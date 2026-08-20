# Building the interim workbook

A start-to-finish guide to turning the 70 query files in
`workbook-template/queries/` into `NEU London Mapping - Data.xlsx`.

Two parts. **Part A** answers "is the design finished enough to start building?"
**Part B** is the build itself, in order, with what to do when something breaks.

No programming knowledge is assumed. Where a piece of jargon is unavoidable it
is explained the first time it appears.

---

## The five words you need

**Power Query** — a data tool built into Excel. You point it at files, it reads
them, joins them together and drops the answer onto a sheet. It comes with
Excel; there is nothing to install.

**Query** — one step of that work, with a name. `Src_GIAS` reads the GIAS
export. `SchoolView` joins everything onto one row per school. Queries can use
each other, which is why they have to go in in a particular order.

**M** — the language the queries are written in. The `.pq` files are M. You
never write any; you paste it.

**Connection only** — a query that does its work but doesn't put anything on a
sheet. Most of the 70 are like this: they exist so that six others can use them.

**Refresh** — re-running every query against whatever is in the folders now.
This is the weekly ritual, and it is one button.

---

# Part A — is the plan finished?

**Yes, with three things to check first.** Every join, every rollup and every
figure is written and reviewed. Nothing is waiting on a design decision.

What is *not* true is that any of it has been run. There is no Excel and no
Python on the machine this was written on, so the queries have been checked for
structure — brackets, names, cross-references — and not for behaviour. Expect
the first paste-in to find a handful of small things. That is normal and it is
why Stage 3 below is done in test mode with fake data.

## The three checks, before you open Excel

These are the ones that could waste a day's work if the answer is no.

**1. Does everyone who needs this have desktop Excel?**

Power Query refreshes reliably in the installed Excel on Windows. In Excel in a
browser it does not. If some of the team only have the browser version, they can
still *read* the workbook — they just can't refresh it — which may be fine if
one named person does the weekly refresh. But it needs to be a decision rather
than a discovery.

**2. Do we have the past weeks' export files, or only this week's?**

The Trend sheets are built from the folder of weekly exports: one file per week
is one point on the line. If the folder starts with a single file, the trend
starts with a single point and fills in a week at a time from now on. Everything
else in the workbook works perfectly on day one.

If anyone has back-copies of the weekly Stratum and activist exports, dig them
out — each one you drop in is a week of history you get for free, and dropping
in an old week never changes a current figure. Michal may have them, since he
already runs the pulls.

**3. Who can open the dispute folder?**

The dispute tracker lives in a subfolder only dispute leads and SIOs can open.
That is deliberate and it stays. But the School view counts disputes per school,
so **refreshing the workbook requires access to that folder.** Anyone else gets
a permissions error rather than a wrong number, which is the right failure — but
it makes the master a dispute-lead file.

Decide now which you want:

- the master stays a dispute-lead file (simplest, nothing to do), or
- a second copy for wider circulation, with the dispute queries stubbed out.

Don't solve it by loosening the folder.

## Settings to decide — cheap, and changeable later

Each of these is a single query holding a single value. Changing one and hitting
refresh moves every figure that depends on it.

| Setting | Holds | The open question |
|---|---|---|
| `P_BranchColumn` | `"LA (borough)"` | Should a "branch" mean the borough, or the NEU branch? Stratum now gives us both. A borough can hold several branches and a branch can straddle boroughs, so the choice moves real numbers. Default matches the app so the two can be compared |
| `P_RepPositions` | the five workplace rep types | Does "a rep" mean all five (workplace, H&S, equality, learning, green) or just the workplace rep? Narrow it to `{"WPR"}` and every rep figure follows |
| `P_BaselineDate` | `2026-08-09` | The starting line every "since" figure is measured from. Matches the app. If the oldest export you have is later than this, the first week you *do* have becomes the baseline |
| `P_BallotThreshold` | `0.5` | The Trade Union Act turnout threshold. Only change if the law does |

## What you have to supply before it will refresh at all

The queries are the machinery; these are the materials. Nothing works without
them.

| File | Holds | Who keeps it |
|---|---|---|
| `Lookups.xlsx` → `WCtoURN` | workplace code → URN | **the hinge of the whole thing.** A code missing here means that school has no membership data anywhere |
| `Lookups.xlsx` → `MatAliases` | trust name spellings → one canonical name | you |
| `Lookups.xlsx` → `MatFacts` | is this a target MAT | you |
| `Lookups.xlsx` → `BranchFacts` | is this a project branch, reps trained | you |
| `Field log.xlsx` → `Meetings`, `FieldNotes`, `RepCommittees` | what the team logs as it happens | the team |
| `Disputes.xlsx` → `DisputeTracker` | the dispute tracker | dispute leads, restricted folder |
| `GIAS export.csv` | the school register | DfE download |
| `Pay Dashboard export.csv` | ballot turnout and engagement | national |
| `Workforce Survey export.csv` | turnover, pay, vacancies | national |
| `Stratum exports/` | one file per week, named `2026-08-16.csv` | you, weekly |
| `Activist exports/` | one file per week, same naming | you, weekly |

