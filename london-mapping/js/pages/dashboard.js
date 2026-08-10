import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel, buildBranchLevel, buildProjectDashboard, disputeKpis } from "../data/rollups.js";
import { snapshotSeries, latestSnapshotDate, daysSince } from "../data/snapshots.js";
import {
  sparkline, formatDelta, formatNumber, formatPercent, formatDate,
  ragPill, escapeHtml,
} from "../ui.js";

const SCOPE_KEY = "london-mapping:dashboard:scope";

// A scope is the aggregate the whole page describes: the project as a whole,
// one borough, or one MAT. An SIO asking "how is Bromley doing" gets the same
// metrics as the project view rather than a different, lesser page.
function readScope() {
  try {
    return localStorage.getItem(SCOPE_KEY) || "project";
  } catch {
    return "project";
  }
}
function writeScope(value) {
  try {
    localStorage.setItem(SCOPE_KEY, value);
  } catch {
    /* non-fatal */
  }
}

function tile(label, value) {
  return `
    <div class="tile tile-compact">
      <div class="tile-label">${escapeHtml(label)}</div>
      <div class="tile-value">${escapeHtml(String(value))}</div>
    </div>`;
}

// Resolves the selected scope into the metrics, school set and disputes the
// rest of the page renders. Everything reuses the existing rollups rather than
// aggregating a second way.
function resolveScope(scopeValue, { dashboard, branches, mats, disputes }) {
  if (scopeValue.startsWith("branch:")) {
    const name = scopeValue.slice(7);
    const b = branches.find((x) => x.name === name);
    if (b) {
      return {
        label: `${b.name} branch`,
        schools: b.schools,
        disputes: disputes.filter((d) => d.branch === b.name),
        metrics: [
          ["Schools", formatNumber(b.schoolsCount)],
          ["Workforce", formatNumber(b.headcount)],
          ["Membership", formatNumber(b.members)],
          ["Density", formatPercent(b.density)],
          ["Reps", formatNumber(b.reps)],
          ["Member:rep ratio", b.memberRepRatio],
          ["No rep schools", formatNumber(b.noRepSchools)],
          ["Members in no-rep schools", formatNumber(b.membersInNoRepSchools)],
          ["School meetings held", formatNumber(b.schoolMeetingsHeld)],
          ["Reps recruited", formatNumber(b.repsRecruited)],
          ["Reps trained", formatNumber(b.repsTrainedSinceStart)],
        ],
      };
    }
  }
  if (scopeValue.startsWith("mat:")) {
    const name = scopeValue.slice(4);
    const m = mats.find((x) => x.name === name);
    if (m) {
      return {
        label: m.name,
        schools: m.schools,
        disputes: disputes.filter((d) => d.mat === m.name),
        metrics: [
          ["Schools", formatNumber(m.schoolCount)],
          ["Boroughs", m.boroughsPresent.length],
          ["Workforce", formatNumber(m.totalStaffHeadcount)],
          ["Membership", formatNumber(m.totalMembers)],
          ["Density", formatPercent(m.trustDensity)],
          ["Reps", formatNumber(m.reps)],
          ["Member:rep ratio", m.memberRepRatio],
          ["Rep coverage", formatPercent(m.repCoveragePercent)],
          ["No rep schools", formatNumber(m.noRepSchools)],
          ["Members in no-rep schools", formatNumber(m.membersInNoRepSchools)],
          ["Rep committee", m.repCommitteeExists ? "Yes" : "No"],
          ["School meetings held", formatNumber(m.meetingsHeld)],
          ["Reps recruited", formatNumber(m.repsRecruited)],
        ],
      };
    }
  }
  // Default: the project as a whole.
  const pb = dashboard.projectBranches;
  return {
    label: "the project",
    isProject: true,
    schools: dashboard.branchList.flatMap((b) => b.schools),
    disputes,
    projectBranchNames: dashboard.branchList.map((b) => b.name),
    projectMatNames: dashboard.matList.map((m) => m.name),
    metrics: null, // the project view renders two blocks, below
    pb,
    pm: dashboard.projectMats,
  };
}

