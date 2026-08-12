# NEU London Project Mapping

A static web app that replaces a 12-tab mapping spreadsheet used by Industrial
Organisers (IOs) and Senior Industrial Organisers (SIOs) in the NEU's London
region. It reads and writes an Excel workbook held on SharePoint/OneDrive via
the Microsoft Graph API.

Live at `https://callumcant.github.io/london-mapping/`. The site lives in the
`london-mapping/` subfolder; the repo root is a GitHub Pages user site.

## Working with Callum

Callum is an NEU organiser, not a developer. **Explain jargon in plain language
as you go** — he has asked for this explicitly and wants to learn from the work.
Name the concept, say what it does, move on. Don't pad, and don't skip the
explanation either.

## Hard rules — read these before touching anything

1. **This repository is public.** No real member, employer, school or dispute
   data may ever be committed. All development uses clearly-fake synthetic data
   in `js/data/mock-data.js`. Real data only ever lives in the workbook.
2. **Density is summed-then-divided, never averaged.** A MAT or borough density
   is `sum(members) / sum(headcount)` across its schools — never the mean of the
   constituent school densities. Averaging a 10-staff school at 90% with a
   200-staff school at 10% gives 50%; the correct figure is 13.8%. See the
   comment on `densities()` in `js/data/rollups.js`.
3. **`Snapshots`, `Reconciliations` and `RepCommittees` are append-only.** Never
   edit or delete past rows. They are the only record of how things looked at
   the time and cannot be reconstructed. Superseding a decision means adding a
   newer row.
4. **No new dependencies, no build step, no CDN imports in app code.** Plain ES
   modules loaded directly by the browser. (Two pre-existing CDN loads survive
   with graceful fallbacks: MSAL from esm.sh, Leaflet from unpkg.)
5. **Every interpolated value goes through `escapeHtml`** from `js/ui.js`. Pages
   build HTML as template strings; there is no framework escaping anything for
   you.
6. **Never carry meaning by colour alone.** Pair hue with shape, fill, size,
   icon or label. Rep status is filled-vs-hollow, membership is dot size,
   deltas carry an arrow. The rule is documented in `js/pages/map.js`.

## Layout

```
london-mapping/
  index.html            single page; everything else is an ES module
  js/
    app.js              boot, nav, route registration
    router.js           hash router; params are decodeURIComponent'd
    config.js           the 3 go-live values; preview mode is INFERRED from them
    auth.js             MSAL PKCE sign-in
    ui.js               shared helpers: escapeHtml, format*, renderDataTable,
                        sparkline, formatDelta, openMicroForm, showToast
    ui/                 larger shared components (quadrant, search-select,
                        level-header)
    data/
      store.js          the ONLY thing pages import for data; picks mock vs Graph
      graph-client.js   Microsoft Graph Excel table access
      table-schemas.js  GENERATED — do not hand-edit
      mock-data.js      GENERATED — do not hand-edit
      rollups.js        all joins and aggregation (school/branch/MAT/project)
      snapshots.js      weekly capture, series, BASELINE_DATE
      exceptions.js     dashboard exception detection (pure)
      reconcile.js      anomaly detection + stored decisions
    pages/              one module per route
  data-dictionary/
    dictionary.json     SINGLE SOURCE OF TRUTH for the data model
    generate_schemas.py writes table-schemas.js and docs/data-dictionary.md
  workbook-template/
    build_workbook.py   reads dictionary.json directly; emits the .xlsx template
  tools/
    gen_mock_data.py    writes js/data/mock-data.js
  design/               NEU design spec and source tokens
  docs/                 generated data dictionary, snapshot flow for IT
  SETUP.md              handover doc for the Entra/M365 admin
```

## Generated files — never hand-edit

`js/data/table-schemas.js`, `js/data/mock-data.js`, `docs/data-dictionary.md`
and the workbook template are all generated. Editing them by hand gets silently
overwritten and puts the app out of step with the workbook.

To change the data model, edit `data-dictionary/dictionary.json`, then:

```bash
cd london-mapping
python3 data-dictionary/generate_schemas.py    # schemas + docs
python3 workbook-template/build_workbook.py    # the .xlsx template
python3 tools/gen_mock_data.py                 # sample data, if the shape changed
python3 data-dictionary/generate_schemas.py --check   # must pass; exits 1 on drift
```

Column order in `table-schemas.js` must match the workbook exactly — Graph
returns positional `values` arrays and the app maps them by index. Both sides
come from `dictionary.json`, so they cannot drift apart. Run `--check` before
committing.

Re-running the generators with no dictionary change reproduces
`table-schemas.js`, `mock-data.js` and `data-dictionary.md` byte-for-byte. The
`.xlsx` is the exception: it's a zip and its bytes shift every build even when
every cell is identical, so `git checkout` it rather than committing the churn.

If you add or reshape a table, **send Callum the regenerated `.xlsx`** and say
it supersedes the previous one.

## Running and verifying

There is no test suite. Verification is: serve locally, drive the real app,
confirm zero console errors.

```bash
python3 -m http.server 8899          # from the REPO ROOT, not london-mapping/
# → http://localhost:8899/london-mapping/#/dashboard
```

