// Weekly capture of the numbers that move, so organising impact is
// measurable rather than remembered.
//
// The workbook only ever stores *current state* — each data refresh overwrites
// the last figures. Without this, "membership is up 12% since September" is an
// assertion nobody can check. Snapshots are append-only and must never be
// edited: they are the only record of how things looked at the time, and
// history cannot be reconstructed after the fact.
//
// Why the trigger lives in the browser: the site is static, so nothing runs
// unless someone has it open. The first person to load the app in a given week
// silently captures a snapshot — no one clicks anything. A scheduled flow in
// the tenant (docs/scheduled-snapshot.md) is the belt-and-braces upgrade that
// keeps capture running even in a week when nobody opens the site.
import { loadAll, getState, appendSnapshotRows } from "./store.js";
import { buildSchoolLevel } from "./rollups.js";

const CAPTURE_INTERVAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Every "since" comparison on the dashboard runs from here: the first data
// upload. Defined once so it changes in one place — a delta measured from a
// different starting line in two places on the same page is worse than no
// delta at all.
export const BASELINE_DATE = "2026-08-09";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function latestSnapshotDate(snapshots) {
  let latest = null;
  for (const s of snapshots) {
    if (!latest || s.snapshotDate > latest) latest = s.snapshotDate;
  }
  return latest;
}

