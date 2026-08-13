// The map renderer, kept deliberately ignorant of where its points came from.
//
// It takes a plain array of points and knows nothing about the store, the
// workbook, membership or disputes. Everything domain-shaped — which bucket a
// school falls in, what a cluster's combined rate is — arrives as a callback
// from the caller. That seam exists so a future public "big organising" map,
// showing schools and events with no membership data in it at all, is a
// different feed into this same component rather than a second map to maintain.
//
// A point is:
//   { urn, name, lat, lon, borough, bucket, num, den, sizeValue, hollow, popupHtml }
//
// `bucket` is an opaque key the caller invents; this module only ever passes it
// back to `colourFor`. `num`/`den` are the numerator and denominator of
// whatever rate `bucket` came from, carried so a cluster can be summed and then
// divided rather than averaged — see aggregateBucket in js/pages/map.js.

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
// Note: MarkerCluster.Default.css is deliberately NOT loaded. That stylesheet
// is the sole source of markercluster's stock green/amber palette, which
// encodes cluster *count* and directly contradicts this map's legend. The
// positioning and animation live in MarkerCluster.css, which is loaded.
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

// Below this many plotted points, clustering switches itself off. Filtering to
// a branch or a trust then gives individual schools without anyone having to
// choose anything. Above it, unclustered all-London is a smear regardless of
// how fast it draws.
export const CLUSTER_THRESHOLD = 300;

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

// Membership drives radius, and nothing else does. The range is deliberately
// narrow: the old map went up to 16px, and at all-London scale a 16px dot
// covers its neighbours rather than sitting beside them. Small and
// semi-transparent means overlap itself reads as density.
export function radiusFor(members) {
  const m = members || 0;
  if (m > 100) return 9;
  if (m > 50) return 7.5;
  if (m > 25) return 6;
  if (m > 10) return 4.5;
  return 3;
}

// Canvas rendering can't resolve `var(--surface-card)` — the 2D context wants a
// real colour — so the hollow fill is read off the live computed style. That
// keeps it correct in both themes without a second hardcoded palette.
function surfaceColour() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--surface-card").trim();
  return value || "#ffffff";
}

// Cluster labels sit on top of the ramp, which runs pale to dark. Picking the
// text colour from the swatch's luminance means the count stays readable at
// both ends instead of vanishing at one of them.
function readableTextOn(colour) {
  const hex = String(colour).trim().replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.5 ? "#11181C" : "#ffffff";
}

function clusterSize(count) {
  if (count >= 100) return { name: "lg", px: 46 };
  if (count >= 20) return { name: "md", px: 36 };
  return { name: "sm", px: 28 };
}

/**
 * Boots Leaflet and returns a handle, or null if the libraries can't be
 * fetched. A null return is the caller's cue to render its own explanation —
 * this module doesn't own that copy, because what to say instead of a map
 * depends on what the map was for.
 *
 * opts:
 *   allCoords        [[lat, lon], ...] for the WHOLE dataset, not the filtered
 *                    set. Sets the zoom floor and the pan limit, so arriving
 *                    with a filter already applied doesn't lock you inside that
 *                    filter's bounding box.
 *   colourFor        (bucket) => css colour
 *   aggregateBucket  (points) => bucket, for a cluster's combined value
 *   isDark           () => boolean, consulted on every tile swap
 */
