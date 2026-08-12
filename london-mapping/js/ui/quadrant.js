// Organising quadrant — one dot per school, density against ballot turnout.
//
// The point of the chart is comparison, not scoring: the dividing lines sit at
// the MEDIAN of whatever is currently plotted, so a school is "strong" relative
// to its own branch or trust rather than against a threshold someone invented.
// Change the filters and the medians move. That is deliberate.
//
// Reading it:
//   x — density (members ÷ headcount, from Stratum)
//   y — 2026 ballot turnout (from the Pay Dashboard)
//   dot AREA — total members (area, not radius: radius would exaggerate size
//              roughly fourfold at the top end)
//   dot FILL — filled if the school has a rep, hollow if it has none
//
// Nothing here is carried by hue alone, following the colourblind rule set out
// in js/pages/map.js: rep status is fill-vs-hollow and membership is size, so
// the chart still reads in greyscale.
//
// The chart is always an addition, never the only route to the data — the
// schools table below it carries the same numbers in full.
import { escapeHtml, formatNumber, formatPercent } from "../ui.js";

// Below this many plotted schools a median says nothing useful, so the chart
// steps aside rather than implying a comparison it can't support.
const MIN_PLOTTED = 5;

const MIN_MEMBERS_OPTIONS = [
  { value: 0, label: "No minimum" },
  { value: 10, label: "10+ members" },
  { value: 20, label: "20+ members" },
];

