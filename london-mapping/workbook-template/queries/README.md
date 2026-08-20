# Power Query source — the interim workbook

The M code behind `NEU London Mapping - Data.xlsx`, the master workbook that
replaces the app now that the Entra app registration has been declined. See
`../../docs/pivot-plan.md` for why, and the build plan for what the workbook as
a whole is meant to contain.

**These files are the source of truth for the queries.** Excel keeps M code
buried in a binary part of the `.xlsx` that nothing can diff and no generator
can write, so the code lives here as plain text — reviewable, diffable, and
unable to drift silently from `data-dictionary/dictionary.json`. Assembling
them into a workbook is done by hand, once. If you change a query, change it
here and paste it in; a fix made only inside Excel is a fix nobody else can
see.

## What is built so far

All of it. The **School view**, the **Branch view** and the **MAT view**; the
**Trend** sheets; the **Disputes** sheet; the **Anomalies** sheet; and
everything the six of them need.

The School view is still the bulk of the model — the dashboard, exceptions band
and quadrant chart all read `SchoolView` and nothing else, and the two rollups
read `SchoolView` and nothing else either.

What is left is not query work: laying the sheets out, adding the sparklines and
the conditional formatting, writing the instruction tab, and checking the
figures against the app on the same sample data.

## Pasting a query into Excel

For each file, in dependency order (the number prefix is that order):

1. **Data → Get Data → From Other Sources → Blank Query**
2. **Home → Advanced Editor**, select everything in the box, paste the file's
   whole contents over it — comments and all.
3. **Rename the query to the name in the first line of the file** (right-click
   it in the Queries pane → Rename). The names matter: queries refer to each
   other by name, and `SchoolView` will not find `Src_GIAS` if you leave it
   called `Query1`.
4. **Close & Load To… → Only Create Connection**, except for the three views.

The `P_*` queries are ordinary queries that return a value, not Excel
"parameters". Nothing needs to be set up in Manage Parameters — a query called
`P_LocalFolder` that returns `""` is all `fnTable` is looking for.

### What loads where

| Query | Load to |
|---|---|
| `SchoolView` | the **School view** sheet, as a table |
| `BranchView` | the **Branch view** sheet, as a table |
| `MatView` | the **MAT view** sheet, as a table |
| `Trend` | the **Trend** sheet, as a table |
| `Trend_ByBranch` | the **Trend by branch** sheet, as a table |
| `Trend_ByMat` | the **Trend by MAT** sheet, as a table |
| `Dispute_Kpis` | the **Disputes** sheet, top block |
| `DisputeView` | the **Disputes** sheet, the dispute list |
| `Dispute_Schools` | the **Disputes** sheet, beneath the list |
| `Anomaly_Counts` | the **Anomalies** sheet, top block |
| `Anomalies` | the **Anomalies** sheet, the list |
| everything else | **Only Create Connection** |

`Src_StratumRows`, `Src_StratumHistory` and `Trend_ByUrn` in particular must
stay connections: they are one row per school per week, forever, and putting one
on a sheet would blow past Excel's row limit within a couple of years at London
scale. The Trend sheets hold the weekly *series*, which is one row per week —
a few hundred rows, not a few hundred thousand.

Three queries to one sheet is fine — each gets its own block, with a heading and
a couple of blank rows between them. Give each block room to grow downwards, or
a refresh that returns more rows than last time will refuse to load.

## Load order

