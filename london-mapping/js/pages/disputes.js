import { loadAll, getState, addDispute, updateDispute } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { LONDON_BOROUGHS, DISPUTE_ISSUE_TYPES, ROR_IO_OPTIONS, RAG_OPTIONS } from "../config.js";
import {
  renderDataTable, renderColumnControls, loadColumnPrefs, saveColumnPrefs,
  downloadCsv, csvFilename, formatNumber, formatPercent, formatDate, ragPill, livePill, escapeHtml,
} from "../ui.js";
import { navigate } from "../router.js";

const PREFS_KEY = "london-mapping:disputes:columns";

// The tracker holds far more than the old list showed. Same treatment as the
// Schools view: a light default, presets, a column picker and CSV export, so
// every recorded field is reachable without opening each dispute.
function disputeColumns(schoolNameByUrn) {
  const link = (label) => (r) =>
    r[label] ? `<a href="${escapeHtml(r[label])}" target="_blank" rel="noopener noreferrer">Open</a>` : "—";
  return [
    { key: "employer", label: "Employer", always: true,
      render: (r) => `<a class="row-link" href="#/disputes/${r.id}">${escapeHtml(r.employer)}</a>` },
    { key: "branch", label: "Branch" },
    { key: "mat", label: "MAT", render: (r) => escapeHtml(r.mat || "—") },
    // "Live" rather than "Status": the RAG column is what's now called Status,
    // and this one matches the workbook's own "Live" header.
    { key: "live", label: "Live", render: (r) => livePill(r.live) },
    { key: "schoolsCount", label: "# Schools", num: true,
      sortValue: (r) => (r.urns || []).length,
      render: (r) => String((r.urns || []).length) },
    { key: "schoolNames", label: "Schools", wrap: true,
      sortValue: (r) => (r.urns || []).length,
      render: (r) => escapeHtml((r.urns || []).map((u) => schoolNameByUrn.get(String(u)) || `URN ${u}`).join(", ") || "—"),
      csv: (r) => (r.urns || []).map((u) => schoolNameByUrn.get(String(u)) || u).join("; ") },
    { key: "urns", label: "Affected URNs", wrap: true,
      render: (r) => escapeHtml((r.urns || []).join(", ") || "—"),
      csv: (r) => (r.urns || []).join("; ") },
    { key: "issues", label: "Issues", wrap: true,
      render: (r) => escapeHtml(r.issues.join(", ")),
      csv: (r) => r.issues.join("; ") },
    { key: "rorIo", label: "Lead role" },
    { key: "staffResponsible", label: "Lead name" },
    { key: "dateIndicativeOpens", label: "Indicative opens", render: (r) => formatDate(r.dateIndicativeOpens),
      csv: (r) => r.dateIndicativeOpens || "" },
    { key: "indicativePercent", label: "Indicative %", num: true, render: (r) => formatPercent(r.indicativePercent),
      csv: (r) => (r.indicativePercent == null ? "" : r.indicativePercent.toFixed(4)) },
    { key: "membershipAtIndicative", label: "Membership at indicative", num: true,
      render: (r) => formatNumber(r.membershipAtIndicative) },
    { key: "formalBallotPercent", label: "Formal %", num: true, render: (r) => formatPercent(r.formalBallotPercent),
      csv: (r) => (r.formalBallotPercent == null ? "" : r.formalBallotPercent.toFixed(4)) },
    { key: "resolvedPriorToAction", label: "Resolved before action" },
    { key: "dateOfResolution", label: "Resolved", render: (r) => formatDate(r.dateOfResolution),
      csv: (r) => r.dateOfResolution || "" },
    { key: "outcome", label: "Status", render: (r) => ragPill(r.outcome) },
    { key: "totalStrikeDays", label: "Strike days", num: true },
    { key: "tradeDisputeLetter", label: "Trade dispute letter", render: link("tradeDisputeLetter") },
    { key: "formalBallotRequest", label: "Formal ballot request", render: link("formalBallotRequest") },
    { key: "noticeOfFormalBallot", label: "Notice of formal ballot", render: link("noticeOfFormalBallot") },
    { key: "noticeOfStrikeDates", label: "Notice of strike dates", render: link("noticeOfStrikeDates") },
    { key: "endOfDisputeReport", label: "End of dispute report", render: link("endOfDisputeReport") },
  ];
}

