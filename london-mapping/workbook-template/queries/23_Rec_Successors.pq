// Query name: Rec_Successors
//
// Closed or replaced school, to the school its members now belong to.
//
// Recorded when GIAS says a school has closed but Stratum still carries members
// against it — usually a conversion or a merger, where the membership is real
// and the URN is stale. The members follow the school to its successor rather
// than vanishing from every rollup.
//
// Applied to Stratum and Pay Dashboard rows before they are grouped, so several
// predecessors can feed one successor and their figures add up.
//
// Load to: connection only.
let
    Rows = Table.SelectRows(Rec_Decisions, each [Action] = "successor" and [Target] <> null and [Target] <> ""),

    Pairs = Table.SelectColumns(
        Table.AddColumn(
            Table.AddColumn(Rows, "From URN", each fnNumber([Key]), Int64.Type),
            "To URN", each fnNumber([Target]), Int64.Type),
        {"From URN", "To URN"}),

    Valid = Table.SelectRows(Pairs, each [From URN] <> null and [To URN] <> null),

    // One hop only, exactly as the app does it: a successor that itself has a
    // successor is not followed. Chains are rare, and a chain that loops would
    // hang the refresh — if one turns up, record the decision against the final
    // URN rather than making this recursive.
    Result = Table.Distinct(Valid, {"From URN"})
in
    Result
