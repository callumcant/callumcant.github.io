// Query name: Reps_ByWorkplace
//
// Rep counts per workplace per week — one row per (Snapshot date, Workplace
// code), built by counting position rows in the activists export.
//
// This is the weekly history of rep numbers, which is what makes rep
// recruitment trendable rather than only reportable. It comes free from the
// folder-of-dated-files design: every week's export is its own file, so the
// whole series rebuilds from source on every refresh.
//
// A member holding three positions is counted once in EACH of them, and once in
// "Activists (people)". That is right: three positions is three jobs being done,
// even if one person is doing them. It is also why the breakdown columns do not
// add up to the people count, and why they must not be summed together to make
// one.
//
// The membership number is used here to count distinct people and is then gone.
// Nothing downstream of this query can reach it.
//
// Load to: connection only.
let
    Source = Src_ActivistHistory,

    // Counts of rows whose position code is in a given list.
    CountIn = (rows as table, codes as list) as number =>
        List.Count(List.Select(Table.Column(rows, "Committee Position"),
                               each List.Contains(codes, _))),

    Grouped = Table.Group(Source, {"Snapshot date", "Workplace code"}, {
        // The headline figure. Which codes count is set in P_RepPositions, in
        // one place, so the definition of "a rep" is a setting rather than
        // something scattered through the queries.
        {"Rep count", each CountIn(_, P_RepPositions), Int64.Type},

        // The breakdown, always present whatever P_RepPositions is narrowed to.
        {"Reps (workplace)", each CountIn(_, {"WPR"}), Int64.Type},
        {"Reps (health & safety)", each CountIn(_, {"WHS"}), Int64.Type},
        {"Reps (equality)", each CountIn(_, {"WEQ"}), Int64.Type},
        {"Reps (learning)", each CountIn(_, {"WLR"}), Int64.Type},
        {"Reps (green)", each CountIn(_, {"WGO"}), Int64.Type},

        // NOT a rep, and NOT the same as the Pay Dashboard's SEVs. Kept in its
        // own column for exactly that reason.
        {"Ballot volunteers", each CountIn(_, {"WBV"}), Int64.Type},

        // District, branch, regional and national positions held by someone at
        // this workplace. Not workplace organisation, but worth seeing.
        {"Other activist positions", each
            Table.RowCount(_)
            - CountIn(_, List.Distinct(List.Combine({P_RepPositions, {"WPR", "WHS", "WEQ", "WLR", "WGO", "WBV"}}))),
            Int64.Type},

        // People, not positions.
        {"Activists (people)", each
            List.Count(List.Distinct(List.RemoveNulls(Table.Column(_, "Membership Number")))),
            Int64.Type}
    })
in
    Grouped
