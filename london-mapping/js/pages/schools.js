import { loadAll, addMeeting, addRepRecruited, removeEventLog } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import {
  renderDataTable, renderColumnControls, loadColumnPrefs, saveColumnPrefs,
  downloadCsv, showToast, openMicroForm, formatNumber, formatPercent, formatDate,
  escapeHtml,
} from "../ui.js";
import { getSignedInName } from "../auth.js";
import { quadrantBadge } from "../ui/quadrant.js";

const PREFS_KEY = "london-mapping:schools:columns";

// The latest note's title, linked to the filtered notes view, with the count
// alongside when there's more than one so the extra notes aren't hidden by
// showing only the newest. Exported because it was shared with the branch and
// MAT list tables; those are now search boxes, so today only this table uses
// it — kept exported for the next list view that needs the same cell.
export function noteLinkCell(row, level, subject) {
  if (!row.noteCount) return `<span class="muted-cell">—</span>`;
  const href = `#/notes?level=${level}&subject=${encodeURIComponent(subject)}`;
  const more = row.noteCount > 1 ? ` <span class="note-count">+${row.noteCount - 1}</span>` : "";
  return `<a class="row-link" href="${href}">${escapeHtml(row.latestNoteTitle || "(untitled note)")}</a>${more}`;
}

// Every column the original School-level tab carried (columns H–AN), plus the
// activity the app now derives itself. The view decides what to show; nothing
// is dropped from the data.
//
// `csv` overrides the exported value where the on-screen render is HTML or a
// formatted string — the export should carry raw data, not markup.
function schoolColumns() {
  return [
    { key: "schoolName", label: "School", always: true,
      render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
    { key: "phase", label: "Phase" },
    { key: "laName", label: "Borough" },
    { key: "trust", label: "MAT", render: (r) => escapeHtml(r.trust || "—") },
    { key: "urn", label: "URN", num: true, render: (r) => String(r.urn) },
    { key: "postcode", label: "Postcode" },
    { key: "typeOfEstablishment", label: "Establishment type" },
    { key: "establishmentStatus", label: "Status" },
    { key: "religiousCharacter", label: "Religious character" },
    { key: "diocese", label: "Diocese" },
    { key: "schoolSponsors", label: "Sponsors" },
    { key: "federations", label: "Federations" },
    { key: "schoolWebsite", label: "Website",
      render: (r) => r.schoolWebsite
        ? `<a href="${escapeHtml(/^https?:/.test(r.schoolWebsite) ? r.schoolWebsite : "https://" + r.schoolWebsite)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.schoolWebsite)}</a>`
        : "—" },
    { key: "telephoneNum", label: "Telephone" },
    { key: "headName", label: "Headteacher" },
    { key: "branchName", label: "NEU branch" },
    { key: "districtName", label: "NEU district" },
    { key: "regionName", label: "NEU region" },

    { key: "schoolType", label: "School type" },
    { key: "headcountTotal", label: "Headcount", num: true, render: (r) => formatNumber(r.headcountTotal) },
    { key: "headcountTeachers", label: "Headcount (teachers)", num: true, render: (r) => formatNumber(r.headcountTeachers) },
    { key: "headcountLeadership", label: "Headcount (leadership)", num: true, render: (r) => formatNumber(r.headcountLeadership) },
    { key: "headcountSupport", label: "Headcount (support)", num: true, render: (r) => formatNumber(r.headcountSupport) },
    { key: "headcountThirdParty", label: "Headcount (third party)", num: true, render: (r) => formatNumber(r.headcountThirdParty) },
    { key: "annualTurnover", label: "Annual turnover", num: true, render: (r) => formatPercent(r.annualTurnover) },
    { key: "pupilTeacherRatio", label: "Pupil:teacher ratio", num: true, render: (r) => (r.pupilTeacherRatio ?? "–") },
    { key: "averageMeanPay", label: "Average mean pay", num: true, render: (r) => formatNumber(r.averageMeanPay) },
    { key: "vacancies", label: "Vacancies", num: true, render: (r) => formatNumber(r.vacancies) },
    { key: "averageSickDays", label: "Average sick days", num: true, render: (r) => (r.averageSickDays ?? "–") },

    { key: "membersTotal", label: "Members", num: true, render: (r) => formatNumber(r.membersTotal) },
    { key: "membersTeachers", label: "Members (teachers)", num: true, render: (r) => formatNumber(r.membersTeachers) },
    { key: "membersLeadership", label: "Members (leadership)", num: true, render: (r) => formatNumber(r.membersLeadership) },
    { key: "membersSupport", label: "Members (support)", num: true, render: (r) => formatNumber(r.membersSupport) },
    { key: "densityTotal", label: "Density", num: true, render: (r) => formatPercent(r.densityTotal),
      csv: (r) => (r.densityTotal == null ? "" : r.densityTotal.toFixed(4)) },
    { key: "densityTeachers", label: "Density (teachers)", num: true, render: (r) => formatPercent(r.densityTeachers),
      csv: (r) => (r.densityTeachers == null ? "" : r.densityTeachers.toFixed(4)) },
    { key: "densityLeadership", label: "Density (leadership)", num: true, render: (r) => formatPercent(r.densityLeadership),
      csv: (r) => (r.densityLeadership == null ? "" : r.densityLeadership.toFixed(4)) },
    { key: "densitySupport", label: "Density (support)", num: true, render: (r) => formatPercent(r.densitySupport),
      csv: (r) => (r.densitySupport == null ? "" : r.densitySupport.toFixed(4)) },
    { key: "membersVoted2026", label: "Voted 2026", num: true, render: (r) => formatNumber(r.membersVoted2026) },
    { key: "membersVoted2025", label: "Voted 2025", num: true, render: (r) => formatNumber(r.membersVoted2025) },
    { key: "membersVoted2024", label: "Voted 2024", num: true, render: (r) => formatNumber(r.membersVoted2024) },
    { key: "turnout2026", label: "Turnout 2026", num: true, render: (r) => formatPercent(r.turnout2026),
      csv: (r) => (r.turnout2026 == null ? "" : r.turnout2026.toFixed(4)) },

    { key: "repCount", label: "Reps", num: true },
    { key: "volunteers", label: "Volunteers", num: true },
    { key: "wpConversations", label: "WP conversations", num: true },
    { key: "repRecruitedVolunteer", label: "Rep recruited volunteer", num: true },
    { key: "joinedCommunity", label: "Joined community", num: true },
    { key: "completedActivateAction", label: "Completed activate action", num: true },
    { key: "agreedToBriefing", label: "Agreed to briefing", num: true },
    { key: "holdAMeeting", label: "Hold a meeting", num: true },
    { key: "needsSupport", label: "Needs support", num: true },
    { key: "pledgedToVote", label: "Pledged to vote", num: true },
    { key: "activeSEVs", label: "Active SEVs", num: true },

    { key: "meetingsLogged", label: "Meetings logged", num: true },
    { key: "repsRecruitedLogged", label: "Reps recruited", num: true },
    // The note's title is the useful link text; a bare count told you nothing
    // about whether the note was worth opening.
    { key: "latestNoteTitle", label: "Latest note", wrap: true,
      sortValue: (r) => r.lastNoteDate,
      render: (r) => noteLinkCell(r, "School", r.urn),
      csv: (r) => r.latestNoteTitle || "" },
    { key: "noteCount", label: "Note count", num: true },
    { key: "lastNoteDate", label: "Last note date", render: (r) => formatDate(r.lastNoteDate),
      csv: (r) => r.lastNoteDate || "" },
  ];
}

const DEFAULT_KEYS = [
  "schoolName", "phase", "laName", "trust", "membersTotal", "densityTotal",
  "densityTeachers", "densitySupport", "repCount", "latestNoteTitle",
];

const PRESETS = {
  essentials: { label: "Essentials", keys: DEFAULT_KEYS },
  membership: {
    label: "Membership & ballots",
    keys: ["schoolName", "phase", "laName", "membersTotal", "membersTeachers",
           "membersLeadership", "membersSupport", "densityTotal", "densityTeachers",
           "densityLeadership", "densitySupport", "membersVoted2026", "turnout2026",
           "membersVoted2025", "membersVoted2024"],
  },
  organising: {
    label: "Organising",
    keys: ["schoolName", "laName", "repCount", "volunteers", "wpConversations",
           "repRecruitedVolunteer", "joinedCommunity", "completedActivateAction",
           "agreedToBriefing", "holdAMeeting", "needsSupport", "pledgedToVote",
           "activeSEVs", "meetingsLogged", "repsRecruitedLogged"],
  },
  workforce: {
    label: "Workforce",
    keys: ["schoolName", "laName", "schoolType", "headcountTotal", "headcountTeachers",
           "headcountLeadership", "headcountSupport", "headcountThirdParty",
           "annualTurnover", "pupilTeacherRatio", "averageMeanPay", "vacancies",
           "averageSickDays"],
  },
  details: {
    label: "School details",
    keys: ["schoolName", "urn", "postcode", "typeOfEstablishment", "establishmentStatus",
           "religiousCharacter", "diocese", "trust", "schoolSponsors", "federations",
           "schoolWebsite", "telephoneNum", "headName", "branchName", "districtName",
           "regionName"],
  },
  everything: { label: "Everything", keys: null },
};

const PICKER_GROUPS = [
  { label: "Identity", keys: ["schoolName", "phase", "laName", "trust", "urn", "postcode"] },
  { label: "School details", keys: ["typeOfEstablishment", "establishmentStatus", "religiousCharacter", "diocese", "schoolSponsors", "federations", "schoolWebsite", "telephoneNum", "headName", "branchName", "districtName", "regionName"] },
  { label: "Headcount (Stratum)", keys: ["schoolType", "headcountTotal", "headcountTeachers", "headcountLeadership", "headcountSupport"] },
  { label: "Workforce survey", keys: ["headcountThirdParty", "annualTurnover", "pupilTeacherRatio", "averageMeanPay", "vacancies", "averageSickDays"] },
  { label: "Membership & density", keys: ["membersTotal", "membersTeachers", "membersLeadership", "membersSupport", "densityTotal", "densityTeachers", "densityLeadership", "densitySupport"] },
  { label: "Ballots", keys: ["membersVoted2026", "turnout2026", "membersVoted2025", "membersVoted2024"] },
  { label: "Organising engagement", keys: ["repCount", "volunteers", "wpConversations", "repRecruitedVolunteer", "joinedCommunity", "completedActivateAction", "agreedToBriefing", "holdAMeeting", "needsSupport", "pledgedToVote", "activeSEVs"] },
  { label: "Activity", keys: ["meetingsLogged", "repsRecruitedLogged", "latestNoteTitle", "noteCount", "lastNoteDate"] },
];

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const columns = schoolColumns();
  const branches = [...new Set(schools.map((s) => s.laName))].sort();
  const trusts = [...new Set(schools.map((s) => s.trust).filter(Boolean))].sort();
  const phases = [...new Set(schools.map((s) => s.phase).filter(Boolean))].sort();

  let visibleKeys = loadColumnPrefs(PREFS_KEY, DEFAULT_KEYS);

  container.innerHTML = `
    <div class="topbar">
      <h1>Schools</h1>
      <button class="btn" id="export-csv">Export CSV</button>
    </div>
    <div class="filter-bar">
      <input type="search" id="school-search" placeholder="Search name, URN or postcode" />
      <select id="school-branch-filter">
        <option value="">All branches</option>
        ${branches.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
      </select>
      <select id="school-phase-filter">
        <option value="">All phases</option>
        ${phases.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
      </select>
      <select id="school-trust-filter">
        <option value="">All MATs</option>
        ${trusts.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
      </select>
      <select id="school-rep-filter">
        <option value="">All schools</option>
        <option value="no-rep">No rep only</option>
      </select>
    </div>
    <div id="column-controls"></div>
    <div class="card"><div id="schools-table"></div></div>
    <div class="result-count" id="result-count"></div>
  `;

  const searchEl = container.querySelector("#school-search");
  const branchEl = container.querySelector("#school-branch-filter");
  const phaseEl = container.querySelector("#school-phase-filter");
  const trustEl = container.querySelector("#school-trust-filter");
  const repEl = container.querySelector("#school-rep-filter");
  const tableEl = container.querySelector("#schools-table");
  const countEl = container.querySelector("#result-count");
  const controlsEl = container.querySelector("#column-controls");

  function currentRows() {
    const q = searchEl.value.trim().toLowerCase();
    return schools.filter((s) => {
      if (q && !`${s.schoolName} ${s.urn} ${s.postcode}`.toLowerCase().includes(q)) return false;
      if (branchEl.value && s.laName !== branchEl.value) return false;
      if (phaseEl.value && s.phase !== phaseEl.value) return false;
      if (trustEl.value && s.trust !== trustEl.value) return false;
      if (repEl.value === "no-rep" && s.repCount !== 0) return false;
      return true;
    });
  }

  function drawControls() {
    renderColumnControls(controlsEl, {
      columns, groups: PICKER_GROUPS, presets: PRESETS, visibleKeys,
      onChange: (next) => {
        visibleKeys = next;
        saveColumnPrefs(PREFS_KEY, visibleKeys);
        drawControls();
        drawTable();
      },
    });
  }

  function drawTable() {
    const rows = currentRows();
    renderDataTable(tableEl, columns, rows, {
      visibleKeys,
      stickyFirst: true,
      defaultSort: "schoolName",
      defaultDir: "asc",
    });
    countEl.textContent = `${rows.length} of ${schools.length} schools · ${visibleKeys.size} columns`;
  }

  [searchEl, branchEl, phaseEl, trustEl, repEl].forEach((el) =>
    el.addEventListener("input", drawTable)
  );

  container.querySelector("#export-csv").addEventListener("click", () => {
    const visible = columns.filter((c) => visibleKeys.has(c.key));
    downloadCsv(`schools-${new Date().toISOString().slice(0, 10)}.csv`, visible, currentRows());
  });

  drawControls();
  drawTable();
}

