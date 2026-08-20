// Query name: Src_RepCounts
//
// This week's rep counts, one row per workplace code — the current week of
// Reps_ByWorkplace.
//
// It stays a query of its own, rather than the School view reading
// Reps_ByWorkplace directly, because it is the one place the rep count's SOURCE
// is decided. If reps ever start coming from somewhere else — a live lookup, a
// column added to the workplace totals export, a national database — this is
// the query that changes and nothing else does.
//
// "This week" is the latest date present, not the latest file added. Dropping in
// an older week that got missed therefore backfills the trend without moving any
// current figure.
//
// Load to: connection only.
let
    History = Table.Buffer(Reps_ByWorkplace),

    Latest = List.Max(Table.Column(History, "Snapshot date")),

    Guarded =
        if Latest = null then
            error Error.Record(
                "No dated activist exports",
                "No file in the Activist exports folder carries a usable date.",
                null
            )
        else
            Latest,

    Current = Table.SelectRows(History, each [Snapshot date] = Guarded),

    Result = Table.RemoveColumns(Current, {"Snapshot date"})
in
    Result
