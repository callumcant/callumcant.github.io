// Query name: Trend
//
// London, one row per week: membership, density and reps, and how far each week
// is from the baseline.
//
// This is the query that makes the workbook worth refreshing rather than only
// reading. Every other sheet answers "how are things"; this one answers "are
// they moving, and which way" — which is the question an organiser is actually
// being asked, and the one the old twelve-tab spreadsheet could not answer at
// all because it only ever held the current week.
//
// It mirrors snapshotSeries + baselinePoint + pointWeeksBefore in
// js/data/snapshots.js, over Trend_ByUrn instead of the Snapshots table.
//
// OLDEST WEEK FIRST, and the sheet must be left that way. The sparklines are
// ranges of cells: sort this table by anything else and every line on the sheet
// runs backwards or scrambles, without a single figure changing.
//
// The last row is this week. Every KPI on the dashboard that carries a "since"
// figure reads from it — see the sheet notes in the README.
//
// Load to: the "Trend" sheet, as a table.
let
    Series = fnTrendSeries(Trend_ByUrn),

    WithDeltas = fnTrendDeltas(Series),

    // Ordered for reading left to right: which week, how big, what moved.
    // "Weeks since previous reading" and "Gap in the history" sit next to the
    // date rather than at the end, because they change how every other figure
    // on the row should be read.
    Result = Table.SelectColumns(WithDeltas, {
        "Week", "Baseline week", "Weeks since previous reading", "Gap in the history",
        "Schools",
        // Membership and density
        "Membership (total)", "Headcount (total)", "Density (total)",
        "Membership (teachers)", "Headcount (teachers)", "Density (teachers)",
        "Membership (leadership)", "Headcount (leadership)", "Density (leadership)",
        "Membership (support)", "Headcount (support)", "Density (support)",
        // Reps
        "Rep count", "Rep:member ratio", "Rep coverage",
        "Schools with a rep", "Schools with no rep", "Members in schools with no rep",
        "Rep counts as at",
        // Since the baseline week. A change in density is a difference of two
        // proportions: 0.02 here is two percentage points, not two per cent.
        "Membership since baseline", "Density since baseline",
        "Rep count since baseline", "Rep coverage since baseline",
        // Since a few weeks back — P_TrendCompareWeeks, and "Compared with"
        // says which week that turned out to be.
        "Compared with", "Membership since compared week",
        "Density since compared week", "Rep count since compared week"
    })
in
    Result
