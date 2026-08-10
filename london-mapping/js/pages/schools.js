import { loadAll } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml } from "../ui.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const branches = [...new Set(schools.map((s) => s.laName))].sort();
  const trusts = [...new Set(schools.map((s) => s.trust).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="topbar"><h1>Schools</h1></div>
    <div class="filter-bar">
      <input type="search" id="school-search" placeholder="Search by name, URN or postcode" />
      <select id="school-branch-filter">
        <option value="">All branches</option>
        ${branches.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
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
    <div class="card"><div id="schools-table"></div></div>
  `;

  const searchEl = container.querySelector("#school-search");
  const branchEl = container.querySelector("#school-branch-filter");
  const trustEl = container.querySelector("#school-trust-filter");
  const repEl = container.querySelector("#school-rep-filter");
  const tableEl = container.querySelector("#schools-table");

  const columns = [
    { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
    { key: "laName", label: "Borough" },
    { key: "trust", label: "MAT", render: (r) => escapeHtml(r.trust || "—") },
    { key: "overallMembers", label: "Members", num: true, render: (r) => formatNumber(r.overallMembers) },
    { key: "density", label: "Density", num: true, render: (r) => formatPercent(r.density) },
    { key: "repCount", label: "Reps", num: true },
    { key: "noteCount", label: "Notes", num: true },
  ];

  function applyFilters() {
    const q = searchEl.value.trim().toLowerCase();
    const branch = branchEl.value;
    const trust = trustEl.value;
    const repFilter = repEl.value;

    const filtered = schools.filter((s) => {
      if (q && !`${s.schoolName} ${s.urn} ${s.postcode}`.toLowerCase().includes(q)) return false;
      if (branch && s.laName !== branch) return false;
      if (trust && s.trust !== trust) return false;
      if (repFilter === "no-rep" && s.repCount !== 0) return false;
      return true;
    });
    renderDataTable(tableEl, columns, filtered, { defaultSort: "schoolName", defaultDir: "asc" });
  }

  [searchEl, branchEl, trustEl, repEl].forEach((el) => el.addEventListener("input", applyFilters));
  applyFilters();
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

    <div class="section-title">Workforce &amp; membership</div>
    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Workforce</div><div class="tile-value">${formatNumber(school.hcWorkforce)}</div></div>
      <div class="tile"><div class="tile-label">Teachers</div><div class="tile-value">${formatNumber(school.hcAllTeachers)}</div></div>
      <div class="tile"><div class="tile-label">Support staff</div><div class="tile-value">${formatNumber(school.hcAllSupportStaff)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(school.overallMembers)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(school.density)}</div></div>
      <div class="tile"><div class="tile-label">Reps</div><div class="tile-value">${school.repCount}</div></div>
    </div>

    <div class="section-title">Organising activity</div>
    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Volunteers</div><div class="tile-value">${formatNumber(school.volunteers)}</div></div>
      <div class="tile"><div class="tile-label">Workplace conversations</div><div class="tile-value">${formatNumber(school.wpConversations)}</div></div>
      <div class="tile"><div class="tile-label">Pledged to vote</div><div class="tile-value">${formatNumber(school.pledgedToVote)}</div></div>
      <div class="tile"><div class="tile-label">Held a meeting?</div><div class="tile-value">${school.holdAMeeting ? "Yes" : "No"}</div></div>
      <div class="tile"><div class="tile-label">Needs support?</div><div class="tile-value">${school.needsSupport ? "Yes" : "No"}</div></div>
      <div class="tile"><div class="tile-label">2025 indicative turnout</div><div class="tile-value">${formatPercent(school.indicativeVoted2025)}</div></div>
      <div class="tile"><div class="tile-label">2024 indicative turnout</div><div class="tile-value">${formatPercent(school.indicativeVoted2024)}</div></div>
    </div>

    <div class="section-title">Field notes</div>
    <div class="card">
      ${notes.length === 0 ? `<div class="empty-state">No notes for this school yet.</div>` : notes.map((n) => `
        <div class="note-card">
          <strong>${escapeHtml(n.title)}</strong>
          <div>${escapeHtml(n.note)}</div>
          <div class="note-meta">${formatDate(n.date)} · ${escapeHtml(n.author)}</div>
        </div>`).join("")}
      <div class="btn-row"><a class="btn" href="#/notes/new?level=School&subject=${school.urn}">+ Add note</a></div>
    </div>
  `;
}
