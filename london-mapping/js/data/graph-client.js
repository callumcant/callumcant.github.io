// Talks to the live workbook on OneDrive/SharePoint via Microsoft Graph's
// Excel API. Only exercised once CONFIG.USE_MOCK_DATA is false — see
// SETUP.md for the app-registration and config.js values this needs.
//
// Row addressing caveat: Excel Tables via Graph don't have a stable row ID
// — rows/itemAt(index=N) addresses by position. updateRow() below finds the
// row's current index by scanning for a matching `id`/key value each time,
// so it stays correct even if rows above it were added or removed, but it
// does mean someone manually re-sorting a table in Excel while the app is
// mid-edit could cause a race. Fine for a small organising team; worth
// revisiting if usage grows.
import { CONFIG } from "../config.js";
import { getAccessToken } from "../auth.js";
import { rowToObject, objectToRow } from "./table-schemas.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function workbookPath(suffix) {
  return `/sites/${CONFIG.graph.siteId}/drive/items/${CONFIG.graph.driveItemId}/workbook${suffix}`;
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

async function getTableRows(tableName) {
  const data = await graphFetch(workbookPath(`/tables('${tableName}')/rows`));
  return data.value.map((row) => rowToObject(tableName, row.values[0]));
}

// Maps Excel table name -> key on the app's state object.
const TABLE_TO_STATE_KEY = {
  SourceGIAS: "sourceGIAS",
  SourceWorkforce: "sourceWorkforce",
  WCtoURN: "wcToUrn",
  SourceNEUDashboard: "sourceNeuDashboard",
  FieldNotes: "fieldNotes",
  DisputeTracker: "disputeTracker",
  BranchFacts: "branchFacts",
  MatFacts: "matFacts",
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
  await graphFetch(workbookPath(`/tables('${tableName}')/rows`), {
    method: "POST",
    body: JSON.stringify({ values: [objectToRow(tableName, obj)] }),
  });
}

export async function updateRow(tableName, id, fullRecord) {
  const rows = await getTableRows(tableName);
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) throw new Error(`${tableName} row with id ${id} not found`);
  await graphFetch(workbookPath(`/tables('${tableName}')/rows/itemAt(index=${idx})`), {
    method: "PATCH",
    body: JSON.stringify({ values: [objectToRow(tableName, fullRecord)] }),
  });
}
