import { loadAll, addMeeting, addRepRecruited, removeEventLog } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import {
  renderDataTable, renderColumnControls, loadColumnPrefs, saveColumnPrefs,
  downloadCsv, showToast, formatNumber, formatPercent, formatDate, escapeHtml,
} from "../ui.js";
import { getSignedInName } from "../auth.js";

const PREFS_KEY = "london-mapping:schools:columns";

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
    { key: "hcWorkforce", label: "Workforce", num: true, render: (r) => formatNumber(r.hcWorkforce) },
    { key: "hcAllTeachers", label: "All teachers", num: true, render: (r) => formatNumber(r.hcAllTeachers) },
    { key: "hcClassroomTeachers", label: "Classroom teachers", num: true, render: (r) => formatNumber(r.hcClassroomTeachers) },
    { key: "hcLeadershipTeachers", label: "Leadership teachers", num: true, render: (r) => formatNumber(r.hcLeadershipTeachers) },
    { key: "hcAllSupportStaff", label: "Support staff", num: true, render: (r) => formatNumber(r.hcAllSupportStaff) },
    { key: "hcTeachingAssistants", label: "Teaching assistants", num: true, render: (r) => formatNumber(r.hcTeachingAssistants) },

    { key: "overallMembers", label: "Members", num: true, render: (r) => formatNumber(r.overallMembers) },
    { key: "density", label: "Density", num: true, render: (r) => formatPercent(r.density),
      csv: (r) => (r.density == null ? "" : r.density.toFixed(4)) },
    { key: "voted", label: "Voted", num: true, render: (r) => formatNumber(r.voted) },
    { key: "turnout", label: "Turnout", num: true, render: (r) => formatPercent(r.turnout),
      csv: (r) => (r.turnout == null ? "" : r.turnout.toFixed(4)) },
    { key: "indicativeVoted2025", label: "2025 indicative", num: true, render: (r) => formatPercent(r.indicativeVoted2025),
      csv: (r) => (r.indicativeVoted2025 == null ? "" : r.indicativeVoted2025.toFixed(4)) },
    { key: "indicativeVoted2024", label: "2024 indicative", num: true, render: (r) => formatPercent(r.indicativeVoted2024),
      csv: (r) => (r.indicativeVoted2024 == null ? "" : r.indicativeVoted2024.toFixed(4)) },

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
    { key: "noteCount", label: "Notes", num: true,
      render: (r) => r.noteCount
        ? `<a class="row-link" href="#/notes?level=School&subject=${r.urn}">${r.noteCount}</a>`
        : "0" },
    { key: "lastNoteDate", label: "Last note", render: (r) => formatDate(r.lastNoteDate),
      csv: (r) => r.lastNoteDate || "" },
  ];
}

const DEFAULT_KEYS = [
  "schoolName", "phase", "laName", "trust", "overallMembers", "density",
  "repCount", "noteCount",
];

