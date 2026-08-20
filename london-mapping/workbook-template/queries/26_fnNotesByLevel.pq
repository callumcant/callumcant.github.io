// Query name: fnNotesByLevel
//
// Notes for one level of the model — "Branch" or "MAT" — counted per subject,
// with the most recent one.
//
//   level   the value in the field log's Level column
//
// Returns: Subject, Notes, Last note date, Latest note title.
//
// Notes_BySchool does the same job for "School" and is kept separate because
// its subject is a URN and has to be turned into a number to join. Branch and
// MAT notes match on the name as typed, so they share this.
//
// MATCHING IS ON THE NAME AS TYPED, and that is the fragile part. "Harris
// Federation" and "Harris Federation " match (both are trimmed); "Harris
// Fed" does not match anything at all. The Branch and MAT views both carry an
// "Unmatched notes" figure for exactly this reason — a note that matches
// nothing is otherwise indistinguishable from a note nobody wrote.
//
// The level is part of the match rather than an afterthought: a branch note and
// a MAT note can carry the same Subject text without meaning the same thing.
//
// Load to: connection only.
let
    fnNotesByLevel = (level as text) as table =>
        let
            Rows = Table.SelectRows(Src_FieldNotes, each [Level] = level and [Subject] <> ""),

            Grouped = Table.Group(Rows, {"Subject"}, {
                {"Notes", each Table.RowCount(_), Int64.Type},
                // The latest note by date, and on a tie the one written FIRST —
                // what the app's latestBy does, since it only replaces its
                // running answer on a strictly later date. Undated notes sort
                // earliest and can only be the answer if nothing under that
                // subject is dated at all.
                {"Latest note", each
                    let
                        Newest = List.Max(Table.Column(_, "Date")),
                        Match = Table.SelectRows(_, each [Date] = Newest)
                    in
                        Table.First(Match),
                    type record}
            }),

            Expanded = Table.ExpandRecordColumn(Grouped, "Latest note",
                {"Date", "Title"}, {"Last note date", "Latest note title"})
        in
            Expanded
in
    fnNotesByLevel
