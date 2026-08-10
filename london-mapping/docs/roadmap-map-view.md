# Map view — design

Not built yet. This records the decisions already taken so they don't need
re-litigating, and flags what makes it non-trivial.

## What it's for

The primary use case is **an organiser visualising their patch** — seeing where
their schools actually are, which cluster together, and which un-repped school
sits next door to one with a strong branch. That's a question a table genuinely
can't answer.

The stated ambition is that this eventually covers **all London schools**, not
just the project boroughs. That's roughly 3,000 schools rather than ~530, and
it changes the design: at that scale clustering and filtering are requirements,
not enhancements. 3,000 undifferentiated pins on a London-wide view is an
unreadable blue smear.

## Decisions taken

- **Leaflet + OpenStreetMap tiles**, both from a CDN. Real street map, so the
  map is useful for planning visits and understanding travel, not just for
  seeing clusters. Tile requests reveal which part of London is on screen to
  the tile server; no union data is transmitted.
- **Geocoding via postcodes.io**, a free open-source service built on ONS open
  data. Its bulk endpoint takes 100 postcodes per call, so all-London is ~30
  calls — done **once**, not per page load.
- **Results cached in the `SchoolGeo` table** (`urn`, `lat`, `lon`,
  `geocodedDate`), which already exists in the workbook and schema. An admin
  action looks up only URNs that have no coordinates yet, so adding schools
  costs one small top-up rather than a full re-run.
- **Only postcodes leave the browser** — no school names, no membership
  figures, no dispute data.

## What to build

**Marker layer**
- One marker per school with coordinates; schools missing a geocode are listed
  separately rather than silently dropped, so gaps are visible.
- **Colour modes**, switchable: density · has-rep / no-rep · dispute status ·
  membership size. Each needs a legend, and none should rely on colour alone —
  pair with shape or size so the map stays readable for colourblind users
  (see the colourblind finding in `../design/NEUDashboardDesignSpec.md`).
- Marker size by workforce, so a 130-staff secondary doesn't look like a
  19-staff nursery.

**Clustering** — mandatory. Use Leaflet.markercluster (or equivalent): pins
merge at low zoom into counted clusters that split apart as you zoom in.

**Filters** — reuse the Schools view's filter set (borough, phase, MAT,
no-rep) rather than inventing a second vocabulary. Ideally share the filter
state so switching between table and map keeps the same subset.

**Interaction** — click a marker for a popup with headline stats and a link
through to the school detail page.

## Constraints worth respecting

- **The table stays canonical.** A marker layer is not usable with a screen
  reader, so the map is an additional view of data that is fully available in
  the Schools table — never the only route to something.
- **Don't geocode on page load.** It's a one-time admin action; doing it lazily
  would hammer postcodes.io and make the map slow for everyone.
- **Postcode ≠ building.** A postcode centroid is accurate to a street, not a
  gate. Good enough for "where is my patch", not for anything requiring a
  precise location.
- GIAS's full download includes Easting/Northing, which would avoid the
  external lookup entirely — but converting OSGB36 to WGS84 in the browser is
  fiddly and error-prone. postcodes.io was chosen deliberately over that.

## Rough effort

Moderate, and low-risk — no unsolved problems. The fiddly part is the
geocode-and-cache round trip (writing ~3,000 rows to the workbook via Graph in
batches), not the map itself. Comparable in size to the Schools column work.