// The six figures the original spreadsheet left blank under "membership
// growth / density % improvement / ...". They only become answerable once
// there is more than one snapshot to compare.
function impactSection(series, scopeLabel) {
  if (series.length < 2) {
    return `
      <div class="card">
        <p class="empty-state" style="text-align:left; padding:0;">
          ${series.length === 0
            ? "No snapshots captured yet. The first is taken automatically the next time someone opens this page — change over time appears here after that."
            : "One snapshot captured so far. Change over time appears here once there's a second to compare against, about a week from now."}
        </p>
      </div>`;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const cards = [
    ["Membership", formatNumber(last.members), formatDelta(first.members, last.members), series.map((p) => p.members)],
    ["Density", formatPercent(last.density), formatDelta(first.density, last.density, { percent: true }), series.map((p) => p.density)],
    ["Reps", formatNumber(last.reps), formatDelta(first.reps, last.reps), series.map((p) => p.reps)],
  ];

  return `
    <div class="tile-grid trend-grid">
      ${cards
        .map(
          ([label, value, delta, values]) => `
        <div class="tile">
          <div class="tile-label">${escapeHtml(label)}</div>
          <div class="tile-value">${value}</div>
          ${delta ? `<div class="tile-delta ${delta.direction}">${escapeHtml(delta.text)} since ${escapeHtml(formatDate(first.date))}</div>` : ""}
          <div class="tile-spark">${sparkline(values, { label })}</div>
        </div>`
        )
        .join("")}
    </div>
    <p class="as-of trend-footnote">
      ${series.length} snapshots across ${escapeHtml(scopeLabel)}, ${escapeHtml(formatDate(first.date))} → ${escapeHtml(formatDate(last.date))}.
    </p>`;
}

function disputeBlock(disputes) {
  const live = disputes.filter((d) => d.live === "Yes");
  if (live.length === 0) {
    return `<div class="card"><div class="empty-state">No live disputes in this scope.</div>
      <div class="btn-row"><a class="btn" href="#/disputes">Open dispute tracker →</a></div></div>`;
  }
  return `
    <div class="card">
      ${live
        .map(
          (d) => `
        <div class="note-card">
          <strong>${escapeHtml(d.employer)}</strong> — ${escapeHtml(d.branch)}${d.mat ? ` · ${escapeHtml(d.mat)}` : ""}
          ${ragPill(d.outcome)}
          <div class="note-meta">Issues: ${escapeHtml(d.issues.join(", "))} · Lead: ${escapeHtml(d.staffResponsible)} (${escapeHtml(d.rorIo)})</div>
        </div>`
        )
        .join("")}
      <div class="btn-row"><a class="btn" href="#/disputes">Open dispute tracker →</a></div>
    </div>`;
}

export async function render(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);
  const branches = buildBranchLevel(schools, state);
  const dashboard = buildProjectDashboard(branches, mats, state.disputeTracker);

  const lastCapture = latestSnapshotDate(state.snapshots);
  const captureAge = daysSince(lastCapture);

  let scopeValue = readScope();

  function draw() {
    const scope = resolveScope(scopeValue, {
      dashboard, branches, mats, disputes: state.disputeTracker,
    });
    const series = snapshotSeries(state.snapshots, scope.schools.map((s) => s.urn));
    const kpis = disputeKpis(scope.disputes);

    const scopeOptions = `
      <option value="project" ${scopeValue === "project" ? "selected" : ""}>Project overview</option>
      <optgroup label="Boroughs">
        ${branches
          .map((b) => `<option value="branch:${escapeHtml(b.name)}" ${scopeValue === `branch:${b.name}` ? "selected" : ""}>${escapeHtml(b.name)}${b.isProjectBranch ? " ⭐" : ""}</option>`)
          .join("")}
      </optgroup>
      <optgroup label="MATs">
        ${mats
          .map((m) => `<option value="mat:${escapeHtml(m.name)}" ${scopeValue === `mat:${m.name}` ? "selected" : ""}>${escapeHtml(m.name)}${m.isTargetMat ? " ⭐" : ""}</option>`)
          .join("")}
      </optgroup>`;

    const kpiBlock = scope.isProject
      ? `
      <div class="section-title">Project branches — ${escapeHtml(scope.projectBranchNames.join(", ") || "none set")}</div>
      <div class="tile-grid tile-grid-compact">
        ${tile("Workforce", formatNumber(scope.pb.workforce))}
        ${tile("Membership", formatNumber(scope.pb.membership))}
        ${tile("Density", formatPercent(scope.pb.density))}
        ${tile("No rep schools", formatNumber(scope.pb.noRepSchools))}
        ${tile("Member:rep ratio", scope.pb.memberRepRatio)}
        ${tile("School meetings held", formatNumber(scope.pb.schoolMeetingsHeld))}
        ${tile("Reps recruited", formatNumber(scope.pb.repsRecruited))}
        ${tile("Reps trained", formatNumber(scope.pb.repsTrainedSinceStart))}
        ${tile("Live disputes", formatNumber(scope.pb.liveDisputes))}
        ${tile("Successful indicative", formatNumber(scope.pb.successfulIndicativeBallots))}
        ${tile("Successful formal", formatNumber(scope.pb.successfulFormalBallots))}
        ${tile("Strike days", formatNumber(scope.pb.strikeDays))}
        ${tile("Green disputes", formatNumber(scope.pb.greenDisputes))}
      </div>

      <div class="section-title">Project MATs — ${escapeHtml(scope.projectMatNames.join(", ") || "none set")}</div>
      <div class="tile-grid tile-grid-compact">
        ${tile("Workforce", formatNumber(scope.pm.workforce))}
        ${tile("Membership", formatNumber(scope.pm.membership))}
        ${tile("Density", formatPercent(scope.pm.density))}
        ${tile("No rep schools", formatNumber(scope.pm.noRepSchools))}
        ${tile("Member:rep ratio", scope.pm.memberRepRatio)}
        ${tile("Members in no-rep", formatNumber(scope.pm.membersInNoRepSchools))}
        ${tile("Rep committees", formatNumber(scope.pm.repCommittees))}
        ${tile("School meetings held", formatNumber(scope.pm.meetingsHeld))}
        ${tile("Reps recruited", formatNumber(scope.pm.repsRecruited))}
        ${tile("Live disputes", formatNumber(scope.pm.liveDisputes))}
        ${tile("Successful indicative", formatNumber(scope.pm.successfulIndicativeBallots))}
        ${tile("Successful formal", formatNumber(scope.pm.successfulFormalBallots))}
        ${tile("Strike days", formatNumber(scope.pm.strikeDays))}
        ${tile("Green disputes", formatNumber(scope.pm.greenDisputes))}
      </div>`
      : `
      <div class="section-title">${escapeHtml(scope.label)}</div>
      <div class="tile-grid tile-grid-compact">
        ${scope.metrics.map(([l, v]) => tile(l, v)).join("")}
        ${tile("Live disputes", formatNumber(kpis.liveDisputes))}
        ${tile("Successful indicative", formatNumber(kpis.successfulIndicativeBallots))}
        ${tile("Successful formal", formatNumber(kpis.successfulFormalBallots))}
        ${tile("Strike days", formatNumber(kpis.strikeDays))}
        ${tile("Green disputes", formatNumber(kpis.greenDisputes))}
      </div>`;

    container.innerHTML = `
      <div class="topbar">
        <h1>Project dashboard</h1>
        <div class="as-of">Data as of ${formatDate(state.asOfDate)}</div>
      </div>

      <div class="filter-bar scope-bar">
        <label for="scope-select"><strong>Showing</strong></label>
        <select id="scope-select">${scopeOptions}</select>
      </div>

      <div class="section-title">Change over time — ${escapeHtml(scope.label)}</div>
      ${impactSection(series, scope.label)}
      ${
        lastCapture && captureAge > 42
          ? `<div class="mock-banner">Last snapshot was ${captureAge} days ago. Weekly capture may have stopped — see docs/scheduled-snapshot.md.</div>`
          : ""
      }

      ${kpiBlock}

      <div class="section-title">Live disputes — ${escapeHtml(scope.label)}</div>
      ${disputeBlock(scope.disputes)}
    `;

    container.querySelector("#scope-select").addEventListener("change", (e) => {
      scopeValue = e.target.value;
      writeScope(scopeValue);
      draw();
    });
  }

  draw();
}
