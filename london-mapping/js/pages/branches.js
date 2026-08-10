import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildBranchLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml } from "../ui.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const branches = buildBranchLevel(schools, state);

  container.innerHTML = `
    <div class="topbar"><h1>Branches</h1></div>
    <div class="card">
      <div id="branches-table"></div>
    </div>
  `;

  renderDataTable(
    container.querySelector("#branches-table"),
    [
      { key: "name", label: "Branch", render: (r) => `<a class="row-link" href="#/branches/${encodeURIComponent(r.name)}">${escapeHtml(r.name)}${r.isProjectBranch ? " ⭐" : ""}</a>` },
      { key: "schoolsCount", label: "Schools", num: true },
      { key: "headcount", label: "Workforce", num: true, render: (r) => formatNumber(r.headcount) },
      { key: "members", label: "Members", num: true, render: (r) => formatNumber(r.members) },
      { key: "density", label: "Density", num: true, render: (r) => formatPercent(r.density) },
      { key: "reps", label: "Reps", num: true },
      { key: "memberRepRatio", label: "Member:rep" },
      { key: "noRepSchools", label: "No-rep schools", num: true },
      { key: "noteCount", label: "Notes", num: true },
    ],
    branches,
    { defaultSort: "members", defaultDir: "desc" }
  );
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

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/branches">← Branches</a></div>
    <div class="topbar"><h1>${escapeHtml(branch.name)}${branch.isProjectBranch ? " ⭐ Project branch" : ""}</h1></div>

    <div class="tile-grid">
      <div class="tile"><div class="tile-label">Schools</div><div class="tile-value">${branch.schoolsCount}</div></div>
      <div class="tile"><div class="tile-label">Workforce</div><div class="tile-value">${formatNumber(branch.headcount)}</div></div>
      <div class="tile"><div class="tile-label">Members</div><div class="tile-value">${formatNumber(branch.members)}</div></div>
      <div class="tile"><div class="tile-label">Density</div><div class="tile-value">${formatPercent(branch.density)}</div></div>
      <div class="tile"><div class="tile-label">Teacher share</div><div class="tile-value">${formatPercent(branch.teacherShare)}</div></div>
      <div class="tile"><div class="tile-label">Support share</div><div class="tile-value">${formatPercent(branch.supportShare)}</div></div>
      <div class="tile"><div class="tile-label">Reps</div><div class="tile-value">${branch.reps}</div></div>
      <div class="tile"><div class="tile-label">Member:rep ratio</div><div class="tile-value">${branch.memberRepRatio}</div></div>
      <div class="tile"><div class="tile-label">No-rep schools</div><div class="tile-value">${branch.noRepSchools}</div></div>
      <div class="tile"><div class="tile-label">Members in no-rep schools</div><div class="tile-value">${formatNumber(branch.membersInNoRepSchools)}</div></div>
      <div class="tile"><div class="tile-label">School meetings held</div><div class="tile-value">${branch.schoolMeetingsHeld}</div></div>
      <div class="tile"><div class="tile-label">Reps trained</div><div class="tile-value">${branch.repsTrainedSinceStart}</div></div>
    </div>

    ${
      branch.biggestNoRepSchool
        ? `<div class="section-title">Biggest un-repped school</div>
           <div class="card">${escapeHtml(branch.biggestNoRepSchool.name)} — ${formatNumber(branch.biggestNoRepSchool.members)} members, no rep</div>`
        : ""
    }

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
      <div class="btn-row"><a class="btn" href="#/notes/new?level=Branch&subject=${encodeURIComponent(name)}">+ Add note</a></div>
    </div>
  `;

  renderDataTable(
    container.querySelector("#branch-schools-table"),
    [
      { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
      { key: "trust", label: "MAT" },
      { key: "overallMembers", label: "Members", num: true, render: (r) => formatNumber(r.overallMembers) },
      { key: "density", label: "Density", num: true, render: (r) => formatPercent(r.density) },
      { key: "repCount", label: "Reps", num: true },
    ],
    branch.schools,
    { defaultSort: "overallMembers", defaultDir: "desc" }
  );
}
