// Query name: Anomaly_Counts
//
// One row per kind of anomaly, with how many are outstanding and how many have
// been decided — the summary block that sits at the top of the Anomalies sheet.
//
// EVERY KIND GETS A ROW, INCLUDING THE ONES AT ZERO. A kind that vanishes from
// the sheet when it stops firing is a kind nobody knows is being checked, and
// "0 workplace codes with no URN" is a result worth reading. It is also how you
// notice a check that has silently stopped working: a detection that fires on
// nothing for a year is either good news or broken, and the two look identical
// if the row is not there.
//
// "Decided" counts the decisions recorded against that kind — rows that were
// anomalies and are now answered. It is the app's resolvedCount, split by kind.
//
// Load to: the "Anomalies" sheet, as a table, above the list itself.
let
    Outstanding = Table.Group(Anomalies, {"Anomaly type"}, {
        {"Outstanding", each Table.RowCount(_), Int64.Type},
        {"Members affected", each List.Sum(List.RemoveNulls(Table.Column(_, "Members"))), type number}
    }),

    Decided = Table.Group(Rec_Decisions, {"Anomaly"}, {{"Decided", each Table.RowCount(_), Int64.Type}}),

    WithOutstanding = Table.NestedJoin(Anomaly_Types, {"Anomaly type"}, Outstanding, {"Anomaly type"}, "O", JoinKind.LeftOuter),
    OutstandingExpanded = Table.ExpandTableColumn(WithOutstanding, "O", {"Outstanding", "Members affected"}),

    WithDecided = Table.NestedJoin(OutstandingExpanded, {"Anomaly type"}, Decided, {"Anomaly"}, "D", JoinKind.LeftOuter),
    DecidedExpanded = Table.ExpandTableColumn(WithDecided, "D", {"Decided"}),

    // A kind with nothing outstanding has none, and 0 is the true answer.
    // "Members affected" is left blank where no anomaly of that kind carries a
    // membership figure at all — a 0 there would claim nothing is at stake,
    // when what is meant is that nobody has counted.
    Zeroed = Table.TransformColumns(DecidedExpanded, {
        {"Outstanding", fnZero, Int64.Type},
        {"Decided", fnZero, Int64.Type}
    }),

    Sorted = Table.Sort(Zeroed, {{"Order", Order.Ascending}}),

    Result = Table.SelectColumns(Sorted, {
        "What it is", "Outstanding", "Members affected", "Decided",
        "What it means", "What you can do", "Anomaly type", "Detected by"
    })
in
    Result
