// Single point of contact between pages and data. Pages never import
// mock-data.js or graph-client.js directly — they call this module, which
// picks a source based on whether config.js is filled in. That's what lets the same
// rollup logic run against fake data today and the real workbook later.
import { isPreviewMode } from "../config.js";
import * as mock from "./mock-data.js";

let graphClient = null;
async function getGraphClient() {
  if (!graphClient) {
    const mod = await import("./graph-client.js");
    graphClient = mod;
  }
  return graphClient;
}

// In-memory copies so additions made through the forms show up immediately
// without a full reload. Mock mode never persists beyond the browser tab.
const state = {
  loaded: false,
  sourceGIAS: [],
  sourceStratum: [],
  sourcePayDashboard: [],
  sourceWorkforceSurvey: [],
  wcToUrn: [],
  matAliases: [],
  reconciliations: [],
  fieldNotes: [],
  disputeTracker: [],
  branchFacts: [],
  matFacts: [],
  meetings: [],
  repsRecruited: [],
  repCommittees: [],
  snapshots: [],
  schoolGeo: [],
  asOfDate: null,
};

export async function loadAll() {
  if (state.loaded) return state;

  if (isPreviewMode()) {
    state.sourceGIAS = mock.sourceGIAS;
    state.sourceStratum = mock.sourceStratum;
    state.sourcePayDashboard = mock.sourcePayDashboard;
    state.sourceWorkforceSurvey = mock.sourceWorkforceSurvey;
    state.wcToUrn = mock.wcToUrn;
    state.matAliases = mock.matAliases;
    state.reconciliations = [...mock.reconciliations];
    state.fieldNotes = [...mock.fieldNotes];
    state.disputeTracker = [...mock.disputeTracker];
    state.branchFacts = mock.branchFacts;
    state.matFacts = mock.matFacts;
    state.meetings = [...mock.meetings];
    state.repsRecruited = [...mock.repsRecruited];
    state.repCommittees = [...mock.repCommittees];
    state.snapshots = [...mock.snapshots];
    state.schoolGeo = [...mock.schoolGeo];
    state.asOfDate = new Date();
  } else {
    const graph = await getGraphClient();
    const tables = await graph.loadAllTables();
    Object.assign(state, tables);
    state.asOfDate = new Date();
  }

  state.loaded = true;
  return state;
}

export function getState() {
  return state;
}

async function appendRow(tableName, stateKey, record) {
  if (!isPreviewMode()) {
    const graph = await getGraphClient();
    await graph.addRow(tableName, record);
  }
  state[stateKey].push(record);
  return record;
}

export async function addFieldNote(note) {
  return appendRow("FieldNotes", "fieldNotes", { id: `n${Date.now()}`, ...note });
}

export async function addDispute(dispute) {
  return appendRow("DisputeTracker", "disputeTracker", { id: `d${Date.now()}`, ...dispute });
}

export async function updateDispute(id, patch) {
  const idx = state.disputeTracker.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Dispute ${id} not found`);
  const updated = { ...state.disputeTracker[idx], ...patch };
  if (!isPreviewMode()) {
    const graph = await getGraphClient();
    await graph.updateRow("DisputeTracker", id, updated);
  }
  state.disputeTracker[idx] = updated;
  return updated;
}

export async function addMeeting({ date, urn, loggedBy }) {
  return appendRow("Meetings", "meetings", { id: `m${Date.now()}`, date, urn, loggedBy });
}

export async function addRepRecruited({ date, urn, repName, loggedBy }) {
  return appendRow("RepsRecruited", "repsRecruited", {
    id: `r${Date.now()}`, date, urn, repName, loggedBy,
  });
}

// Append-only, like every other reporter: changing a trust's committee status
// adds a row with the date it changed rather than overwriting the last one, so
// the history of when a committee was in place survives.
export async function logRepCommittee({ mat, exists, effectiveFrom, loggedBy }) {
  return appendRow("RepCommittees", "repCommittees", {
    id: `rcm${Date.now()}`, mat, exists, effectiveFrom, loggedBy,
  });
}

// Undo support for the one-click event logs: the entry was created without a
// confirmation step, so it has to be removable just as cheaply.
export async function removeEventLog(tableName, stateKey, id) {
  const idx = state[stateKey].findIndex((r) => r.id === id);
  if (idx === -1) return;
  if (!isPreviewMode()) {
    const graph = await getGraphClient();
    await graph.deleteRow(tableName, id);
  }
  state[stateKey].splice(idx, 1);
}

export async function addReconciliation(decision) {
  return appendRow("Reconciliations", "reconciliations", {
    id: `rc${Date.now()}`, ...decision,
  });
}

export async function appendSchoolGeoRows(rows) {
  if (!isPreviewMode()) {
    const graph = await getGraphClient();
    await graph.addRows("SchoolGeo", rows);
  }
  state.schoolGeo.push(...rows);
  return rows;
}

export async function appendSnapshotRows(rows) {
  if (!isPreviewMode()) {
    const graph = await getGraphClient();
    await graph.addRows("Snapshots", rows);
  }
  state.snapshots.push(...rows);
  return rows;
}
