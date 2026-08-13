// Map of schools, for visualising a patch: where the schools actually are,
// which cluster together, and which un-repped school sits next to a strong one.
//
// Three organising jobs, served by filters rather than by modes:
//   - MAT geography      filter to a trust and see how far it straddles boroughs
//   - visit planning     filter to a branch and read names against positions
//   - the dispute picture  colour by dispute status
//
// Deliberate constraints:
// - The Schools table stays the canonical view. A marker layer is not usable
//   with a screen reader, so the map is an addition, never the only route to
//   anything. Every school here is in that table too.
// - Leaflet and the tiles come from a CDN, which some networks block. A
//   blocked CDN must produce an explanation and a link to the table, never a
//   blank page — hence the load-with-fallback below.
//
// ENCODING. Three variables, and no more:
//   colour  the selected metric, on a scale fixed in code
//   size    membership
//   fill    rep status — filled has one, hollow doesn't
//
// Fill carries rep status in EVERY view, not only when colour-by is set to rep
// coverage. That is one more variable than the strict "one variable per view"
// rule allows, and it is deliberate: rep gaps are the thing organisers are
// always hunting, so they stay legible whatever else is being asked. It also
// matches the quadrant (js/ui/quadrant.js), so both graphics teach the same
// visual language. The consequence is that hollow is spoken for, so "no data"
// for the selected metric is a muted grey sitting outside the ramp instead.
//
// Per the colourblind finding in the design spec, nothing here leans on hue
// alone. Rep status is fill, membership is size, and the metric ramps are
// monotonic in luminance so they survive greyscale. Dispute status is the one
// genuinely categorical scale; it is backed by the word in the popup, by the
// list panel, and by the "In a live dispute only" filter, which isolates the
// live cases without asking anyone to read a colour.
import { loadAll } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { geocodeMissing, schoolsNeedingGeocode, geoByUrn } from "../data/geocode.js";
import { escapeHtml, formatNumber, formatPercent, showToast, prefersDark, onThemeChange } from "../ui.js";
import { createMapCanvas } from "../ui/map-canvas.js";

// The list panel is a reading aid beside the map, not a table. Past a couple of
// hundred names nobody is reading it, and the Schools table is the thing that
// sorts and exports.
const MAX_LIST_ROWS = 200;

// How recently a dispute has to have been resolved to still count as part of
// the picture. Three years is roughly "within the memory of the current staff".
const DISPUTE_WINDOW_YEARS = 3;

const NO_DATA = "nodata";
const GREY = "#9AA3A8";

// ---------------------------------------------------------------------------
// Colour scales.
//
// Every break here is an ABSOLUTE constant, not something computed from the
// data. That is what makes a colour mean the same thing in every view — and it
// goes further than recomputing once per session would, because it also holds
// from one week to the next. A screenshot taken last month still means what it
// meant. Breaks derived from the loaded dataset would shift silently every time
// the workbook was updated, and cross-borough comparison would quietly break.
//
// The numbers are stated in the legend for the same reason.
// ---------------------------------------------------------------------------

function bucketOfRate(rate, breaks) {
  if (rate == null || Number.isNaN(rate)) return NO_DATA;
  for (let i = 0; i < breaks.length; i += 1) {
    if (rate < breaks[i]) return `b${i}`;
  }
  return `b${breaks.length}`;
}

// A metric that is a proportion. `weight` returns the numerator and denominator
// behind a school's value so a cluster can be summed and then divided.
function rateScale({ label, breaks, colours, legend, valueOf, weight, note }) {
  const colourMap = { ...colours, [NO_DATA]: GREY };
  return {
    label,
    note,
    colours: colourMap,
    bucketOf: (s) => bucketOfRate(valueOf(s), breaks),
    weight,
    // -----------------------------------------------------------------------
    // THE RULE, from the data dictionary and js/data/rollups.js:37-48. A rate
    // across a group is recalculated from the summed numerator and the summed
    // denominator. It is NEVER the mean of the members' rates. A 10-staff
    // school at 90% and a 200-staff school at 10% average to 50%; the true
    // figure is 13.8%. A cluster is exactly such a group, so it goes through
    // here. If you are tempted to "simplify" this into an average, don't.
    // -----------------------------------------------------------------------
    aggregate: (points) => {
      let num = 0;
      let den = 0;
      for (const p of points) {
        if (p.den) {
          num += p.num;
          den += p.den;
        }
      }
      return den ? bucketOfRate(num / den, breaks) : NO_DATA;
    },
    legend,
  };
}

