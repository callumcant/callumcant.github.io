// Query name: Src_Disputes
//
// The dispute tracker.
//
// It lives in its own file, in a subfolder with permission inheritance broken
// and access limited to dispute leads and SIOs — not in the shared field log.
// This is the data IT specifically named as needing a DPIA, and it is the one
// direct, visible answer to that objection. It costs almost nothing now and is
// awkward to retrofit later.
//
// Anyone without access to that folder gets a permissions error on refresh
// rather than a wrong number, which is the correct failure.
//
// Load to: connection only. The Disputes SHEET reads this query; nothing else
// needs the detail.
let
    Raw = fnTable({"Disputes"}, "Disputes.xlsx", "DisputeTracker"),

    Kept = fnExpect(Raw,
        {
            "ID", "Employer", "MAT", "Branch", "Affected URNs", "Live",
            "Dispute lead (IO/ROR/SIO)", "Dispute lead (name)", "Dispute issues",
            "Indicative opens (date)", "Trade dispute letter (doc link)",
            "Resolved prior to action (y/n)", "Indicative %", "Membership at indicative",
            "Formal ballot request (doc link)", "Notice of formal ballot (doc link)",
            "Formal %", "Notice of strike dates (doc link)", "Date of resolution",
            "Outcome (RAG)", "Total strike days", "End of dispute report (doc link)"
        },
        "the DisputeTracker table in Disputes.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"Live", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"MAT", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Branch", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Indicative opens (date)", each try Date.From(_) otherwise null, type date},
        {"Date of resolution", each try Date.From(_) otherwise null, type date},
        // Ballot percentages are proportions (0.72), not 72 — same scale as
        // density and turnout, formatted as a percentage on the sheet.
        {"Indicative %", each fnNumber(_), type number},
        {"Formal %", each fnNumber(_), type number},
        {"Membership at indicative", each fnNumber(_), type number},
        {"Total strike days", each fnNumber(_), type number}
    })
in
    Typed
