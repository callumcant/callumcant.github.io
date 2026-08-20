// Query name: Disputes_ByUrn
//
// One row per school that appears on a dispute, with a count and a live flag.
// This is what the School view joins to.
//
// The unpacking of the tracker's comma-separated "Affected URNs" cell happens
// in Dispute_Urns; this is only the count. Keeping the two apart means the
// Disputes sheet and the School view are looking at the same parsed list rather
// than at two implementations of the same split.
//
// Load to: connection only.
let
    Source = Dispute_Urns,

    Grouped = Table.Group(Source, {"URN"}, {
        {"Disputes", each Table.RowCount(_), Int64.Type},
        // Yes on any one live dispute is enough. Matching the app's
        // d.live === "Yes" rather than treating a blank as live.
        {"In live dispute", each List.Contains(Table.Column(_, "Live"), "Yes"), type logical}
    })
in
    Grouped