function statRow(label, value) {
  return `<div class="stat-row"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

export async function renderDetail(container, { urn }) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const school = schools.find((s) => String(s.urn) === String(urn));

  if (!school) {
    container.innerHTML = `<div class="empty-state">School URN ${escapeHtml(urn)} not found.</div>`;
    return;
  }

  const notes = state.fieldNotes
    .filter((n) => n.level === "School" && String(n.subject) === String(urn))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const meetings = state.meetings.filter((m) => String(m.urn) === String(urn))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const recruited = state.repsRecruited.filter((r) => String(r.urn) === String(urn))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const websiteHref = school.schoolWebsite
    ? (/^https?:/.test(school.schoolWebsite) ? school.schoolWebsite : "https://" + school.schoolWebsite)
    : null;

  // Where this school sits on the organising quadrant, and against whom.
  // The branch is the default comparison; a target MAT gets its own badge
  // rather than one silently overriding the other, because the two medians
  // are computed over different sets and can genuinely disagree.
  const isTargetMat = !!school.trust
    && state.matFacts.some((f) => f.mat === school.trust && f.isTargetMat);
  const badges = [
    quadrantBadge(school, schools.filter((s) => s.laName === school.laName), {
      peerLabel: school.laName,
      href: `#/branches/${encodeURIComponent(school.laName)}`,
    }),
    isTargetMat
      ? quadrantBadge(school, schools.filter((s) => s.trust === school.trust), {
          peerLabel: school.trust,
          href: `#/mats/${encodeURIComponent(school.trust)}`,
        })
      : "",
  ].filter(Boolean).join("");

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/schools">← Schools</a></div>
    <div class="topbar">
      <h1>${escapeHtml(school.schoolName)}</h1>
      <div class="as-of">URN ${school.urn} · ${escapeHtml(school.postcode)}</div>
    </div>
    <div class="detail-meta">
      ${escapeHtml(school.phase)} · <a href="#/branches/${encodeURIComponent(school.laName)}">${escapeHtml(school.laName)}</a>
      ${school.trust ? ` · <a href="#/mats/${encodeURIComponent(school.trust)}">${escapeHtml(school.trust)}</a>` : " · LA maintained / no MAT"}
      ${school.repCount === 0 ? ` · <span class="pill rag-amber">No rep</span>` : ""}
    </div>

    <div class="quadrant-badges">${badges}</div>

    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-primary" id="log-meeting">+ Log meeting</button>
      <button class="btn" id="log-rep">+ Log rep recruited</button>
      <a class="btn" href="#/notes/new?level=School&subject=${school.urn}">+ Add note</a>
    </div>

    <div class="section-title">Activity log</div>
    <div class="card">
      ${meetings.length === 0 && recruited.length === 0
        ? `<div class="empty-state">Nothing logged for this school yet.</div>`
        : `<dl class="stat-list">
            ${meetings.map((m) => statRow("Meeting", formatDate(m.date) + (m.loggedBy ? ` · ${escapeHtml(m.loggedBy)}` : ""))).join("")}
            ${recruited.map((r) => statRow("Rep recruited", `${escapeHtml(r.repName || "(name not recorded)")} — ${formatDate(r.date)}` + (r.loggedBy ? ` · logged by ${escapeHtml(r.loggedBy)}` : ""))).join("")}
          </dl>`}
    </div>

    <div class="section-title">Field notes</div>
    <div class="card">
      ${notes.length === 0 ? `<div class="empty-state">No notes for this school yet.</div>` : notes.map((n) => `
        <div class="note-card">
          <strong>${escapeHtml(n.title)}</strong>
          <div>${escapeHtml(n.note)}</div>
          <div class="note-meta">${formatDate(n.date)} · ${escapeHtml(n.author)}</div>
        </div>`).join("")}
      <div class="btn-row">
        <a class="btn" href="#/notes/new?level=School&subject=${school.urn}">+ Add note</a>
        ${notes.length ? `<a class="btn" href="#/notes?level=School&subject=${school.urn}">View in notes</a>` : ""}
      </div>
    </div>
    <div class="section-title">Headline</div>
    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Headcount</div><div class="tile-value">${formatNumber(school.headcountTotal)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(school.membersTotal)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(school.densityTotal)}</div></div>
      <div class="tile"><div class="tile-label">Density (teachers)</div><div class="tile-value">${formatPercent(school.densityTeachers)}</div></div>
      <div class="tile"><div class="tile-label">Density (support)</div><div class="tile-value">${formatPercent(school.densitySupport)}</div></div>
      <div class="tile"><div class="tile-label">Reps</div><div class="tile-value">${school.repCount}</div></div>
      <div class="tile"><div class="tile-label">Meetings logged</div><div class="tile-value">${school.meetingsLogged}</div></div>
      <div class="tile"><div class="tile-label">Reps recruited</div><div class="tile-value">${school.repsRecruitedLogged}</div></div>
    </div>

    <div class="section-title">Headcount, membership &amp; density (Stratum)</div>
    <div class="card"><dl class="stat-list">
      ${statRow("Headcount — total", formatNumber(school.headcountTotal))}
      ${statRow("Headcount — teachers", formatNumber(school.headcountTeachers))}
      ${statRow("Headcount — leadership", formatNumber(school.headcountLeadership))}
      ${statRow("Headcount — support", formatNumber(school.headcountSupport))}
      ${statRow("Members — total", formatNumber(school.membersTotal))}
      ${statRow("Members — teachers", formatNumber(school.membersTeachers))}
      ${statRow("Members — leadership", formatNumber(school.membersLeadership))}
      ${statRow("Members — support", formatNumber(school.membersSupport))}
      ${statRow("Density — total", formatPercent(school.densityTotal))}
      ${statRow("Density — teachers", formatPercent(school.densityTeachers))}
      ${statRow("Density — leadership", formatPercent(school.densityLeadership))}
      ${statRow("Density — support", formatPercent(school.densitySupport))}
      ${statRow("Stratum export date", formatDate(school.stratumExportDate))}
    </dl></div>

    <div class="section-title">Workforce survey</div>
    <div class="card"><dl class="stat-list">
      ${statRow("School type", escapeHtml(school.schoolType || "—"))}
      ${statRow("Headcount (third party)", formatNumber(school.headcountThirdParty))}
      ${statRow("Annual turnover", formatPercent(school.annualTurnover))}
      ${statRow("Pupil:teacher ratio (qualified)", school.pupilTeacherRatio ?? "–")}
      ${statRow("Average mean pay", formatNumber(school.averageMeanPay))}
      ${statRow("Vacancies", formatNumber(school.vacancies))}
      ${statRow("Average sick days", school.averageSickDays ?? "–")}
    </dl></div>

    <div class="section-title">Ballots</div>
    <div class="card"><dl class="stat-list">
      ${statRow("Members voted — 2026 indicative", formatNumber(school.membersVoted2026))}
      ${statRow("Turnout — 2026 indicative", formatPercent(school.turnout2026))}
      ${statRow("Members voted — 2025 indicative", formatNumber(school.membersVoted2025))}
      ${statRow("Members voted — 2024 indicative", formatNumber(school.membersVoted2024))}
    </dl></div>

    <div class="section-title">Organising engagement</div>
    <div class="card"><dl class="stat-list">
      ${statRow("Reps", formatNumber(school.repCount))}
      ${statRow("Volunteers", formatNumber(school.volunteers))}
      ${statRow("Workplace conversations", formatNumber(school.wpConversations))}
      ${statRow("Rep recruited volunteer", formatNumber(school.repRecruitedVolunteer))}
      ${statRow("Joined community", formatNumber(school.joinedCommunity))}
      ${statRow("Completed activate action", formatNumber(school.completedActivateAction))}
      ${statRow("Agreed to briefing", formatNumber(school.agreedToBriefing))}
      ${statRow("Hold a meeting", formatNumber(school.holdAMeeting))}
      ${statRow("Needs support", formatNumber(school.needsSupport))}
      ${statRow("Pledged to vote", formatNumber(school.pledgedToVote))}
      ${statRow("Active SEVs", formatNumber(school.activeSEVs))}
    </dl></div>

    <div class="section-title">School details</div>
    <div class="card"><dl class="stat-list">
      ${statRow("URN", String(school.urn))}
      ${statRow("Establishment type", escapeHtml(school.typeOfEstablishment || "—"))}
      ${statRow("Status", escapeHtml(school.establishmentStatus || "—"))}
      ${statRow("Phase", escapeHtml(school.phase || "—"))}
      ${statRow("Religious character", escapeHtml(school.religiousCharacter || "—"))}
      ${statRow("Diocese", escapeHtml(school.diocese || "—"))}
      ${statRow("Trust / MAT", escapeHtml(school.trust || "—"))}
      ${statRow("Sponsors", escapeHtml(school.schoolSponsors || "—"))}
      ${statRow("Federations", escapeHtml(school.federations || "—"))}
      ${statRow("Postcode", escapeHtml(school.postcode || "—"))}
      ${statRow("Website", websiteHref ? `<a href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(school.schoolWebsite)}</a>` : "—")}
      ${statRow("Telephone", escapeHtml(school.telephoneNum || "—"))}
      ${statRow("Headteacher", escapeHtml(school.headName || "—"))}
      ${statRow("NEU branch", escapeHtml(school.branchName || "—"))}
      ${statRow("NEU district", escapeHtml(school.districtName || "—"))}
      ${statRow("NEU region", escapeHtml(school.regionName || "—"))}
      ${statRow("Membership data imported", formatDate(school.importDate))}
    </dl></div>

  `;

  // Logging opens a small form rather than writing on a single click: a
  // stray click was close enough to a valid entry to end up in the workbook.
  // Date is pre-filled with today so the common case is still one keystroke.
  const today = new Date().toISOString().slice(0, 10);

  async function afterLog(kind, record, label) {
    showToast(label, {
      actionLabel: "Undo",
      onAction: async () => {
        await removeEventLog(
          kind === "meeting" ? "Meetings" : "RepsRecruited",
          kind === "meeting" ? "meetings" : "repsRecruited",
          record.id
        );
        renderDetail(container, { urn });
      },
    });
    renderDetail(container, { urn });
  }

  container.querySelector("#log-meeting").addEventListener("click", () => {
    openMicroForm({
      title: `Log a meeting — ${school.schoolName}`,
      submitLabel: "Log meeting",
      fields: [{ name: "date", label: "Date of meeting", type: "date", required: true, value: today }],
      onSubmit: async ({ date }) => {
        const loggedBy = await getSignedInName();
        const record = await addMeeting({ date, urn: school.urn, loggedBy });
        afterLog("meeting", record, `Meeting logged for ${school.schoolName}`);
      },
    });
  });

  container.querySelector("#log-rep").addEventListener("click", () => {
    openMicroForm({
      title: `Log a rep recruited — ${school.schoolName}`,
      submitLabel: "Log rep",
      fields: [
        { name: "repName", label: "Rep's name", type: "text", required: true, placeholder: "e.g. Dana Whitlock" },
        { name: "date", label: "Date recruited", type: "date", required: true, value: today },
      ],
      onSubmit: async ({ repName, date }) => {
        const loggedBy = await getSignedInName();
        const record = await addRepRecruited({ date, urn: school.urn, repName: repName.trim(), loggedBy });
        afterLog("rep", record, `${repName.trim()} logged as a new rep at ${school.schoolName}`);
      },
    });
  });
}
