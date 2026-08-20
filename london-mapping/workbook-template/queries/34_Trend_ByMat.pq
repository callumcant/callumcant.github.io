// Query name: Trend_ByMat
//
// The same weekly series as Trend, one trust at a time.
//
// A trust-wide campaign is the unit of work on the MAT side, and this is the
// only place the workbook can show whether it moved anything. The MAT view says
// where Harris is now; this says whether the last term of organising in Harris
// did anything.
//
// GROUPED ON THE CANONICAL TRUST NAME, the one the School view has already
// folded the source spellings into via MatAliases and which Trend_ByUrn carries
// through. Grouping on the sourced spelling would split one trust into three
// series with a third of its schools each.
//
// A maintained school belongs to no trust and is not on this sheet, exactly as
// it is not on the MAT view. Those schools are on the Trend sheet and in the
// London figures; the school counts here will not add up to London, and should
// not.
//
// SORTED BY TRUST, THEN OLDEST WEEK FIRST — each trust's sparkline is a
// contiguous block of these rows.
//
// Load to: the "Trend by MAT" sheet, as a table.
let
    Trusted = Table.Buffer(Table.SelectRows(Trend_ByUrn,
        each [#"Trust (MAT)"] <> null and [#"Trust (MAT)"] <> "")),

    Grouped = Table.Group(Trusted, {"Trust (MAT)"}, {
        {"Series", each fnTrendDeltas(fnTrendSeries(_)), type table}
    }),

    Expanded = Table.ExpandTableColumn(Grouped, "Series", {
        "Week", "Baseline week", "Weeks since previous reading", "Gap in the history",
        "Schools", "Membership (total)", "Headcount (total)", "Density (total)",
        "Rep count", "Rep:member ratio", "Rep coverage",
        "Schools with a rep", "Schools with no rep", "Members in schools with no rep",
        "Membership since baseline", "Density since baseline",
        "Rep count since baseline", "Rep coverage since baseline",
        "Compared with", "Membership since compared week",
        "Density since compared week", "Rep count since compared week"
    }),

    Result = Table.Sort(Expanded, {{"Trust (MAT)", Order.Ascending}, {"Week", Order.Ascending}})
in
    Result
