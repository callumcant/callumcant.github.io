// Query name: Src_FieldNotes
//
// The notes log, from the shared field log. One row per note. Level says what
// the note is about — School, Branch or MAT — and Subject holds the URN, the
// borough name or the trust name to match.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Field log.xlsx", "FieldNotes"),

    Kept = fnExpect(Raw, {"ID", "Date", "Level", "Subject", "Title", "Note", "Author"},
        "the FieldNotes table in Field log.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"Date", each try Date.From(_) otherwise null, type date},
        {"Level", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        // Subject holds a URN for school notes and a name for the others, so it
        // stays text throughout. Text.From on a URN that arrived as a number
        // gives "200003", which is what the school-level match wants.
        {"Subject", each if _ = null then "" else Text.Trim(Text.From(_)), type text}
    })
in
    Typed
