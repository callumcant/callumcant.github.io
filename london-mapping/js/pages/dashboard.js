// Strategic management view.
//
// Read weekly or monthly by the regional secretary, SIOs and IOs — a
// monitoring surface, not an exploration tool. The Schools table is where you
// go digging; the Branch and MAT pages are where "which schools need
// attention" lives. This page answers one question: is the project moving, and
// where isn't it.
//
// Three bands, deliberately unequal in weight:
//   1. Outcomes (lagging)  — four large tiles. What actually changed.
//   2. Activity (leading)  — two small tiles. What we did that should cause it.
//   3. Exceptions          — a short ranked list. The only part anyone acts on.
//
// Band 2 is visually smaller than band 1 on purpose: meetings held is an input,
// not an achievement, and a page that renders them the same size invites
// mistaking effort for impact.
//
// Everything here reuses the existing rollups. Every scope — the project, one
// borough, one trust — goes through the same summariseSchools(), which is what
// makes a regional figure and a branch figure comparable rather than merely
// similar-looking.
import { loadAll } from "../data/store.js";
import {
  buildSchoolLevel, buildMatLevel, buildBranchLevel, summariseSchools, disputeKpis,
} from "../data/rollups.js";
import {
  snapshotSeries, latestSnapshotDate, daysSince, baselinePoint, pointWeeksBefore,
  seriesCadence, recentRun, BASELINE_DATE,
} from "../data/snapshots.js";
import { detectExceptions } from "../data/exceptions.js";
import { densityCard, densityGroupDeltas } from "../ui/level-header.js";
import {
  sparkline, formatDelta, formatNumber, formatPercent, formatDate, escapeHtml,
} from "../ui.js";

const SCOPE_KEY = "london-mapping:dashboard:scope";

// The short comparison that sits under the baseline figure.
const RECENT_WEEKS = 4;

// London has 32 boroughs plus the City. Five are project branches, so a spine
// covering the region leaves nearly thirty others. Far fewer than that means
// only the project boroughs were loaded, and "the rest of the region" would be
// a handful of schools presented as a regional counterfactual — which is worse
// than showing nothing.
const MIN_NON_PROJECT_BRANCHES = 8;
const MIN_NON_PROJECT_MATS = 3;

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

// "9 Aug" rather than "9 Aug 2026" inside a delta chip, where the year is
// repeated on every tile and the cadence line already states it in full.
function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