**Name the two weekly files for the week they cover.** Neither export carries a
date of its own, so the filename *is* the date. An undated file stops the
refresh rather than quietly attaching itself to the current week.

## What the workbook will not do

Worth saying out loud before you circulate it, so nobody discovers it in a
meeting.

- **No map.** Excel's filled maps can't do a pin per school with rep status
  carried by fill. Lost, not deferred.
- **No universal search, no shareable links, no phone.** Lost.
- **The exception band is partly there.** Four of its five kinds — density
  falling, membership falling, reps falling, a standout gain — are now just
  filters over the latest row of `Trend_ByBranch`, and you can build that as a
  sheet. The fifth, "this branch has logged nothing for six weeks", needs a last
  meeting date at branch level that the Branch view doesn't carry. Small job,
  not done.
- **The written sentences are gone.** The app turned each exception into a
  sentence. A sheet gives you a ranked row instead.
- **Append-only is weaker.** `Reconciliations`, the field log and the rep
  committee log are all meant to be added to and never edited. In Excel,
  co-authoring lets anyone edit any past row. Sheet protection plus a stated
  rule is the only lever. This is a genuine regression from the app and should
  be described as one.

The weekly history is the one thing that gets **better**: it is rebuilt from the
export files every refresh, so there is no half-captured week and no past row
anyone can accidentally change.

---

# Part B — building it

Rough shape of the day: about half an hour of setup, two hours of pasting, then
a couple of hours of laying sheets out. It does not have to be done in one
sitting — Excel saves the queries with the file.

## Stage 0 — gather, 30 minutes

Make a folder on your own PC called something like `Mapping test data`, and put
in it a fake copy of every source, as CSV files named after the *table* rather
than the file:

```
Mapping test data\
  SourceGIAS.csv
  SourcePayDashboard.csv
  SourceWorkforceSurvey.csv
  WCtoURN.csv
  MatAliases.csv
  MatFacts.csv
  BranchFacts.csv
  Meetings.csv
  FieldNotes.csv
  RepCommittees.csv
  DisputeTracker.csv
  Stratum exports\
    2026-08-09.csv
    2026-08-16.csv
  Activist exports\
    2026-08-09.csv
    2026-08-16.csv
```

The app's own sample data is the right thing to fill these with — it is already
fake, it is already the right shape, and using it means you can compare the
workbook's numbers against the app's at Stage 8, which is the only free
correctness test available.

Two weekly files rather than one, so the Trend sheets have something to draw.

**No real member, school or dispute data goes in this folder or anywhere near
the repo.**

## Stage 1 — turn on test mode

Test mode is a switch already built into the queries: set it, and every query
reads your fake CSVs instead of SharePoint. You build and debug the whole
workbook without touching real data or needing anyone's permission.

You'll set it in Stage 3, when you paste `P_LocalFolder`: change the empty `""`
to your folder path, like

```
Source = "C:\Users\Callum.Cant\Desktop\Mapping test data"
```

Setting it back to `""` at Stage 9 is what switches the finished workbook to
live.

## Stage 2 — create the master, 10 minutes

1. New blank workbook. Save it as `NEU London Mapping - Data.xlsx`.
2. Make a sheet called **Reconciliations**, and on it type these eight headings
   across row 1:

   `ID` · `Anomaly type` · `Key (URN or workplace code)` · `Action` ·
   `Target key` · `Note` · `Decided by` · `Decided date`

3. Select those headings, **Insert → Table**, tick "My table has headers", then
   with the table selected use **Table Design → Table Name** to name it
   `Reconciliations`.

This one table lives inside the master rather than in a source file, because you
are the only person who edits it. It is where you record decisions about
anomalies — and it is fine for it to be empty for now; the queries expect that.

## Stage 3 — paste the 70 queries, 1.5 to 2 hours

This is the long bit. It is the same six clicks 70 times.

For each file, in the order in the checklist at the end:

1. **Data → Get Data → From Other Sources → Blank Query.** A window called the
   Power Query Editor opens.
