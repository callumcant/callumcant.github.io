import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml } from "../ui.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);

  container.innerHTML = `
    <div class="topbar"><h1>MATs</h1></div>
    <div class="card"><div id="mats-table"></div></div>
  `;

  renderDataTable(
    container.querySelector("#mats-table"),
    [
      { key: "name", label: "Trust", render: (r) => `<a class="row-link" href="#/mats/${encodeURIComponent(r.name)}">${escapeHtml(r.name)}${r.isTargetMat ? " ⭐" : ""}</a>` },
      { key: "schoolCount", label: "Schools", num: true },
      { key: "boroughsPresent", label: "Boroughs", render: (r) => escapeHtml(r.boroughsPresent.join(", ")) },
      { key: "totalStaffHeadcount", label: "Workforce", num: true, render: (r) => formatNumber(r.totalStaffHeadcount) },
      { key: "trustDensity", label: "Density", num: true, render: (r) => formatPercent(r.trustDensity) },
      { key: "repCoveragePercent", label: "Rep coverage", num: true, render: (r) => formatPercent(r.repCoveragePercent) },
      { key: "noRepSchools", label: "No-rep schools", num: true },
      { key: "repCommitteeExists", label: "Rep committee", render: (r) => (r.repCommitteeExists ? "Yes" : "No") },
    ],
    mats,
    { defaultSort: "totalMembers", defaultDir: "desc" }
  );
}

export async function renderDetail(container, { name }) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);
  const mat = mats.find((m) => m.name === name);

  if (!mat) {
    container.innerHTML = `<div class="empty-state">MAT "${escapeHtml(name)}" not found.</div>`;
    return;
  }

  const notes = state.fieldNotes
    .filter((n) => n.level === "MAT" && n.subject === name)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/mats">← MATs</a></div>
    <div class="topbar"><h1>${escapeHtml(mat.name)}${mat.isTargetMat ? " ⭐ Target MAT" : ""}</h1></div>

    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Schools</div><div class="tile-value">${mat.schoolCount}</div></div>
      <div class="tile"><div class="tile-label">Boroughs present</div><div class="tile-value text-value">${escapeHtml(mat.boroughsPresent.join(", "))}</div></div>
      <div class="tile"><div class="tile-label">Phases</div><div class="tile-value text-value">${escapeHtml(mat.phasesPresent.join(", "))}</div></div>
      <div class="tile"><div class="tile-label">Workforce</div><div class="tile-value">${formatNumber(mat.totalStaffHeadcount)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(mat.totalMembers)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(mat.trustDensity)}</div></div>
      <div class="tile"><div class="tile-label">Rep coverage</div><div class="tile-value">${formatPercent(mat.repCoveragePercent)}</div></div>
      <div class="tile"><div class="tile-label">Member:rep ratio</div><div class="tile-value">${mat.memberRepRatio}</div></div>
      <div class="tile"><div class="tile-label">No-rep schools</div><div class="tile-value">${mat.noRepSchools}</div></div>
      <div class="tile"><div class="tile-label">Members in no-rep schools</div><div class="tile-value">${formatNumber(mat.membersInNoRepSchools)}</div></div>
      <div class="tile"><div class="tile-label">Rep committee exists?</div><div class="tile-value">${mat.repCommitteeExists ? "Yes" : "No"}</div></div>
    </div>

    <div class="section-title">Schools in this trust</div>
    <div class="card"><div id="mat-schools-table"></div></div>

    <div class="section-title">Field notes</div>
    <div class="card">
      ${notes.length === 0 ? `<div class="empty-state">No notes for this MAT yet.</div>` : notes.map((n) => `
        <div class="note-card">
          <strong>${escapeHtml(n.title)}</strong>
          <div>${escapeHtml(n.note)}</div>
          <div class="note-meta">${formatDate(n.date)} · ${escapeHtml(n.author)}</div>
        </div>`).join("")}
      <div class="btn-row"><a class="btn" href="#/notes/new?level=MAT&subject=${encodeURIComponent(name)}">+ Add note</a></div>
    </div>
  `;

  renderDataTable(
    container.querySelector("#mat-schools-table"),
    [
      { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
      { key: "laName", label: "Borough" },
      { key: "overallMembers", label: "Members", num: true, render: (r) => formatNumber(r.overallMembers) },
      { key: "density", label: "Density", num: true, render: (r) => formatPercent(r.density) },
      { key: "turnout", label: "Indicative turnout", num: true, render: (r) => formatPercent(r.turnout) },
      { key: "repCount", label: "Reps", num: true },
    ],
    mat.schools,
    { defaultSort: "overallMembers", defaultDir: "desc" }
  );
}
