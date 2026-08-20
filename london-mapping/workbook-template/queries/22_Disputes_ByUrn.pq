// Query name: Disputes_ByUrn
//
// One row per school that appears on a dispute, with a count and a live flag.
//
// A school is in dispute if its URN is listed on the dispute — exact, rather
// than inferred from the dispute's branch or MAT. A trust-wide dispute that
// only covers four of its thirty schools must not flag the other twenty-six.
//
// Affected URNs holds a comma-separated list in one cell, so it is split and
// expanded here. That is the only reason this query exists rather than the
// School view joining Src_Disputes directly.
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

    Valid = Table.SelectRows(Numbered, each [URN] <> null),

    Grouped = Table.Group(Valid, {"URN"}, {
        {"Disputes", each Table.RowCount(_), Int64.Type},
        // Yes on any one live dispute is enough. Matching the app's
        // d.live === "Yes" rather than treating a blank as live.
        {"In live dispute", each List.Contains(Table.Column(_, "Live"), "Yes"), type logical}
    })
in
    Grouped
