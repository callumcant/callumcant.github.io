import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml } from "../ui.js";
import { renderQuadrant } from "../ui/quadrant.js";
import { renderSearchSelect } from "../ui/search-select.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);

  container.innerHTML = `
    <div class="topbar"><h1>MATs</h1></div>
    <div class="card"><div id="mat-search"></div></div>
  `;

  const items = [...mats]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      name: `${m.name}${m.isTargetMat ? " ⭐" : ""}`,
      summary: `${formatNumber(m.schoolCount)} schools · ${m.boroughsPresent.length} ${m.boroughsPresent.length === 1 ? "borough" : "boroughs"} · ${formatNumber(m.membersTotal)} members · ${formatPercent(m.densityTotal)} density`,
      href: `#/mats/${encodeURIComponent(m.name)}`,
      featured: m.isTargetMat,
    }));

  renderSearchSelect(container.querySelector("#mat-search"), items, {
    label: "Search MATs",
    placeholder: "Search MATs",
    defaultLabel: "Target MATs",
  });
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
      <div class="tile"><div class="tile-label">Workforce</div><div class="tile-value">${formatNumber(mat.headcountTotal)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(mat.membersTotal)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(mat.densityTotal)}</div></div>
      <div class="tile"><div class="tile-label">Density (teachers)</div><div class="tile-value">${formatPercent(mat.densityTeachers)}</div></div>
      <div class="tile"><div class="tile-label">Density (leadership)</div><div class="tile-value">${formatPercent(mat.densityLeadership)}</div></div>
      <div class="tile"><div class="tile-label">Density (support)</div><div class="tile-value">${formatPercent(mat.densitySupport)}</div></div>
      <div class="tile"><div class="tile-label">Rep coverage</div><div class="tile-value">${formatPercent(mat.repCoveragePercent)}</div></div>
      <div class="tile"><div class="tile-label">Member:rep ratio</div><div class="tile-value">${mat.memberRepRatio}</div></div>
      <div class="tile"><div class="tile-label">No-rep schools</div><div class="tile-value">${mat.noRepSchools}</div></div>
      <div class="tile"><div class="tile-label">Members in no-rep schools</div><div class="tile-value">${formatNumber(mat.membersInNoRepSchools)}</div></div>
      <div class="tile"><div class="tile-label">Rep committee exists?</div><div class="tile-value">${mat.repCommitteeExists ? "Yes" : "No"}</div></div>
    </div>

    <div class="section-title">Organising quadrant</div>
    <div class="card"><div id="mat-quadrant"></div></div>

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
      <div class="btn-row">
        <a class="btn" href="#/notes/new?level=MAT&subject=${encodeURIComponent(name)}">+ Add note</a>
        ${notes.length ? `<a class="btn" href="#/notes?level=MAT&subject=${encodeURIComponent(name)}">View in notes</a>` : ""}
      </div>
    </div>
  `;

  renderQuadrant(container.querySelector("#mat-quadrant"), mat.schools, {
    title: `${mat.name} organising quadrant`,
  });

  renderDataTable(
    container.querySelector("#mat-schools-table"),
    [
      { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
      { key: "laName", label: "Borough" },
      { key: "membersTotal", label: "Members", num: true, render: (r) => formatNumber(r.membersTotal) },
      { key: "densityTotal", label: "Density", num: true, render: (r) => formatPercent(r.densityTotal) },
      { key: "turnout2026", label: "2026 turnout", num: true, render: (r) => formatPercent(r.turnout2026) },
      { key: "repCount", label: "Reps", num: true },
    ],
    mat.schools,
    { defaultSort: "membersTotal", defaultDir: "desc" }
  );
}
