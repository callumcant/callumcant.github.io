// Query name: fnTrendSeries
//
// A set of Trend_ByUrn rows, turned into a weekly series: one row per week,
// with membership, headcount, reps and the densities that follow from them.
//
//   rows   Trend_ByUrn, or any subset of its rows
//
// It mirrors snapshotSeries in js/data/snapshots.js measure for measure, and is
// written as a function for the same reason that one takes a list of URNs: the
// London series, each borough's series and each trust's series are the same
// arithmetic over different rows, and having it in one place is what stops them
// disagreeing.
//
// DENSITY IS SUMMED THEN DIVIDED, and here that is structural rather than
// remembered: membership and headcount are summed inside the Group By, and
// fnDensity is called afterwards on the summed columns. A borough's density for
// a week is sum(members) / sum(headcount) across its schools that week, never
// the mean of their densities.
//
// Two measures are counted per school inside the group because they cannot be
// recovered afterwards. Rep coverage and members-in-schools-with-no-rep depend
// on how the reps are spread, and a summed rep count says nothing about that:
// 40 reps in a borough is 40 schools covered or 4, and the difference is the
// whole point of the figure.
//
// Load to: connection only.
let
    fnTrendSeries = (rows as table) as table =>
        let
            Grouped = Table.Group(rows, {"Week"}, {{"Rows", each _, type table}}),

            Summed = Table.AddColumn(Grouped, "Point", each
                let
                    R = [Rows],
                    Total = (col as text) as number => fnZero(List.Sum(Table.Column(R, col))),
                    NoRep = Table.SelectRows(R, each [Rep count] = 0)
                in
                    [
                        Schools = Table.RowCount(R),
                        MembersTotal = Total("Membership (total)"),
                        MembersTeachers = Total("Membership (teachers)"),
                        MembersLeadership = Total("Membership (leadership)"),
                        MembersSupport = Total("Membership (support)"),
                        HeadTotal = Total("Headcount (total)"),
                        HeadTeachers = Total("Headcount (teachers)"),
                        HeadLeadership = Total("Headcount (leadership)"),
                        HeadSupport = Total("Headcount (support)"),
                        Reps = Total("Rep count"),
                        NoRepSchools = Table.RowCount(NoRep),
                        MembersNoRep = fnZero(List.Sum(Table.Column(NoRep, "Membership (total)"))),
                        // Which week of the activists export answered this
                        // week's rep count. Blank means no activist export had
                        // been taken yet and every rep figure in the row is the
                        // Stratum flag standing in as a floor of 1.
                        RepWeek = List.Max(Table.Column(R, "Rep count week"))
                    ]),

            Expanded = Table.ExpandRecordColumn(Summed, "Point",
                {"Schools", "MembersTotal", "MembersTeachers", "MembersLeadership", "MembersSupport",
                 "HeadTotal", "HeadTeachers", "HeadLeadership", "HeadSupport",
                 "Reps", "NoRepSchools", "MembersNoRep", "RepWeek"},
                {"Schools", "Membership (total)", "Membership (teachers)", "Membership (leadership)",
                 "Membership (support)", "Headcount (total)", "Headcount (teachers)",
                 "Headcount (leadership)", "Headcount (support)",
                 "Rep count", "Schools with no rep", "Members in schools with no rep",
                 "Rep counts as at"}),

            Dropped = Table.RemoveColumns(Expanded, {"Rows"}),

            WithRep = Table.AddColumn(Dropped, "Schools with a rep",
                each [Schools] - [#"Schools with no rep"], Int64.Type),
            Coverage = Table.AddColumn(WithRep, "Rep coverage",
                each if [Schools] = 0 then null else [#"Schools with a rep"] / [Schools], type number),
            Ratio = Table.AddColumn(Coverage, "Rep:member ratio",
                each fnRepRatio([#"Membership (total)"], [#"Rep count"]), type text),

            // Summed above, divided here. Never the other way round.
            Density = Table.AddColumn(Ratio, "Density (total)",
                each fnDensity([#"Membership (total)"], [#"Headcount (total)"]), type number),
            DensityT = Table.AddColumn(Density, "Density (teachers)",
                each fnDensity([#"Membership (teachers)"], [#"Headcount (teachers)"]), type number),
            DensityL = Table.AddColumn(DensityT, "Density (leadership)",
                each fnDensity([#"Membership (leadership)"], [#"Headcount (leadership)"]), type number),
            DensityS = Table.AddColumn(DensityL, "Density (support)",
                each fnDensity([#"Membership (support)"], [#"Headcount (support)"]), type number),

            // Oldest week first. Everything downstream — the gap column, the
            // two comparisons, and every sparkline drawn on the sheet — assumes
            // this order and would be silently wrong without it.
            Sorted = Table.Sort(DensityS, {{"Week", Order.Ascending}}),

            Result = Table.SelectColumns(Sorted, {
                "Week", "Schools",
                "Membership (total)", "Headcount (total)", "Density (total)",
                "Membership (teachers)", "Headcount (teachers)", "Density (teachers)",
                "Membership (leadership)", "Headcount (leadership)", "Density (leadership)",
                "Membership (support)", "Headcount (support)", "Density (support)",
                "Rep count", "Rep:member ratio", "Rep coverage",
                "Schools with a rep", "Schools with no rep", "Members in schools with no rep",
                "Rep counts as at"
            })
        in
            Result
in
    fnTrendSeries