const DEFAULT_KEYS = [
  "employer", "branch", "live", "schoolsCount", "issues", "rorIo",
  "indicativePercent", "formalBallotPercent", "outcome", "totalStrikeDays",
];

const PRESETS = {
  essentials: { label: "Essentials", keys: DEFAULT_KEYS },
  schools: { label: "Schools affected", keys: ["employer", "branch", "mat", "live", "schoolsCount", "schoolNames", "urns"] },
  ballots: { label: "Ballots", keys: ["employer", "live", "dateIndicativeOpens", "indicativePercent", "membershipAtIndicative", "formalBallotPercent", "resolvedPriorToAction"] },
  outcome: { label: "Status", keys: ["employer", "branch", "live", "dateOfResolution", "outcome", "totalStrikeDays"] },
  documents: { label: "Documents", keys: ["employer", "tradeDisputeLetter", "formalBallotRequest", "noticeOfFormalBallot", "noticeOfStrikeDates", "endOfDisputeReport"] },
  everything: { label: "Everything", keys: null },
};

const PICKER_GROUPS = [
  { label: "Identity", keys: ["employer", "branch", "mat", "live"] },
  { label: "Schools", keys: ["schoolsCount", "schoolNames", "urns"] },
  { label: "People & issues", keys: ["issues", "rorIo", "staffResponsible"] },
  { label: "Ballots", keys: ["dateIndicativeOpens", "indicativePercent", "membershipAtIndicative", "formalBallotPercent", "resolvedPriorToAction"] },
  { label: "Status", keys: ["dateOfResolution", "outcome", "totalStrikeDays"] },
  { label: "Documents", keys: ["tradeDisputeLetter", "formalBallotRequest", "noticeOfFormalBallot", "noticeOfStrikeDates", "endOfDisputeReport"] },
];

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const schoolNameByUrn = new Map(schools.map((s) => [String(s.urn), s.schoolName]));
  const disputes = state.disputeTracker;
  const columns = disputeColumns(schoolNameByUrn);
  let visibleKeys = loadColumnPrefs(PREFS_KEY, DEFAULT_KEYS);

  container.innerHTML = `
    <div class="topbar">
      <h1>Dispute tracker</h1>
      <div class="btn-row" style="margin-top:0;">
        <button class="btn" id="export-csv">Export CSV</button>
        <a class="btn btn-primary" href="#/disputes/new">+ New dispute</a>
      </div>
    </div>
    <div class="filter-bar">
      <select id="dispute-live-filter">
        <option value="">All disputes</option>
        <option value="Yes">Live only</option>
        <option value="No">Closed only</option>
      </select>
      <select id="dispute-branch-filter">
        <option value="">All branches</option>
        ${[...new Set(disputes.map((d) => d.branch))].filter(Boolean).sort().map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
      </select>
      <select id="dispute-outcome-filter">
        <option value="">All statuses</option>
        ${RAG_OPTIONS.map((o) => `<option value="${o}">${o}</option>`).join("")}
        <option value="none">Not yet set</option>
      </select>
    </div>
    <div id="column-controls"></div>
    <div class="card"><div id="disputes-table"></div></div>
    <div class="result-count" id="result-count"></div>
  `;

  const liveEl = container.querySelector("#dispute-live-filter");
  const branchEl = container.querySelector("#dispute-branch-filter");
  const outcomeEl = container.querySelector("#dispute-outcome-filter");
  const tableEl = container.querySelector("#disputes-table");
  const countEl = container.querySelector("#result-count");
  const controlsEl = container.querySelector("#column-controls");

  function currentRows() {
    return disputes.filter((d) => {
      if (liveEl.value && d.live !== liveEl.value) return false;
      if (branchEl.value && d.branch !== branchEl.value) return false;
      if (outcomeEl.value === "none" && d.outcome) return false;
      if (outcomeEl.value && outcomeEl.value !== "none" && d.outcome !== outcomeEl.value) return false;
      return true;
    });
  }

  // Owned here so re-drawing on a filter change doesn't discard the user's sort.
  const sortState = { key: "employer", dir: "asc" };

  renderColumnControls(controlsEl, {
    columns, groups: PICKER_GROUPS, presets: PRESETS, visibleKeys,
    onChange: (next) => {
      visibleKeys = next;
      saveColumnPrefs(PREFS_KEY, visibleKeys);
      drawTable();
    },
  });

  function drawTable() {
    const rows = currentRows();
    renderDataTable(tableEl, columns, rows, { visibleKeys, stickyFirst: true, sortState });
    countEl.textContent = `${rows.length} of ${disputes.length} disputes · ${visibleKeys.size} columns`;
  }

  [liveEl, branchEl, outcomeEl].forEach((el) => el.addEventListener("input", drawTable));
  container.querySelector("#export-csv").addEventListener("click", () => {
    downloadCsv(
      csvFilename(branchEl.value, "disputes"),
      columns.filter((c) => visibleKeys.has(c.key)),
      currentRows()
    );
  });

  drawTable();
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
  const allSchools = buildSchoolLevel(state);
  const existing = id ? state.disputeTracker.find((d) => d.id === id) : null;
  if (id && !existing) {
    container.innerHTML = `<div class="empty-state">Dispute not found.</div>`;
    return;
  }
  const d = existing || {
    employer: "", mat: "", branch: "", live: "Yes", schoolsCount: 1, rorIo: "ROR",
    // The numeric ballot fields default to null, not "": the inputs below test
    // `!= null`, and "" * 100 would render a misleading 0 on a blank form.
    staffResponsible: "", issues: [], urns: [], dateIndicativeOpens: "", indicativePercent: null,
    membershipAtIndicative: null, formalBallotPercent: null, dateOfResolution: "",
    outcome: "", totalStrikeDays: 0, resolvedPriorToAction: "No",
    tradeDisputeLetter: "", formalBallotRequest: "", noticeOfFormalBallot: "",
    noticeOfStrikeDates: "", endOfDisputeReport: "",
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
        <div class="field span-2">
          <label>Affected schools *</label>
          <div class="hint">Search by name or URN. The number of schools is counted from this list, and the map's dispute layer uses it.</div>
          <div id="school-picker"></div>
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
          <label>Status (RAG)</label>
          <select name="outcome">
            <option value="">Not yet set</option>
            ${optionsHtml(RAG_OPTIONS, d.outcome)}
          </select>
        </div>
        <div class="field">
          <label>Total strike days</label>
          <input name="totalStrikeDays" type="number" min="0" value="${d.totalStrikeDays ?? 0}" />
        </div>
        <div class="field">
          <label>Resolved prior to action?</label>
          <select name="resolvedPriorToAction">
            <option value="No" ${d.resolvedPriorToAction !== "Yes" ? "selected" : ""}>No</option>
            <option value="Yes" ${d.resolvedPriorToAction === "Yes" ? "selected" : ""}>Yes</option>
          </select>
        </div>
      </div>

      <div class="section-title">Documents</div>
      <div class="form-grid">
        <div class="field">
          <label>Trade dispute letter</label>
          <input name="tradeDisputeLetter" type="url" placeholder="Link" value="${escapeHtml(d.tradeDisputeLetter || "")}" />
        </div>
        <div class="field">
          <label>Formal ballot request</label>
          <input name="formalBallotRequest" type="url" placeholder="Link" value="${escapeHtml(d.formalBallotRequest || "")}" />
        </div>
        <div class="field">
          <label>Notice of formal ballot</label>
          <input name="noticeOfFormalBallot" type="url" placeholder="Link" value="${escapeHtml(d.noticeOfFormalBallot || "")}" />
        </div>
        <div class="field">
          <label>Notice of strike dates</label>
          <input name="noticeOfStrikeDates" type="url" placeholder="Link" value="${escapeHtml(d.noticeOfStrikeDates || "")}" />
        </div>
        <div class="field span-2">
          <label>End of dispute report</label>
          <input name="endOfDisputeReport" type="url" placeholder="Link" value="${escapeHtml(d.endOfDisputeReport || "")}" />
        </div>
      </div>

      <div class="btn-row">
        <button type="submit" class="btn btn-primary">${existing ? "Save changes" : "Add dispute"}</button>
        <a class="btn" href="#/disputes">Cancel</a>
      </div>
    </form>
  `;

  // Chosen schools live outside the form fields because they're a multi-select
  // built from search, not an <input> the browser can serialise.
  let selectedUrns = [...(d.urns || [])].map(String);
  const pickerEl = container.querySelector("#school-picker");

  function drawPicker() {
    const chosen = selectedUrns
      .map((u) => allSchools.find((s) => String(s.urn) === u))
      .filter(Boolean);
    pickerEl.innerHTML = `
      <div class="chip-list">
        ${chosen.length === 0 ? `<span class="muted-cell">No schools selected yet.</span>` : ""}
        ${chosen.map((s) => `
          <span class="chip chip-selected">${escapeHtml(s.schoolName)}
            <button type="button" data-remove="${s.urn}" aria-label="Remove ${escapeHtml(s.schoolName)}">✕</button>
          </span>`).join("")}
      </div>
      <input type="search" id="school-search" placeholder="Type a school name or URN…" autocomplete="off" />
      <div class="picker-results" id="picker-results" hidden></div>`;

    pickerEl.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedUrns = selectedUrns.filter((u) => u !== btn.dataset.remove);
        drawPicker();
      });
    });

    const search = pickerEl.querySelector("#school-search");
    const results = pickerEl.querySelector("#picker-results");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) {
        results.hidden = true;
        return;
      }
      const matches = allSchools
        .filter((s) => !selectedUrns.includes(String(s.urn)))
        .filter((s) => `${s.schoolName} ${s.urn} ${s.laName}`.toLowerCase().includes(q))
        .slice(0, 8);
      results.hidden = matches.length === 0;
      results.innerHTML = matches
        .map((s) => `<button type="button" data-add="${s.urn}">${escapeHtml(s.schoolName)}
          <span class="muted-cell">URN ${s.urn} · ${escapeHtml(s.laName)}</span></button>`)
        .join("");
      results.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedUrns.push(btn.dataset.add);
          drawPicker();
        });
      });
    });
  }
  drawPicker();

  container.querySelector("#dispute-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const record = {
      employer: fd.get("employer").trim(),
      mat: fd.get("mat").trim(),
      branch: fd.get("branch"),
      live: fd.get("live"),

      rorIo: fd.get("rorIo"),
      staffResponsible: fd.get("staffResponsible").trim(),
      issues: fd.getAll("issues"),
      urns: selectedUrns,
      dateIndicativeOpens: fd.get("dateIndicativeOpens") || null,
      indicativePercent: fd.get("indicativePercent") ? Number(fd.get("indicativePercent")) / 100 : null,
      membershipAtIndicative: fd.get("membershipAtIndicative") ? Number(fd.get("membershipAtIndicative")) : null,
      formalBallotPercent: fd.get("formalBallotPercent") ? Number(fd.get("formalBallotPercent")) / 100 : null,
      dateOfResolution: fd.get("dateOfResolution") || null,
      outcome: fd.get("outcome") || null,
      totalStrikeDays: Number(fd.get("totalStrikeDays")) || 0,
      resolvedPriorToAction: fd.get("resolvedPriorToAction") || "No",
      tradeDisputeLetter: (fd.get("tradeDisputeLetter") || "").trim(),
      formalBallotRequest: (fd.get("formalBallotRequest") || "").trim(),
      noticeOfFormalBallot: (fd.get("noticeOfFormalBallot") || "").trim(),
      noticeOfStrikeDates: (fd.get("noticeOfStrikeDates") || "").trim(),
      endOfDisputeReport: (fd.get("endOfDisputeReport") || "").trim(),
    };
    if (record.urns.length === 0) {
      // Required, but it isn't a native form control so reportValidity can't
      // catch it — say so where the field is rather than failing silently.
      pickerEl.scrollIntoView({ block: "center" });
      pickerEl.classList.add("has-error");
      return;
    }
    if (existing) {
      await updateDispute(existing.id, record);
    } else {
      await addDispute(record);
    }
    navigate("/disputes");
  });
}