const PRESETS = {
  essentials: { label: "Essentials", keys: DEFAULT_KEYS },
  membership: {
    label: "Membership & ballots",
    keys: ["schoolName", "phase", "laName", "overallMembers", "density", "voted",
           "turnout", "indicativeVoted2025", "indicativeVoted2024"],
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
    keys: ["schoolName", "laName", "schoolType", "hcWorkforce", "hcAllTeachers",
           "hcClassroomTeachers", "hcLeadershipTeachers", "hcAllSupportStaff",
           "hcTeachingAssistants"],
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
  { label: "Workforce", keys: ["schoolType", "hcWorkforce", "hcAllTeachers", "hcClassroomTeachers", "hcLeadershipTeachers", "hcAllSupportStaff", "hcTeachingAssistants"] },
  { label: "Membership & ballots", keys: ["overallMembers", "density", "voted", "turnout", "indicativeVoted2025", "indicativeVoted2024"] },
  { label: "Organising engagement", keys: ["repCount", "volunteers", "wpConversations", "repRecruitedVolunteer", "joinedCommunity", "completedActivateAction", "agreedToBriefing", "holdAMeeting", "needsSupport", "pledgedToVote", "activeSEVs"] },
  { label: "Activity", keys: ["meetingsLogged", "repsRecruitedLogged", "noteCount", "lastNoteDate"] },
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

    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-primary" id="log-meeting">+ Log meeting</button>
      <button class="btn" id="log-rep">+ Log rep recruited</button>
      <a class="btn" href="#/notes/new?level=School&subject=${school.urn}">+ Add note</a>
    </div>

    <div class="section-title">Headline</div>
    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Workforce</div><div class="tile-value">${formatNumber(school.hcWorkforce)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(school.overallMembers)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(school.density)}</div></div>
      <div class="tile"><div class="tile-label">Reps</div><div class="tile-value">${school.repCount}</div></div>
      <div class="tile"><div class="tile-label">Meetings logged</div><div class="tile-value">${school.meetingsLogged}</div></div>
      <div class="tile"><div class="tile-label">Reps recruited</div><div class="tile-value">${school.repsRecruitedLogged}</div></div>
    </div>

    <div class="section-title">Workforce breakdown</div>
    <div class="card"><dl class="stat-list">
      ${statRow("School type", escapeHtml(school.schoolType || "—"))}
      ${statRow("Total workforce", formatNumber(school.hcWorkforce))}
      ${statRow("All teachers", formatNumber(school.hcAllTeachers))}
      ${statRow("Classroom teachers", formatNumber(school.hcClassroomTeachers))}
      ${statRow("Leadership teachers", formatNumber(school.hcLeadershipTeachers))}
      ${statRow("All support staff", formatNumber(school.hcAllSupportStaff))}
      ${statRow("Teaching assistants", formatNumber(school.hcTeachingAssistants))}
    </dl></div>

    <div class="section-title">Membership &amp; ballots</div>
    <div class="card"><dl class="stat-list">
      ${statRow("Overall members", formatNumber(school.overallMembers))}
      ${statRow("Density", formatPercent(school.density))}
      ${statRow("Voted", formatNumber(school.voted))}
      ${statRow("Turnout", formatPercent(school.turnout))}
      ${statRow("2025 indicative turnout", formatPercent(school.indicativeVoted2025))}
      ${statRow("2024 indicative turnout", formatPercent(school.indicativeVoted2024))}
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

    <div class="section-title">Activity log</div>
    <div class="card">
      ${meetings.length === 0 && recruited.length === 0
        ? `<div class="empty-state">Nothing logged for this school yet.</div>`
        : `<dl class="stat-list">
            ${meetings.map((m) => statRow("Meeting", formatDate(m.date) + (m.loggedBy ? ` · ${escapeHtml(m.loggedBy)}` : ""))).join("")}
            ${recruited.map((r) => statRow("Rep recruited", formatDate(r.date) + (r.loggedBy ? ` · ${escapeHtml(r.loggedBy)}` : ""))).join("")}
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
  `;

  // One-click logging: today's date and this school are implied by where the
  // button is, so there's no form. The undo in the toast is what makes that
  // safe — an accidental click is one click to reverse.
  async function quickLog(kind) {
    const today = new Date().toISOString().slice(0, 10);
    const loggedBy = await getSignedInName();
    const payload = { date: today, urn: school.urn, loggedBy };
    const record = kind === "meeting" ? await addMeeting(payload) : await addRepRecruited(payload);
    showToast(
      kind === "meeting"
        ? `Meeting logged for ${school.schoolName}`
        : `Rep recruited logged for ${school.schoolName}`,
      {
        actionLabel: "Undo",
        onAction: async () => {
          await removeEventLog(
            kind === "meeting" ? "Meetings" : "RepsRecruited",
            kind === "meeting" ? "meetings" : "repsRecruited",
            record.id
          );
          renderDetail(container, { urn });
        },
      }
    );
    renderDetail(container, { urn });
  }

  container.querySelector("#log-meeting").addEventListener("click", () => quickLog("meeting"));
  container.querySelector("#log-rep").addEventListener("click", () => quickLog("rep"));
}
