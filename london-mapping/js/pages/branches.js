import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildBranchLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml, downloadCsv, csvFilename, barCell } from "../ui.js";
import { renderQuadrant } from "../ui/quadrant.js";
import { renderSearchSelect } from "../ui/search-select.js";
import { levelHeaderHtml, headlineTiles, footerStat } from "../ui/level-header.js";
import { snapshotSeries, baselinePoint } from "../data/snapshots.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const branches = buildBranchLevel(schools, state);

  container.innerHTML = `
    <div class="topbar"><h1>Branches</h1></div>
    <div class="card"><div id="branch-search"></div></div>
  `;

  // Sorted so the starting list and any tie in the results read predictably.
  const items = [...branches]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => ({
      name: `${b.name}${b.isProjectBranch ? " ⭐" : ""}`,
      // Enough to confirm it's the right branch before clicking, and no more.
      summary: `${formatNumber(b.schoolsCount)} schools · ${formatNumber(b.membersTotal)} members · ${formatPercent(b.densityTotal)} density`,
      href: `#/branches/${encodeURIComponent(b.name)}`,
      featured: b.isProjectBranch,
    }));

  renderSearchSelect(container.querySelector("#branch-search"), items, {
    label: "Search branches",
    placeholder: "Search branches",
    defaultLabel: "Project branches",
  });
}

export async function renderDetail(container, { name }) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const branches = buildBranchLevel(schools, state);
  const branch = branches.find((b) => b.name === name);

  if (!branch) {
    container.innerHTML = `<div class="empty-state">Branch "${escapeHtml(name)}" not found.</div>`;
    return;
  }

  const notes = state.fieldNotes
    .filter((n) => n.level === "Branch" && n.subject === name)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const series = snapshotSeries(state.snapshots, branch.schools.map((s) => String(s.urn)));

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/branches">← Branches</a></div>
    <div class="topbar"><h1>${escapeHtml(branch.name)}${branch.isProjectBranch ? " ⭐ Project branch" : ""}</h1></div>

    ${levelHeaderHtml({
      identityParts: [
        `${formatNumber(branch.schoolsCount)} schools`,
        `${formatNumber(branch.headcountTotal)} staff`,
        `${formatNumber(branch.membersTotal)} members`,
      ],
      tiles: headlineTiles(
        { ...branch, schoolCount: branch.schoolsCount },
        series,
        baselinePoint(series)
      ),
      density: {
        total: branch.densityTotal,
        teachers: branch.densityTeachers,
        leadership: branch.densityLeadership,
        support: branch.densitySupport,
      },
      footerHtml: [
        footerStat("Meetings held", formatNumber(branch.schoolMeetingsHeld)),
        footerStat("Reps recruited", formatNumber(branch.repsRecruited)),
        footerStat("Member:rep ratio", branch.memberRepRatio),
      ].join(""),
    })}

    ${
      branch.biggestNoRepSchool
        ? `<div class="section-title">Biggest un-repped school</div>
           <div class="card">${escapeHtml(branch.biggestNoRepSchool.name)} — ${formatNumber(branch.biggestNoRepSchool.members)} members, no rep</div>`
        : ""
    }

    <div class="section-title">Organising quadrant</div>
    <div class="card"><div id="branch-quadrant"></div></div>

    <div class="section-title">Schools in ${escapeHtml(branch.name)}</div>
    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-small" id="export-branch-schools">Export CSV</button>
      <a class="btn btn-small" href="#/map?branch=${encodeURIComponent(branch.name)}">View on map</a>
    </div>
    <div class="card"><div id="branch-schools-table"></div></div>

    <div class="section-title">Field notes</div>
    <div class="card">
      ${notes.length === 0 ? `<div class="empty-state">No notes for this branch yet.</div>` : notes.map((n) => `
        <div class="note-card">
          <strong>${escapeHtml(n.title)}</strong>
          <div>${escapeHtml(n.note)}</div>
          <div class="note-meta">${formatDate(n.date)} · ${escapeHtml(n.author)}</div>
        </div>`).join("")}
      <div class="btn-row">
        <a class="btn" href="#/notes/new?level=Branch&subject=${encodeURIComponent(name)}">+ Add note</a>
        ${notes.length ? `<a class="btn" href="#/notes?level=Branch&subject=${encodeURIComponent(name)}">View in notes</a>` : ""}
      </div>
    </div>
  `;

  renderQuadrant(container.querySelector("#branch-quadrant"), branch.schools, {
    title: `${branch.name} organising quadrant`,
  });

  // Hoisted out of the renderDataTable call so the export can reuse exactly the
  // columns on screen. `csv` carries the raw fraction rather than the "41.2%"
  // string, so the figures stay usable in a spreadsheet.
  const schoolColumns = [
    { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
    { key: "trust", label: "MAT" },
    { key: "membersTotal", label: "Members", num: true, render: (r) => formatNumber(r.membersTotal) },
    { key: "densityTotal", label: "Density", num: true, cellClass: "has-bar",
      render: (r) => barCell(r.densityTotal, formatPercent(r.densityTotal)),
      csv: (r) => (r.densityTotal == null ? "" : r.densityTotal.toFixed(4)) },
    { key: "densityTeachers", label: "Density (teachers)", num: true, cellClass: "has-bar",
      render: (r) => barCell(r.densityTeachers, formatPercent(r.densityTeachers)),
      csv: (r) => (r.densityTeachers == null ? "" : r.densityTeachers.toFixed(4)) },
    { key: "densitySupport", label: "Density (support)", num: true, cellClass: "has-bar",
      render: (r) => barCell(r.densitySupport, formatPercent(r.densitySupport)),
      csv: (r) => (r.densitySupport == null ? "" : r.densitySupport.toFixed(4)) },
    { key: "repCount", label: "Reps", num: true },
  ];

  renderDataTable(
    container.querySelector("#branch-schools-table"),
    schoolColumns,
    branch.schools,
    { defaultSort: "membersTotal", defaultDir: "desc" }
  );

  container.querySelector("#export-branch-schools").addEventListener("click", () => {
    downloadCsv(csvFilename(branch.name, "schools"), schoolColumns, branch.schools);
  });
}
