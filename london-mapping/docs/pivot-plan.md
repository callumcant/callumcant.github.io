# Pivot plan — August 2026

**Status: the Graph/SharePoint go-live is cancelled.** IT declined the Entra app
registration. This document records why, what replaces it, and the three
workstreams that follow. It is the starting point for any future session on this
project; read it before `## Going live` in `CLAUDE.md`, which is now historical.

---

## 1. What happened

IT's objections, condensed:

1. **Sensitivity.** Dispute data is materially more sensitive than the BSU
   dashboard's Parquet files. Needs a DPIA and a fuller security assessment.
2. **Permission scope.** `Files.ReadWrite.All` is not restricted to one
   workbook. It grants the app everything the signed-in user can reach in
   SharePoint/OneDrive.
3. **Spreadsheet-as-database.** Not a sensible long-term persistence layer.
4. **Regional scope.** London is not a special case. Building and supporting one
   of these per region makes no sense.
5. **Recommendation.** Take it to Digital Solutions to map requirements
   (possibly cross-region), assess DP/security, and recommend a design. Keep the
   prototype as a demonstration of the requirement.

**Objections 1–4 are all correct.** There is no version of this argument worth
having. Objection 2 had a narrower answer available
(`Files.SelectedOperations.Selected`, or a `Sites.Selected` app registration,
both of which scope access to specific files an admin grants) — but since
objection 3 kills the workbook-as-database design anyway, that concession is
moot. Don't spend effort re-litigating it.

Michal's reply changed the picture: he has a parallel requirement (membership and
density across post-16, support and supply, plus industrial action), the same
scattered-spreadsheets problem, and **already runs scripts that pull the full
Stratum workplace, employer and reps reports into CSV/Parquet**. He has proposed
a jointly-designed, jointly-maintained SQL database covering all workplaces
nationally, fed by manual pulls until Stratum's replacement ships an API.

That is the right answer, and a better one than the design we were defending.

## 2. The response: a two-part pivot

**Part A — ship something before term starts (~1 week).**
A pure Excel workbook. No app, no app registration, no Graph. It carries as much
of the app's functionality as formulas can carry. Organisers open it in Excel
like any other file; IT are not involved, because there is nothing to approve.

**Part B — reframe the app as a validated prototype.**
It stops being a thing we're trying to deploy and becomes the requirements
artefact IT themselves suggested it should be: a working demonstration of the
workflows, with a data model, a set of hard-won design rules, and a one-module
data seam a SQL backend can slot into. Feed it into the joint proposal with
Michal.

The framing for Ian and Digital Solutions: *we're not asking to keep the current
design. We're offering a validated requirements spec, a data model, and a working
reference implementation — plus a colleague whose ingest scripts already run.
What we need is a place to put the data.*

---

## 3. Workstream 1 — update `CLAUDE.md`

Small, do first. Without it the next session reads "IT must register the Entra
app" and works on a dead path.

- Add a status block near the top pointing at this document.
- Rewrite `## Going live` as `## Why there is no go-live`. Keep the technical
  detail (the windowed snapshot read, the `$select=rowCount` gamble, the unknown
  Stratum headers) — it stays relevant to the SQL ingest — but reframe it as
  prototype notes rather than a launch checklist.
- Keep everything under `## Hard rules`. Every one of those is a requirement
  finding, not an implementation detail, and all six carry forward.

## 4. Workstream 2 — the interim workbook

**Deadline: before the start of term. Budget: one week.**

The original brief was to *replace* a 12-tab spreadsheet, so shipping a
spreadsheet is a partial retreat. What makes it not a retreat: this one has the
data model and the density rule baked in, it's generated from the same
`dictionary.json` as everything else, and it's the file that later loads into
SQL without a migration.

### What already exists

`workbook-template/build_workbook.py` reads `dictionary.json` and emits the
15-table `.xlsx` today. That's the raw data layer, done. The work is the
**derived layer on top of it** — the joins and rollups currently living in
`js/data/rollups.js`.

### What survives the move, and what doesn't

| App capability | Excel equivalent | Confidence |
|---|---|---|
| School level (57 cols; joins GIAS + Stratum + Pay Dashboard + Workforce Survey via `WCtoURN`) | A `School view` sheet, one row per URN, XLOOKUP per join | High — but see performance |
| MAT / branch rollups | `SUMIFS` over School view, **then divide** | High |
| Summed-then-divided density | Falls out of SUMIFS naturally; the rule becomes *never use `AVERAGE`* | High — structurally safer than the app |
| Dispute tracker, field notes, meetings, rep committees | Tables people type into, with data-validation dropdowns | High |
| Anomaly detection (the 6 types in `reconcile.js`) | An `Anomalies` sheet of `COUNTIFS` / `ISNA(XLOOKUP(...))` flags | High |
| Dashboard KPIs | Formula cells plus conditional formatting | High |
| Trend sparklines | Excel has native sparklines | Medium |
| Exception band (`exceptions.js`) | Formula-ranked list; loses the written sentences | Medium |
| Weekly snapshot capture | **Manual ritual** — see below | Low, needs a decision |
| Map view | **Lost.** Excel filled maps can't do per-school pins with rep status carried by fill | Lost |
| Universal search, shareable URLs, mobile | **Lost** | Lost |