export async function createMapCanvas(canvasEl, opts) {
  const {
    allCoords = [],
    colourFor,
    aggregateBucket,
    isDark,
    clusterThreshold = CLUSTER_THRESHOLD,
  } = opts;

  let L;
  try {
    await Promise.all([loadCss(LEAFLET_CSS), loadCss(CLUSTER_CSS)]);
    await loadScript(LEAFLET_JS);
    L = window.L;
    if (!L) throw new Error("Leaflet loaded but window.L is undefined");
  } catch (err) {
    console.warn("[map] falling back — map libraries unavailable", err);
    return null;
  }
  if (!canvasEl.isConnected) return null;

  // Clustering is a separate plugin. If only it fails, still draw the markers.
  let hasCluster = true;
  try {
    await loadScript(CLUSTER_JS);
    if (!L.markerClusterGroup) hasCluster = false;
  } catch {
    hasCluster = false;
  }
  if (!canvasEl.isConnected) return null;

  // preferCanvas: one canvas beats 3,000 SVG nodes, and the browser stops
  // laying out a DOM element per school.
  //
  // zoomSnap: Leaflet's default of 1 rounds fitBounds DOWN to the next whole
  // zoom, which can leave the view up to twice as wide as the data — that is
  // where the old map's Reading-to-Basildon extent came from, not from the
  // fixed centre it also had. A quarter-step fits what's actually there.
  const map = L.map(canvasEl, { preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5 });

  let tiles = null;
  function applyTiles() {
    const url = isDark() ? TILES.dark : TILES.light;
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(url, { attribution: TILE_ATTRIBUTION, subdomains: "abcd", maxZoom: 19 });
    tiles.addTo(map);
    // Tiles are added after the marker layer on a redraw, so push them back
    // under it rather than over the top of the data.
    tiles.bringToBack();
  }
  applyTiles();

  const extent = allCoords.length ? L.latLngBounds(allCoords) : null;
  if (extent) {
    map.fitBounds(extent, { padding: [24, 24] });
    // Computed, not a hardcoded number: a zoom floor tuned on a desktop crops
    // London on a phone. getBoundsZoom asks the container it actually has.
    map.setMinZoom(map.getBoundsZoom(extent) - 0.25);
    map.setMaxBounds(extent.pad(0.35));
  } else {
    map.setView([51.5074, -0.1278], 10);
  }

  let layer = null;
  let clustered = null;

  function makeClusterIcon(cluster) {
    const children = cluster.getAllChildMarkers().map((m) => m.__point);
    const colour = colourFor(aggregateBucket(children));
    const size = clusterSize(children.length);
    return L.divIcon({
      className: `map-cluster map-cluster-${size.name}`,
      iconSize: L.point(size.px, size.px),
      html: `<span class="map-cluster-inner" style="--swatch:${colour};--swatch-text:${readableTextOn(colour)}">${children.length}</span>`,
    });
  }

  function ensureLayer(useCluster) {
    if (clustered === useCluster && layer) {
      layer.clearLayers();
      return;
    }
    if (layer) map.removeLayer(layer);
    layer = useCluster
      ? L.markerClusterGroup({
          showCoverageOnHover: false,
          chunkedLoading: true,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 45,
          iconCreateFunction: makeClusterIcon,
        })
      : L.layerGroup();
    clustered = useCluster;
    map.addLayer(layer);
  }

  function draw(points, { refit = false } = {}) {
    const hollowFill = surfaceColour();
    ensureLayer(hasCluster && points.length >= clusterThreshold);

    // A thin outline against the basemap, so that the palest step of a ramp is
    // still a definite mark rather than a smudge. It has to flip with the
    // theme: black hairlines vanish on Dark Matter and white ones vanish on
    // Positron.
    const hairline = isDark() ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)";

    const bounds = [];
    for (const p of points) {
      const colour = colourFor(p.bucket);
      // Hollow means "no rep" in every view, so it survives a change of
      // colour-by. See the encoding note in js/pages/map.js.
      //
      // The two states carry the metric colour differently, which is why the
      // stroke isn't simply the fill: a filled mark carries it in the fill and
      // takes the hairline as an outline, while a hollow mark has no fill to
      // carry it and so puts the colour in a heavier stroke instead.
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: radiusFor(p.sizeValue),
        color: p.hollow ? colour : hairline,
        fillColor: p.hollow ? hollowFill : colour,
        fillOpacity: p.hollow ? 0.95 : 0.75,
        weight: p.hollow ? 2.5 : 1,
      });
      marker.__point = p;
      marker.bindPopup(p.popupHtml);
      layer.addLayer(marker);
      bounds.push([p.lat, p.lon]);
    }

    // Refitting is the caller's decision, and it only ever says yes when a
    // filter changed. The old map refitted on every redraw, which took the
    // viewport back off you every time you touched anything.
    if (refit && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 15 });
    }
  }

  return {
    setPoints: draw,
    // Re-tiles in place when the theme changes. The points are untouched, so
    // the viewport and the popup state survive the swap.
    refreshTheme: applyTiles,
    destroy: () => map.remove(),
  };
}
