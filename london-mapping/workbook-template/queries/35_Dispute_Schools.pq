// Query name: Dispute_Schools
//
// One row per dispute per school, with the school's own figures alongside.
//
// This is the sheet that answers "who is actually in this dispute" — the app's
// dispute detail page, which listed every affected school with its membership
// and whether it had a rep. A dispute at an employer with eleven schools is
// eleven different organising situations, and the tracker's single
// comma-separated cell of URNs hides all of it.
//
// LEFT JOIN, deliberately. A URN on the tracker that matches no school on the
// School view keeps its row, with "On the School view" reading No — because a
// mistyped URN is a school somebody thinks is in a dispute and the workbook
// does not, which is exactly the disagreement worth seeing. It reaches the
// Anomalies sheet from here.
//
// The School view is the right side of the join rather than GIAS, so this
// covers the same schools as every other figure in the workbook: no excluded
// schools, and canonical trust names.
//
// Load to: the "Disputes" sheet, beneath the dispute list, as a table.
let
    Source = Dispute_Urns,

    Joined = Table.NestedJoin(Source, {"URN"},
        Table.SelectColumns(SchoolView,
            {"URN", "School name", "LA (borough)", "Trust (MAT)",
             "Membership (total)", "Headcount (total)", "Density (total)",
             "Rep count", "Has rep", "Meetings logged", "Last note date"}),
        {"URN"}, "School", JoinKind.LeftOuter),

    Expanded = Table.ExpandTableColumn(Joined, "School",
        {"School name", "LA (borough)", "Trust (MAT)",
         "Membership (total)", "Headcount (total)", "Density (total)",
         "Rep count", "Has rep", "Meetings logged", "Last note date"}),

    Matched = Table.AddColumn(Expanded, "On the School view",
        each if [School name] = null then "No" else "Yes", type text),

    // No zeroing. A school that did not match has no membership FIGURE, which
    // is not the same as no members, and a 0 in that column would be read as
    // one. Every row that did match is already zeroed by the School view.
    Result = Table.SelectColumns(Matched, {
        "ID", "Employer", "Branch", "MAT", "Live", "Outcome (RAG)",
        "URN", "School name", "On the School view", "LA (borough)", "Trust (MAT)",
        "Membership (total)", "Headcount (total)", "Density (total)",
        "Rep count", "Has rep", "Meetings logged", "Last note date"
    })
in
    Result