| # | Queries | What they are |
|---|---|---|
| `00_` | `P_SiteUrl` `P_Library` `P_MappingFolder` `P_LocalFolder` `P_RepPositions` `P_BranchColumn` `P_QuadrantMinMembers` `P_QuadrantMinPlotted` `P_BaselineDate` `P_TrendCompareWeeks` `P_BallotThreshold` | the settings anyone might need to change |
| `10_` | `fnFolderContents` `fnGetFile` `fnCsvTable` `fnExcelTable` `fnTable` | reaching the files, on SharePoint or on this PC |
| `11_` | `fnExpect` `fnNumber` `fnZero` `fnDensity` `fnMedian` `fnYesNo` `fnRepRatio` | small shared rules |
| `20_` | `Src_GIAS` `Src_StratumRows` `Src_StratumHistory` `Src_StratumUnkeyed` `Src_Stratum` `Src_ActivistHistory` `Src_PayDashboard` `Src_WorkforceSurvey` | the big exports |
| `21_` | `Reps_ByWorkplace` `Src_WCtoURN` `Src_MatAliases` `Src_Meetings` `Src_FieldNotes` `Src_BranchFacts` `Src_MatFacts` `Src_RepCommittees` | rep counts, lookups and the shared field log |
| `22_` | `Src_RepCounts` `Src_Disputes` `Dispute_Urns` `Disputes_ByUrn` | this week's rep counts; the restricted dispute tracker |
| `23_` | `Src_Reconciliations` `Rec_Decisions` `Rec_UrnByWorkplaceCode` `Rec_Successors` `Rec_Excluded` | decisions taken about anomalies |
| `24_` | `Stratum_ByUrn` `Pay_ByUrn` `Meetings_ByUrn` `Notes_BySchool` | one row per school, per source |
| `25_` | `fnAddQuadrant` | the organising-quadrant classification |
| `26_` | `fnNotesByLevel` `Committee_ByMat` | notes and committees for the rollups |
| `30_` | `SchoolView` | everything joined together |
| `31_` | `BranchView` | one row per branch, summed from the School view |
| `32_` | `MatView` | one row per trust, summed from the School view |
| `33_` | `fnTrendSeries` `fnTrendDeltas` `Trend_ByUrn` | the weekly history, and the arithmetic on it |
| `34_` | `Trend` `Trend_ByBranch` `Trend_ByMat` | one row per week, three ways |
| `35_` | `Dispute_Schools` `DisputeView` `Dispute_Kpis` | the disputes sheet |
| `36_` | `Anomaly_Types` | what each kind of anomaly is |
| `37_` | `Anomalies` | everything that doesn't line up |
| `38_` | `Anomaly_Counts` | how many of each, outstanding and decided |

Paste them in this order and no query is ever referring to something that does
not exist yet.

## The weekly routine

Drop this week's two exports in their folders — `workplace totals and density`
into `Stratum exports`, `all workplace activists` into `Activist exports` —
then open the master and **Data → Refresh All**. That is the whole thing.

**Name both files for the week they cover**, as `2026-08-16.csv`. Neither
export carries a date of its own, so the filename IS the date: an undated file
stops the refresh rather than quietly attaching itself to the current week.

The history is rebuilt from the files on every refresh, so a week is either
there or it is not — there is no partly-captured week, and no past row anyone
can accidentally edit. If a missing older week turns up later, dropping it in
backfills the trend and changes no current figure.

## Test mode

Set `P_LocalFolder` to a folder on this PC and every query reads CSVs from
there instead of SharePoint: one CSV per table, named after the table
(`SourceGIAS.csv`, `WCtoURN.csv`, `Meetings.csv` …), with `Stratum exports` and
`Activist exports` as subfolders inside it.

That is how the workbook gets built and checked against the app's sample data
before any real data exists — which matters, because **no real member, school
or dispute data may go anywhere near this repo**.

Set it back to `""` to go live.

## Two rules the queries are built around

**Density is summed-then-divided, never averaged.** Membership and headcount
are summed inside a Group By, and `fnDensity` is only ever called afterwards on
the summed columns. The division is structurally downstream of the sum, so no
edit can accidentally turn it into a mean of school densities — a stronger
guarantee than the app had, where the rule lived in a comment.

**A blank is an answer.** Unknown turnout stays blank rather than becoming 0%;
a quadrant with too few or too alike peers stays blank rather than naming one.
Both would otherwise read as findings, and neither is.

## The two rollups — Branch view and MAT view

Both read `SchoolView` and nothing else. The joins have already been done once,
at school level, and rolling up from the sources again would be a second
implementation of them, free to disagree with the first. Both group, sum inside
the group, and call `fnDensity` afterwards, so the density rule holds by
construction.