// Returns the metrics as named groups rather than one flat list. The flat list
// is what forced every measure into a uniform grid of equal-looking tiles, and
// with it the implication that membership and meetings-logged are the same
// kind of fact.
function resolveScope(scopeValue, { branches, mats, disputes }) {
  let label = "the project";
  let schools = [];
  let scopeDisputes = disputes;
  let isProject = false;
  // The project scope unions two overlapping sets, so its school count needs
  // to say which — otherwise the headline membership figure and the
  // project-branches figure in the comparison below look like a contradiction.
  let projectMakeup = "";

  if (scopeValue.startsWith("branch:")) {
    const branch = branches.find((b) => b.name === scopeValue.slice(7));
    if (branch) {
      label = `${branch.name} branch`;
      schools = branch.schools;
      scopeDisputes = disputes.filter((d) => d.branch === branch.name);
    }
  } else if (scopeValue.startsWith("mat:")) {
    const mat = mats.find((m) => m.name === scopeValue.slice(4));
    if (mat) {
      label = mat.name;
      schools = mat.schools;
      scopeDisputes = disputes.filter((d) => d.mat === mat.name);
    }
  }

  if (schools.length === 0) {
    // The project is both workstreams, and a trust can reach outside the five
    // project boroughs — so the two sets are unioned and de-duplicated by URN
    // rather than one standing in for the whole.
    const byUrn = new Map();
    for (const b of branches.filter((x) => x.isProjectBranch)) {
      for (const s of b.schools) byUrn.set(String(s.urn), s);
    }
    for (const m of mats.filter((x) => x.isTargetMat)) {
      for (const s of m.schools) byUrn.set(String(s.urn), s);
    }
    schools = [...byUrn.values()];
    isProject = true;
    scopeDisputes = disputes;
    projectMakeup = `${branches.filter((x) => x.isProjectBranch).length} project branches `
      + `and ${mats.filter((x) => x.isTargetMat).length} target trusts`;
  }

  const summary = summariseSchools(schools);
  const kpis = disputeKpis(scopeDisputes);

  return {
    label,
    isProject,
    schools,
    disputes: scopeDisputes,
    summary,
    kpis,
    // `field` names the snapshot series key that carries this measure over
    // time; entries without one have no trend and say so instead of pretending.
    outcomes: [
      {
        key: "membership", label: "Membership", field: "members", percent: false,
        value: formatNumber(summary.membersTotal),
        hint: `across ${formatNumber(summary.schoolCount)} schools`
          + (projectMakeup ? ` in ${projectMakeup}` : ""),
      },
      {
        key: "density", label: "Density", field: "density", percent: true,
        value: formatPercent(summary.densityTotal),
        hint: `${formatNumber(summary.membersTotal)} of ${formatNumber(summary.headcountTotal)} staff`,
      },
      {
        key: "reps", label: "Reps", field: "reps", percent: false,
        value: formatNumber(summary.reps),
        hint: `${formatNumber(summary.noRepSchools)} schools with no rep · ${summary.memberRepRatio}`,
      },
      {
        key: "disputes", label: "Live disputes", field: null, percent: false,
        value: formatNumber(kpis.liveDisputes),
        hint: `${formatNumber(kpis.strikeDays)} strike days · ${formatNumber(kpis.greenDisputes)} resolved green`,
        href: "#/disputes",
        // Disputes are a current-state table, not a snapshotted level. A
        // "trend" reconstructed from open and resolution dates would silently
        // drop every dispute with a blank date, so there isn't one.
        noTrend: "Not captured in snapshots — the tracker holds the history",
      },
    ],
    // Just the one. Reps recruited used to sit here, but reps now come from the
    // weekly Stratum export, so rep movement is an outcome with a trend rather
    // than an activity someone remembered to log — it lives in the Reps tile
    // above. Reps trained has no data source and would read zero forever;
    // workplace conversations aren't logged consistently enough to trust; active
    // SEVs aren't something an organiser controls. The test is that an IO both
    // drives it and records it reliably, and today only meetings pass.
    activity: [
      {
        key: "meetings",
        label: "Meetings & 1-2-1s held",
        value: formatNumber(summary.meetingsHeld),
        // Attendance rides with the count rather than taking a tile of its own:
        // 40 conversations with 45 people is a different picture from 40 with
        // 400, and the two figures only mean anything side by side.
        note: `${formatNumber(summary.meetingAttendeesTotal)} people took part`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Band 1 — outcomes
// ---------------------------------------------------------------------------

function outcomeTile(entry, series, base, recent) {
  const latest = series.length ? series[series.length - 1] : null;
  const canTrend = entry.field && latest != null;
  // The sparkline spaces its points evenly, so it can only show the unbroken
  // recent run. The deltas below are unaffected: each compares two named dates
  // directly and doesn't care what sits between them.
  const values = canTrend ? recentRun(series).map((p) => p[entry.field]) : [];

  const sinceBaseline = canTrend && base
    ? formatDelta(base[entry.field], latest[entry.field], { percent: entry.percent })
    : null;
  const sinceRecent = canTrend && recent
    ? formatDelta(recent[entry.field], latest[entry.field], { percent: entry.percent })
    : null;

  // Direction is never carried by colour alone — formatDelta emits an arrow,
  // and the word "since <date>" sits beside it.
  const baselineRow = sinceBaseline
    ? `<div class="tile-delta ${sinceBaseline.direction}">${escapeHtml(sinceBaseline.text)} since ${escapeHtml(shortDate(BASELINE_DATE))}</div>`
    : "";
  const recentRow = sinceRecent
    ? `<div class="tile-delta-minor ${sinceRecent.direction}">${escapeHtml(sinceRecent.text)} in ${RECENT_WEEKS} weeks</div>`
    : "";

  const body = `
    <div class="tile-label">${escapeHtml(entry.label)}</div>
    <div class="tile-value">${escapeHtml(entry.value)}</div>
    ${entry.hint ? `<div class="tile-hint">${escapeHtml(entry.hint)}</div>` : ""}
    ${baselineRow}
    ${recentRow}
    ${entry.noTrend ? `<div class="tile-hint tile-hint-quiet">${escapeHtml(entry.noTrend)}</div>` : ""}
    ${canTrend && values.length > 1 ? `<div class="tile-spark">${sparkline(values, { label: entry.label })}</div>` : ""}
  `;

  return entry.href
    ? `<a class="tile tile-outcome tile-linked" href="${escapeHtml(entry.href)}">${body}</a>`
    : `<div class="tile tile-outcome">${body}</div>`;
}

function outcomesBand(scope, series, base, recent) {
  // Each band degrades on its own. A scope with one snapshot still shows its
  // current figures; it just can't show movement, and says which.
  let caveat = "";
  if (series.length < 2) {
    caveat = series.length === 0
      ? "No snapshots captured yet. The first is taken automatically the next time someone opens this page — change over time appears here after that."
      : "One snapshot captured so far. Change over time appears here once there's a second to compare against, about a week from now.";
  } else if (!base) {
    // Covers both ways the baseline can be unusable: nothing captured at or
    // after it, and a baseline capture that is itself the newest snapshot.
    caveat = `There isn't yet a snapshot on or after the ${formatDate(BASELINE_DATE)} baseline with a later one to compare it against, `
      + `so "since baseline" figures aren't shown. Comparing against whatever happened to be captured first would be a delta measured from an unstated starting line.`;
  }

  // The same chart the branch and trust pages open with — three numbers hidden
  // behind a disclosure triangle told nobody about the teacher/support gap.
  const split = densityCard({
    total: scope.summary.densityTotal,
    teachers: scope.summary.densityTeachers,
    leadership: scope.summary.densityLeadership,
    support: scope.summary.densitySupport,
    deltas: densityGroupDeltas(series, base),
  });

  return `
    <div class="band-grid band-outcomes">
      ${scope.outcomes.map((e) => outcomeTile(e, series, base, recent)).join("")}
    </div>
    ${caveat ? `<p class="band-caveat">${escapeHtml(caveat)}</p>` : ""}
    ${split}`;
}

// ---------------------------------------------------------------------------
// Project vs the rest of the region
// ---------------------------------------------------------------------------

function comparePanel(setLabel, series, field, percent) {
  const latest = series.length ? series[series.length - 1] : null;
  const base = baselinePoint(series);
  const delta = base && latest
    ? formatDelta(base[field], latest[field], { percent })
    : null;
  const value = latest == null
    ? "–"
    : percent ? formatPercent(latest[field]) : formatNumber(latest[field]);

  return `
    <div class="compare-cell">
      <div class="compare-cell-label">${escapeHtml(setLabel)}</div>
      <div class="compare-cell-value">${escapeHtml(value)}</div>
      ${delta
        ? `<div class="tile-delta ${delta.direction}">${escapeHtml(delta.text)} since ${escapeHtml(shortDate(BASELINE_DATE))}</div>`
        : `<div class="tile-delta-minor flat">No baseline comparison yet</div>`}
      <div class="tile-spark">${sparkline(recentRun(series).map((p) => p[field]), { label: `${setLabel} ${field}` })}</div>
    </div>`;
}

function compareBlock({ heading, aLabel, bLabel, aSeries, bSeries }) {
  const measures = [
    { field: "members", label: "Membership", percent: false },
    { field: "density", label: "Density", percent: true },
  ];
  return `
    <div class="card">
      <div class="compare-heading">${escapeHtml(heading)}</div>
      ${measures.map((m) => `
        <div class="compare-row">
          <div class="compare-measure">${escapeHtml(m.label)}</div>
          ${comparePanel(aLabel, aSeries, m.field, m.percent)}
          ${comparePanel(bLabel, bSeries, m.field, m.percent)}
        </div>`).join("")}
    </div>`;
}

// Membership up in project branches means little on its own. Up against a flat
// or falling rest-of-region, it is an argument. That comparison is only honest
// if the spine actually covers the region, so it checks before it draws.
function comparisonSection(branches, mats, snapshots) {
  const projectBranches = branches.filter((b) => b.isProjectBranch);
  const otherBranches = branches.filter((b) => !b.isProjectBranch);
  const targetMats = mats.filter((m) => m.isTargetMat);
  const otherMats = mats.filter((m) => !m.isTargetMat);

  const urnsOf = (groups) => groups.flatMap((g) => g.schools.map((s) => String(s.urn)));

  const blocks = [];

  if (otherBranches.length >= MIN_NON_PROJECT_BRANCHES) {
    blocks.push(compareBlock({
      heading: "Project branches against the rest of the region",
      aLabel: `Project branches (${projectBranches.length})`,
      bLabel: `Other boroughs (${otherBranches.length})`,
      aSeries: snapshotSeries(snapshots, urnsOf(projectBranches)),
      bSeries: snapshotSeries(snapshots, urnsOf(otherBranches)),
    }));
  } else {
    blocks.push(`
      <div class="card">
        <p class="empty-state" style="text-align:left; padding:0;">
          Region-wide comparison needs the all-London GIAS spine loaded. Only
          ${escapeHtml(String(otherBranches.length))} non-project
          ${otherBranches.length === 1 ? "borough is" : "boroughs are"} present in the data, which
          is too few to stand for "the rest of the region" — so the comparison is hidden rather
          than drawn from a handful of schools.
        </p>
      </div>`);
  }

  if (otherMats.length >= MIN_NON_PROJECT_MATS) {
    blocks.push(compareBlock({
      heading: "Target trusts against other trusts",
      aLabel: `Target MATs (${targetMats.length})`,
      bLabel: `Other MATs (${otherMats.length})`,
      aSeries: snapshotSeries(snapshots, urnsOf(targetMats)),
      bSeries: snapshotSeries(snapshots, urnsOf(otherMats)),
    }));
  }

  return blocks.join("");
}

// ---------------------------------------------------------------------------
// Band 3 — exceptions
// ---------------------------------------------------------------------------

function exceptionsBand(result) {
  if (result.items.length === 0) {
    return `
      <div class="card">
        <p class="empty-state" style="text-align:left; padding:0;">
          ${result.baselineMissing
            ? `Nothing to flag yet — there isn't yet a snapshot on or after the ${escapeHtml(formatDate(BASELINE_DATE))} baseline with a later one to measure movement against.`
            : "No exceptions. Project branches and target trusts are moving in line with each other."}
        </p>
      </div>`;
  }
  return `
    <div class="card exceptions">
      ${result.items.map((item) => `
        <a class="exception" href="${escapeHtml(item.href)}">
          <span class="exception-text">${escapeHtml(item.text)}</span>
          <span class="exception-go" aria-hidden="true">→</span>
        </a>`).join("")}
    </div>`;
}

// ---------------------------------------------------------------------------

export async function render(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);
  const branches = buildBranchLevel(schools, state);

  const lastCapture = latestSnapshotDate(state.snapshots);
  const captureAge = daysSince(lastCapture);

  let scopeValue = readScope();

  function draw() {
    const scope = resolveScope(scopeValue, { branches, mats, disputes: state.disputeTracker });
    const scopeUrns = scope.schools.map((s) => String(s.urn));
    const series = snapshotSeries(state.snapshots, scopeUrns);
    const base = baselinePoint(series);
    const recent = pointWeeksBefore(series, RECENT_WEEKS);
    const cadence = seriesCadence(series);

    // The page reports as at the newest capture, not as at right now: the
    // whole point of the cadence line is that this is a considered position.
    const exceptions = detectExceptions({
      branches, mats,
      snapshots: state.snapshots,
      meetings: state.meetings,
      asOf: lastCapture,
    });

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

    // When only a recent window is loaded, the line says so rather than
    // counting the window's captures "since" the baseline — that would read as
    // a full year of weekly history when twelve weeks of it is what's here.
    const cadenceLine = cadence.count === 0
      ? "No snapshots captured yet — figures below are current values with no history behind them."
      : cadence.earlier
        ? `As at ${formatDate(cadence.last)} · last ${cadence.count} weekly `
          + `${cadence.count === 1 ? "snapshot" : "snapshots"} · `
          + `baseline ${formatDate(cadence.earlier)}`
        : `As at ${formatDate(cadence.last)} · ${cadence.count} weekly `
          + `${cadence.count === 1 ? "snapshot" : "snapshots"} since ${formatDate(cadence.first)}`;

    container.innerHTML = `
      <div class="topbar">
        <h1>Dashboard</h1>
        <div class="as-of">Baseline ${escapeHtml(formatDate(BASELINE_DATE))}</div>
      </div>

      <p class="cadence-line">${escapeHtml(cadenceLine)}</p>

      <div class="filter-bar scope-bar">
        <label for="scope-select"><strong>Showing</strong></label>
        <select id="scope-select">${scopeOptions}</select>
      </div>
      ${
        lastCapture && captureAge > 42
          ? `<div class="mock-banner">Last snapshot was ${captureAge} days ago. Weekly capture may have stopped — see docs/scheduled-snapshot.md.</div>`
          : ""
      }

      <div class="section-title">Outcomes — ${escapeHtml(scope.label)}</div>
      ${outcomesBand(scope, series, base, recent)}

      ${scope.isProject ? `
        <div class="section-title">Compared with the rest of the region</div>
        ${comparisonSection(branches, mats, state.snapshots)}` : ""}

      <div class="section-title">Activity — what we did</div>
      <div class="band-grid band-activity">
        ${scope.activity.map((a) => `
          <div class="tile tile-compact">
            <div class="tile-label">${escapeHtml(a.label)}</div>
            <div class="tile-value">${escapeHtml(a.value)}</div>
            ${a.note ? `<div class="tile-note">${escapeHtml(a.note)}</div>` : ""}
          </div>`).join("")}
      </div>

      <div class="section-title">Exceptions — where to look</div>
      ${exceptionsBand(exceptions)}
    `;

    container.querySelector("#scope-select").addEventListener("change", (e) => {
      scopeValue = e.target.value;
      writeScope(scopeValue);
      draw();
    });
  }

  draw();
}
