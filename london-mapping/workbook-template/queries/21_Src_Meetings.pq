// Query name: Src_Meetings
//
// The meetings log, from the shared field log. One row per meeting, keyed on
// the school URN.
//
// Counts 1-2-1s and small group conversations as well as workplace meetings —
// they all go in the same log, which is why the derived column is called
// "Meetings logged" rather than "Workplace meetings".
//
// Load to: connection only.
let
    Raw = fnTable({}, "Field log.xlsx", "Meetings"),

    Kept = fnExpect(Raw, {"ID", "Date", "URN", "Logged by", "Attendees"},
        "the Meetings table in Field log.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"Date", each try Date.From(_) otherwise null, type date},
        {"URN", each fnNumber(_), Int64.Type},
        // Attendees is blank on meetings logged before the column existed, and
        // an empty cell arrives as "" rather than as a number. fnNumber turns
        // both into null, so every total built on it reads as a floor rather
        // than an exact headcount.
        {"Attendees", each fnNumber(_), type number}
    }),

    Result = Table.SelectRows(Typed, each [URN] <> null)
in
    Result