They mirror `buildBranchLevel` and `buildMatLevel` in `js/data/rollups.js` field
for field, which is what makes the free correctness test possible: same inputs,
same numbers, or one of the two is wrong.

### Three tables they need that nothing else did

| Table | Lives in | Holds |
|---|---|---|
| `BranchFacts` | `Lookups.xlsx` | is this a project branch, and reps trained |
| `MatFacts` | `Lookups.xlsx` | is this a target MAT, and the committee fallback |
| `RepCommittees` | `Field log.xlsx` | dated reports of a trust's rep committee |

The split follows what each one is: the two `*Facts` tables are settings someone
maintains, so they sit with the other lookups; `RepCommittees` is an append-only
log people write to as things happen, so it sits with the meetings and notes.

`Reps trained since start` is the last hand-kept number in the workbook —
training data has no pipeline. It is **not** the rep count and must never be
added to it.

### "Branch" is still an open decision

`P_BranchColumn` decides whether the Branch view groups by `LA (borough)` or by
`NEU branch`. It defaults to borough because that is what the app does, so the
two can be compared — not because the question is settled. A borough can hold
more than one NEU branch and a branch can straddle boroughs, so the choice moves
real numbers. Two things deliberately do **not** follow the setting: branch
notes match on the name typed into the field log, and the School view's
`Quadrant (vs branch)` column is fixed to borough.

### Notes that match nothing get a row

Branch and MAT notes match on the name as typed. "Harris Fed" matches no trust,
and a note that matches nothing is otherwise indistinguishable from a note
nobody wrote. Both views end with rows carrying `Row type` =
`Notes only — no trust of this name`, no schools and no figures — so the typo is
visible and no total moves. `Row type` is `Branch` or `MAT` on every real row.

### A school with no trust is not on the MAT view

Maintained schools belong to no trust, so `MatView` drops them, exactly as the
app does. They are all still on the School view and counted on the Branch view.
The MAT view's school count will not add up to London, and should not.

## The Trend sheets

This is what makes the workbook worth refreshing rather than only reading.
Every other sheet answers "how are things"; these answer "are they moving, and
which way" — which is the question an organiser is actually asked, and the one
the twelve-tab spreadsheet could not answer at all, because it only ever held
the current week.

`Trend` is London, one row per week. `Trend_ByBranch` and `Trend_ByMat` are the
same series per borough and per trust, because a borough can be falling while
the region rises.

**The history is derived, not captured.** The app captured a week from whoever
opened the site first, appended 3,000 rows from their browser, and could not
resume if they closed the tab — a half-written week showed on the dashboard as a
real-looking dip, and any row, once written, could be edited by anyone. Here the
whole history is recomputed from the export files on every refresh. There is
nothing to capture, nothing to append, nothing to edit, and no half-finished
week: a week is in the folder or it is not.

`Trend_ByUrn` is the equivalent of the app's `Snapshots` table and stays a
connection. `fnTrendSeries` groups it into weeks and `fnTrendDeltas` adds the
comparisons; all three sheets are those two functions over different rows, which
is what stops them disagreeing.

### Two comparisons, and three settings

| Setting | Means |
|---|---|
| `P_BaselineDate` | the starting line every "since" figure is measured from. `BASELINE_DATE` from `js/data/snapshots.js`, to the day |
| `P_TrendCompareWeeks` | the short comparison, default 4 weeks |
| `P_BallotThreshold` | the Trade Union Act turnout threshold, used by the Disputes sheet |

The baseline **week** is the earliest week on or after `P_BaselineDate`, not the
date itself. Weeks before it, and the baseline week itself, have blank "since
baseline" columns — there is nothing to compare them against, and an unstated
starting line reads as authoritative when it is not.

The short comparison is the most recent week **at least** four weeks back, not
the row four rows up. `Compared with` says which week that turned out to be.

