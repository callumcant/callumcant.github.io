// Query name: Pay_ByUrn
//
// The Pay Dashboard export attached to schools: one row per URN.
//
// Same shape as Stratum_ByUrn — map the workplace code, follow any successor,
// then group — and for the same reason: two codes on one school must merge into
// it, never duplicate it.
//
// What gets summed is narrower here. Volunteers, WP conversations and active
// SEVs are counts of people and activity, so they add. Turnout and the votes
// behind it do NOT: adding two turnout percentages is meaningless, and adding
// vote counts without adding the electorates they came from is worse. Where a
// school has two codes, the first row's ballot figures are taken, exactly as
// the app does. It is a rare case and it shows up on the Anomalies sheet.
//
// Load to: connection only.
let
    Source = Src_PayDashboard,

    Matched = Table.NestedJoin(Source, {"Workplace code"}, Rec_UrnByWorkplaceCode, {"Workplace code"}, "Map", JoinKind.Inner),
    Mapped = Table.ExpandTableColumn(Matched, "Map", {"URN"}, {"URN"}),

    WithSuccessor = Table.NestedJoin(Mapped, {"URN"}, Rec_Successors, {"From URN"}, "Successor", JoinKind.LeftOuter),
    Successor = Table.ExpandTableColumn(WithSuccessor, "Successor", {"To URN"}, {"To URN"}),
    Redirected = Table.AddColumn(Successor, "School URN",
        each if [To URN] = null then [URN] else [To URN], Int64.Type),

    Grouped = Table.Group(Redirected, {"School URN"}, {
        // Summed: counts of people and of activity.
        {"SEVs", each fnZero(List.Sum(Table.Column(_, "SEVs"))), type number},
        {"WP conversations", each fnZero(List.Sum(Table.Column(_, "WP conversations"))), type number},
        {"Active SEVs", each fnZero(List.Sum(Table.Column(_, "Active SEVs"))), type number},

        // Taken from the first row: everything else.
        {"Members voted (2026 indicative)", each Table.First(_)[#"Members voted (2026 indicative)"], type number},
        {"Members voted (2025 indicative)", each Table.First(_)[#"Members voted (2025 indicative)"], type number},
        {"Members voted (2024 indicative)", each Table.First(_)[#"Members voted (2024 indicative)"], type number},
        {"Turnout (2026 indicative)", each Table.First(_)[#"Turnout (2026 indicative)"], type number},
        {"Reps recruited by a SEV", each Table.First(_)[#"Reps recruited by a SEV"], type number},
        {"Joined community", each Table.First(_)[#"Joined community"], type number},
        {"Completed activate action", each Table.First(_)[#"Completed activate action"], type number},
        {"Agreed to briefing", each Table.First(_)[#"Agreed to briefing"], type number},
        {"Hold a meeting", each Table.First(_)[#"Hold a meeting"], type number},
        {"Needs support", each Table.First(_)[#"Needs support"], type number},
        {"Pledged to vote", each Table.First(_)[#"Pledged to vote"], type number},
        {"Branch name", each Table.First(_)[#"Branch name"], type text},
        {"District name", each Table.First(_)[#"District name"], type text},
        {"Region name", each Table.First(_)[#"Region name"], type text},
        {"Import date", each Table.First(_)[#"Import date"], type date},
        {"Pay workplace code", each Table.First(_)[#"Workplace code"], type text}
    }),

    Result = Table.RenameColumns(Grouped, {{"School URN", "URN"}})
in
    Result
