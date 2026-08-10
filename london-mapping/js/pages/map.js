// Map of schools, for visualising a patch: where the schools actually are,
// which cluster together, and which un-repped school sits next to a strong one.
//
// Deliberate constraints:
// - The Schools table stays the canonical view. A marker layer is not usable
//   with a screen reader, so the map is an addition, never the only route to
//   anything. Every school here is in that table too.
// - Leaflet and the tiles come from a CDN, which some networks block. A
//   blocked CDN must produce an explanation and a link to the table, never a
//   blank page — hence the load-with-fallback below.
// - Clustering is on from the start. Even the project boroughs are ~530
//   schools; all-London is ~3,000, at which point unclustered pins are a smear.
import { loadAll } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { geocodeMissing, schoolsNeedingGeocode, geoByUrn } from "../data/geocode.js";
import { escapeHtml, formatNumber, formatPercent, showToast } from "../ui.js";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_DEFAULT_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
const CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

const LONDON_CENTRE = [51.5074, -0.1278];

function loadCss(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    // CSS failing is cosmetic, not fatal — resolve either way.
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

// Colour modes. Each returns a Leaflet path style plus the legend that
// explains it. Per the colourblind finding in the design spec, none of these
// leans on hue alone: rep coverage and disputes differ in fill as well as
// colour, and membership differs in size.
const MODES = {
  repCoverage: {
    label: "Rep coverage",
    legend: [
      { swatch: "filled", colour: "var(--accent)", text: "Has a rep" },
      { swatch: "hollow", colour: "var(--color-warning)", text: "No rep" },
    ],
    style: (s) =>
      s.repCount > 0
        ? { radius: 7, color: "#00747C", fillColor: "#00747C", fillOpacity: 0.85, weight: 2 }
        : { radius: 7, color: "#A15C00", fillColor: "#ffffff", fillOpacity: 0.9, weight: 3 },
  },
  disputes: {
    label: "Live disputes",
    // Filtering rather than recolouring: a greyed-out dot still competes for
    // attention, and the question this mode answers is "where are the
    // disputes", not "where aren't they".
    onlyMatching: (s) => s.inLiveDispute,
    legend: [
      { swatch: "filled", colour: "var(--color-critical)", text: "In a live dispute" },
    ],
    style: () => ({ radius: 9, color: "#B3261E", fillColor: "#B3261E", fillOpacity: 0.85, weight: 2 }),
  },
  density: {
    label: "Density",
    legend: [
      { swatch: "filled", colour: "#cde2fb", text: "Under 20%" },
      { swatch: "filled", colour: "#6da7ec", text: "20–35%" },
      { swatch: "filled", colour: "#2a78d6", text: "35–50%" },
      { swatch: "filled", colour: "#104281", text: "Over 50%" },
      { swatch: "hollow", colour: "var(--text-muted)", text: "No data" },
    ],
    style: (s) => {
      const d = s.densityTotal;
      if (d == null) return { radius: 5, color: "#767E84", fillColor: "#ffffff", fillOpacity: 0.7, weight: 1.5 };
      const colour = d < 0.2 ? "#cde2fb" : d < 0.35 ? "#6da7ec" : d < 0.5 ? "#2a78d6" : "#104281";
      return { radius: 8, color: "#0d366b", fillColor: colour, fillOpacity: 0.9, weight: 1.5 };
    },
  },
  members: {
    label: "Membership size",
    legend: [
      { swatch: "dot-xs", colour: "var(--accent)", text: "Under 10" },
      { swatch: "dot-sm", colour: "var(--accent)", text: "10–25" },
      { swatch: "dot-md", colour: "var(--accent)", text: "25–50" },
      { swatch: "dot-lg", colour: "var(--accent)", text: "50–100" },
      { swatch: "dot-xl", colour: "var(--accent)", text: "Over 100" },
    ],
    style: (s) => {
      const m = s.membersTotal || 0;
      const radius = m > 100 ? 16 : m > 50 ? 13 : m > 25 ? 10 : m > 10 ? 7 : 4;
      return { radius, color: "#00747C", fillColor: "#009CA6", fillOpacity: 0.7, weight: 1.5 };
    },
  },
};

function legendHtml(mode) {
  return MODES[mode].legend
    .map(
      (l) => `<span class="legend-item">
        <span class="legend-swatch legend-${l.swatch}" style="--swatch:${l.colour}"></span>${escapeHtml(l.text)}
      </span>`
    )
    .join("");
}

function popupHtml(s) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(s.schoolName)}</strong>
      <div class="map-popup-meta">${escapeHtml(s.phase)} · ${escapeHtml(s.laName)}</div>
      <dl>
        <div><dt>Members</dt><dd>${formatNumber(s.membersTotal)}</dd></div>
        <div><dt>Density</dt><dd>${formatPercent(s.densityTotal)}</dd></div>
        <div><dt>Reps</dt><dd>${s.repCount}</dd></div>
      </dl>
      ${s.inLiveDispute ? `<div class="map-popup-flag">In a live dispute</div>` : ""}
      <a href="#/schools/${s.urn}">Open school →</a>
    </div>`;
}

export async function render(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);

  // `inLiveDispute` is set in buildSchoolLevel from the dispute's own URN
  // list, so it is exact rather than inferred from branch or MAT.

  const branches = [...new Set(schools.map((s) => s.laName))].sort();
  const phases = [...new Set(schools.map((s) => s.phase).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="topbar">
      <h1>Map</h1>
      <div class="as-of">Postcode locations — accurate to a street, not a building</div>
    </div>
    <div class="filter-bar">
      <select id="map-mode">
        ${Object.entries(MODES).map(([k, m]) => `<option value="${k}">${escapeHtml(m.label)}</option>`).join("")}
      </select>
      <select id="map-branch"><option value="">All branches</option>
        ${branches.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}</select>
      <select id="map-phase"><option value="">All phases</option>
        ${phases.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}</select>
      <select id="map-rep"><option value="">All schools</option>
        <option value="no-rep">No rep only</option></select>
      <span id="map-count" class="result-count"></span>
    </div>
    <div class="map-legend" id="map-legend"></div>
    <div id="map-canvas" class="map-canvas"></div>
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

  let L;
  try {
    await Promise.all([loadCss(LEAFLET_CSS), loadCss(CLUSTER_CSS), loadCss(CLUSTER_DEFAULT_CSS)]);
    await loadScript(LEAFLET_JS);
    L = window.L;
    if (!L) throw new Error("Leaflet loaded but window.L is undefined");
  } catch (err) {
    // The one failure mode worth designing for: a network that blocks the CDN.
    // Say so plainly and point at the view that still works.
    console.warn("[map] falling back — map libraries unavailable", err);
    if (!stillOnPage()) return;
    canvas.outerHTML = `
      <div class="card">
        <h2>The map couldn't load</h2>
        <p>The mapping library is fetched from an external site (unpkg.com), and this
        network appears to be blocking it. Everything the map shows is also in the
        schools table, which works offline.</p>
        <div class="btn-row"><a class="btn btn-primary" href="#/schools">Open the schools table</a></div>
      </div>`;
    container.querySelector("#map-legend")?.remove();
    return;
  }

  if (!stillOnPage()) return;

  // Clustering is a separate plugin; if only it fails, still draw the markers.
  let hasCluster = true;
  try {
    await loadScript(CLUSTER_JS);
    if (!L.markerClusterGroup) hasCluster = false;
  } catch {
    hasCluster = false;
  }

  if (!stillOnPage()) return;

  const map = L.map(canvas).setView(LONDON_CENTRE, 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  let layer = hasCluster ? L.markerClusterGroup({ showCoverageOnHover: false }) : L.layerGroup();
  map.addLayer(layer);

  const modeEl = container.querySelector("#map-mode");
  const branchEl = container.querySelector("#map-branch");
  const phaseEl = container.querySelector("#map-phase");
  const repEl = container.querySelector("#map-rep");
  const countEl = container.querySelector("#map-count");
  const legendEl = container.querySelector("#map-legend");
  const missingEl = container.querySelector("#map-missing");

  function visibleSchools() {
    const mode = MODES[modeEl.value];
    return schools.filter((s) => {
      if (mode.onlyMatching && !mode.onlyMatching(s)) return false;
      if (branchEl.value && s.laName !== branchEl.value) return false;
      if (phaseEl.value && s.phase !== phaseEl.value) return false;
      if (repEl.value === "no-rep" && s.repCount !== 0) return false;
      return true;
    });
  }

  function drawMarkers() {
    const mode = MODES[modeEl.value];
    const geo = geoByUrn();
    const shown = visibleSchools();
    layer.clearLayers();

    let plotted = 0;
    const bounds = [];
    for (const s of shown) {
      const g = geo.get(String(s.urn));
      if (!g) continue;
      const marker = L.circleMarker([g.lat, g.lon], mode.style(s));
      marker.bindPopup(popupHtml(s));
      layer.addLayer(marker);
      bounds.push([g.lat, g.lon]);
      plotted += 1;
    }

    legendEl.innerHTML = legendHtml(modeEl.value);
    countEl.textContent = `${plotted} of ${shown.length} shown${plotted < shown.length ? ` · ${shown.length - plotted} not yet located` : ""}`;
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });

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

    const btn = missingEl.querySelector("#geocode-btn");
    if (btn) btn.addEventListener("click", runGeocode);
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
        btn.textContent = `Locating ${done}/${total}…`;
      });
      showToast(
        `Located ${result.added} school${result.added === 1 ? "" : "s"}` +
          (result.failed.length ? `, ${result.failed.length} could not be found` : "")
      );
      drawMarkers();
    } catch (err) {
      console.error("[map] geocoding failed", err);
      showToast(`Couldn't reach the postcode lookup service: ${err.message}`);
      btn.disabled = false;
      btn.textContent = "Locate missing schools";
    }
  }

  [modeEl, branchEl, phaseEl, repEl].forEach((el) => el.addEventListener("change", drawMarkers));
  drawMarkers();
}
