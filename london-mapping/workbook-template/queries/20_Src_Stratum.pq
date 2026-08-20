// Query name: Src_Stratum
//
// The most recent week of Src_StratumHistory — the membership, headcount and
// rep figures the School view is built from.
//
// "Most recent" is the latest Snapshot date present, not the latest file
// dropped in. Adding a missing older week therefore backfills the trend
// without changing any current figure, which is the behaviour you want when
// someone finds a week that never got saved.
//
// Load to: connection only.
let
    History = Table.Buffer(Src_StratumHistory),

    Latest = List.Max(Table.Column(History, "Snapshot date")),

    Guarded =
        if Latest = null then
            error Error.Record(
                "No dated Stratum exports",
                "No export in the Stratum exports folder carries a usable date.",
                null
            )
        else
            Latest,

    Result = Table.SelectRows(History, each [Snapshot date] = Guarded)
in
    Result
