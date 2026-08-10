// Single point of contact between pages and data. Pages never import
// mock-data.js or graph-client.js directly — they call this module, which
// picks a source based on CONFIG.USE_MOCK_DATA. That's what lets the same
// rollup logic run against fake data today and the real workbook later.
import { CONFIG } from "../config.js";
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
  sourceWorkforce: [],
  wcToUrn: [],
  sourceNeuDashboard: [],
  fieldNotes: [],
  disputeTracker: [],
  branchFacts: [],
  matFacts: [],
  asOfDate: null,
};

export async function loadAll() {
  if (state.loaded) return state;

  if (CONFIG.USE_MOCK_DATA) {
    state.sourceGIAS = mock.sourceGIAS;
    state.sourceWorkforce = mock.sourceWorkforce;
    state.wcToUrn = mock.wcToUrn;
    state.sourceNeuDashboard = mock.sourceNeuDashboard;
    state.fieldNotes = [...mock.fieldNotes];
    state.disputeTracker = [...mock.disputeTracker];
    state.branchFacts = mock.branchFacts;
    state.matFacts = mock.matFacts;
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

export async function addFieldNote(note) {
  const record = { id: `n${Date.now()}`, ...note };
  if (CONFIG.USE_MOCK_DATA) {
    state.fieldNotes.push(record);
  } else {
    const graph = await getGraphClient();
    await graph.addRow("FieldNotes", record);
    state.fieldNotes.push(record);
  }
  return record;
}

export async function addDispute(dispute) {
  const record = { id: `d${Date.now()}`, ...dispute };
  if (CONFIG.USE_MOCK_DATA) {
    state.disputeTracker.push(record);
  } else {
    const graph = await getGraphClient();
    await graph.addRow("DisputeTracker", record);
    state.disputeTracker.push(record);
  }
  return record;
}

export async function updateDispute(id, patch) {
  const idx = state.disputeTracker.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Dispute ${id} not found`);
  const updated = { ...state.disputeTracker[idx], ...patch };
  if (CONFIG.USE_MOCK_DATA) {
    state.disputeTracker[idx] = updated;
  } else {
    const graph = await getGraphClient();
    await graph.updateRow("DisputeTracker", id, updated);
    state.disputeTracker[idx] = updated;
  }
  return updated;
}