const SCALES = {
  rep: rateScale({
    label: "Rep coverage",
    breaks: [0.01, 0.5, 0.8],
    // Amber at the bottom and teal at the top is the convention the rest of the
    // app already teaches. An individual school is only ever 0% or 100%, so it
    // lands on one of the two ends; the middle steps are what clusters use.
    colours: { b0: "#A15C00", b1: "#8ECDD1", b2: "#3E9BA3", b3: "#00747C" },
    valueOf: (s) => (s.repCount > 0 ? 1 : 0),
    weight: (s) => ({ num: s.repCount > 0 ? 1 : 0, den: 1 }),
    legend: [
      { bucket: "b0", text: "No rep" },
      { bucket: "b1", text: "Under 50% have a rep" },
      { bucket: "b2", text: "50–80%" },
      { bucket: "b3", text: "80%+ / has a rep" },
    ],
    note: "A single school is either 0% or 100%; the middle steps are cluster rates.",
  }),

  density: rateScale({
    label: "Density",
    breaks: [0.2, 0.35, 0.5],
    // The old map's palest step was #cde2fb, which is near-white. That was
    // survivable on a white card in the legend and is not survivable as the
    // outline of a hollow marker on a pale basemap — the lowest-density
    // un-repped schools would be the ones that disappeared. Darkened just
    // enough to hold its own; the breaks it labels are unchanged.
    colours: { b0: "#93bdec", b1: "#4f92e0", b2: "#2a78d6", b3: "#104281" },
    valueOf: (s) => s.densityTotal,
    weight: (s) => ({ num: s.membersTotal || 0, den: s.headcountTotal || 0 }),
    legend: [
      { bucket: "b0", text: "Under 20%" },
      { bucket: "b1", text: "20–35%" },
      { bucket: "b2", text: "35–50%" },
      { bucket: "b3", text: "Over 50%" },
      { bucket: NO_DATA, text: "No headcount" },
    ],
  }),

  turnout: rateScale({
    label: "Turnout (2026 ballot)",
    breaks: [0.3, 0.4, 0.5],
    // Purple rather than the obvious amber ramp: amber already means "no rep"
    // in this app, and a turnout scale in the same hue as the rep signal would
    // read as one encoding bleeding into the other. Each metric gets its own
    // family — teal for reps, blue for density, purple for turnout, red for
    // disputes — and every ramp descends in luminance so it survives greyscale.
    colours: { b0: "#bda6d8", b1: "#8f6cb5", b2: "#63408d", b3: "#3a1f57" },
    valueOf: (s) => s.turnout2026,
    // Weighted by membership rather than by a separate votes column, so the
    // cluster figure can't drift from the number the point is coloured by:
    // sum(turnout x members) / sum(members) IS sum(votes) / sum(members).
    weight: (s) =>
      s.turnout2026 != null && s.membersTotal
        ? { num: s.turnout2026 * s.membersTotal, den: s.membersTotal }
        : { num: 0, den: 0 },
    legend: [
      { bucket: "b0", text: "Under 30%" },
      { bucket: "b1", text: "30–40%" },
      { bucket: "b2", text: "40–50%" },
      { bucket: "b3", text: "50% and over" },
      { bucket: NO_DATA, text: "No ballot data" },
    ],
    note: "50% is the legal turnout threshold.",
  }),

  dispute: {
    label: "Dispute status",
    colours: {
      live: "#B3261E",
      recent: "#E08A3C",
      closed: "#9c8466",
      none: "#afb9bf",
    },
    // Four states, not three. `dateOfResolution` is optional on a closed
    // dispute and nothing enforces it, so "had a dispute, no date recorded" is
    // a real case — and it is not the same fact as "never had one". Lumping
    // them together would hide exactly the schools worth asking about.
    bucketOf: (s) => disputeBucket(s),
    weight: () => ({ num: 0, den: 0 }),
    // Categorical, so a cluster shows the most serious state present rather
    // than a rate. One live dispute inside a cluster is the thing you need to
    // see; it must not be averaged away by its quiet neighbours.
    aggregate: (points) => {
      const order = ["live", "recent", "closed", "none"];
      for (const bucket of order) {
        if (points.some((p) => p.bucket === bucket)) return bucket;
      }
      return "none";
    },
    legend: [
      { bucket: "live", text: "Live dispute" },
      { bucket: "recent", text: `Resolved in the last ${DISPUTE_WINDOW_YEARS} years` },
      { bucket: "closed", text: "Older, or no resolution date" },
      { bucket: "none", text: "No dispute recorded" },
    ],
    note: "A cluster shows the most serious status inside it.",
  },
};

