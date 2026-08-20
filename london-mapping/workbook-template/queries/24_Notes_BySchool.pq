// Query name: Notes_BySchool
//
// School-level notes per school: how many, and the most recent one.
//
// Only rows whose Level is School. A branch note and a school note can carry
// the same Subject text without meaning the same thing, so the level is part of
// the match rather than an afterthought.
//
// Load to: connection only.
let
    SchoolNotes = Table.SelectRows(Src_FieldNotes, each [Level] = "School" and [Subject] <> ""),

    // Subject holds the URN as text. Converted here so the join is number to
    // number and cannot fail on "200003" against 200003.
    Keyed = Table.AddColumn(SchoolNotes, "URN", each fnNumber([Subject]), Int64.Type),

    Valid = Table.SelectRows(Keyed, each [URN] <> null),

    Grouped = Table.Group(Valid, {"URN"}, {
        {"Notes", each Table.RowCount(_), Int64.Type},
        // The latest note by date, and on a tie the one written FIRST — which
        // is what the app's latestBy does, since it only replaces its running
        // answer on a strictly later date. Undated notes sort earliest and can
        // only be the answer if nothing in the school is dated at all.
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
