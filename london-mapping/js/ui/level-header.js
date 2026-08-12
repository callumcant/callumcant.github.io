// The header block shared by the Branch and MAT detail pages.
//
// Both pages used to open with thirteen or fourteen identically weighted
// tiles. Nothing was emphasised, so nothing was read: a reader had to work out
// for themselves that density matters and "boroughs present" is a label. The
// same four parts now run on both pages, in the same order, so a branch and a
// trust stay comparable at a glance:
//
//   1. Identity   — plain text. Attributes that describe, not measures that move.
//   2. Three tiles — density, rep coverage, members unrepresented. These move.
//   3. Density by staff group — one small bar chart, replacing four tiles and
//      showing the teacher/support gap the tiles hid.
//   4. Footer     — the small stuff, and on the MAT page the committee control.
import { escapeHtml, formatNumber, formatPercent, formatDelta } from "../ui.js";
import { BASELINE_DATE } from "../data/snapshots.js";

// Fixed 0–100% scale rather than one fitted to each page's numbers. Density is
// a share of staff, so 100% is a real ceiling — and a scale that changed per
// branch would make two branches' charts look comparable when they aren't.
const AXIS_MAX = 1;

const BAR_W = 560;
const ROW_H = 26;
const BAR_H = 16;
const LABEL_W = 96;
const VALUE_W = 54;
const TRACK_X = LABEL_W + 8;
const TRACK_W = BAR_W - TRACK_X - VALUE_W;

function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Rounded at the data end only, square against the baseline — a bar rounded at
// both ends reads as floating free of its axis.
function barPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w));
  if (w <= 0) return "";
  return `M${x},${y} H${(x + w - rr).toFixed(1)} A${rr},${rr} 0 0 1 ${(x + w).toFixed(1)},${(y + rr).toFixed(1)}`
    + ` V${(y + h - rr).toFixed(1)} A${rr},${rr} 0 0 1 ${(x + w - rr).toFixed(1)},${(y + h).toFixed(1)} H${x} Z`;
}

/**
 * Horizontal bars for density by staff group, with the overall figure drawn as
 * a reference line. One measure across three groups, so one colour — the bars
 * are magnitudes of the same thing, not separate identities that need hues.
 */
export function densityBars({ teachers, leadership, support, overall }) {
  const groups = [
    { label: "Teachers", value: teachers },
    { label: "Leadership", value: leadership },
    { label: "Support", value: support },
  ];
  const height = groups.length * ROW_H + 34;
  const x = (v) => TRACK_X + (Math.max(0, Math.min(v ?? 0, AXIS_MAX)) / AXIS_MAX) * TRACK_W;

  const rows = groups.map((g, i) => {
    const y = 6 + i * ROW_H;
    const w = g.value == null ? 0 : x(g.value) - TRACK_X;
    return `
      <text class="dbar-label" x="${LABEL_W}" y="${y + BAR_H - 3}" text-anchor="end">${escapeHtml(g.label)}</text>
      <rect class="dbar-track" x="${TRACK_X}" y="${y}" width="${TRACK_W}" height="${BAR_H}" rx="3" />
      ${w > 0 ? `<path class="dbar-fill" d="${barPath(TRACK_X, y, w, BAR_H, 3)}" />` : ""}
      <text class="dbar-value" x="${BAR_W}" y="${y + BAR_H - 3}" text-anchor="end">${escapeHtml(formatPercent(g.value, 1))}</text>`;
  }).join("");

  const refX = overall == null ? null : x(overall);
  const ref = refX == null ? "" : `
    <line class="dbar-ref" x1="${refX.toFixed(1)}" y1="2" x2="${refX.toFixed(1)}" y2="${groups.length * ROW_H + 4}" />
    <text class="dbar-ref-label" x="${refX.toFixed(1)}" y="${groups.length * ROW_H + 18}"
          text-anchor="${refX > TRACK_X + TRACK_W * 0.7 ? "end" : "start"}">overall ${escapeHtml(formatPercent(overall, 1))}</text>`;

  const summary = `Density by staff group: `
    + groups.map((g) => `${g.label} ${formatPercent(g.value, 1)}`).join(", ")
    + `. Overall ${formatPercent(overall, 1)}. Scale runs from 0 to 100 per cent.`;

  return `
    <svg class="density-bars" viewBox="0 0 ${BAR_W} ${height}" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="${escapeHtml(summary)}">
      ${rows}${ref}
    </svg>`;
}