**A change in density is a difference of two proportions.** 0.34 to 0.36 gives
0.02, which formats as 2% and means two percentage points. It is not "up 6%",
and no label on the sheet may say that it is.

### The gap columns

`Weeks since previous reading` and `Gap in the history` have no app equivalent,
because the workbook's failure mode is different. The app's history was
windowed, so a hole in the series was by design and `recentRun()` existed to
find the unbroken run. Nothing is windowed here — the whole folder is read every
time — so a hole means a week's export was never dropped in. A fortnight's
change plotted next to a week's looks like a surge, so the gap is named on the
row and again on the Anomalies sheet. Dropping the missing file in backfills it
and moves no current figure.

### Sparklines

Native Excel sparklines read a range of cells, and each Trend sheet is sorted
oldest week first for exactly that reason. **Sorting a Trend sheet by anything
else leaves every figure right and every line wrong.**

For the London sparklines: select the cell they should sit in, then **Insert →
Sparklines → Line**, and give it the table column as its data range —
`Trend[Density (total)]`, `Trend[Membership (total)]`, `Trend[Rep count]`. A
table column reference grows on its own as weeks are added, where a fixed
`A2:A40` does not.

For a single borough or trust, don't try to give each one its own sparkline —
33 boroughs is 33 hand-placed sparklines that break the first time a row count
changes. Put a slicer on `Branch` over `Trend_ByBranch` and a line chart beside
it instead.

### The KPI cells

Every "since" figure on a dashboard is the last row of `Trend`, and the safe way
to reach it is by the newest week rather than by row number:

```
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Density (total)])
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Density since baseline])
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Rep count since baseline])
```

`Rep counts as at` on that row says which week of the activists export answered
its rep figures. It is normal for it to be a day or two off the Stratum week —
they are two files, pulled at two moments — and each Stratum week takes the most
recent activist week at or before it. If that column is ever blank, every rep
figure in the row is Stratum's Yes/No flag standing in as a floor of 1.

## The Disputes sheet

Three blocks, top to bottom: `Dispute_Kpis`, then `DisputeView`, then
`Dispute_Schools`.

`DisputeView` is the tracker with the schools on each dispute counted and their
membership added up. A dispute is easier to judge with "9 schools, 640 members,
2 with no rep" beside it than with a cell of comma-separated URNs.
`Dispute_Schools` is that unpacked one school per row — the app's dispute detail
page, and the sheet that answers "who is actually in this dispute", because a
dispute at an employer with eleven schools is eleven organising situations.

