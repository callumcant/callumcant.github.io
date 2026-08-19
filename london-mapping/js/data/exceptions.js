// Exception detection for the dashboard's third band.
//
// The point of this band is that it is the only part of a monitoring page
// anyone acts on. Everything else tells you the region is broadly fine; this
// tells you where it isn't. So it is deliberately short, ranked, and quiet
// when there is genuinely nothing to say — padding it with weak observations
// would train people to skip it.
//
// Pure over the rollups and the snapshot series: no DOM, no formatting beyond
// the sentence itself, so it can be tested and reused.
//
// It names PLACES, never people. A strategic view where every branch has a
// named lead is one step away from a performance-management tool, and
// organisers who feel measured by a number will manage the number rather than
// organise. That constraint is the reason there is no ranking here either —
// this surfaces movement worth a conversation, not a league table.
import { snapshotSeries, baselinePoint, BASELINE_DATE } from "./snapshots.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A branch that hasn't logged a meeting in this long has stalled rather than
// simply had a quiet fortnight. Half a term, roughly.
const STALE_ACTIVITY_WEEKS = 6;

// Movement smaller than this is noise — a couple of members joining or a
// headcount correction — and putting it in front of a regional secretary as an
// exception costs more attention than it is worth.
const MIN_DENSITY_POINTS = 1.0;   // percentage points
const MIN_MEMBERSHIP_CHANGE = 5;  // members

// Reps come from the weekly Stratum export, so a branch total drifts by one
// almost every week as people take up and give up the role. A single rep is
// movement, not a story; two is worth a conversation.
const MIN_REPS_CHANGE = 2;        // reps

// Ranked worst-first. Anything falling beats anything stalled, which beats a
// standout gain — a gain is only ever included to stop a healthy region
// rendering an empty box.
const KIND_ORDER = ["density-fall", "membership-fall", "reps-fall", "activity-stall", "standout-gain"];

function weeksBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.floor((to - from) / MS_PER_DAY / 7);
}

function points(value) {
  return Math.abs(value * 100);
}

/**
 * @param {Object} input
 * @param {Array}  input.branches   buildBranchLevel output
 * @param {Array}  input.mats       buildMatLevel output
 * @param {Array}  input.snapshots  raw Snapshots rows
 * @param {Array}  input.meetings   raw Meetings rows
 * @param {string} input.asOf       ISO date the page is reporting as at
 * @param {string} [input.baselineDate]
 * @param {number} [input.limit]
 * @returns {{ items: Array, baselineMissing: boolean, scopesChecked: number }}
 */