2. **Home → Advanced Editor.** Select everything in the box and paste the whole
   contents of the `.pq` file over it — comments and all. The comments are the
   documentation; don't strip them.
3. **Done.**
4. **Rename the query** to the name on the first line of the file
   (`// Query name: Src_GIAS` → rename it to `Src_GIAS`). Right-click it in the
   Queries list on the left → Rename.
5. **Home → Close & Load → Close & Load To…** and choose **Only Create
   Connection**, unless the checklist says otherwise.

### The four traps

**The name matters more than anything else.** Queries find each other by name.
`SchoolView` will not find `Src_GIAS` if you left it called `Query1`. If you
rename nothing else correctly, rename these.

**"Only Create Connection" is not the default.** Excel wants to put every query
on a sheet. Change it every time. If you slip, you get a sheet with 400,000
rows on it and a very slow workbook — delete the sheet and set the query back to
connection only.

**Red errors during pasting are expected.** A query that mentions
`Rec_Decisions` will complain until you've pasted `Rec_Decisions`. Work down the
list and the errors clear themselves. Don't stop to fix one unless it is still
there after you've finished the list.

**Excel may refuse to combine your sources.** If you see an error mentioning
`Formula.Firewall` — usually "Query references other queries and may not
directly access a data source" — it is Power Query's privacy feature refusing to
let a file on SharePoint and a table inside this workbook be used together. Fix
it once: **Data → Get Data → Query Options → Current Workbook → Privacy →
"Ignore the Privacy Levels"**. This is safe here: everything involved is our own
data, and nothing is being sent anywhere.

## Stage 4 — load the six sheets

Six queries go on sheets. The rest stay as connections.

| Query | Sheet | What it is |
|---|---|---|
| `SchoolView` | **School view** | one row per school, 89 columns |
| `BranchView` | **Branch view** | one row per borough |
| `MatView` | **MAT view** | one row per trust |
| `Trend` | **Trend** | one row per week, London |
| `Trend_ByBranch` | **Trend by branch** | one row per week per borough |
| `Trend_ByMat` | **Trend by MAT** | one row per week per trust |

Then two sheets take three queries between them, each as its own block with a
heading and a couple of blank rows above it:

| Sheet | Blocks, top to bottom |
|---|---|
| **Disputes** | `Dispute_Kpis`, then `DisputeView`, then `Dispute_Schools` |
| **Anomalies** | `Anomaly_Counts`, then `Anomalies` |

To put a connection-only query on a sheet afterwards: right-click it in the
**Queries & Connections** pane → **Load To…** → Table.

**Leave room below each block.** If a refresh returns more rows than last time
and there's something in the way, the load fails.

### You know it worked when

- The School view has roughly 3,000 rows and no blank density column.
- The Trend sheet has one row per weekly file you put in the folder.
- The Anomalies sheet is not empty — some anomalies are normal and permanent,
  and an empty Anomalies sheet on real data means a check isn't running.

## Stage 5 — formatting, 45 minutes

Nothing here changes a number; it changes whether anyone can read them.

- **Percentages.** Every density, turnout, rep coverage and ballot percentage is
  stored as a proportion — 0.34, not 34. Format those columns as Percentage with
  one decimal. This includes the "since baseline" density columns.
- **Dates** as `yyyy-mm-dd`, which is how the exports are named too.
- **Freeze the top row** on every sheet (View → Freeze Panes → Freeze Top Row),
  and on the School view freeze the first column too so the school name stays
  visible as you scroll right.
- **Number formats** with a thousands separator on membership and headcount.
- **Conditional formatting** for the things that should catch the eye: a red
  fill where "Rep count" is 0, a colour scale on density, an arrow icon set on
  the "since baseline" columns.

One rule from the app carries over and is worth keeping: **never carry meaning
by colour alone.** If a red fill means "no rep", the column next to it should
still say No. Anyone printing in mono, or colour-blind, gets nothing from the
red.

## Stage 6 — sparklines and charts, 30 minutes

A sparkline is a tiny line chart inside a single cell. Excel has them built in.

For the London trend, put them wherever your headline figures sit:

1. Click the cell the sparkline should live in.
2. **Insert → Sparklines → Line.**
3. For Data Range, type `Trend[Density (total)]` — that is a reference to the
   whole column of the Trend table, so it grows on its own as weeks are added. A
   fixed range like `C2:C40` does not.
4. Repeat for `Trend[Membership (total)]` and `Trend[Rep count]`.

**Do not re-sort the Trend sheets.** They come out oldest week first, and a
sparkline just draws the cells in the order it finds them. Sorting by anything
else leaves every figure correct and every line wrong.