// viewBox units. The SVG scales to its container via preserveAspectRatio, so
// these are proportions rather than pixels.
const W = 720;
const H = 470;
const PAD = { top: 26, right: 26, bottom: 56, left: 66 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const MAX_R = 17;
const MIN_R = 4.5;

export const QUADRANTS = {
  strong: {
    key: "strong",
    label: "Strong",
    hint: "organised and mobilised",
    full: "Strong (organised and mobilised)",
  },
  core: {
    key: "core",
    label: "Committed core",
    hint: "mobilised, low density — recruitment ground",
    full: "Committed core (mobilised, low density — recruitment ground)",
  },
  members: {
    key: "members",
    label: "Members, not mobilised",
    hint: "density without turnout — contact and rep capacity",
    full: "Members, not mobilised (density without turnout — contact and rep capacity)",
  },
  cold: {
    key: "cold",
    label: "Cold",
    hint: "needs a rep and a first conversation",
    full: "Cold (needs a rep and a first conversation)",
  },
};

// ---------------------------------------------------------------------------
// Pure logic — no DOM. The school page reuses classifyQuadrant() to badge a
// single school against its branch, so none of this may touch the document.
// ---------------------------------------------------------------------------

export function isPlottable(school) {
  return school
    && school.densityTotal != null && !Number.isNaN(school.densityTotal)
    && school.turnout2026 != null && !Number.isNaN(school.turnout2026);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hasSpread(values) {
  return Math.min(...values) !== Math.max(...values);
}

/**
 * Everything the chart and the badge both need: which schools are in scope,
 * where the medians fall, and how many schools each quadrant holds.
 *
 * @param {Array} peers   schools to compare against (a branch's or a MAT's)
 * @param {Object} options  { minMembers = 0, phase = "All" }
 */
export function quadrantContext(peers, options = {}) {
  const minMembers = options.minMembers ?? 0;
  const phase = options.phase ?? "All";

  const withData = peers.filter(isPlottable);
  const inPhase = phase === "All" ? withData : withData.filter((s) => s.phase === phase);
  const plotted = inPhase.filter((s) => (s.membersTotal ?? 0) >= minMembers);

  const context = {
    plotted,
    // Split by which source is missing rather than lumped together: "no ballot
    // data" is a Pay Dashboard gap, a missing density is a Stratum one, and
    // they send you to different places to fix it.
    excludedNoTurnout: peers.filter((s) => s.densityTotal != null && s.turnout2026 == null).length,
    excludedNoDensity: peers.filter((s) => s.densityTotal == null).length,
    excludedByPhase: withData.length - inPhase.length,
    excludedByMinimum: inPhase.length - plotted.length,
    anyTurnoutAnywhere: peers.some((s) => s.turnout2026 != null),
    medianDensity: null,
    medianTurnout: null,
    densitySplits: false,
    turnoutSplits: false,
    counts: { strong: 0, core: 0, members: 0, cold: 0 },
  };

  if (plotted.length < MIN_PLOTTED) return context;

  const densities = plotted.map((s) => s.densityTotal);
  const turnouts = plotted.map((s) => s.turnout2026);
  context.densitySplits = hasSpread(densities);
  context.turnoutSplits = hasSpread(turnouts);
  // A median only divides anything if the values actually differ. Where they
  // don't, the line is withheld rather than drawn through every dot.
  if (context.densitySplits) context.medianDensity = median(densities);
  if (context.turnoutSplits) context.medianTurnout = median(turnouts);

  if (context.densitySplits && context.turnoutSplits) {
    for (const school of plotted) {
      context.counts[quadrantKey(school, context.medianDensity, context.medianTurnout)] += 1;
    }
  }
  return context;
}

function quadrantKey(school, medianDensity, medianTurnout) {
  const denseEnough = school.densityTotal >= medianDensity;
  const mobilised = school.turnout2026 >= medianTurnout;
  if (denseEnough && mobilised) return "strong";
  if (!denseEnough && mobilised) return "core";
  if (denseEnough && !mobilised) return "members";
  return "cold";
}

/**
 * Which quadrant one school falls into, relative to its peers.
 * Returns a QUADRANTS entry, or null when the comparison can't be made —
 * missing data, too few peers, or peers with no spread to divide.
 */
export function classifyQuadrant(school, peers, options = {}) {
  if (!isPlottable(school)) return null;
  const context = options.context ?? quadrantContext(peers, options);
  if (!context.densitySplits || !context.turnoutSplits) return null;
  return QUADRANTS[quadrantKey(school, context.medianDensity, context.medianTurnout)];
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let nextId = 0;

/**
 * Draw the quadrant into `container` (expected to be the inner div of a card).
 *
 * @param {Element} container
 * @param {Array} schools      the branch's or trust's schools
 * @param {Object} options     { title, minMembersDefault }
 */
export function renderQuadrant(container, schools, options = {}) {
  const title = options.title || "Organising quadrant";
  const id = `quadrant-${nextId++}`;
  let phase = "All";
  let minMembers = options.minMembersDefault ?? 10;

  const withData = schools.filter(isPlottable);

  // Two different "can't draw this" cases, and they want different words. No
  // ballot data at all is a data-collection gap; too few schools is a sample
  // too small for a median to mean anything.
  if (!schools.some((s) => s.turnout2026 != null)) {
    container.innerHTML = `<div class="empty-state">No 2026 ballot turnout has been recorded for
      these schools yet, so there is nothing to plot turnout against. The chart appears once
      turnout figures reach the Pay Dashboard.</div>`;
    return;
  }
  if (withData.length < MIN_PLOTTED) {
    container.innerHTML = `<div class="empty-state">Only ${withData.length}
      ${withData.length === 1 ? "school has" : "schools have"} both a density and a 2026 turnout
      figure. The chart needs at least ${MIN_PLOTTED} before the midpoints mean anything —
      the table below has the figures in the meantime.</div>`;
    return;
  }

  const phases = [...new Set(withData.map((s) => s.phase).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="quadrant">
      <div class="quadrant-controls">
        <label for="${id}-phase">Phase</label>
        <select id="${id}-phase">
          <option value="All">All phases</option>
          ${phases.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
        </select>
        <label for="${id}-min">Minimum membership</label>
        <select id="${id}-min">
          ${MIN_MEMBERS_OPTIONS.map((o) => `
            <option value="${o.value}"${o.value === minMembers ? " selected" : ""}>${escapeHtml(o.label)}</option>
          `).join("")}
        </select>
      </div>
      <p class="quadrant-caption">The dividing lines sit at the median of the schools currently
        plotted, so they move every time you change a filter — a school is "strong" compared with
        the others shown, not against a fixed target. Dot size is total membership; filled dots
        have a rep, hollow ones don't.</p>
      <div class="quadrant-plot" id="${id}-plot"></div>
      <p class="quadrant-footnote" id="${id}-footnote"></p>
    </div>
  `;

  const plot = container.querySelector(`#${id}-plot`);
  const footnote = container.querySelector(`#${id}-footnote`);
  const phaseSelect = container.querySelector(`#${id}-phase`);
  const minSelect = container.querySelector(`#${id}-min`);

  phaseSelect.addEventListener("change", () => { phase = phaseSelect.value; draw(); });
  minSelect.addEventListener("change", () => { minMembers = Number(minSelect.value); draw(); });

  draw();

  function draw() {
    const context = quadrantContext(schools, { phase, minMembers });
    footnote.innerHTML = footnoteHtml(context, phase, minMembers);

    if (context.plotted.length < MIN_PLOTTED) {
      plot.innerHTML = `<div class="empty-state">${context.plotted.length}
        ${context.plotted.length === 1 ? "school matches" : "schools match"} these filters —
        too few for a median to say anything. Widen the phase or lower the minimum membership.</div>`;
      return;
    }

    plot.innerHTML = svgHtml(context, title);
    wireDots(plot, context);
  }
}

function footnoteHtml(context, phase, minMembers) {
  const parts = [];
  if (context.excludedNoTurnout > 0) {
    parts.push(`${context.excludedNoTurnout}
      ${context.excludedNoTurnout === 1 ? "school" : "schools"} not shown — no ballot data`);
  }
  if (context.excludedNoDensity > 0) {
    parts.push(`${context.excludedNoDensity}
      ${context.excludedNoDensity === 1 ? "school" : "schools"} not shown — no headcount, so no
      density to plot`);
  }
  if (phase !== "All" && context.excludedByPhase > 0) {
    parts.push(`${context.excludedByPhase} outside ${escapeHtml(phase)}`);
  }
  if (minMembers > 0 && context.excludedByMinimum > 0) {
    parts.push(`${context.excludedByMinimum} below ${minMembers} members`);
  }
  if (context.plotted.length >= MIN_PLOTTED && !context.densitySplits) {
    parts.push(`every school plotted has the same density, so there is no meaningful midpoint to
      split them on — the vertical line is left off`);
  }
  if (context.plotted.length >= MIN_PLOTTED && !context.turnoutSplits) {
    parts.push(`every school plotted has the same turnout, so there is no meaningful midpoint to
      split them on — the horizontal line is left off`);
  }
  if (!parts.length) return "";
  return `${parts.join(". ")}.`;
}

// Domain always starts at 0 — these are percentages, and a truncated axis would
// make a 4-point gap look like a chasm. Rounded up past the largest value so
// the biggest dot isn't clipped by the frame.
function axisMax(values) {
  const max = Math.max(...values);
  return Math.min(1, Math.max(0.2, Math.ceil(max * 10 + 0.5) / 10));
}

function ticks(max) {
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += 0.2) out.push(Math.round(v * 100) / 100);
  return out;
}

function svgHtml(context, title) {
  const schools = context.plotted;
  const maxDensity = axisMax(schools.map((s) => s.densityTotal));
  const maxTurnout = axisMax(schools.map((s) => s.turnout2026));
  const maxMembers = Math.max(...schools.map((s) => s.membersTotal || 0), 1);

  const x = (d) => PAD.left + (d / maxDensity) * PLOT_W;
  const y = (t) => PAD.top + PLOT_H - (t / maxTurnout) * PLOT_H;
  // Area, not radius: r ∝ √members. The floor keeps the smallest schools
  // clickable and keyboard-targetable rather than mathematically pure.
  const r = (m) => Math.max(MIN_R, MAX_R * Math.sqrt((m || 0) / maxMembers));

  const gridlines = [
    ...ticks(maxDensity).map((t) => `<line class="quadrant-grid" x1="${x(t).toFixed(1)}" y1="${PAD.top}" x2="${x(t).toFixed(1)}" y2="${PAD.top + PLOT_H}" />`),
    ...ticks(maxTurnout).map((t) => `<line class="quadrant-grid" x1="${PAD.left}" y1="${y(t).toFixed(1)}" x2="${PAD.left + PLOT_W}" y2="${y(t).toFixed(1)}" />`),
  ].join("");

  const axisLabels = [
    ...ticks(maxDensity).map((t) => `<text class="quadrant-tick" x="${x(t).toFixed(1)}" y="${PAD.top + PLOT_H + 20}" text-anchor="middle">${Math.round(t * 100)}%</text>`),
    ...ticks(maxTurnout).map((t) => `<text class="quadrant-tick" x="${PAD.left - 10}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${Math.round(t * 100)}%</text>`),
    `<text class="quadrant-axis-title" x="${PAD.left + PLOT_W / 2}" y="${H - 12}" text-anchor="middle">Density (members ÷ headcount)</text>`,
    `<text class="quadrant-axis-title" text-anchor="middle" transform="translate(16 ${PAD.top + PLOT_H / 2}) rotate(-90)">2026 ballot turnout</text>`,
  ].join("");

  const medianLines = [
    context.medianDensity != null
      ? `<line class="quadrant-median" x1="${x(context.medianDensity).toFixed(1)}" y1="${PAD.top}" x2="${x(context.medianDensity).toFixed(1)}" y2="${PAD.top + PLOT_H}" />
         <text class="quadrant-median-label" x="${(x(context.medianDensity) + 6).toFixed(1)}" y="${PAD.top + 12}">median density ${formatPercent(context.medianDensity, 0)}</text>`
      : "",
    context.medianTurnout != null
      ? `<line class="quadrant-median" x1="${PAD.left}" y1="${y(context.medianTurnout).toFixed(1)}" x2="${PAD.left + PLOT_W}" y2="${y(context.medianTurnout).toFixed(1)}" />
         <text class="quadrant-median-label" x="${PAD.left + PLOT_W - 4}" y="${(y(context.medianTurnout) - 7).toFixed(1)}" text-anchor="end">median turnout ${formatPercent(context.medianTurnout, 0)}</text>`
      : "",
  ].join("");

  // Corner labels only make sense once both lines are drawn — without them
  // there are no quadrants, just a scatter. Painted after the dots, because the
  // top-right corner is exactly where the strongest (and largest) schools sit;
  // the halo in the stylesheet keeps them legible where they cross one.
  const left = PAD.left + 10;
  const right = PAD.left + PLOT_W - 10;
  const corners = context.densitySplits && context.turnoutSplits
    ? [
        cornerLabel(QUADRANTS.strong, right, PAD.top + 16, "end"),
        cornerLabel(QUADRANTS.core, left, PAD.top + 16, "start"),
        cornerLabel(QUADRANTS.members, right, PAD.top + PLOT_H - 22, "end"),
        cornerLabel(QUADRANTS.cold, left, PAD.top + PLOT_H - 22, "start"),
      ].join("")
    : "";

  // Largest first, so a big school can never sit on top of a small one and hide
  // it entirely. Hover and focus lift a dot into the highlight layer instead of
  // reordering these, which would disturb the tab order mid-interaction.
  const dots = [...schools]
    .sort((a, b) => (b.membersTotal || 0) - (a.membersTotal || 0))
    .map((s) => dotSvg(s, x(s.densityTotal), y(s.turnout2026), r(s.membersTotal)))
    .join("");

  // The SVG carries an explicit tabindex because browsers disagree about
  // whether an <svg> is tabbable: one stop that reads the whole distribution
  // aloud before you reach the individual dots, the same way everywhere.
  // The scroll wrapper is what lets the chart keep a legible minimum width on a
  // phone: it scrolls inside its own box rather than squeezing the labels down
  // to nothing or forcing the whole page sideways.
  return `
    <div class="quadrant-scroll">
    <svg class="quadrant-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
         role="img" tabindex="0" aria-label="${escapeHtml(summaryLabel(context, title))}">
      <g aria-hidden="true">${gridlines}${axisLabels}${medianLines}</g>
      <g class="quadrant-dots">${dots}</g>
      <g class="quadrant-labels" aria-hidden="true">${corners}</g>
      <g class="quadrant-highlight" aria-hidden="true"></g>
    </svg>
    </div>
  `;
}

function cornerLabel(quadrant, xPos, yPos, anchor) {
  return `<text class="quadrant-corner" x="${xPos}" y="${yPos}" text-anchor="${anchor}">
      <tspan x="${xPos}">${escapeHtml(quadrant.label)}</tspan>
      <tspan x="${xPos}" dy="15" class="quadrant-corner-hint">${escapeHtml(quadrant.hint)}</tspan>
    </text>`;
}

function summaryLabel(context, title) {
  const n = context.plotted.length;
  if (!context.densitySplits || !context.turnoutSplits) {
    return `${title}: ${n} schools plotted by density and 2026 ballot turnout. The schools shown
      do not differ enough on one axis to be split into quadrants.`;
  }
  const c = context.counts;
  return `${title}: ${n} schools plotted by density and 2026 ballot turnout;
    ${c.strong} strong, ${c.members} members-not-mobilised, ${c.core} committed core,
    ${c.cold} cold. Each school is also listed in the table below.`;
}

function dotSvg(school, cx, cy, radius) {
  const label = `${school.schoolName}, density ${formatPercent(school.densityTotal, 0)}, `
    + `turnout ${formatPercent(school.turnout2026, 0)}, ${formatNumber(school.membersTotal)} members, `
    + `${school.repCount} ${school.repCount === 1 ? "rep" : "reps"}`;
  return `<circle class="quadrant-dot${school.repCount > 0 ? "" : " no-rep"}"
    cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}"
    data-urn="${escapeHtml(String(school.urn))}"
    tabindex="0" role="link" aria-label="${escapeHtml(label)}" />`;
}

function wireDots(plot, context) {
  const svg = plot.querySelector(".quadrant-svg");
  const highlight = plot.querySelector(".quadrant-highlight");
  const byUrn = new Map(context.plotted.map((s) => [String(s.urn), s]));

  const tip = document.createElement("div");
  tip.className = "quadrant-tooltip";
  tip.hidden = true;
  // Announced through each dot's aria-label instead; a duplicate live region
  // would read every school name twice on arrow-key navigation.
  tip.setAttribute("aria-hidden", "true");
  plot.appendChild(tip);

  function show(circle) {
    const school = byUrn.get(circle.dataset.urn);
    if (!school) return;

    // A copy drawn last, so the dot under the pointer is never buried by a
    // larger neighbour. --focus-ring is a box-shadow token and box-shadow
    // doesn't paint on SVG shapes, so the ring is drawn at the same width and
    // accent colour instead.
    highlight.innerHTML = `
      <circle class="quadrant-ring" cx="${circle.getAttribute("cx")}" cy="${circle.getAttribute("cy")}"
        r="${(Number(circle.getAttribute("r")) + 5).toFixed(1)}" />
      <circle class="quadrant-dot quadrant-dot-lifted${school.repCount > 0 ? "" : " no-rep"}"
        cx="${circle.getAttribute("cx")}" cy="${circle.getAttribute("cy")}" r="${circle.getAttribute("r")}" />`;

    tip.innerHTML = `
      <strong>${escapeHtml(school.schoolName)}</strong>
      <span>Density ${formatPercent(school.densityTotal)}</span>
      <span>2026 turnout ${formatPercent(school.turnout2026)}</span>
      <span>${formatNumber(school.membersTotal)} members</span>
      <span>${school.repCount} ${school.repCount === 1 ? "rep" : "reps"}</span>`;
    tip.hidden = false;

    const dotBox = circle.getBoundingClientRect();
    const plotBox = plot.getBoundingClientRect();
    const tipBox = tip.getBoundingClientRect();
    const left = dotBox.left - plotBox.left + dotBox.width / 2 - tipBox.width / 2;
    tip.style.left = `${Math.max(0, Math.min(left, plotBox.width - tipBox.width))}px`;
    // Above the dot by preference, below it when there's no room at the top,
    // clamped so it never hangs off the bottom of the plot either.
    const above = dotBox.top - plotBox.top - tipBox.height - 8;
    const top = above < 0 ? dotBox.bottom - plotBox.top + 8 : above;
    tip.style.top = `${Math.max(0, Math.min(top, plotBox.height - tipBox.height))}px`;
  }

  function hide() {
    highlight.innerHTML = "";
    tip.hidden = true;
  }

  function open(urn) {
    window.location.hash = `#/schools/${urn}`;
  }

  svg.addEventListener("pointerover", (e) => {
    if (e.target.classList.contains("quadrant-dot")) show(e.target);
  });
  svg.addEventListener("pointerout", (e) => {
    if (e.target.classList.contains("quadrant-dot")) hide();
  });
  svg.addEventListener("focusin", (e) => {
    if (e.target.classList.contains("quadrant-dot")) show(e.target);
  });
  svg.addEventListener("focusout", hide);
  svg.addEventListener("click", (e) => {
    if (e.target.classList.contains("quadrant-dot")) open(e.target.dataset.urn);
  });
  svg.addEventListener("keydown", (e) => {
    if (!e.target.classList.contains("quadrant-dot")) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault(); // Space would otherwise scroll the page
      open(e.target.dataset.urn);
    }
  });
}