`Dispute_Kpis` mirrors `disputeKpis` in `js/data/rollups.js`: live disputes,
successful indicative ballots, successful formal ballots, strike days, disputes
resolved green — plus three the workbook can add for free. It is a
Measure/Value/**What it counts** table rather than one wide row, because the
definitions are the point: "successful indicative ballots" counts ballots that
reached a legal threshold, not ballots people were pleased with, and a number on
a dashboard with no definition beside it gets quoted in a meeting as whatever
the reader assumed.

**A blank ballot percentage is not a failed ballot.** It stays blank in
`Indicative reached threshold` and is not counted either way in the KPIs.

### The dispute tracker's permissions reach the whole workbook

`Src_Disputes` reads a file in a subfolder whose inheritance is broken, limited
to dispute leads and SIOs. That was the direct answer to IT's objection about
sensitivity and it stays.

It has a consequence worth being explicit about: **the School view counts
disputes per school**, so `SchoolView` → `Disputes_ByUrn` → `Src_Disputes`, and
anyone who cannot open that folder cannot refresh the master workbook at all.
They get a permissions error rather than a wrong number, which is the correct
failure, but it does mean the master is a dispute-lead file. If the workbook
needs to go wider than that, the fix is a copy with `Disputes_ByUrn` returning
an empty table — not a loosening of the folder.

## The Anomalies sheet

Two blocks: `Anomaly_Counts` at the top, then `Anomalies` itself.

Roughly 5–10% of schools don't match cleanly across GIAS, Stratum and the Pay
Dashboard. That is normal and permanent — three systems, three sets of keys,
three cadences. What is not acceptable is not knowing *which* 5%, because every
one of them is membership sitting outside a total that still looks complete.

**Detection is recomputed every refresh; decisions are stored.** Cleaning an
export fixes a problem once, until next week's export arrives with the same
problem in it. Recording the decision fixes it for every refresh from now on.

To answer an anomaly, copy its `Anomaly type` and `Key` into a new row on the
**Reconciliations** table with an action — `link`, `successor`, `exclude` or
`accept` — and refresh. The row disappears. Reconciliations is append-only:
superseding a decision means a newer row, never an edit.

### Thirteen kinds, six of them the app's

The first six are `ANOMALY_TYPES` in `js/data/reconcile.js`, slug for slug. **The
slugs are the join key between a decision and the thing it decided**, so a
decision recorded in the app silences the same anomaly here and the other way
round. Changing one orphans every decision ever recorded against it.

The other seven the workbook found on its own, mostly because it reads the
export files directly and the app only ever saw what had already been loaded:
rows with no workplace code at all, a workplace repeated within one week, a week
missing from the folder, a dispute listing a school that isn't there, notes
filed against a branch or trust name nothing has, and whether the staff groups
add up to total membership. They are silenced the same way, but the app does not
detect them and will ignore those decisions.

**Every kind gets a row in `Anomaly_Counts`, including the ones at zero.** A
check that disappears when it stops firing is a check nobody knows is running —
and a detection that fires on nothing for a year is either good news or broken,
which look identical if the row isn't there.

### One deliberate difference from the app

In **Members at a closed school**, the app looks only at the first workplace
code on the school, so a closed school whose first code carries 0 members and
whose second carries 50 is missed entirely. The workbook sums the codes and
catches it. That is a bug in `js/data/reconcile.js` worth fixing there rather
than reproducing here.

### One check still not built

`Src_StratumHistory` drops Stratum's own density percentages, because a borough
density cannot be built from per-school percentages and carrying both would give
two columns that disagree in the third decimal place. Comparing them **as a
check** — our density against theirs, per school — is still worth doing, and
would mean reading one of those columns back in for that purpose only. Not done,
deliberately not forgotten.

## The real Stratum export — confirmed August 2026

The long-standing unknown is answered: the queries are written against
Stratum's actual column headers, not the designed guess. The full mapping,
including what is dropped and why, is in the banner comment at the top of
`20_Src_StratumHistory.pq`. Three things came out of it that change the model.

**The workplace totals export carries no rep count** — only a
`Workplace has a rep?` flag and one `Rep MemNo`, one row per workplace. `Rep
MemNo` identifies a person and is **not read at all**: one row per workplace
means one number, so it could never have yielded a count anyway.

The rep count comes from the **second export** instead — see below.

**A repeated workplace would inflate everything.** Rows sharing a workplace
code within one week are collapsed to one rather than summed. With one row per
workplace that should never trigger, which is exactly why it stays: if Stratum
ever changes, summing those rows would silently double that school's membership
in every total in the workbook. `Rows in export` shows it happening. Note the
*later* grouping in `Stratum_ByUrn` does sum — that one is across different
workplace codes belonging to one school, which is right. The two steps look
alike and do opposite things.

**Stratum carries the NEU branch.** `Neu Branch Desc$$neu` comes through as
`NEU branch`, alongside GIAS's `LA (borough)`. That is the answer to a
long-standing muddle in the app, where the "All branches" filter actually
filtered borough. Both columns are on the School view, so the filters can mean
what they say — but somebody still has to decide which one the dashboard rolls
up by. `P_BranchColumn` is where that decision gets made when it is made; until
then it holds the app's answer, borough.

**Excel is Microsoft 365**, so `XLOOKUP`, `FILTER` and `SORTBY` are available
and the dashboard formulas in the build plan work as written.

## Reps — the second export

`all workplace activists` is one row per member per committee position, so
counting rep positions per workplace code gives a real rep count, a real
rep:member ratio, and — because it arrives as a weekly file like everything
else — a real recruitment trend.

`Src_ActivistHistory` reads it, `Reps_ByWorkplace` counts it, and
`Src_RepCounts` picks out the current week. That last query is still the single
place the rep count's source is decided, so if reps ever come from somewhere
else, one query changes and nothing downstream does.

**Which positions count as a rep is a setting**, `P_RepPositions`, defaulting to
the five workplace rep types (`WPR` workplace, `WHS` health & safety, `WEQ`
equality, `WLR` learning, `WGO` green). Cut it to `{"WPR"}` for workplace reps
only; every total follows and the per-type breakdown columns stay on the School
view either way.

Where the activists export has no row for a school but the totals export flags
one, the count falls back to a floor of 1. **`Rep count basis`** travels with
every count and says which:

| Basis | Means |
|---|---|
| `Counted` | counted from the activists export |
| `Flagged, but no rep position recorded` | the activists export covers this school but records no rep position, while the totals export says it has one. A real organising signal: someone is acting as the rep without the position being on the system |
| `None` | covered by the activists export, no rep, not flagged |
| `At least one (flag only)` | not in the activists export at all, but flagged; the count is a floor of 1 |
| `None reported` | neither export says anything |

That column is what keeps a rep:member ratio honest, and it shows at a glance
how completely the activists export covers London. The two exports disagreeing
on some schools is normal, not alarming — different files, taken at different
moments.

### Only four of its 46 columns are read

The export carries every activist's name, home address, postcode, age, personal
email and phone numbers. It **sits in the shared team library** with the other
exports, which is settled and correct: every member of the team can pull this
data from Stratum themselves, so a copy in a folder they can all read gives
nobody access to anything they did not already have. It is not the dispute
tracker, whose audience is genuinely narrower.

The query still reads only `Membership Number`, `Workplace Code`,
`Committee Position` and `Comm Start Date`, discarding the other 42 in its
first step — not because the file is restricted, but because there is no reason
to carry what nothing uses. The membership number stitches continuation rows
together and counts distinct people, then is dropped.

The upshot is that **the master workbook holds no personal data at all**: what
reaches it is counts per workplace.

### Three traps in that export

All three are handled, all three are silent if they are not, and none should be
tidied away.

1. **A member's second and further positions sit on continuation rows**, blank
   in every column except the position ones — roughly a quarter of all rows.
   Read the file without filling those down and you lose a quarter of all
   positions while mis-attributing none of them, so every number still looks
   plausible.
2. **`Comm End Date` is an expiry date, not evidence a position has ended.**
   Where populated at all it is in the future. Filtering on it would delete live
   reps. Nothing filters on it.
3. **`Employer Code` is blank on roughly a third of rows.** Attribution goes
   through `Workplace Code`, which is complete.

### ⚠ Two kinds of volunteer — never merge them

| Concept | Source | Column here |
|---|---|---|
| **Ballot Volunteer** | membership database, position code `WBV` | `Ballot volunteers` |
| **SEV** (Save Education Volunteer) | the ballot export, where it is called "Volunteers" | `SEVs` |

Different things, from different systems, roughly an order of magnitude apart,
and near enough in name to be conflated by anyone reading a column heading
quickly — which has happened before. The Pay Dashboard's `Volunteers` is
renamed to `SEVs` at the source and its `Rep recruited volunteer` to
`Reps recruited by a SEV`, so that **nothing in this workbook is called just
"volunteers"**. An unqualified name is how the two got confused in the first
place.

### Still to do in the app

`data-dictionary/dictionary.json` still describes the guessed `SourceStratum`.
It needs the same edit, followed by `generate_schemas.py` and
`build_workbook.py` — which needs Python, and this machine has none. Not urgent
(the app runs on sample data and is not going live), but the two will describe
different things until it happens.

`fnExpect` is what stands between a future change to the export and a dashboard
full of quietly wrong numbers: a column that is not there stops the refresh and
names itself, rather than arriving as nulls.
