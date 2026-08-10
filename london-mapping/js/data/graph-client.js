// Talks to the live workbook on OneDrive/SharePoint via Microsoft Graph's
// Excel API. Only exercised once config.js holds real values — see SETUP.md.
//
// The workbook is located from its ordinary SharePoint URL rather than from
// site/item GUIDs, so going live needs no Graph Explorer archaeology: copy the
// address bar, paste it into config.js, done.
//
// Row addressing caveat: Excel Tables via Graph have no stable row ID —
// rows/itemAt(index=N) addresses by position. updateRow/deleteRow below find
// the row's current index by scanning for a matching `id` each time, so they
// stay correct even if rows above changed, but someone manually re-sorting a
// table in Excel mid-edit could still cause a race. Acceptable for a small
// team; worth revisiting if usage grows.
import { CONFIG } from "../config.js";
import { getAccessToken } from "../auth.js";
import { rowToObject, objectToRow, TABLE_SCHEMAS } from "./table-schemas.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// Graph rejects oversized payloads, and a weekly snapshot is ~530 rows (more
// if this grows to all-London), so writes are chunked rather than sent as one
// request.
const WRITE_BATCH_SIZE = 200;

// Graph's /shares endpoint takes a sharing URL encoded as an unpadded,
// URL-safe base64 string prefixed with "u!". That turns any SharePoint link
// into a driveItem, which is what lets config.js hold a URL instead of GUIDs.
function encodeShareUrl(url) {
  const b64 = btoa(unescape(encodeURIComponent(url)));
  return "u!" + b64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
}

let workbookRefPromise = null;

// Resolved once per page load and reused: every table read would otherwise
// repeat the lookup.
export function resolveWorkbook() {
  if (!workbookRefPromise) {
    workbookRefPromise = (async () => {
      const item = await graphFetch(`/shares/${encodeShareUrl(CONFIG.workbookUrl)}/driveItem`);
      if (!item?.id || !item?.parentReference?.driveId) {
        throw new Error("Resolved the workbook URL but Graph returned no drive item id.");
      }
      return { driveId: item.parentReference.driveId, itemId: item.id, name: item.name };
    })().catch((err) => {
      workbookRefPromise = null; // let a later attempt retry rather than caching the failure
      throw err;
    });
  }
  return workbookRefPromise;
}

async function workbookPath(suffix) {
  const { driveId, itemId } = await resolveWorkbook();
  return `/drives/${driveId}/items/${itemId}/workbook${suffix}`;
}

async function graphFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph API ${res.status} on ${path}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Graph pages large tables; the snapshot table in particular will outgrow one
// page within a few months, so follow @odata.nextLink rather than assuming a
// single response holds everything.
async function getTableRows(tableName) {
  const rows = [];
  let path = await workbookPath(`/tables('${tableName}')/rows`);
  while (path) {
    const data = await graphFetch(path);
    for (const row of data.value) rows.push(rowToObject(tableName, row.values[0]));
    const next = data["@odata.nextLink"];
    path = next ? next.replace(GRAPH_BASE, "") : null;
  }
  return rows;
}

// Excel table name -> key on the app's state object.
const TABLE_TO_STATE_KEY = {
  SourceGIAS: "sourceGIAS",
  SourceStratum: "sourceStratum",
  SourcePayDashboard: "sourcePayDashboard",
  SourceWorkforceSurvey: "sourceWorkforceSurvey",
  WCtoURN: "wcToUrn",
  MatAliases: "matAliases",
  Reconciliations: "reconciliations",
  FieldNotes: "fieldNotes",
  DisputeTracker: "disputeTracker",
  BranchFacts: "branchFacts",
  MatFacts: "matFacts",
  Meetings: "meetings",
  RepsRecruited: "repsRecruited",
  Snapshots: "snapshots",
  SchoolGeo: "schoolGeo",
};

export async function loadAllTables() {
  const entries = await Promise.all(
    Object.entries(TABLE_TO_STATE_KEY).map(async ([tableName, stateKey]) => [
      stateKey,
      await getTableRows(tableName),
    ])
  );
  return Object.fromEntries(entries);
}

export async function addRow(tableName, obj) {
  await addRows(tableName, [obj]);
}

export async function addRows(tableName, objects) {
  for (let i = 0; i < objects.length; i += WRITE_BATCH_SIZE) {
    const batch = objects.slice(i, i + WRITE_BATCH_SIZE);
    await graphFetch(await workbookPath(`/tables('${tableName}')/rows`), {
      method: "POST",
      body: JSON.stringify({ values: batch.map((o) => objectToRow(tableName, o)) }),
    });
  }
}

async function findRowIndex(tableName, id) {
  const rows = await getTableRows(tableName);
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) throw new Error(`${tableName} row with id ${id} not found`);
  return idx;
}

export async function updateRow(tableName, id, fullRecord) {
  const idx = await findRowIndex(tableName, id);
  await graphFetch(await workbookPath(`/tables('${tableName}')/rows/itemAt(index=${idx})`), {
    method: "PATCH",
    body: JSON.stringify({ values: [objectToRow(tableName, fullRecord)] }),
  });
}

export async function deleteRow(tableName, id) {
  const idx = await findRowIndex(tableName, id);
  await graphFetch(await workbookPath(`/tables('${tableName}')/rows/itemAt(index=${idx})`), {
    method: "DELETE",
  });
}

// Health check for the setup page. Compares the workbook's actual tables and
// column counts against TABLE_SCHEMAS and reports per-table, so "it doesn't
// work" becomes "SourceGIAS has 7 columns, expected 17".
//
// SchoolGeo is optional: it stays empty until the map view is used, and its
// absence shouldn't be reported as a fault on an otherwise-healthy workbook.
const OPTIONAL_TABLES = new Set(["SchoolGeo"]);

export async function checkWorkbookHealth() {
  const { name } = await resolveWorkbook();
  const listPath = await workbookPath("/tables");
  const data = await graphFetch(listPath);
  const present = new Map(data.value.map((t) => [t.name, t]));

  const results = [];
  for (const [tableName, fields] of Object.entries(TABLE_SCHEMAS)) {
    const table = present.get(tableName);
    if (!table) {
      results.push({
        table: tableName,
        ok: OPTIONAL_TABLES.has(tableName),
        optional: OPTIONAL_TABLES.has(tableName),
        detail: OPTIONAL_TABLES.has(tableName)
          ? "Not present — optional, only needed for the map view."
          : `Missing. Add a table named exactly "${tableName}" with ${fields.length} columns.`,
      });
      continue;
    }
    let columns = [];
    try {
      const colData = await graphFetch(
        await workbookPath(`/tables('${tableName}')/columns?$select=name`)
      );
      columns = colData.value.map((c) => c.name);
    } catch {
      results.push({ table: tableName, ok: false, detail: "Could not read this table's columns." });
      continue;
    }
    const ok = columns.length === fields.length;
    results.push({
      table: tableName,
      ok,
      detail: ok
        ? `${columns.length} columns, as expected.`
        : `Has ${columns.length} columns, expected ${fields.length}. Column order must match the template.`,
      columns,
    });
  }

  const extras = [...present.keys()].filter((n) => !TABLE_SCHEMAS[n]);
  return { workbookName: name, results, extras };
}