export function daysSince(isoDate) {
  if (!isoDate) return Infinity;
  const then = new Date(`${isoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return Infinity;
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.floor((today - then) / MS_PER_DAY);
}

export function isCaptureDue(snapshots) {
  return daysSince(latestSnapshotDate(snapshots)) >= CAPTURE_INTERVAL_DAYS;
}

// Two organisers opening the site at the same moment can both see a stale
// snapshot and both write. De-duplicating on read makes that harmless: one
// row per (snapshotDate, urn) wins and the duplicate is ignored. This is a
// deliberate trade — without a backend there's nothing to lock against.
export function dedupeSnapshots(snapshots) {
  const seen = new Set();
  const out = [];
  for (const s of snapshots) {
    const key = `${s.snapshotDate}|${s.urn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// The dashboard draws five series from the same array — one for the chosen
// scope, four more for the two comparisons — and each one used to re-scan every
// snapshot row to de-duplicate it. That is the same answer five times over: at
// London scale it was most of the page's work.
//
// Keyed on the array's identity AND its length, because appendSnapshotRows
// pushes onto the very same array a capture ran against. Identity alone would
// keep serving a pre-capture answer for the rest of the page's life.
let dedupeCache = { source: null, length: -1, result: null };

function dedupedOnce(snapshots) {
  if (dedupeCache.source === snapshots && dedupeCache.length === snapshots.length) {
    return dedupeCache.result;
  }
  const result = dedupeSnapshots(snapshots);
  dedupeCache = { source: snapshots, length: snapshots.length, result };
  return result;
}

export function buildSnapshotRows(schools, snapshotDate = todayIso()) {
  return schools.map((s) => ({
    snapshotDate,
    urn: s.urn,
    membersTotal: s.membersTotal,
    membersTeachers: s.membersTeachers,
    membersLeadership: s.membersLeadership,
    membersSupport: s.membersSupport,
    headcountTotal: s.headcountTotal,
    headcountTeachers: s.headcountTeachers,
    headcountLeadership: s.headcountLeadership,
    headcountSupport: s.headcountSupport,
    repCount: s.repCount,
  }));
}

// Groups snapshots into a date-ordered series, aggregating whichever schools
// the caller cares about. Used by trend views; safe to call with a subset.
export function snapshotSeries(snapshots, urns = null) {
  const urnFilter = urns ? new Set(urns.map(String)) : null;
  const byDate = new Map();
  for (const s of dedupedOnce(snapshots)) {
    if (urnFilter && !urnFilter.has(String(s.urn))) continue;
    if (!byDate.has(s.snapshotDate)) {
      byDate.set(s.snapshotDate, {
        date: s.snapshotDate, members: 0, membersTeachers: 0, membersLeadership: 0,
        membersSupport: 0, reps: 0, headcount: 0, headcountTeachers: 0,
        headcountLeadership: 0, headcountSupport: 0, schools: 0,
        schoolsWithRep: 0, membersUnrepresented: 0,
      });
    }
    const point = byDate.get(s.snapshotDate);
    point.members += s.membersTotal || 0;
    point.membersTeachers += s.membersTeachers || 0;
    point.membersLeadership += s.membersLeadership || 0;
    point.membersSupport += s.membersSupport || 0;
    point.reps += s.repCount || 0;
    point.headcount += s.headcountTotal || 0;
    point.headcountTeachers += s.headcountTeachers || 0;
    point.headcountLeadership += s.headcountLeadership || 0;
    point.headcountSupport += s.headcountSupport || 0;
    point.schools += 1;
    // Rep coverage and unrepresented membership have to be counted per school
    // here — they can't be recovered later from the summed totals, because a
    // total rep count says nothing about how those reps are spread.
    if ((s.repCount || 0) > 0) point.schoolsWithRep += 1;
    else point.membersUnrepresented += s.membersTotal || 0;
  }
  // Density per point is summed-then-divided, matching the dictionary's rule
  // that it can never be averaged from constituent parts.
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((p) => ({
      ...p,
      density: p.headcount ? p.members / p.headcount : null,
      repCoverage: p.schools ? p.schoolsWithRep / p.schools : null,
      densityTeachers: p.headcountTeachers ? p.membersTeachers / p.headcountTeachers : null,
      densityLeadership: p.headcountLeadership ? p.membersLeadership / p.headcountLeadership : null,
      densitySupport: p.headcountSupport ? p.membersSupport / p.headcountSupport : null,
    }));
}

// The comparison point for "since the baseline": the earliest snapshot taken
// on or after the baseline date.
//
// Deliberately returns null rather than falling back to the first available
// snapshot. Quietly comparing against whatever happens to be earliest would
// produce a delta measured from an unstated starting line, which reads as
// authoritative and isn't. The page says so instead.
export function baselinePoint(series, baselineDate = BASELINE_DATE) {
  const index = series.findIndex((p) => p.date >= baselineDate);
  if (index === -1) return null;
  // A baseline that is also the newest snapshot has nothing to compare to yet.
  if (index === series.length - 1) return null;
  return series[index];
}

// The most recent snapshot at least `weeks` before the newest one — the short
// comparison that sits alongside the baseline figure. Nulls out rather than
// reaching for the oldest point when the series is too short to span it.
export function pointWeeksBefore(series, weeks = 4) {
  if (series.length < 2) return null;
  const latest = series[series.length - 1];
  const cutoff = new Date(`${latest.date}T00:00:00Z`).getTime() - weeks * 7 * MS_PER_DAY;
  let found = null;
  for (const point of series.slice(0, -1)) {
    if (new Date(`${point.date}T00:00:00Z`).getTime() <= cutoff) found = point;
  }
  return found;
}

// The app loads a recent window of snapshots plus the baseline week, not the
// whole history (see readSnapshotWindow in graph-client.js), so a series can
// arrive with a hole in the middle: one point at the baseline, then a year's
// silence, then twelve weekly points.
//
// This returns the trailing run of points that really are consecutive weekly
// captures. Anything drawn on an evenly-spaced axis — the sparklines — has to
// use this rather than the raw series, or the baseline would be plotted one
// step away from a reading taken nine months later and the line would describe
// a change that never happened.
const MAX_CADENCE_GAP_DAYS = 10; // a weekly cadence, with slack for a late capture

export function recentRun(series, maxGapDays = MAX_CADENCE_GAP_DAYS) {
  if (series.length === 0) return [];
  let start = series.length - 1;
  for (let i = series.length - 1; i > 0; i--) {
    const gap =
      (new Date(`${series[i].date}T00:00:00Z`).getTime()
        - new Date(`${series[i - 1].date}T00:00:00Z`).getTime()) / MS_PER_DAY;
    if (gap > maxGapDays) break;
    start = i - 1;
  }
  return series.slice(start);
}

// Distinct capture dates and the span they cover, for the cadence line that
// tells a reader this is a considered position rather than a live feed.
//
// `count`/`first`/`last` describe the unbroken recent run, because that is what
// the page can honestly claim to be showing. `earlier` carries the detached
// baseline point when there is one, so the line can mention it separately
// instead of implying a continuous run that was never loaded.
export function seriesCadence(series) {
  if (series.length === 0) return { count: 0, first: null, last: null, earlier: null };
  const run = recentRun(series);
  return {
    count: run.length,
    first: run[0].date,
    last: run[run.length - 1].date,
    earlier: run.length < series.length ? series[0].date : null,
  };
}

let captureAttempted = false;

// Called after first paint. Deliberately swallows failures: a snapshot is
// bookkeeping, and a Graph hiccup must never take the dashboard down with it.
export async function maybeCaptureSnapshot() {
  if (captureAttempted) return { captured: false, reason: "already-attempted" };
  captureAttempted = true;

  try {
    await loadAll();
    const state = getState();
    if (!isCaptureDue(state.snapshots)) {
      return { captured: false, reason: "not-due" };
    }

    const schools = buildSchoolLevel(state);
    if (schools.length === 0) return { captured: false, reason: "no-schools" };

    // Re-check immediately before writing. Doesn't eliminate the race above,
    // but closes the window between page load and this write.
    if (!isCaptureDue(getState().snapshots)) {
      return { captured: false, reason: "not-due" };
    }

    const rows = buildSnapshotRows(schools);
    await appendSnapshotRows(rows);
    console.info(`[snapshots] captured ${rows.length} rows for ${rows[0].snapshotDate}`);
    return { captured: true, rows: rows.length };
  } catch (err) {
    console.error("[snapshots] capture failed; continuing without it", err);
    return { captured: false, reason: "error", error: err };
  }
}
