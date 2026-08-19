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
// Safe despite snapshots.js -> store.js: store.js reaches this module through a
// dynamic import, so there is no static cycle to trip over.
import { BASELINE_DATE } from "./snapshots.js";

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
async function getTableRows(tableName, query = "") {
  const rows = [];
  let path = await workbookPath(`/tables('${tableName}')/rows${query}`);
  while (path) {
    const data = await graphFetch(path);
    for (const row of data.value) rows.push(rowToObject(tableName, row.values[0]));
    const next = data["@odata.nextLink"];
    path = next ? next.replace(GRAPH_BASE, "") : null;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Snapshots: read a window, not the whole table
//
// Snapshots grows by one row per school per week and is never pruned. At London
// scale that is 3,000 rows a week — 156,000 after a year — and the old code
// pulled all of it on every page load, including pages with no chart on them.
// Nothing on screen needs more than a recent trend plus the baseline, so that
// is all we fetch. The workbook keeps the full history either way; this only
// changes what crosses the wire.
//
// The whole approach rests on the table being append-only (hard rule 3): rows
// for one week sit in one contiguous block and the newest week is last, so the
// recent window is the tail. readSnapshotWindow re-checks that assumption and
// falls back to a full read if it doesn't hold.
// ---------------------------------------------------------------------------

const SNAPSHOT_WINDOW_DATES = 12;  // weekly captures kept in memory
const SNAPSHOT_CHUNK_ROWS = 5000;  // first probe; later reads are sized from what it finds
const SNAPSHOT_MAX_READS = 6;      // stop walking backwards even if something is odd

function distinctDates(rows) {
  return [...new Set(rows.map((r) => r.snapshotDate))].sort();
}

// A chunk taken from the middle of the table can cut a week's block in half.
// Half a week's rows still look like a perfectly valid week — they just sum to
// a smaller membership — so a truncated block would put a phantom dip on the
// trend line, which is exactly the kind of quietly-wrong number this app exists
// to avoid. A block is only trustworthy when both its edges are visible: either
// another date sits beside it inside the chunk, or the chunk reached the real
// start or end of the table.
export function completeDateBlocks(rows, { touchesStart = false, touchesEnd = false } = {}) {
  if (rows.length === 0) return rows;
  const firstDate = rows[0].snapshotDate;
  const lastDate = rows[rows.length - 1].snapshotDate;
  return rows.filter((r) => {
    if (!touchesStart && r.snapshotDate === firstDate) return false;
    if (!touchesEnd && r.snapshotDate === lastDate) return false;
    return true;
  });
}

// Append order means each date's rows form exactly one unbroken run. If a date
// appears in two separate runs, the sheet has been re-sorted by hand and the
// tail is not the recent window — it is an arbitrary slice, whose weeks are all
// partial. That reads as a plausible set of numbers, so it has to be caught
// here rather than noticed later on a chart.
export function isBlockOrdered(rows) {
  const seen = new Set();
  let current = null;
  for (const r of rows) {
    if (r.snapshotDate === current) continue;
    if (seen.has(r.snapshotDate)) return false;
    seen.add(r.snapshotDate);
    current = r.snapshotDate;
  }
  return true;
}

// Reads the tail of the table until it holds `windowDates` complete weeks, then
// one read from the head for the baseline week.
//
// `fetchRange(skip, top)` is injected rather than called directly so the whole
// walk — the backwards stepping, the stop condition, the truncation guard, the
// order check — can be driven from an in-memory array under Node. This path
// only runs against a real workbook once config.js is filled in, so without
// that seam it would ship untested.
export async function readSnapshotWindow(totalRows, fetchRange, opts = {}) {
  const {
    windowDates = SNAPSHOT_WINDOW_DATES,
    chunkRows = SNAPSHOT_CHUNK_ROWS,
    maxReads = SNAPSHOT_MAX_READS,
    baselineDate,
  } = opts;

  if (totalRows === 0) return { rows: [], reads: 0, fullRead: false };

  let skip = Math.max(0, totalRows - chunkRows);
  let top = totalRows - skip;
  let tail = [];
  let reads = 0;
  let complete = [];

  while (true) {
    tail = (await fetchRange(skip, top)).concat(tail);
    reads += 1;
    complete = completeDateBlocks(tail, { touchesStart: skip === 0, touchesEnd: true });
    const found = distinctDates(complete).length;
    if (found >= windowDates || skip === 0 || reads >= maxReads) break;

    // Size the next read from what this one revealed, rather than stepping back
    // by a fixed chunk: one more request usually finishes the job.
    const seen = distinctDates(tail).length || 1;
    const rowsPerDate = Math.ceil(tail.length / seen);
    const want = Math.ceil((windowDates - found + 1) * rowsPerDate * 1.2);
    const nextSkip = Math.max(0, skip - want);
    top = skip - nextSkip;
    skip = nextSkip;
  }

  // Keep only the newest `windowDates` weeks, so a generous chunk doesn't drag
  // extra history along behind it.
  const keep = new Set(distinctDates(complete).slice(-windowDates));
  const recent = complete.filter((r) => keep.has(r.snapshotDate));

  // Already read the lot — the baseline is in there, and picking weeks by date
  // rather than by position means row order can't mislead us.
  if (skip === 0) return { rows: recent, reads, fullRead: false };

  // Everything below here trusts position, so the ordering assumption has to
  // hold. If it doesn't, give up and let the caller read the table in full.
  if (!isBlockOrdered(tail)) return { rows: null, reads, fullRead: true };

  // One read from the head for the baseline week. Sized from the same
  // rows-per-week estimate so it spans more than a single week and the block's
  // far edge is visible.
  const seenDates = distinctDates(tail).length || 1;
  const headTop = Math.min(totalRows, Math.max(chunkRows, Math.ceil((tail.length / seenDates) * 3)));
  const head = await fetchRange(0, headTop);
  reads += 1;
  const headComplete = completeDateBlocks(head, {
    touchesStart: true,
    touchesEnd: headTop >= totalRows,
  });

  // Same check at the head, plus the cross-check the two reads make possible:
  // in append order nothing at the start of the table can be newer than the
  // tail. Correct and slow beats fast and wrong.
  const newestTail = distinctDates(recent).slice(-1)[0];
  const newestHead = distinctDates(headComplete).slice(-1)[0];
  if (!isBlockOrdered(head) || (newestTail && newestHead && newestHead > newestTail)) {
    return { rows: null, reads, fullRead: true };
  }

  const baselineBlock = baselineDate
    ? (() => {
        const date = distinctDates(headComplete).find((d) => d >= baselineDate);
        return date ? headComplete.filter((r) => r.snapshotDate === date) : [];
      })()
    : [];

  // Overlap between head and tail needs no arithmetic here: dedupeSnapshots
  // already collapses duplicate (snapshotDate, urn) pairs on read.
  return { rows: recent.concat(baselineBlock), reads, fullRead: false };
}

// The table's row count, without dragging its contents along. $select is doing
// real work: without it Graph returns every cell value in the range, which
// would be worse than the full read this exists to avoid.
async function getTableRowCount(tableName) {
  const data = await graphFetch(
    await workbookPath(`/tables('${tableName}')/dataBodyRange?$select=rowCount`)
  );
  const count = data?.rowCount;
  return Number.isInteger(count) && count >= 0 ? count : null;
}

async function getSnapshotRows() {
  let total = null;
  try {
    total = await getTableRowCount("Snapshots");
  } catch (err) {
    console.warn("[graph] snapshot row count failed; reading the whole table", err);
  }
  if (total == null) return getTableRows("Snapshots");

  const fetchRange = (skip, top) =>
    getTableRows("Snapshots", `?$skip=${skip}&$top=${top}`);

  try {
    const { rows, reads, fullRead } = await readSnapshotWindow(total, fetchRange, {
      baselineDate: BASELINE_DATE,
    });
    if (fullRead || rows == null) {
      console.warn("[graph] Snapshots is not in append order; reading the whole table");
      return getTableRows("Snapshots");
    }
    console.info(`[graph] snapshots: ${rows.length} of ${total} rows in ${reads} requests`);
    return rows;
  } catch (err) {
    // A windowed read is an optimisation. If anything about it goes wrong the
    // dashboard should still get its history.
    console.warn("[graph] windowed snapshot read failed; reading the whole table", err);
    return getTableRows("Snapshots");
  }
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
  RepCommittees: "repCommittees",
  Snapshots: "snapshots",
  SchoolGeo: "schoolGeo",
};

export async function loadAllTables() {
  const entries = await Promise.all(
    Object.entries(TABLE_TO_STATE_KEY).map(async ([tableName, stateKey]) => [
      stateKey,
      // Snapshots is the one table that grows without bound, so it is read as a
      // window rather than in full — see readSnapshotWindow above.
      tableName === "Snapshots" ? await getSnapshotRows() : await getTableRows(tableName),
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