The app runs on sample data because `js/config.js` still holds placeholders —
preview mode is inferred, never set by hand.

**Driving the browser (in this remote sandbox):** Playwright is installed
globally and Chromium is pre-installed. Do not run `playwright install`.

```bash
mkdir -p /tmp/pw && ln -sfn /opt/node22/lib/node_modules /tmp/pw/node_modules
# then in /tmp/pw:  chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

**Running data modules under Node** (useful for checking rollups without a
browser): `config.js` touches `window` at import time, so preload a shim —

```bash
echo 'globalThis.window={location:{origin:"http://x",pathname:"/"}};' > /tmp/shim.mjs
node --import /tmp/shim.mjs your-script.mjs
```

**The sandbox blocks outbound CDNs** — esm.sh, unpkg, jsDelivr, OSM tiles,
postcodes.io and the live GitHub Pages URL all fail here. That is the
environment, not the code. Fonts fall back to Arial and the map shows its
blocked-CDN fallback; both are expected locally.

## Conventions

- Pages export `render(container, params)` (or `renderList` / `renderDetail`)
  and build HTML as template strings, then attach listeners after insertion.
- Shared UI goes in `js/ui.js` (small helpers) or `js/ui/` (components).
- Styles extend `css/main.css` using tokens from `css/tokens.css`. Don't
  introduce a new palette. Dark values are declared twice — under the OS media
  query with a `:not([data-theme="light"])` guard, and under `[data-theme="dark"]`.
- **`[hidden]` needs restating** whenever an element also has `display: flex`
  or `grid` — the class rule outranks the UA stylesheet and the element stays
  visible. This has bitten three times; grep for `[hidden] { display: none }`.
- Wide content (tables, charts) scrolls inside its own container. The page body
  must never scroll horizontally.
- After `await`, check the element you're about to write into is still
  connected — the router replaces the *children* of `#content`, so the outer
  container stays connected even after navigation.
- Reporters (meetings, reps recruited, rep committee, notes, disputes) work in
  preview mode, writing to in-memory state that doesn't persist. Don't disable
  them in preview; nothing else is disabled.
- **Table sort lives in a caller-owned `sortState` object**, passed to
  `renderDataTable`. Pages re-render the table on every filter keystroke, so a
  sort held in the function's own closure gets thrown away as soon as anyone
  types. Same for the column picker: `renderColumnControls` builds its markup
  once and exposes `sync()` — don't re-call it from its own `onChange`, or the
  popover snaps shut on every checkbox tick.
- **Zebra striping must be declared before the `tr:hover` rule.** Identical
  specificity, so source order is what decides, and hover has to win. A table
  with `sticky-first` also needs the stripe restated on `td:first-child`, which
  paints its own opaque background.
- Filter state on the Schools page is written to the hash with
  `history.replaceState`. Never assign `location.hash` for this — that fires
  `hashchange`, and the router rebuilds the page and scrolls to top
  mid-keystroke.
- CSV filenames come from `csvFilename(scope, kind)`, which slugifies and dates
  them. Don't hand-build a filename.

## Going live

Three values in `js/config.js` — `clientId`, `tenantId`, `workbookUrl`. Filling
all three switches the app from sample data to the real workbook; there is no
flag to flip. `workbookUrl` is already set. Outstanding:

- **IT must register the Entra app** (single tenant, SPA, PKCE, delegated
  `Files.ReadWrite.All` + `User.Read`). See `SETUP.md`. Not started as of the
  last check. The MSAL client ID is not a secret and is fine in a public repo;
  there is no client secret.
- **The workbook must be populated** from the generated template.
- Stratum's real column headers are still unknown — `SourceStratum` is a
  designed guess. When the real export arrives it's a `dictionary.json` edit
  plus regeneration.

## Git

Work on `claude/london-mapping-ux-edits-16uadk` and push there.

**The remote deliberately points at the old repo name**
(`callumcant/username.github.io`). The repo was renamed to
`callumcant.github.io`; GitHub redirects, so pushes work. Pointing it at the new
name fails the sandbox's repository allow-list. Leave it.

Don't open a pull request unless asked.

## Known gaps

- No automated tests. Verification is manual via Playwright.
- The column picker's checkbox groups don't cover every one of the 57 school
  columns; a key missing from `PICKER_GROUPS` is only reachable via the
  "Everything" preset.
- `downloadCsv` exports rows in filter order, not the order shown on screen —
  so re-sorting a table doesn't change the exported file.
- The Schools "All branches" filter actually filters `laName` (borough). A
  separate `branchName` ("NEU branch") column exists. The label and the field
  disagree; needs a decision on which one the filter should mean.
- `repsTrainedSinceStart` has no data source. It's retained in the dictionary,
  schema and rollups for when training data arrives, but is not displayed.
- Michal's bargaining-dashboard link from MAT pages needs a URL pattern from
  Callum before it can be built.
- Rubik (jsDelivr) and MSAL (esm.sh) are still CDN-loaded, ~200KB. Self-hosting
  was offered and not yet taken up.