// For most measures a rise is good and the green/red reading is right. For
// members unrepresented it is exactly backwards — more members in schools with
// no rep is worse. The ARROW always follows the number (▼ means fewer), and
// only the colour flips, so direction is never carried by colour alone.
const FLIP = { up: "down", down: "up", flat: "flat" };

function tile({ label, value, hint, delta, invertDelta }) {
  const tone = delta ? (invertDelta ? FLIP[delta.direction] : delta.direction) : "";
  return `
    <div class="tile tile-headline">
      <div class="tile-label">${escapeHtml(label)}</div>
      <div class="tile-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="tile-hint">${escapeHtml(hint)}</div>` : ""}
      ${delta ? `<div class="tile-delta ${tone}">${escapeHtml(delta.text)} since ${escapeHtml(shortDate(BASELINE_DATE))}</div>` : ""}
    </div>`;
}

/**
 * @param {Object} model
 * @param {string[]} model.identityParts  e.g. ["8 schools", "706 staff", "307 members"]
 * @param {Array}  [model.chips]          [{ label, href }] — boroughs on the MAT page
 * @param {Array}  model.tiles            three { label, value, hint, delta }
 * @param {Object} model.density          { total, teachers, leadership, support }
 * @param {string} [model.footerHtml]
 */
export function levelHeaderHtml(model) {
  const chips = (model.chips || []).map((c) =>
    `<a class="chip" href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`).join("");

  return `
    <div class="level-header">
      <p class="level-identity">${model.identityParts.map((p) => escapeHtml(p)).join(" · ")}</p>
      ${chips ? `<div class="level-chips">${chips}</div>` : ""}

      <div class="band-grid level-tiles">
        ${model.tiles.map(tile).join("")}
      </div>

      <div class="card level-density">
        <div class="level-density-title">Density by staff group</div>
        <div class="density-scroll">${densityBars({
          teachers: model.density.teachers,
          leadership: model.density.leadership,
          support: model.density.support,
          overall: model.density.total,
        })}</div>
      </div>

      ${model.footerHtml ? `<div class="level-footer">${model.footerHtml}</div>` : ""}
    </div>`;
}

// Small label/value pair for the footer row — the things worth keeping but not
// worth a headline tile.
export function footerStat(label, value) {
  return `<span class="level-footer-stat"><span class="level-footer-label">${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong></span>`;
}

// The three headline tiles, built identically for a branch and a trust. Taking
// both from one function is what guarantees "rep coverage" means the same
// thing on both pages, rather than a count here and a percentage there.
export function headlineTiles(level, series, base) {
  const latest = series.length ? series[series.length - 1] : null;
  const deltaFor = (field, percent) => (base && latest
    ? formatDelta(base[field], latest[field], { percent })
    : null);

  const withRep = level.schoolCount - level.noRepSchools;
  const unrepresentedShare = level.membersTotal
    ? level.membersInNoRepSchools / level.membersTotal
    : null;

  return [
    {
      label: "Density",
      value: formatPercent(level.densityTotal),
      hint: `${formatNumber(level.membersTotal)} of ${formatNumber(level.headcountTotal)} staff`,
      delta: deltaFor("density", true),
    },
    {
      label: "Rep coverage",
      value: formatPercent(level.repCoveragePercent),
      hint: `${formatNumber(withRep)} of ${formatNumber(level.schoolCount)} schools have a rep`,
      delta: deltaFor("repCoverage", true),
    },
    {
      label: "Members unrepresented",
      value: formatNumber(level.membersInNoRepSchools),
      hint: `${formatPercent(unrepresentedShare)} of members, in schools with no rep`,
      delta: deltaFor("membersUnrepresented", false),
      invertDelta: true,
    },
  ];
}