const DISPUTE_WORDS = {
  live: "In a live dispute",
  recent: `Dispute resolved in the last ${DISPUTE_WINDOW_YEARS} years`,
  closed: "Past dispute",
  none: "No dispute recorded",
};

let disputeCutoff = "";

function disputeBucket(s) {
  const list = s.disputes || [];
  if (!list.length) return "none";
  // `live` is a plain text column — it is not in YES_NO_FIELDS, so it comes
  // back as the literal string "Yes", never a boolean.
  if (list.some((d) => d.live === "Yes")) return "live";
  // ISO dates compare lexicographically, which is how the rest of the app
  // does date windows. A school can carry several disputes, so this asks
  // whether ANY of them is recent rather than picking one.
  if (list.some((d) => d.dateOfResolution && d.dateOfResolution >= disputeCutoff)) return "recent";
  return "closed";
}

// ---------------------------------------------------------------------------

function legendHtml(scaleKey) {
  const scale = SCALES[scaleKey];
  const swatch = (colour, cls = "") =>
    `<span class="legend-swatch ${cls}" style="--swatch:${colour}"></span>`;

  const colourItems = scale.legend
    .map(
      (l) =>
        `<span class="legend-item">${swatch(scale.colours[l.bucket])}${escapeHtml(l.text)}</span>`
    )
    .join("");

  const sizeItems = [
    ["dot-xs", "Under 10"],
    ["dot-sm", "10–25"],
    ["dot-md", "25–50"],
    ["dot-lg", "50–100"],
    ["dot-xl", "Over 100"],
  ]
    .map(
      ([cls, text]) =>
        `<span class="legend-item">${swatch("var(--accent)", `legend-${cls}`)}${escapeHtml(text)}</span>`
    )
    .join("");

  return `
    <div class="map-legend-group">
      <span class="map-legend-caption">${escapeHtml(scale.label)}</span>
      ${colourItems}
    </div>
    <div class="map-legend-group">
      <span class="map-legend-caption">Members</span>
      ${sizeItems}
    </div>
    <div class="map-legend-group">
      <span class="map-legend-caption">Rep</span>
      <span class="legend-item">${swatch("var(--accent)")}Has a rep</span>
      <span class="legend-item">${swatch("var(--accent)", "legend-hollow")}No rep</span>
    </div>
    <p class="map-legend-note">Clusters are shaded on this same scale, by the combined figure
      for the schools inside them.${scale.note ? ` ${escapeHtml(scale.note)}` : ""}</p>`;
}

function popupHtml(s, scaleKey) {
  const dispute = disputeBucket(s);
  return `
    <div class="map-popup">
      <strong>${escapeHtml(s.schoolName)}</strong>
      <div class="map-popup-meta">${escapeHtml(s.phase)} · ${escapeHtml(s.laName)}</div>
      ${s.trust ? `<div class="map-popup-meta">${escapeHtml(s.trust)}</div>` : ""}
      <dl>
        <div><dt>Members</dt><dd>${formatNumber(s.membersTotal)}</dd></div>
        <div><dt>Density</dt><dd>${formatPercent(s.densityTotal)}</dd></div>
        <div><dt>Reps</dt><dd>${s.repCount}</dd></div>
        ${scaleKey === "turnout" ? `<div><dt>Turnout</dt><dd>${formatPercent(s.turnout2026)}</dd></div>` : ""}
      </dl>
      ${dispute !== "none" ? `<div class="map-popup-flag">${escapeHtml(DISPUTE_WORDS[dispute])}</div>` : ""}
      <a href="#/schools/${s.urn}">Open school →</a>
    </div>`;
}

// One map instance at a time. The router swaps the children of #content and has
// no unmount hook, so without this every visit leaves a live Leaflet instance
// and its listeners behind.
let active = null;

function teardown() {
  active?.unsubscribeTheme?.();
  active?.handle?.destroy?.();
  active = null;
}

