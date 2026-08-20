// Query name: Src_Reconciliations
//
// Decisions taken about anomalies: this workplace code belongs to that school,
// this closed school's members moved to that successor, ignore this one.
//
// This is the one table that lives in the MASTER itself rather than in a source
// file, because Callum is the only person who edits it — read with
// Excel.CurrentWorkbook rather than through the folder.
//
// APPEND-ONLY. Never edit or delete a past row. Superseding a decision means
// adding a newer row with a later Decided date; the older row stays as the
// record of what was believed at the time. Nothing here recomputes if you
// delete history — it is simply gone.
//
// Detection is recomputed from live data on every refresh, but decisions are
// stored. Cleaning an export fixes a problem once; recording the decision fixes
// it for every future refresh.
//
// The whole table being missing is not an error: the workbook has to be
// buildable before the sheet exists, and a workbook with no decisions yet is a
// perfectly ordinary state. An empty table of the right shape is returned
// instead.
//
// Load to: connection only.
let
    Empty = #table(
        type table [ID = text, #"Anomaly type" = text, #"Key (URN or workplace code)" = text,
                    Action = text, #"Target key" = text, Note = text,
                    #"Decided by" = text, #"Decided date" = date],
        {}),

    Found = try Excel.CurrentWorkbook(){[Name = "Reconciliations"]}[Content],

    Raw = if Found[HasError] then Empty else Found[Value],

    Kept = if Table.IsEmpty(Raw) then Empty
        else fnExpect(Raw,
            {"ID", "Anomaly type", "Key (URN or workplace code)", "Action", "Target key",
             "Note", "Decided by", "Decided date"},
            "the Reconciliations table on this sheet"),

    Typed = Table.TransformColumns(Kept, {
        {"Anomaly type", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Key (URN or workplace code)", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Action", each if _ = null then "" else Text.Lower(Text.Trim(Text.From(_))), type text},
        {"Target key", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Decided date", each try Date.From(_) otherwise null, type date}
    }),

    Renamed = Table.RenameColumns(Typed, {
        {"Anomaly type", "Anomaly"},
        {"Key (URN or workplace code)", "Key"},
        {"Target key", "Target"},
        {"Decided date", "Decided"}
    })
in
    Renamed
