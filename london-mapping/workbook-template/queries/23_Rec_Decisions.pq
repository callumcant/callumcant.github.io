// Query name: Rec_Decisions
//
// The decision currently in force for each anomaly — one row per
// (anomaly type, key), the latest by Decided date.
//
// Because Reconciliations is append-only, the same key can carry several rows;
// the newest wins and the rest are history. Ties on the date are broken by row
// order, so the row added later wins — the same rule a person reading the sheet
// would apply.
//
// A blank date sorts earliest, matching the app, which compares
// (r.decidedDate || "") — so an undated row can only ever be superseded, never
// supersede.
//
// Load to: connection only.
let
    Source = Src_Reconciliations,

    Indexed = Table.AddIndexColumn(Source, "Row order", 0, 1, Int64.Type),

    Sorted = Table.Sort(Indexed, {{"Decided", Order.Ascending}, {"Row order", Order.Ascending}}),

    Grouped = Table.Group(Sorted, {"Anomaly", "Key"}, {{"Latest", each Table.Last(_), type record}}),

    Expanded = Table.ExpandRecordColumn(Grouped, "Latest",
        {"Action", "Target", "Note", "Decided by", "Decided"},
        {"Action", "Target", "Note", "Decided by", "Decided"})
in
    Expanded