export function detectExceptions({
  branches = [],
  mats = [],
  snapshots = [],
  meetings = [],
  asOf,
  baselineDate = BASELINE_DATE,
  limit = 5,
} = {}) {
  // Project branches and target MATs only. A borough nobody is working in
  // hasn't "stalled" — it was never started, and listing it as an exception
  // would bury the ones that matter.
  const scopes = [
    ...branches.filter((b) => b.isProjectBranch).map((b) => ({
      name: b.name, schools: b.schools, href: `#/branches/${encodeURIComponent(b.name)}`, noun: "branch",
    })),
    ...mats.filter((m) => m.isTargetMat).map((m) => ({
      name: m.name, schools: m.schools, href: `#/mats/${encodeURIComponent(m.name)}`, noun: "trust",
    })),
  ];

  const found = [];
  let baselineMissing = false;
  // Counted per kind of scope: "the only project branch falling" is a claim
  // about branches, and a falling trust is not a counter-example to it.
  const densityFalling = { branch: 0, trust: 0 };

  const measured = scopes.map((scope) => {
    const urns = scope.schools.map((s) => String(s.urn));
    const series = snapshotSeries(snapshots, urns);
    const base = baselinePoint(series, baselineDate);
    if (!base) baselineMissing = true;
    const latest = series.length ? series[series.length - 1] : null;
    return { scope, base, latest };
  });

  for (const { scope, base, latest } of measured) {
    if (base && latest && latest.density != null && base.density != null
        && points(latest.density - base.density) >= MIN_DENSITY_POINTS
        && latest.density < base.density) {
      densityFalling[scope.noun] += 1;
    }
  }

  for (const { scope, base, latest } of measured) {
    if (base && latest) {
      const densityDrop = base.density != null && latest.density != null
        ? base.density - latest.density : null;
      if (densityDrop != null && points(densityDrop) >= MIN_DENSITY_POINTS && densityDrop > 0) {
        found.push({
          kind: "density-fall",
          magnitude: points(densityDrop),
          name: scope.name,
          href: scope.href,
          // "The only one falling" is the sentence that makes a reader act;
          // without it a single falling branch reads as regional weather.
          text: `${scope.name}: density down ${points(densityDrop).toFixed(1)} points`
            + (densityFalling[scope.noun] === 1 ? `, the only project ${scope.noun} falling` : ""),
        });
      }

      const membershipDrop = base.members - latest.members;
      if (membershipDrop >= MIN_MEMBERSHIP_CHANGE) {
        found.push({
          kind: "membership-fall",
          magnitude: membershipDrop,
          name: scope.name,
          href: scope.href,
          text: `${scope.name}: ${membershipDrop} fewer members`,
        });
      }

      const repsDrop = base.reps - latest.reps;
      if (repsDrop >= MIN_REPS_CHANGE) {
        found.push({
          kind: "reps-fall",
          magnitude: repsDrop,
          name: scope.name,
          href: scope.href,
          text: `${scope.name}: ${repsDrop} fewer ${repsDrop === 1 ? "rep" : "reps"}`,
        });
      }

      const membershipGain = latest.members - base.members;
      if (membershipGain >= MIN_MEMBERSHIP_CHANGE * 3) {
        found.push({
          kind: "standout-gain",
          magnitude: membershipGain,
          name: scope.name,
          href: scope.href,
          text: `${scope.name}: ${membershipGain} more members, the strongest movement in the project`,
        });
      }
    }

    // Activity is logged in the app, so an empty log genuinely means nothing
    // was recorded — unlike the source exports, where a gap can be an upload
    // that hasn't happened.
    if (asOf) {
      const urnSet = new Set(scope.schools.map((s) => String(s.urn)));
      const scopeMeetings = meetings.filter((m) => urnSet.has(String(m.urn)));
      const lastMeeting = scopeMeetings.reduce(
        (latestDate, m) => (!latestDate || m.date > latestDate ? m.date : latestDate), null
      );
      const weeks = lastMeeting ? weeksBetween(lastMeeting, asOf) : null;
      if (lastMeeting == null) {
        found.push({
          kind: "activity-stall",
          magnitude: 999,
          name: scope.name,
          href: scope.href,
          text: `${scope.name}: no workplace meetings logged at all`,
        });
      } else if (weeks != null && weeks >= STALE_ACTIVITY_WEEKS) {
        found.push({
          kind: "activity-stall",
          magnitude: weeks,
          name: scope.name,
          href: scope.href,
          text: `${scope.name}: no meetings logged in ${weeks} weeks`,
        });
      }
    }
  }

  // Only the strongest gain is ever worth a slot; several would turn the band
  // into a good-news feed and blunt the ones that need action.
  const gains = found.filter((f) => f.kind === "standout-gain")
    .sort((a, b) => b.magnitude - a.magnitude);
  const ranked = [
    ...found.filter((f) => f.kind !== "standout-gain"),
    ...gains.slice(0, 1),
  ].sort((a, b) => {
    const byKind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    return byKind !== 0 ? byKind : b.magnitude - a.magnitude;
  });

  // One line per place, strongest signal only. A branch in real trouble trips
  // several rules at once, and letting it take three of five slots buries
  // every other place that needs looking at — which is the opposite of what
  // this band is for. The detail page carries the rest of the story.
  const seen = new Set();
  const items = ranked
    .filter((item) => !seen.has(item.name) && seen.add(item.name))
    .slice(0, limit);

  return { items, baselineMissing, scopesChecked: scopes.length };
}
