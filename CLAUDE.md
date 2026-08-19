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
   newer row. `Snapshots` must also stay in **insertion order** — the windowed
   read (below) finds the recent weeks by reading the end of the table. Sorting
   it in Excel doesn't lose data, but it does cost a slow full read until
   someone puts it back.
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
    app.js              boot, route registration, the whole app shell — grouped
                        sidebar, header, universal search, mobile nav overlay
    router.js           hash router; params are decodeURIComponent'd, and the
                        query string arrives as params.query
    config.js           the 3 go-live values; preview mode is INFERRED from them
    auth.js             MSAL PKCE sign-in
    ui.js               shared helpers: escapeHtml, format*, renderDataTable,
                        sparkline, formatDelta, openMicroForm, showToast,
                        barCell, csvFilename, downloadCsv, column prefs
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
- Reporters (meetings, rep committee, notes, disputes) work in
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
- **Reps come from Stratum, and the app collects no rep data of its own.**
  `repCount` is a column on `SourceStratum`, refreshed weekly, and it is the
  only rep figure anywhere in the app. There used to be a `RepsRecruited` event
  log and a "+ Log rep recruited" button; both were dropped in favour of the
  authoritative source. Two consequences, both accepted on purpose: rep
  movement is *net*, so a school that recruits two and loses two reads zero;
  and no organiser's name is attached to a recruitment any more. "Reps since
  the baseline" comes from the `repCount` column in `Snapshots`, which has been
  captured all along.
- **`state.snapshots` is a window, not the whole history.** Against a real
  workbook `readSnapshotWindow` in `graph-client.js` loads the last 12 weekly
  captures plus the baseline week, because `Snapshots` grows by one row per
  school per week and never stops (3,000 rows/week at London scale). The
  workbook still holds everything; the browser doesn't. Any code that treats
  `state.snapshots` as complete — counting captures, finding the earliest date,
  reconstructing a long trend — will be wrong in live mode and right in preview,
  which is the worst way to be wrong. Widen the window if you need more.
- **A windowed series has a gap in it**, so anything drawn on an evenly-spaced
  axis must plot `recentRun(series)` from `snapshots.js`, never the raw series.
  Otherwise the baseline point sits one step from a reading months later and the
  line shows a change that never happened. Two-point deltas (`baselinePoint`,
  `pointWeeksBefore`) are unaffected — they compare named dates and don't care
  what's between them.
- **`renderDataTable`'s `opts.maxRows` caps the DOM, not the data.** The Schools
  table passes 200 because laying out 3,000 rows takes ~2s and the page redraws
  as you type. Sorting still spans the whole filtered set. Don't apply the cap to
  the CSV export — the footer line tells people to use it to get everything.

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
  designed guess, and it now carries the rep count as well as membership and
  headcount. When the real export arrives it's a `dictionary.json` edit plus
  regeneration. Whoever produces the export needs telling that the weekly
  report must include a rep count per workplace code.
- **Watch the console on the first real load.** Two things in `graph-client.js`
  have only ever run against an in-memory stub, because they need a live
  workbook: the windowed snapshot read, and the `dataBodyRange?$select=rowCount`
  call it starts with. If Graph ignores that `$select` it returns every cell in
  the range — worse than the full read the window exists to avoid. It falls back
  safely either way, and logs which path it took (`[graph] snapshots: N of M
  rows in K requests`), so the log line is the thing to check.

## Git and deploying

**`claude/organizers-campaign-dashboard-web-a9h44v` is the default branch, and
GitHub Pages builds the live site from it.** Pushing to a feature branch changes
nothing that anyone can see. Work on a feature branch, then merge into that
branch to deploy. (The default branch being a `claude/...` feature branch is
odd but deliberate-by-accident; renaming it to `main` is unfinished business.)

**The remote deliberately points at the old repo name**
(`callumcant/username.github.io`). The repo was renamed to
`callumcant.github.io`; GitHub redirects, so pushes work. Pointing it at the new
name fails the sandbox's repository allow-list. Leave it.

Don't open a pull request unless asked. Don't merge to the default branch
without asking either — that publishes to a site the team uses.

**After deploying, hard-refresh before believing a bug report.** The app ships
unbundled ES modules, so every `.js` is a separate file with its own cache
entry, and Pages serves them with a ~10-minute TTL. For a few minutes after a
deploy a browser can hold a *mix* of old and new modules — a combination that
was never tested together and can fail in ways neither version does alone. It
self-heals when the cache expires. This has already produced one confusing bug
report ("No match for ''" stuck in the header search: an old `search-select.js`
against a new `app.js`). Calls across module boundaries that are new in a
release are worth writing defensively (`handle.setItems?.(…)`) for that window.

## Known gaps

- No automated tests. Verification is manual via Playwright.
- The column picker's checkbox groups don't cover every one of the 57 school
  columns; a key missing from `PICKER_GROUPS` is only reachable via the
  "Everything" preset.
- `downloadCsv` exports rows in filter order, not the order shown on screen —
  so re-sorting a table doesn't change the exported file. It also exports every
  filtered row while the Schools table shows only the first 200; that gap is
  deliberate, and the table's footer line points at it.
- **The weekly snapshot write isn't resumable.** `maybeCaptureSnapshot` makes
  the first person to open the app each week write the whole capture from their
  browser, in sequential batches of 200 (15 requests at 3,000 schools). Close
  the tab halfway and the week is captured for some schools and not others —
  and because de-duplication guards against duplicate rows, not missing ones,
  that shows on the dashboard as a real-looking dip. This is an accuracy risk,
  not a speed one, and the fix is the scheduled tenant-side flow in
  `docs/scheduled-snapshot.md`.
- `loadAllTables` fires all 16 table reads at the same workbook simultaneously.
  Microsoft's Excel API guidance says to avoid high concurrency against one
  workbook, so this makes 429 throttling likelier than sequential reads would.
  Not yet observed, because nothing has run against the real workbook.
- The Schools "All branches" filter actually filters `laName` (borough). A
  separate `branchName` ("NEU branch") column exists. The label and the field
  disagree; needs a decision on which one the filter should mean.
- `repCount` falls back to `0` when a school has no `SourceStratum` row, so
  "missing from the export" and "genuinely has no rep" are indistinguishable:
  the school counts in `noRepSchools`, drags `repCoveragePercent` down and
  renders hollow on the map. Such a school also shows zero membership and zero
  density, so it is visibly broken by other means — but the rep figure alone
  does not say so.
- `buildProjectDashboard` in `js/data/rollups.js` has no importer anywhere. It
  is dead code, along with the project-level `repCommittees` count that only it
  computes.
- `repsTrainedSinceStart` has no data source. It's retained in the dictionary,
  schema and rollups for when training data arrives, but is not displayed.
- **Bargaining Dashboard links are only as good as the numbers behind them.**
  `js/ui/bargaining-link.js` builds them: schools key on URN (always present,
  so the button is always there), trusts key on a Companies House number held
  in the `MatFacts` sheet's new "Companies House number" column. That column
  ships blank — a wrong number links to another employer's finances, so it has
  to be looked up per trust — and a MAT without one shows no button at all.
  Nothing flags the omission; a silently missing button is the failure mode.
  The column is text-formatted in the template so Excel can't eat the leading
  zero off `06228587`, and `normaliseCompanyNumber` pads it back if it does.
- Rubik (jsDelivr) and MSAL (esm.sh) are still CDN-loaded, ~200KB. Self-hosting
  was offered and not yet taken up.
