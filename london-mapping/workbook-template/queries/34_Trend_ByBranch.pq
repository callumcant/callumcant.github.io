// Query name: Trend_ByBranch
//
// The same weekly series as Trend, one branch at a time.
//
// "Is London up?" is the question the region asks; "is my patch up?" is the
// question every organiser asks, and it is not answerable by reading the London
// line. A borough can be falling while the region rises.
//
// WHAT "BRANCH" MEANS IS A SETTING — P_BranchColumn, the same one the Branch
// view uses, so the two sheets always agree about what a branch is. See the
// note there; it is an open decision, not a preference.
//
// Each branch gets its own series, its own baseline comparison and its own gap
// column, because a week missing for one borough is not a week missing for
// another — a school can drop out of one export and not the next.
//
// Only the total membership and density are carried, not the staff-group
// breakdown. Thirty-three branches times a year of weeks is already a big
// table, and the breakdown over time is on the Trend sheet for London and on
// the Branch view for the current week.
//
// SORTED BY BRANCH, THEN OLDEST WEEK FIRST, and it has to stay that way: each
// branch's sparkline is a contiguous block of these rows. Re-sorting the sheet
// leaves every figure right and every line wrong.
//
// Load to: the "Trend by branch" sheet, as a table.
let
    Key = P_BranchColumn,

    // A school with no branch recorded is still a school, and hiding it would
    // quietly shrink London. Named group of its own, the same as the Branch
    // view does it. With the default LA (borough) this never fires.
    Filled = Table.Buffer(Table.TransformColumns(Trend_ByUrn, {
        {Key, each if _ = null or _ = "" then "(No branch recorded)" else _, type text}
    })),

    Grouped = Table.Group(Filled, {Key}, {
        {"Series", each fnTrendDeltas(fnTrendSeries(_)), type table}
    }),

    Named = Table.RenameColumns(Grouped, {{Key, "Branch"}}),

    Expanded = Table.ExpandTableColumn(Named, "Series", {
        "Week", "Baseline week", "Weeks since previous reading", "Gap in the history",
        "Schools", "Membership (total)", "Headcount (total)", "Density (total)",
        "Rep count", "Rep:member ratio", "Rep coverage",
        "Schools with a rep", "Schools with no rep", "Members in schools with no rep",
        "Membership since baseline", "Density since baseline",
        "Rep count since baseline", "Rep coverage since baseline",
        "Compared with", "Membership since compared week",
        "Density since compared week", "Rep count since compared week"
    }),

    Result = Table.Sort(Expanded, {{"Branch", Order.Ascending}, {"Week", Order.Ascending}})
in
    Result