For a single borough or trust, don't make 33 sparklines by hand — put a
**slicer** on the Branch column of `Trend by branch` (click in the table →
Insert → Slicer) and a line chart next to it. One chart, any borough.

## Stage 7 — the dashboard sheet, 1 hour

There is no query behind the dashboard; it is formula cells reading the sheets
you have already built.

The headline "since" figures are all the last row of the Trend sheet, and the
safe way to reach that row is by its date rather than its position:

```
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Density (total)])
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Density since baseline])
=XLOOKUP(MAX(Trend[Week]), Trend[Week], Trend[Rep count since baseline])
```

`XLOOKUP` means: find `MAX(Trend[Week])` — the newest week — in the `Week`
column, and give me what's beside it in this other column. Written this way the
formula keeps working as weeks are added.

Two things to put next to those numbers:

- **What a change in density means.** These columns are a difference between two
  proportions. Formatted as a percentage, 0.02 shows as 2% and means **two
  percentage points**, not "up 2%". Label them "since the baseline week
  (percentage points)" and nobody misquotes them.
- **Which week the reps came from.** `Rep counts as at` on that row says which
  activist export answered the rep figures. A day or two off the Stratum week is
  normal — two files, two moments. Blank means no activist export was available
  and every rep figure is Stratum's yes/no flag standing in as "at least one".

The quadrant chart is a scatter plot over the School view: density on one axis,
turnout on the other, using the `Quadrant (vs branch)` column already on the
sheet.

## Stage 8 — check the numbers against the app, 30 minutes

This is the only free correctness test there is, and it is worth the half hour.

Run the app on the same sample data:

```
python3 -m http.server 8899
# then http://localhost:8899/london-mapping/#/dashboard
```

Compare, in this order:

1. **Total London membership and headcount.** Must match exactly.
2. **London density.** Must match. If membership and headcount match and density
   doesn't, something has been averaged that should have been summed.
3. **Three or four boroughs**, biggest first, on the Branch view.
4. **A trust with schools in several boroughs**, on the MAT view.
5. **The rep count and rep coverage** for London.
6. **The dispute KPIs** against the app's dispute page.

Same inputs must give the same numbers. Where they don't, one of the two is
wrong and it is worth finding out which before anyone uses either.

One difference is expected and is not a bug: the workbook finds an anomaly the
app misses — a closed school with members recorded against its second workplace
code. The app only checks the first code. That is a bug in the app.

## Stage 9 — go live, 20 minutes

1. On SharePoint, in `London data (do not delete)/Mapping`, create the folders:
   `Stratum exports`, `Activist exports`, and a `Disputes` subfolder with
   **inheritance broken** and access limited to dispute leads and SIOs.
2. Put the real source files in, named exactly as in the table in Part A.
3. In the workbook, edit `P_LocalFolder` back to `""` (Queries & Connections →
   right-click → Edit → change the value → Close & Load).
4. **Refresh All.** Excel will ask you to sign in the first time — choose
   **Organizational account** and use your NEU login.
5. Check `P_Library`. If the refresh fails with "Folder not found: Documents",
   open the navigator, read the library's name off the top level, and put that
   in `P_Library` instead. The default library is often listed as "Documents"
   even though the address bar says "Shared Documents".

## Stage 10 — protect it and write the front page

1. **Protect the sheets that shouldn't be typed on** — every view is rebuilt on
   refresh, so anything typed on one is lost anyway. Review → Protect Sheet, no
   password needed; it is a guard rail, not security.
2. **A "Read me first" sheet, first in the tab order**, saying:
   - the weekly routine: drop the two exports in their folders, named for the
     week, then Data → Refresh All;
   - what not to edit: the view sheets get rebuilt, and `Reconciliations` is
     append-only — supersede a decision with a new row, never edit an old one;
   - who owns the weekly refresh, by name;
   - that a blank means "we don't know", not zero — an unknown turnout is blank
     rather than 0%, deliberately, because 0% sorts to the bottom of every list
     and drags every average down.
3. **Circulate it** with a short note saying what it replaces, what it can't do
   (the map, the search, the phone), and who to tell when a number looks wrong.

---

## When something breaks

