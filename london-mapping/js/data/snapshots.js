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
  for (const s of dedupeSnapshots(snapshots)) {
    if (urnFilter && !urnFilter.has(String(s.urn))) continue;
    if (!byDate.has(s.snapshotDate)) {
      byDate.set(s.snapshotDate, {
        date: s.snapshotDate, members: 0, membersTeachers: 0, membersSupport: 0,
        reps: 0, headcount: 0, headcountTeachers: 0, headcountSupport: 0, schools: 0,
      });
    }
    const point = byDate.get(s.snapshotDate);
    point.members += s.membersTotal || 0;
    point.membersTeachers += s.membersTeachers || 0;
    point.membersSupport += s.membersSupport || 0;
    point.reps += s.repCount || 0;
    point.headcount += s.headcountTotal || 0;
    point.headcountTeachers += s.headcountTeachers || 0;
    point.headcountSupport += s.headcountSupport || 0;
    point.schools += 1;
  }
  // Density per point is summed-then-divided, matching the dictionary's rule
  // that it can never be averaged from constituent parts.
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((p) => ({
      ...p,
      density: p.headcount ? p.members / p.headcount : null,
      densityTeachers: p.headcountTeachers ? p.membersTeachers / p.headcountTeachers : null,
      densitySupport: p.headcountSupport ? p.membersSupport / p.headcountSupport : null,
    }));
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
