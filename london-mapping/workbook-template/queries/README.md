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

The **School view**, the **Branch view** and the **MAT view**, and everything
they need. That is the bulk of the model — the dashboard, exceptions band and
quadrant chart all read `SchoolView` and nothing else, and the two rollups read
`SchoolView` and nothing else either.

Still to write: `Trend`, and the small queries behind the disputes and anomalies
sheets.

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
| everything else | **Only Create Connection** |

`Src_StratumHistory` in particular must stay a connection: it is one row per
school per week, forever, and putting it on a sheet would blow past Excel's row
limit within a couple of years at London scale.

## Load order

| # | Queries | What they are |
|---|---|---|
| `00_` | `P_SiteUrl` `P_Library` `P_MappingFolder` `P_LocalFolder` `P_RepPositions` `P_BranchColumn` `P_QuadrantMinMembers` `P_QuadrantMinPlotted` | the settings anyone might need to change |
| `10_` | `fnFolderContents` `fnGetFile` `fnCsvTable` `fnExcelTable` `fnTable` | reaching the files, on SharePoint or on this PC |
| `11_` | `fnExpect` `fnNumber` `fnZero` `fnDensity` `fnMedian` `fnYesNo` `fnRepRatio` | small shared rules |
| `20_` | `Src_GIAS` `Src_StratumHistory` `Src_Stratum` `Src_ActivistHistory` `Src_PayDashboard` `Src_WorkforceSurvey` | the big exports |
| `21_` | `Reps_ByWorkplace` `Src_WCtoURN` `Src_MatAliases` `Src_Meetings` `Src_FieldNotes` `Src_BranchFacts` `Src_MatFacts` `Src_RepCommittees` | rep counts, lookups and the shared field log |
| `22_` | `Src_RepCounts` `Src_Disputes` `Disputes_ByUrn` | this week's rep counts; the restricted dispute tracker |
| `23_` | `Src_Reconciliations` `Rec_Decisions` `Rec_UrnByWorkplaceCode` `Rec_Successors` `Rec_Excluded` | decisions taken about anomalies |
| `24_` | `Stratum_ByUrn` `Pay_ByUrn` `Meetings_ByUrn` `Notes_BySchool` | one row per school, per source |
| `25_` | `fnAddQuadrant` | the organising-quadrant classification |
| `26_` | `fnNotesByLevel` `Committee_ByMat` | notes and committees for the rollups |
| `30_` | `SchoolView` | everything joined together |
| `31_` | `BranchView` | one row per branch, summed from the School view |
| `32_` | `MatView` | one row per trust, summed from the School view |

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
