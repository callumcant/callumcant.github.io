// Query name: Src_PayDashboard
//
// The Pay Dashboard export: ballot turnout and engagement, keyed on workplace
// code like Stratum and joined to schools the same way, through WCtoURN.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Pay Dashboard export.csv", "SourcePayDashboard"),

    Kept = fnExpect(Raw,
        {
            "Workplace code", "Workplace name",
            "Members voted (2026 indicative)", "Members voted (2025 indicative)",
            "Members voted (2024 indicative)", "Turnout (2026 indicative)",
            "Volunteers", "WP conversations", "Active SEVs", "Rep recruited volunteer",
            "Joined community", "Completed activate action", "Agreed to briefing",
            "Hold a meeting", "Needs support", "Pledged to vote",
            "Branch name", "District name", "Region name", "Import date"
        },
        "the Pay Dashboard export"),

    // ---- The volunteer trap -----------------------------------------------
    // This export's "Volunteers" are SEVs — Save Education Volunteers, a ballot
    // role. The activists export has its own Ballot Volunteers (position code
    // WBV), which is a standing position in the membership database. They are
    // different things, from different systems, an order of magnitude apart in
    // number, and similar enough in name to be conflated by anyone reading a
    // column heading quickly. That has happened before.
    //
    // So the column is renamed here, at the source, and NOTHING in this
    // workbook is called just "volunteers". "Active SEVs" was already
    // unambiguous and is left alone.
    Renamed = Table.RenameColumns(Kept, {
        {"Volunteers", "SEVs"},
        {"Rep recruited volunteer", "Reps recruited by a SEV"}
    }),

    Typed = Table.TransformColumns(Renamed, {
        {"Workplace code", each if _ = null then null else Text.Trim(Text.From(_)), type text},
        {"Members voted (2026 indicative)", each fnNumber(_), type number},
        {"Members voted (2025 indicative)", each fnNumber(_), type number},
        {"Members voted (2024 indicative)", each fnNumber(_), type number},
        // Turnout is a proportion (0.62), not 62. It is formatted as a
        // percentage on the sheet and compared against densities, which are
        // also proportions — the quadrant would be nonsense if the two scales
        // disagreed.
        {"Turnout (2026 indicative)", each fnNumber(_), type number},
        {"SEVs", each fnNumber(_), type number},
        {"WP conversations", each fnNumber(_), type number},
        {"Active SEVs", each fnNumber(_), type number},
        {"Reps recruited by a SEV", each fnNumber(_), type number},
        {"Joined community", each fnNumber(_), type number},
        {"Completed activate action", each fnNumber(_), type number},
        {"Agreed to briefing", each fnNumber(_), type number},
        {"Hold a meeting", each fnNumber(_), type number},
        {"Needs support", each fnNumber(_), type number},
        {"Pledged to vote", each fnNumber(_), type number},
        {"Import date", each try Date.From(_) otherwise null, type date}
    }),

    Result = Table.SelectRows(Typed, each [Workplace code] <> null and [Workplace code] <> "")
in
    Result
