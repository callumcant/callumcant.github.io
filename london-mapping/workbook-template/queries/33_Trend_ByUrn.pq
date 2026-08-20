// Query name: Trend_ByUrn
//
// One row per school per week: membership, headcount and reps, for every week
// in the Stratum exports folder.
//
// This is the workbook's answer to the app's Snapshots table, and it is a
// better one. The app captured a week from whoever opened the site first,
// appended 3,000 rows from their browser, and could not resume if they closed
// the tab — a half-written week showed on the dashboard as a real-looking dip,
// and the rows, once written, could be edited by anyone. Here the whole history
// is recomputed from the export files on every refresh. There is nothing to
// capture, nothing to append and nothing to edit.
//
// Everything the Trend sheet shows is grouped up from this, by fnTrendSeries.
//
// Order of assembly:
//   1. Every week's Stratum rows, mapped to a URN
//   2. Rep counts for that week
//   3. Closed schools redirected to their successors
//   4. Group by week and school, summing across workplace codes
//   5. The scope columns — borough, branch, trust — from the School view
//
// Steps 1, 3 and 4 are Stratum_ByUrn's steps, run across every week rather than
// only the current one, and in the same order for the same reason: group and
// sum BEFORE joining to the school, so a school with two workplace codes merges
// into one row rather than appearing twice.
//
// Load to: connection only. Thousands of rows a week, and the sheet wants the
// series, not this.
let
    // ---- 1. Every week, mapped to a school --------------------------------
    Source = Src_StratumHistory,

    Matched = Table.NestedJoin(Source, {"Workplace code"}, Rec_UrnByWorkplaceCode, {"Workplace code"}, "Map", JoinKind.Inner),
    Mapped = Table.ExpandTableColumn(Matched, "Map", {"URN"}, {"URN"}),

    // ---- 2. Reps ----------------------------------------------------------
    // The two exports are separate files and need not be dated the same day —
    // the activists pull can be run on the Thursday and the workplace totals on
    // the Friday. So each Stratum week takes the most recent activist week AT
    // OR BEFORE it, rather than joining on an equal date and quietly finding
    // nothing.
    //
    // Getting this wrong would be invisible: every week would fall through to
    // the Yes/No flag below, every school with a rep would read exactly 1, and
    // the rep line on the Trend sheet would be flat and entirely plausible.
    //
    // "Rep count week" travels with the figure and says which week answered it.
    RepWeeks = List.Buffer(List.Distinct(Table.Column(Reps_ByWorkplace, "Snapshot date"))),

    RepWeekFor = (week as date) as nullable date =>
        let
            Earlier = List.Select(RepWeeks, each _ <= week)
        in
            if List.IsEmpty(Earlier) then null else List.Max(Earlier),

    WithRepWeek = Table.AddColumn(Mapped, "Rep count week", each RepWeekFor([Snapshot date]), type date),

    RepsJoined = Table.NestedJoin(WithRepWeek, {"Rep count week", "Workplace code"},
                                  Reps_ByWorkplace, {"Snapshot date", "Workplace code"},
                                  "Reps", JoinKind.LeftOuter),
    WithReps = Table.ExpandTableColumn(RepsJoined, "Reps", {"Rep count"}, {"Reps counted"}),

    // ---- 3. Successors -----------------------------------------------------
    // The same decision, applied to every week of history, so a school that
    // converted in March does not appear to lose all its members that week
    // while its successor gains them. The trend follows the members.
    WithSuccessor = Table.NestedJoin(WithReps, {"URN"}, Rec_Successors, {"From URN"}, "Successor", JoinKind.LeftOuter),
    Successor = Table.ExpandTableColumn(WithSuccessor, "Successor", {"To URN"}, {"To URN"}),
    Redirected = Table.AddColumn(Successor, "School URN",
        each if [To URN] = null then [URN] else [To URN], Int64.Type),

    // ---- 4. One row per school per week ------------------------------------
    Grouped = Table.Group(Redirected, {"Snapshot date", "School URN"}, {
        {"Membership (total)", each fnZero(List.Sum(Table.Column(_, "Membership (total)"))), type number},
        {"Membership (teachers)", each fnZero(List.Sum(Table.Column(_, "Membership (teachers)"))), type number},
        {"Membership (leadership)", each fnZero(List.Sum(Table.Column(_, "Membership (leadership)"))), type number},
        {"Membership (support)", each fnZero(List.Sum(Table.Column(_, "Membership (support)"))), type number},
        {"Headcount (total)", each fnZero(List.Sum(Table.Column(_, "Headcount (total)"))), type number},
        {"Headcount (teachers)", each fnZero(List.Sum(Table.Column(_, "Headcount (teachers)"))), type number},
        {"Headcount (leadership)", each fnZero(List.Sum(Table.Column(_, "Headcount (leadership)"))), type number},
        {"Headcount (support)", each fnZero(List.Sum(Table.Column(_, "Headcount (support)"))), type number},
        {"Has rep", each List.AnyTrue(Table.Column(_, "Has rep")), type logical},
        {"Reps counted", each
            let
                Values = List.RemoveNulls(Table.Column(_, "Reps counted"))
            in
                if List.IsEmpty(Values) then null else List.Sum(Values),
            type number},
        {"Rep count week", each List.Max(Table.Column(_, "Rep count week")), type date}
    }),

    // The same fallback as Stratum_ByUrn, for the same reason: a school the
    // union says has a rep is nearer to 1 than to blank. "Rep count basis" is
    // not carried here — at this grain it would be the same five words repeated
    // 36,000 times. The current week's basis is on the School view, which is
    // where anyone asking that question is already looking.
    Counted = Table.AddColumn(Grouped, "Rep count",
        each if [Reps counted] <> null then [Reps counted]
             else if [Has rep] = true then 1
             else 0,
        type number),

    Named = Table.RenameColumns(Table.RemoveColumns(Counted, {"Reps counted"}),
        {{"Snapshot date", "Week"}, {"School URN", "URN"}}),

    // ---- 5. Scope ----------------------------------------------------------
    // Borough, branch and trust come from the School view — today's answer,
    // applied to every week. That is deliberate: a school that changed trust in
    // January counts in its current trust for the whole series, so the line
    // describes the trust as it is now rather than stepping the week the name
    // changed. It is the only version of the question the workbook can answer
    // from a single current export, and it is the more useful one.
    //
    // INNER JOIN, so this covers exactly the schools the School view covers:
    // GIAS schools, minus anything an exclude decision has taken out. The
    // London row of the Trend sheet for the current week therefore sums to the
    // same figures as the School view — which is the first check to run if the
    // two ever disagree.
    Scope = Table.SelectColumns(SchoolView,
        {"URN", "School name", "LA (borough)", "NEU branch", "Trust (MAT)"}),
    ScopeJoined = Table.NestedJoin(Named, {"URN"}, Scope, {"URN"}, "School", JoinKind.Inner),
    ScopeExpanded = Table.ExpandTableColumn(ScopeJoined, "School",
        {"School name", "LA (borough)", "NEU branch", "Trust (MAT)"}),

    Result = Table.SelectColumns(ScopeExpanded, {
        "Week", "URN", "School name", "LA (borough)", "NEU branch", "Trust (MAT)",
        "Membership (total)", "Membership (teachers)", "Membership (leadership)", "Membership (support)",
        "Headcount (total)", "Headcount (teachers)", "Headcount (leadership)", "Headcount (support)",
        "Has rep", "Rep count", "Rep count week"
    })
in
    Result