export async function render(container, params = {}) {
  teardown();

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - DISPUTE_WINDOW_YEARS);
  disputeCutoff = cutoff.toISOString().slice(0, 10);

  const state = await loadAll();
  const schools = buildSchoolLevel(state);

  // `inLiveDispute` and the dispute list are set in buildSchoolLevel from the
  // dispute's own URN list, so they are exact rather than inferred from branch
  // or MAT.

  const branches = [...new Set(schools.map((s) => s.laName))].sort();
  const phases = [...new Set(schools.map((s) => s.phase).filter(Boolean))].sort();
  const trusts = [...new Set(schools.map((s) => s.trust).filter(Boolean))].sort();

  // Filters arrive from the hash, using the same names as the Schools page, so
  // #/schools?trust=X and #/map?trust=X are the same link with the route
  // swapped. Anything unrecognised is dropped rather than applied — a stale
  // borough name in an old link should show every school, not none of them.
  const query = params.query || {};
  const oneOf = (value, allowed) => (allowed.includes(value) ? value : "");
  const initial = {
    by: oneOf(query.by, Object.keys(SCALES)) || "rep",
    branch: oneOf(query.branch, branches),
    phase: oneOf(query.phase, phases),
    trust: oneOf(query.trust, trusts),
    rep: oneOf(query.rep, ["no-rep", "live-dispute"]),
  };

  container.innerHTML = `
    <div class="topbar">
      <h1>Map</h1>
      <div class="as-of">Postcode locations — accurate to a street, not a building</div>
    </div>
    <div class="filter-bar">
      <select id="map-by" aria-label="Colour by">
        ${Object.entries(SCALES)
          .map(
            ([k, s]) =>
              `<option value="${k}"${k === initial.by ? " selected" : ""}>Colour by: ${escapeHtml(s.label)}</option>`
          )
          .join("")}
      </select>
      <select id="map-branch" aria-label="Branch">
        <option value="">All branches</option>
        ${branches.map((b) => `<option value="${escapeHtml(b)}"${b === initial.branch ? " selected" : ""}>${escapeHtml(b)}</option>`).join("")}
      </select>
      <select id="map-phase" aria-label="Phase">
        <option value="">All phases</option>
        ${phases.map((p) => `<option value="${escapeHtml(p)}"${p === initial.phase ? " selected" : ""}>${escapeHtml(p)}</option>`).join("")}
      </select>
      <select id="map-trust" aria-label="MAT">
        <option value="">All MATs</option>
        ${trusts.map((t) => `<option value="${escapeHtml(t)}"${t === initial.trust ? " selected" : ""}>${escapeHtml(t)}</option>`).join("")}
      </select>
      <select id="map-rep" aria-label="Status">
        <option value="">All schools</option>
        <option value="no-rep"${initial.rep === "no-rep" ? " selected" : ""}>No rep only</option>
        <option value="live-dispute"${initial.rep === "live-dispute" ? " selected" : ""}>In a live dispute only</option>
      </select>
      <span id="map-count" class="result-count"></span>
    </div>
    <div class="map-legend" id="map-legend"></div>
    <div class="map-layout">
      <div id="map-canvas" class="map-canvas"></div>
      <aside class="map-list" id="map-list" aria-label="Schools currently shown"></aside>
    </div>
    <div id="map-missing"></div>
  `;

  const canvas = container.querySelector("#map-canvas");

  // Loading the map libraries takes a second or two, and the user may well
  // have navigated on by then. Writing into a detached element throws, and the
  // router would surface that as an error over whatever page they moved to —
  // so every post-await DOM write checks first.
  //
  // Test `canvas`, not `container`: the router replaces the content element's
  // children rather than the element itself, so the container stays connected
  // even after navigating away. The canvas is what actually gets detached.
  const stillOnPage = () => canvas.isConnected;

  const byEl = container.querySelector("#map-by");
  const branchEl = container.querySelector("#map-branch");
  const phaseEl = container.querySelector("#map-phase");
  const trustEl = container.querySelector("#map-trust");
  const repEl = container.querySelector("#map-rep");
  const countEl = container.querySelector("#map-count");
  const legendEl = container.querySelector("#map-legend");
  const listEl = container.querySelector("#map-list");
  const missingEl = container.querySelector("#map-missing");

  let geo = geoByUrn();

  function visibleSchools() {
    return schools.filter((s) => {
      if (branchEl.value && s.laName !== branchEl.value) return false;
      if (phaseEl.value && s.phase !== phaseEl.value) return false;
      if (trustEl.value && s.trust !== trustEl.value) return false;
      if (repEl.value === "no-rep" && s.repCount !== 0) return false;
      if (repEl.value === "live-dispute" && !s.inLiveDispute) return false;
      return true;
    });
  }

  function toPoints(shown, scale) {
    const points = [];
    for (const s of shown) {
      const g = geo.get(String(s.urn));
      if (!g) continue;
      const { num, den } = scale.weight(s);
      points.push({
        urn: s.urn,
        name: s.schoolName,
        lat: g.lat,
        lon: g.lon,
        borough: s.laName,
        bucket: scale.bucketOf(s),
        num,
        den,
        sizeValue: s.membersTotal,
        // Hollow means no rep, in every view. See the encoding note at the top.
        hollow: s.repCount === 0,
        popupHtml: popupHtml(s, byEl.value),
      });
    }
    return points;
  }

  function renderList(shown) {
    const rows = shown.slice(0, MAX_LIST_ROWS);
    listEl.innerHTML = `
      <div class="map-list-head">
        <span>${formatNumber(shown.length)} school${shown.length === 1 ? "" : "s"}</span>
        <span>Rep · members</span>
      </div>
      <ul class="map-list-items">
        ${rows
          .map(
            (s) => `<li>
              <a href="#/schools/${s.urn}">${escapeHtml(s.schoolName)}</a>
              <span class="map-list-meta">
                <span class="map-list-rep${s.repCount === 0 ? " no-rep" : ""}"
                      title="${s.repCount === 0 ? "No rep" : `${s.repCount} rep${s.repCount === 1 ? "" : "s"}`}">
                  ${s.repCount === 0 ? "○" : "●"}
                </span>
                <span class="map-list-members">${formatNumber(s.membersTotal)}</span>
              </span>
            </li>`
          )
          .join("")}
      </ul>
      ${
        shown.length > MAX_LIST_ROWS
          ? `<p class="map-list-cap">Showing the first ${MAX_LIST_ROWS}. Narrow the filters, or use the
             <a href="#/schools">schools table</a> to sort and export.</p>`
          : ""
      }`;
  }

  function renderMissing(shown) {
    // Schools without coordinates are named rather than quietly omitted —
    // an incomplete map that looks complete is worse than no map.
    const missing = shown.filter((s) => !geo.has(String(s.urn)));
    missingEl.innerHTML = missing.length
      ? `<div class="section-title">Not on the map (${missing.length})</div>
         <div class="card">
           <p style="margin-top:0;">These schools have no coordinates yet${missing.some((s) => !s.postcode) ? ", and some have no postcode in GIAS" : ""}.</p>
           <ul class="plain-list">${missing.slice(0, 40).map((s) => `<li><a href="#/schools/${s.urn}">${escapeHtml(s.schoolName)}</a>${s.postcode ? "" : " <span class=\"muted-cell\">(no postcode)</span>"}</li>`).join("")}</ul>
           ${missing.length > 40 ? `<p class="muted-cell">…and ${missing.length - 40} more.</p>` : ""}
           <div class="btn-row"><button class="btn btn-primary" id="geocode-btn">Locate missing schools</button></div>
         </div>`
      : "";
    missingEl.querySelector("#geocode-btn")?.addEventListener("click", runGeocode);
  }

  // Written with replaceState, not by assigning location.hash: assigning fires
  // hashchange, which makes the router rebuild the whole page and scroll to the
  // top. replaceState fires nothing, and leaves no history entries either.
  function syncUrl() {
    const next = new URLSearchParams();
    if (byEl.value !== "rep") next.set("by", byEl.value);
    if (branchEl.value) next.set("branch", branchEl.value);
    if (phaseEl.value) next.set("phase", phaseEl.value);
    if (trustEl.value) next.set("trust", trustEl.value);
    if (repEl.value) next.set("rep", repEl.value);
    // Carried through so changing a filter doesn't silently drop the override
    // you arrived with.
    if (Number.isFinite(clusterOverride) && clusterOverride > 0) {
      next.set("cluster", String(clusterOverride));
    }
    const qs = next.toString();
    history.replaceState(null, "", `#/map${qs ? `?${qs}` : ""}`);
  }

  // `refit` is only ever true when the set of schools changed. Changing the
  // colour scale must not move the viewport — the old map refitted on every
  // redraw and took the view back off you every time you touched anything.
  function draw({ refit }) {
    const scale = SCALES[byEl.value];
    const shown = visibleSchools();
    const points = toPoints(shown, scale);

    legendEl.innerHTML = legendHtml(byEl.value);
    countEl.textContent =
      `${formatNumber(points.length)} of ${formatNumber(shown.length)} shown` +
      (points.length < shown.length ? ` · ${shown.length - points.length} not yet located` : "");
    renderList(shown);
    renderMissing(shown);

    handle.setPoints(points, { refit });
  }

  async function runGeocode() {
    const btn = missingEl.querySelector("#geocode-btn");
    const pending = schoolsNeedingGeocode(schools);
    if (pending.length === 0) {
      showToast("Every school with a postcode is already located.");
      return;
    }
    btn.disabled = true;
    btn.textContent = `Locating 0/${pending.length}…`;
    try {
      const result = await geocodeMissing(schools, ({ done, total }) => {
        if (btn.isConnected) btn.textContent = `Locating ${done}/${total}…`;
      });
      if (!stillOnPage()) return;
      showToast(
        `Located ${result.added} school${result.added === 1 ? "" : "s"}` +
          (result.failed.length ? `, ${result.failed.length} could not be found` : "")
      );
      geo = geoByUrn();
      // Newly located schools are an addition to what's already on screen, not
      // a new question — so don't move the viewport under them.
      draw({ refit: false });
    } catch (err) {
      console.error("[map] geocoding failed", err);
      if (!stillOnPage()) return;
      showToast(`Couldn't reach the postcode lookup service: ${err.message}`);
      btn.disabled = false;
      btn.textContent = "Locate missing schools";
    }
  }

  // The zoom floor and the pan limit come from the WHOLE dataset, not the
  // filtered set: arriving on #/map?trust=X shouldn't lock you inside that
  // trust's bounding box.
  const allCoords = [];
  for (const s of schools) {
    const g = geo.get(String(s.urn));
    if (g) allCoords.push([g.lat, g.lon]);
  }

  // `?cluster=N` overrides the point count at which clustering switches on.
  // It exists because the sample workbook holds 72 schools and the real one
  // holds ~3,000: without it the entire cluster path — the icons, and the
  // summed-then-divided aggregates behind them — would never run until the
  // first day it ran against live data. Not a feature; there is no control for
  // it and nothing links to it. Use `#/map?cluster=10` to exercise it.
  const clusterOverride = Number.parseInt(query.cluster, 10);

  const handle = await createMapCanvas(canvas, {
    allCoords,
    colourFor: (bucket) => SCALES[byEl.value].colours[bucket] || GREY,
    aggregateBucket: (points) => SCALES[byEl.value].aggregate(points),
    isDark: prefersDark,
    ...(Number.isFinite(clusterOverride) && clusterOverride > 0
      ? { clusterThreshold: clusterOverride }
      : {}),
  });

  if (!stillOnPage()) {
    handle?.destroy();
    return;
  }

  if (!handle) {
    // The one failure mode worth designing for: a network that blocks the CDN.
    // Say so plainly and point at the view that still works.
    // Replace the whole layout, not just the canvas — otherwise the card sits
    // in a two-column grid beside an empty panel.
    container.querySelector(".map-layout").outerHTML = `
      <div class="card">
        <h2>The map couldn't load</h2>
        <p>The mapping library is fetched from an external site (unpkg.com), and this
        network appears to be blocking it. Everything the map shows is also in the
        schools table, which works offline.</p>
        <div class="btn-row"><a class="btn btn-primary" href="#/schools">Open the schools table</a></div>
      </div>`;
    legendEl.remove();
    return;
  }

  active = { handle, unsubscribeTheme: onThemeChange(() => handle.refreshTheme()) };

  byEl.addEventListener("change", () => {
    draw({ refit: false });
    syncUrl();
  });
  [branchEl, phaseEl, trustEl, repEl].forEach((el) =>
    el.addEventListener("change", () => {
      draw({ refit: true });
      syncUrl();
    })
  );

  draw({ refit: true });
  syncUrl();
}
