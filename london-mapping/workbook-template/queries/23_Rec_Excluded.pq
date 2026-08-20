// Query name: Rec_Excluded
//
// URNs deliberately kept out of every view — schools someone has looked at and
// decided are not ours to count.
//
// A single-column table rather than a list, so it can be joined; the School
// view uses an anti-join against it.
//
// Load to: connection only.
let
    Rows = Table.SelectRows(Rec_Decisions, each [Action] = "exclude"),

    Urns = Table.SelectColumns(
        Table.AddColumn(Rows, "URN", each fnNumber([Key]), Int64.Type),
        {"URN"}),

    // An exclude decision can be recorded against a workplace code as well as a
    // URN — the anomaly types share one Key column. Those rows are not numbers
    // and are dropped here; they take effect by leaving the code unlinked.
    Valid = Table.SelectRows(Urns, each [URN] <> null),

    Result = Table.Distinct(Valid)
in
    Result
