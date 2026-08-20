// Query name: fnExpect
//
// Checks a source really has the columns we think it has, then keeps exactly
// those, in that order.
//
// This is the loud-failure mechanism for the whole build. Stratum's real
// column headers are still a guess (see the Src_Stratum* queries), and the
// GIAS and Pay Dashboard exports can change under us at any time. Without
// this, a renamed column arrives as nulls and quietly drags every density on
// the dashboard down; with it, the refresh stops and names the column.
//
//   label  what to call this source in the error, e.g. "the Stratum export"
let
    fnExpect = (source as table, columns as list, label as text) as table =>
        let
            Present = Table.ColumnNames(source),
            Missing = List.Difference(columns, Present),
            Checked =
                if List.Count(Missing) = 0 then
                    source
                else
                    error Error.Record(
                        "Column not found in " & label,
                        "Expected but did not find: " & Text.Combine(Missing, ", "),
                        "The columns actually there are: " & Text.Combine(Present, ", ")
                            & ". If the export has genuinely been renamed, change the name in this Src_ query"
                            & " — and tell whoever maintains data-dictionary/dictionary.json, because the app"
                            & " needs the same edit."
                    ),
            Kept = Table.SelectColumns(Checked, columns)
        in
            Kept
in
    fnExpect
