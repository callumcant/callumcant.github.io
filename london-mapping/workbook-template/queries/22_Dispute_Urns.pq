// Query name: Dispute_Urns
//
// One row per dispute per school listed on it — the tracker's "Affected URNs"
// cell, unpacked.
//
// A school is in dispute if its URN is listed on the dispute: exact, rather
// than inferred from the dispute's branch or MAT. A trust-wide dispute that
// only covers four of its thirty schools must not flag the other twenty-six.
//
// The list lives in one cell, comma-separated, so it has to be split before
// anything can join to it. That happens here, once, because two queries need
// it and they must not do it twice: Disputes_ByUrn counts disputes per school
// for the School view, and Dispute_Schools names them for the Disputes sheet.
// Two copies of a parsing rule is two places for "12345 ,67890" to be handled
// differently.
//
// This query cannot touch the School view — the School view reads
// Disputes_ByUrn, which reads this, and Power Query will not build a circle.
// Anything needing the school's name or membership belongs in Dispute_Schools,
// which sits downstream of both.
//
// Load to: connection only.
let
    Source = Src_Disputes,

    Listed = Table.SelectRows(Source, each [Affected URNs] <> null and Text.Trim(Text.From([Affected URNs])) <> ""),

    Split = Table.AddColumn(Listed, "URN list",
        each List.Transform(Text.Split(Text.From([Affected URNs]), ","), each Text.Trim(_)),
        type list),

    Expanded = Table.ExpandListColumn(Split, "URN list"),

    Numbered = Table.AddColumn(Expanded, "URN", each fnNumber([URN list]), Int64.Type),

    // Anything that is not a number is dropped here. A URN typed as "TBC" or a
    // trailing comma leaving an empty entry would otherwise become a row that
    // joins to no school and reads as a missing school rather than a typo. The
    // Anomalies sheet reports the ones that ARE numbers and still match no
    // school, which is the case worth a person's time.
    Valid = Table.SelectRows(Numbered, each [URN] <> null),

    Result = Table.SelectColumns(Valid,
        {"ID", "Employer", "Branch", "MAT", "Live", "Outcome (RAG)", "URN"})
in
    Result
