import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel, buildBranchLevel, buildProjectDashboard } from "../data/rollups.js";
import { snapshotSeries, latestSnapshotDate, daysSince } from "../data/snapshots.js";
import {
  statTile, sparkline, formatDelta, formatNumber, formatPercent, formatDate,
  ragPill, escapeHtml,
} from "../ui.js";

// The six figures the original spreadsheet left blank under "membership
// growth / density % improvement / ...". They only become answerable once
// there is more than one snapshot to compare.
function impactSection(series) {
  if (series.length < 2) {
    const captured = series.length;
    return `
      <div class="card">
        <p class="empty-state" style="text-align:left; padding:0;">
          ${captured === 0
            ? "No snapshots captured yet. The first one is taken automatically the next time someone opens this page — after that, change over time appears here."
            : "One snapshot captured so far. Change over time appears here once there's a second one to compare against, about a week from now."}
        </p>
      </div>`;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const memberDelta = formatDelta(first.members, last.members);
  const densityDelta = formatDelta(first.density, last.density, { percent: true });
  const repDelta = formatDelta(first.reps, last.reps);

  const tile = (label, value, delta, values) => `
    <div class="tile">
      <div class="tile-label">${escapeHtml(label)}</div>
      <div class="tile-value">${value}</div>
      ${delta ? `<div class="tile-delta ${delta.direction}">${escapeHtml(delta.text)}</div>` : ""}
      <div class="tile-spark">${sparkline(values, { label })}</div>
    </div>`;

  return `
    <div class="tile-grid">
      ${tile("Membership", formatNumber(last.members), memberDelta, series.map((p) => p.members))}
      ${tile("Density", formatPercent(last.density), densityDelta, series.map((p) => p.density))}
      ${tile("Reps", formatNumber(last.reps), repDelta, series.map((p) => p.reps))}
    </div>
    <p class="as-of" style="margin-top:10px;">
      ${series.length} snapshots, ${escapeHtml(formatDate(first.date))} → ${escapeHtml(formatDate(last.date))}.
    </p>`;
}

export async function render(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);
  const branches = buildBranchLevel(schools, state);
  const dashboard = buildProjectDashboard(branches, mats, state.disputeTracker);
  const pb = dashboard.projectBranches;
  const pm = dashboard.projectMats;
  const projectBranchNames = dashboard.branchList.map((b) => b.name);
  const projectMatNames = dashboard.matList.map((m) => m.name);

  const liveDisputes = state.disputeTracker.filter((d) => d.live === "Yes");

  // Trend over the project branches only, matching the headline KPIs above it.
  const projectUrns = dashboard.branchList.flatMap((b) => b.schools.map((s) => s.urn));
  const series = snapshotSeries(state.snapshots, projectUrns);
  const lastCapture = latestSnapshotDate(state.snapshots);
  const captureAge = daysSince(lastCapture);

  container.innerHTML = `
    <div class="topbar">
      <h1>Project dashboard</h1>
      <div class="as-of">Data as of ${formatDate(state.asOfDate)}</div>
    </div>

    <div class="section-title">Project branches — ${escapeHtml(projectBranchNames.join(", ") || "none set")}</div>
    <div class="tile-grid">
      ${statTile("Workforce", formatNumber(pb.workforce))}
      ${statTile("Membership", formatNumber(pb.membership))}
      ${statTile("Density", formatPercent(pb.density))}
      ${statTile("No rep schools", formatNumber(pb.noRepSchools))}
      ${statTile("Member:rep ratio", pb.memberRepRatio)}
      ${statTile("School meetings held", formatNumber(pb.schoolMeetingsHeld))}
      ${statTile("Reps recruited", formatNumber(pb.repsRecruited))}
      ${statTile("Reps trained", formatNumber(pb.repsTrainedSinceStart))}
      ${statTile("Live disputes", formatNumber(pb.liveDisputes))}
      ${statTile("Successful indicative ballots", formatNumber(pb.successfulIndicativeBallots))}
      ${statTile("Successful formal ballots", formatNumber(pb.successfulFormalBallots))}
      ${statTile("Strike days", formatNumber(pb.strikeDays))}
      ${statTile("Green disputes", formatNumber(pb.greenDisputes))}
    </div>

    <div class="section-title">Project MATs — ${escapeHtml(projectMatNames.join(", ") || "none set")}</div>
    <div class="tile-grid">
      ${statTile("Workforce", formatNumber(pm.workforce))}
      ${statTile("Membership", formatNumber(pm.membership))}
      ${statTile("Density", formatPercent(pm.density))}
      ${statTile("No rep schools", formatNumber(pm.noRepSchools))}
      ${statTile("Member:rep ratio", pm.memberRepRatio)}
      ${statTile("Members in no-rep schools", formatNumber(pm.membersInNoRepSchools))}
      ${statTile("Rep committees", formatNumber(pm.repCommittees))}
      ${statTile("Live disputes", formatNumber(pm.liveDisputes))}
      ${statTile("Successful indicative ballots", formatNumber(pm.successfulIndicativeBallots))}
      ${statTile("Successful formal ballots", formatNumber(pm.successfulFormalBallots))}
      ${statTile("Strike days", formatNumber(pm.strikeDays))}
      ${statTile("Green disputes", formatNumber(pm.greenDisputes))}
    </div>

    <div class="section-title">Live disputes</div>
    <div class="card">
      ${
        liveDisputes.length === 0
          ? `<div class="empty-state">No live disputes right now.</div>`
          : liveDisputes
              .map(
                (d) => `
        <div class="note-card">
          <strong>${escapeHtml(d.employer)}</strong> — ${escapeHtml(d.branch)}${d.mat ? ` · ${escapeHtml(d.mat)}` : ""}
          ${ragPill(d.outcome)}
          <div class="note-meta">Issues: ${escapeHtml(d.issues.join(", "))} · Lead: ${escapeHtml(d.staffResponsible)} (${escapeHtml(d.rorIo)})</div>
        </div>`
              )
              .join("")
      }
      <div class="btn-row"><a class="btn" href="#/disputes">View full dispute tracker →</a></div>
    </div>

    <div class="section-title">Change over time — project branches</div>
    ${impactSection(series)}
    ${
      lastCapture && captureAge > 42
        ? `<div class="mock-banner" style="margin-top:14px;">Last snapshot was ${captureAge} days ago. Weekly capture may have stopped — see docs/scheduled-snapshot.md.</div>`
        : ""
    }
  `;
}
