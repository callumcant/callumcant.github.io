// Turns school postcodes into map coordinates, once, and caches the result in
// the workbook's SchoolGeo table.
//
// Uses postcodes.io — a free, open-source service built on ONS open data.
// Only postcodes are sent: no school names, no membership figures, no dispute
// data. Results are cached so this runs when schools are added, not on every
// page load.
//
// A postcode centroid locates a street, not a building. That's the right
// precision for "where is my patch"; don't present it as a precise address.
import { getState, appendSchoolGeoRows } from "./store.js";

const POSTCODES_API = "https://api.postcodes.io/postcodes";
const BATCH_SIZE = 100; // the API's documented maximum per bulk request

// Schools that have a postcode but no cached coordinates yet.
export function schoolsNeedingGeocode(schools) {
  const known = new Set(getState().schoolGeo.map((g) => String(g.urn)));
  return schools.filter((s) => s.postcode && !known.has(String(s.urn)));
}

export function geoByUrn() {
  const map = new Map();
  for (const g of getState().schoolGeo) {
    if (g.lat != null && g.lon != null) map.set(String(g.urn), g);
  }
  return map;
}

async function lookupBatch(postcodes) {
  const res = await fetch(POSTCODES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes }),
  });
  if (!res.ok) throw new Error(`postcodes.io returned ${res.status}`);
  const body = await res.json();
  return body.result || [];
}

// Looks up every school missing coordinates and appends what it finds.
// `onProgress` receives {done, total} so the UI can show movement on what may
// be a few thousand lookups.
export async function geocodeMissing(schools, onProgress) {
  const pending = schoolsNeedingGeocode(schools);
  if (pending.length === 0) return { added: 0, failed: [], total: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  const failed = [];

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    // Same order in and out, but match on the echoed query rather than
    // position — the API is documented to preserve order, and relying on that
    // silently mis-locates schools if it ever changes.
    const byQuery = new Map();
    try {
      const results = await lookupBatch(chunk.map((s) => s.postcode));
      for (const r of results) byQuery.set(String(r.query).toUpperCase(), r.result);
    } catch (err) {
      // A failed batch shouldn't lose the batches that already succeeded.
      for (const s of chunk) failed.push({ urn: s.urn, reason: err.message });
      onProgress?.({ done: Math.min(i + BATCH_SIZE, pending.length), total: pending.length });
      continue;
    }

    for (const s of chunk) {
      const hit = byQuery.get(String(s.postcode).toUpperCase());
      if (hit?.latitude != null && hit?.longitude != null) {
        rows.push({ urn: s.urn, lat: hit.latitude, lon: hit.longitude, geocodedDate: today });
      } else {
        failed.push({ urn: s.urn, reason: "postcode not found" });
      }
    }
    onProgress?.({ done: Math.min(i + BATCH_SIZE, pending.length), total: pending.length });
  }

  if (rows.length) await appendSchoolGeoRows(rows);
  return { added: rows.length, failed, total: pending.length };
}
