// Query name: Meetings_ByUrn
//
// Meetings per school: how many, and how many people came.
//
// The attendee total is a FLOOR, not a headcount. Meetings logged before the
// Attendees column existed carry no figure at all, and they still count as
// meetings. Reported as "at least" wherever it appears.
//
// Load to: connection only.
let
    Grouped = Table.Group(Src_Meetings, {"URN"}, {
        {"Meetings logged", each Table.RowCount(_), Int64.Type},
        {"Meeting attendees", each fnZero(List.Sum(Table.Column(_, "Attendees"))), type number},
        {"Last meeting date", each List.Max(Table.Column(_, "Date")), type date}
    })
in
    Grouped
