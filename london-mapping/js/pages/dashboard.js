import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel, buildBranchLevel, buildProjectDashboard } from "../data/rollups.js";
import { statTile, formatNumber, formatPercent, formatDate, ragPill, escapeHtml } from "../ui.js";

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

    <div class="section-title">Longitudinal tracking</div>
    <div class="card">
      <p style="color:var(--text-muted); margin:0;">Change vs. the previous period will appear here once there's more than one snapshot to compare against — same as the workbook's own placeholder rows for membership growth, density improvement, no-rep schools organised, member:rep ratio improvement, school meetings held, and reps trained.</p>
    </div>
  `;
}
