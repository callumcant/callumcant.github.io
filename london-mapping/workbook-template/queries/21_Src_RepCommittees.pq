// Query name: Src_RepCommittees
//
// The log of whether a trust has a rep committee, and from when. One row per
// report; the newest row per trust is the current answer.
//
// APPEND-ONLY. Never edit or delete a past row: it is the only record of when a
// committee was in place, and that cannot be reconstructed. Superseding a
// report means adding a newer one. Nothing in this query enforces that — it is
// the one place the workbook is genuinely weaker than the app, because Excel
// co-authoring lets anyone edit any row. Sheet protection and a stated rule are
// the whole defence.
//
// "Effective from" is the date the committee started or stopped existing, not
// the date somebody typed it in. That is what makes it sortable into a history.
// A row without one cannot be placed in that history and is dropped, exactly as
// the app drops it.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Field log.xlsx", "RepCommittees"),

    Kept = fnExpect(Raw, {"ID", "MAT", "Committee exists", "Effective from", "Logged by"},
        "the RepCommittees table in Field log.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"MAT", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Committee exists", fnYesNo, type logical},
        {"Effective from", each try Date.From(_) otherwise null, type date}
    }),

    Result = Table.SelectRows(Typed, each [MAT] <> "" and [#"Effective from"] <> null)
in
    Result