### The three real decisions

1. **Formulas or Power Query?** Power Query is built into Excel, does the joins
   on refresh rather than live, and would handle 3,000 rows × 15 tables far
   better than a wall of XLOOKUPs. But refresh support in Excel Online is
   limited, so it likely commits everyone to desktop Excel. Needs a check on
   what NEU staff actually have. *Recommendation: check first; prefer Power
   Query if desktop Excel is universal.*
2. **How do snapshots get captured?** The app captured automatically on the
   first open each week. In a workbook this becomes: paste the new Stratum
   export, then copy the key columns and paste-as-values onto the end of the
   `Snapshots` tab. That's a human ritual with a named owner, or it doesn't
   happen. The alternative — keep each week's export as its own dated sheet — is
   easier to do and much worse to query. *Recommendation: the paste-as-values
   ritual, with a one-page instruction block on the tab itself.*
3. **How are the append-only tables protected?** `Snapshots`, `Reconciliations`
   and `RepCommittees` are append-only, and Excel co-authoring lets anyone edit
   any past row. Sheet protection plus a stated rule is the only lever
   available. *This is a genuine regression from the app and should be stated as
   one, not glossed.*

### Build order

1. Confirm desktop-vs-online Excel, then pick formulas or Power Query.
2. Extend `build_workbook.py` to emit the derived sheets. It stays generated from
   `dictionary.json` — don't hand-build the workbook, or it drifts.
3. School view → branch/MAT rollups → dashboard → anomalies.
4. Populate from `mock-data.js` and check the density figures against the app's
   own rollups. Same inputs must give the same numbers — this is the one free
   correctness test available.
5. Write the instruction tab: weekly refresh, snapshot ritual, what not to edit.
6. Send round with a short covering note.

## 5. Workstream 3 — the national SQL proposal

No deadline. This one needs Digital Solutions, and it isn't finished until they
own it.

### Document the prototype

Write `docs/prototype-findings.md`, aimed at Digital Solutions rather than at
another developer. It should carry:

- **The data model.** `dictionary.json` is already the single source of truth and
  already generates three targets (JS schemas, docs, workbook). Adding a fourth —
  SQL DDL — is a generator, not a redesign. *This is the strongest single
  argument available: the schema is done, versioned, and machine-readable.*
- **The six hard rules, as findings.** Summed-then-divided density; append-only
  history; never colour alone; reps come from Stratum and the tool collects none
  of its own; the tool names places, never people (see the comment at the top of
  `exceptions.js` — that's a governance decision, not a UI one); no real data in
  the repo.
- **The workflows.** Ten routes, the reporters, the reconciliation flow, the
  exception band. Screenshots.
- **What was learned the hard way.** The windowed snapshot read exists because
  `Snapshots` grows by one row per school per week and never stops — 3,000
  rows/week at London scale, ~10× that nationally. Any national design has to
  answer that on day one. The non-resumable weekly write is the other one.

### Architecture sketch for the meeting

- **Store:** Azure SQL or Postgres. Workplace-level grain, aggregatable upward,
  national coverage from the start.
- **Ingest:** Michal's existing scripts. Stratum workplace / employer / reps
  reports on a manual cadence, appending, until Stratum's successor has an API.
  Shared dimension tables (workplace, employer, branch, region); separate marts
  per tool. This is his proposal and it's the right one.
- **Access:** a backend API with Entra auth and row-level scoping by region.
  This answers IT's objection 2 directly — no browser gets broad file access.
- **Front end:** the existing app, largely unchanged. **`js/data/store.js` is the
  only module any page imports for data.** Swapping Graph for a REST API is one
  module, not a rewrite. Say this explicitly; it's what makes the prototype worth
  more than a slide deck.
- **Sensitivity split:** dispute data is the sensitive tier and doesn't need to
  live alongside membership counts. A separate schema with tighter grants would
  narrow the DPIA's blast radius considerably. Worth proposing rather than
  waiting to be told.

### Open questions for Digital Solutions

- Who owns the DPIA, and on what timescale?
- What's the retention position on dispute records and field notes?
- Is there an existing NEU pattern for a backend API with Entra auth, or is this
  the first?
- Does Stratum's replacement have an API roadmap, and when?
- Regional scoping: hard row-level security, or is national visibility fine for
  organisers?

---

## 6. Sequencing

| When | What |
|---|---|
| Now | Workstream 1 (`CLAUDE.md`), then start Workstream 2 |
| Before term | Workbook shipped and circulated |
| Parallel | Reply to Ian: concede the design, back Michal's SQL proposal, offer the prototype as the requirements artefact, ask for the Digital Solutions conversation |
| After term starts | Workstream 3 — prototype findings doc, then the joint proposal with Michal |

## 7. What not to do

- Don't rebuild the app against a narrower Graph permission. The design was
  rejected on more than scope.
- Don't delete the app or the Graph client. It's the demonstration, and
  `graph-client.js` documents real constraints (throttling, windowed reads, batch
  limits) that inform the SQL design.
- Don't let the workbook drift from `dictionary.json`. Generated, always.
- Don't let "take it to Digital Solutions" become an indefinite park. The
  workbook shipping before term is what keeps the requirement visible while the
  longer process runs.
