import { loadAll, getState, addDispute, updateDispute } from "../data/store.js";
import { LONDON_BOROUGHS, DISPUTE_ISSUE_TYPES, ROR_IO_OPTIONS, RAG_OPTIONS } from "../config.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, ragPill, livePill, escapeHtml } from "../ui.js";
import { navigate } from "../router.js";

export async function renderList(container) {
  const state = await loadAll();
  const disputes = state.disputeTracker;

  container.innerHTML = `
    <div class="topbar">
      <h1>Dispute tracker</h1>
      <a class="btn btn-primary" href="#/disputes/new">+ New dispute</a>
    </div>
    <div class="filter-bar">
      <select id="dispute-live-filter">
        <option value="">All disputes</option>
        <option value="Yes">Live only</option>
        <option value="No">Closed only</option>
      </select>
      <select id="dispute-branch-filter">
        <option value="">All branches</option>
        ${[...new Set(disputes.map((d) => d.branch))].sort().map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
      </select>
      <select id="dispute-outcome-filter">
        <option value="">All outcomes</option>
        ${RAG_OPTIONS.map((o) => `<option value="${o}">${o}</option>`).join("")}
        <option value="none">Not yet set</option>
      </select>
    </div>
    <div class="card"><div id="disputes-table"></div></div>
  `;

  const liveEl = container.querySelector("#dispute-live-filter");
  const branchEl = container.querySelector("#dispute-branch-filter");
  const outcomeEl = container.querySelector("#dispute-outcome-filter");
  const tableEl = container.querySelector("#disputes-table");

  const columns = [
    { key: "employer", label: "Employer", render: (r) => `<a class="row-link" href="#/disputes/${r.id}">${escapeHtml(r.employer)}</a>` },
    { key: "branch", label: "Branch" },
    { key: "live", label: "Status", render: (r) => livePill(r.live) },
    { key: "issues", label: "Issues", wrap: true, render: (r) => escapeHtml(r.issues.join(", ")) },
    { key: "rorIo", label: "Lead" },
    { key: "indicativePercent", label: "Indicative %", num: true, render: (r) => formatPercent(r.indicativePercent) },
    { key: "formalBallotPercent", label: "Formal %", num: true, render: (r) => formatPercent(r.formalBallotPercent) },
    { key: "outcome", label: "Outcome", render: (r) => ragPill(r.outcome) },
    { key: "totalStrikeDays", label: "Strike days", num: true },
  ];

  function applyFilters() {
    const filtered = disputes.filter((d) => {
      if (liveEl.value && d.live !== liveEl.value) return false;
      if (branchEl.value && d.branch !== branchEl.value) return false;
      if (outcomeEl.value === "none" && d.outcome) return false;
      if (outcomeEl.value && outcomeEl.value !== "none" && d.outcome !== outcomeEl.value) return false;
      return true;
    });
    renderDataTable(tableEl, columns, filtered, { defaultSort: "employer", defaultDir: "asc" });
  }

  [liveEl, branchEl, outcomeEl].forEach((el) => el.addEventListener("input", applyFilters));
  applyFilters();
}

function issueCheckboxes(selected = []) {
  return DISPUTE_ISSUE_TYPES.map(
    (issue) => `
    <label><input type="checkbox" name="issues" value="${escapeHtml(issue)}" ${selected.includes(issue) ? "checked" : ""} /> ${escapeHtml(issue)}</label>`
  ).join("");
}

// Stored as a fraction, edited as a percentage. Rounding to 1dp keeps
// floating-point noise out of the input (0.58 * 100 is 57.99999999999999),
// which would otherwise be written straight back to the workbook on save.
function fractionToPercentInput(fraction) {
  if (fraction == null) return "";
  return Math.round(fraction * 1000) / 10;
}

