import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildBranchLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml } from "../ui.js";
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

  renderDataTable(
    container.querySelector("#branch-schools-table"),
    [
      { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
      { key: "trust", label: "MAT" },
      { key: "membersTotal", label: "Members", num: true, render: (r) => formatNumber(r.membersTotal) },
      { key: "densityTotal", label: "Density", num: true, render: (r) => formatPercent(r.densityTotal) },
      { key: "densityTeachers", label: "Density (teachers)", num: true, render: (r) => formatPercent(r.densityTeachers) },
      { key: "densitySupport", label: "Density (support)", num: true, render: (r) => formatPercent(r.densitySupport) },
      { key: "repCount", label: "Reps", num: true },
    ],
    branch.schools,
    { defaultSort: "membersTotal", defaultDir: "desc" }
  );
}