| What you see | What it means | What to do |
|---|---|---|
| "Column not found in the Stratum export. Expected but did not find: …" | An export has been renamed or reshaped. This error is deliberate — it stops the refresh instead of letting the column arrive as blanks and quietly drag every density down | Fix the name in that one `Src_` query, and tell whoever maintains `dictionary.json` so the app stays in step |
| `Formula.Firewall` … "may not directly access a data source" | Power Query's privacy feature won't combine SharePoint and this workbook | Query Options → Privacy → Ignore the Privacy Levels |
| "Folder not found: Documents" | `P_Library` doesn't match the library's real name | Read the name off the connector's navigator, put it in `P_Library` |
| "The name 'Src_GIAS' wasn't recognised" | A query is missing or misnamed | Check the spelling against the first line of the `.pq` file |
| "No dated Stratum exports" | Nothing in the folder carries a usable date | Rename the files to `2026-08-16.csv` |
| A permissions error on the disputes file | You, or whoever is refreshing, can't open the restricted folder | Expected. See check 3 in Part A |
| The refresh takes minutes | 70 queries against a folder of weekly files | Normal for a first run. If it gets worse as weeks accumulate, say so — there are known fixes |

---

## The paste checklist

Tier by tier, in order. Within a tier the order rarely matters — if a query
complains about a name that hasn't arrived yet, carry on and it will clear.

Everything is **Only Create Connection** unless the right-hand column says
otherwise.

### `00_` the settings

`P_SiteUrl` · `P_Library` · `P_MappingFolder` · `P_LocalFolder` ·
`P_RepPositions` · `P_BranchColumn` · `P_QuadrantMinMembers` ·
`P_QuadrantMinPlotted` · `P_BaselineDate` · `P_TrendCompareWeeks` ·
`P_BallotThreshold`

*Set `P_LocalFolder` to your test folder as you paste it.*

### `10_` reaching the files

`fnFolderContents` · `fnGetFile` · `fnCsvTable` · `fnExcelTable` · `fnTable`

### `11_` small shared rules

`fnExpect` · `fnNumber` · `fnZero` · `fnDensity` · `fnMedian` · `fnYesNo` ·
`fnRepRatio`

### `20_` the big exports

`Src_GIAS` · `Src_StratumRows` · `Src_StratumHistory` · `Src_StratumUnkeyed` ·
`Src_Stratum` · `Src_ActivistHistory` · `Src_PayDashboard` ·
`Src_WorkforceSurvey`

### `21_` rep counts, lookups, the field log

`Reps_ByWorkplace` · `Src_WCtoURN` · `Src_MatAliases` · `Src_Meetings` ·
`Src_FieldNotes` · `Src_BranchFacts` · `Src_MatFacts` · `Src_RepCommittees`

### `22_` this week's reps; the dispute tracker

`Src_RepCounts` · `Src_Disputes` · `Dispute_Urns` · `Disputes_ByUrn`

### `23_` decisions taken about anomalies

`Src_Reconciliations` · `Rec_Decisions` · `Rec_UrnByWorkplaceCode` ·
`Rec_Successors` · `Rec_Excluded`

### `24_` one row per school, per source

`Stratum_ByUrn` · `Pay_ByUrn` · `Meetings_ByUrn` · `Notes_BySchool`

### `25_`–`26_` quadrant, notes, committees

`fnAddQuadrant` · `fnNotesByLevel` · `Committee_ByMat`

### `30_`–`32_` the three views

| Query | Load to |
|---|---|
| `SchoolView` | **School view** sheet |
| `BranchView` | **Branch view** sheet |
| `MatView` | **MAT view** sheet |

### `33_`–`34_` the trend

`fnTrendSeries` · `fnTrendDeltas` · `Trend_ByUrn` — all connection only.
`Trend_ByUrn` especially: it is one row per school per week and must never go on
a sheet.

| Query | Load to |
|---|---|
| `Trend` | **Trend** sheet |
| `Trend_ByBranch` | **Trend by branch** sheet |
| `Trend_ByMat` | **Trend by MAT** sheet |

### `35_` the disputes sheet

| Query | Load to |
|---|---|
| `Dispute_Schools` | **Disputes** sheet, bottom block |
| `DisputeView` | **Disputes** sheet, middle block |
| `Dispute_Kpis` | **Disputes** sheet, top block |

### `36_`–`38_` the anomalies sheet

`Anomaly_Types` — connection only.

| Query | Load to |
|---|---|
| `Anomalies` | **Anomalies** sheet, the list |
| `Anomaly_Counts` | **Anomalies** sheet, top block |

---

## Where the detail lives

- `workbook-template/queries/README.md` — every query, what it does and why, and
  the notes on Stratum's real columns, the two kinds of volunteer, and the
  density rule.
- `docs/pivot-plan.md` — why there is a workbook at all, and what happens after
  it ships.
- The comment at the top of each `.pq` file — the reasoning behind that query.
  If you change a query, change it in the file and paste it in again. A fix made
  only inside Excel is a fix nobody else can see.
