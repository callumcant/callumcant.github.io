// Query name: Committee_ByMat
//
// The current rep-committee position for each trust that has ever been
// reported on: the newest row in RepCommittees, by effective date.
//
// Mirrors resolveRepCommittee in js/data/rollups.js, including its tie-break,
// which is the opposite of the one used for notes:
//
//   notes       on the same date, the FIRST row wins  (latestBy uses >)
//   committees  on the same date, the LAST row wins   (the loop uses >=)
//
// Two reports of the same trust on the same effective date is somebody
// correcting themselves, so taking the later-entered row is right — but the two
// rules being different is the sort of thing that gets "tidied" into
// consistency by a future reader. It is not an inconsistency. Table.Last is
// doing what >= does.
//
// "Reported" is the column that keeps this honest. A trust with no rows here
// falls back to MatFacts, which has no date and no author, and the MAT view
// says which of the two answered.
//
// Load to: connection only.
let
    Grouped = Table.Group(Src_RepCommittees, {"MAT"}, {
        {"Latest", each
            let
                Newest = List.Max(Table.Column(_, "Effective from")),
                Match = Table.SelectRows(_, each [#"Effective from"] = Newest)
            in
                Table.Last(Match),
            type record}
    }),

    Expanded = Table.ExpandRecordColumn(Grouped, "Latest",
        {"Committee exists", "Effective from", "Logged by"},
        {"Committee exists", "Committee since", "Committee logged by"}),

    Result = Table.AddColumn(Expanded, "Committee reported", each true, type logical)
in
    Result