function optionsHtml(list, selected) {
  return list.map((v) => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
}

export async function renderForm(container, { id }) {
  await loadAll();
  const state = getState();
  const existing = id ? state.disputeTracker.find((d) => d.id === id) : null;
  if (id && !existing) {
    container.innerHTML = `<div class="empty-state">Dispute not found.</div>`;
    return;
  }
  const d = existing || {
    employer: "", mat: "", branch: "", live: "Yes", schoolsCount: 1, rorIo: "ROR",
    // The numeric ballot fields default to null, not "": the inputs below test
    // `!= null`, and "" * 100 would render a misleading 0 on a blank form.
    staffResponsible: "", issues: [], dateIndicativeOpens: "", indicativePercent: null,
    membershipAtIndicative: null, formalBallotPercent: null, dateOfResolution: "",
    outcome: "", totalStrikeDays: 0,
  };

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/disputes">← Dispute tracker</a></div>
    <div class="topbar"><h1>${existing ? "Edit dispute" : "New dispute"}</h1></div>
    <form class="card" id="dispute-form">
      <div class="form-grid">
        <div class="field span-2">
          <label>Employer *</label>
          <input name="employer" required value="${escapeHtml(d.employer)}" />
        </div>
        <div class="field">
          <label>Branch *</label>
          <select name="branch" required>
            <option value="">Select…</option>
            ${optionsHtml(LONDON_BOROUGHS, d.branch)}
          </select>
        </div>
        <div class="field">
          <label>MAT <span class="hint">(leave blank if not a MAT employer)</span></label>
          <input name="mat" value="${escapeHtml(d.mat)}" />
        </div>
        <div class="field">
          <label>Live?</label>
          <select name="live">
            <option value="Yes" ${d.live === "Yes" ? "selected" : ""}>Yes</option>
            <option value="No" ${d.live === "No" ? "selected" : ""}>No</option>
          </select>
        </div>
        <div class="field">
          <label># Schools affected</label>
          <input name="schoolsCount" type="number" min="0" value="${d.schoolsCount ?? ""}" />
        </div>
        <div class="field">
          <label>ROR / IO / SIO leading</label>
          <select name="rorIo">${optionsHtml(ROR_IO_OPTIONS, d.rorIo)}</select>
        </div>
        <div class="field">
          <label>Staff responsible</label>
          <input name="staffResponsible" value="${escapeHtml(d.staffResponsible)}" />
        </div>
        <div class="field span-2">
          <label>Dispute issues</label>
          <div class="checkbox-group">${issueCheckboxes(d.issues)}</div>
        </div>
      </div>

      <div class="section-title">Ballot &amp; outcome</div>
      <div class="form-grid">
        <div class="field">
          <label>Date indicative opens</label>
          <input name="dateIndicativeOpens" type="date" value="${d.dateIndicativeOpens || ""}" />
        </div>
        <div class="field">
          <label>Indicative % (Yes)</label>
          <input name="indicativePercent" type="number" min="0" max="100" step="0.1" value="${fractionToPercentInput(d.indicativePercent)}" />
        </div>
        <div class="field">
          <label>Membership at indicative</label>
          <input name="membershipAtIndicative" type="number" min="0" value="${d.membershipAtIndicative ?? ""}" />
        </div>
        <div class="field">
          <label>Formal ballot % (Yes)</label>
          <input name="formalBallotPercent" type="number" min="0" max="100" step="0.1" value="${fractionToPercentInput(d.formalBallotPercent)}" />
        </div>
        <div class="field">
          <label>Date of resolution</label>
          <input name="dateOfResolution" type="date" value="${d.dateOfResolution || ""}" />
        </div>
        <div class="field">
          <label>Outcome (RAG)</label>
          <select name="outcome">
            <option value="">Not yet set</option>
            ${optionsHtml(RAG_OPTIONS, d.outcome)}
          </select>
        </div>
        <div class="field">
          <label>Total strike days</label>
          <input name="totalStrikeDays" type="number" min="0" value="${d.totalStrikeDays ?? 0}" />
        </div>
      </div>

      <div class="btn-row">
        <button type="submit" class="btn btn-primary">${existing ? "Save changes" : "Add dispute"}</button>
        <a class="btn" href="#/disputes">Cancel</a>
      </div>
    </form>
  `;

  container.querySelector("#dispute-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const record = {
      employer: fd.get("employer").trim(),
      mat: fd.get("mat").trim(),
      branch: fd.get("branch"),
      live: fd.get("live"),
      schoolsCount: Number(fd.get("schoolsCount")) || 0,
      rorIo: fd.get("rorIo"),
      staffResponsible: fd.get("staffResponsible").trim(),
      issues: fd.getAll("issues"),
      dateIndicativeOpens: fd.get("dateIndicativeOpens") || null,
      indicativePercent: fd.get("indicativePercent") ? Number(fd.get("indicativePercent")) / 100 : null,
      membershipAtIndicative: fd.get("membershipAtIndicative") ? Number(fd.get("membershipAtIndicative")) : null,
      formalBallotPercent: fd.get("formalBallotPercent") ? Number(fd.get("formalBallotPercent")) / 100 : null,
      dateOfResolution: fd.get("dateOfResolution") || null,
      outcome: fd.get("outcome") || null,
      totalStrikeDays: Number(fd.get("totalStrikeDays")) || 0,
    };
    if (existing) {
      await updateDispute(existing.id, record);
    } else {
      await addDispute(record);
    }
    navigate("/disputes");
  });
}
