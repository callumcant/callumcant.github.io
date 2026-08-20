// Query name: DisputeView
//
// One row per dispute — the tracker, with the schools on it counted and their
// membership added up.
//
// The tracker itself (Src_Disputes) is what people type into; this is what they
// read. Everything added here comes from joining the affected schools back to
// the School view: how many schools, how many of them the workbook can find,
// how many members are in them, how many have a rep. A dispute is easier to
// judge with "9 schools, 640 members, 2 with no rep" beside it than with a cell
// of comma-separated URNs.
//
// The two ballot columns apply P_BallotThreshold, which is the Trade Union Act
// turnout threshold rather than a reporting preference. Same rule as
// disputeKpis in js/data/rollups.js: a blank percentage is not a failure, it is
// a ballot that has not happened or has not been entered, and it stays blank.
//
// RESTRICTED. This reads Src_Disputes, which lives in a folder only dispute
// leads and SIOs can open. Anyone else gets a permissions error on refresh
// rather than a wrong number, which is the correct failure — and this sheet is
// why the workbook's audience is not the same as the tracker's.
//
// Load to: the "Disputes" sheet, as a table.
let
    Source = Src_Disputes,

    // ---- What the schools add up to ---------------------------------------
    Schools = Table.Buffer(Dispute_Schools),

    Rolled = Table.Group(Schools, {"ID"}, {
        {"Schools listed", each Table.RowCount(_), Int64.Type},
        {"Schools found", each Table.RowCount(Table.SelectRows(_, each [On the School view] = "Yes")), Int64.Type},
        {"Membership in those schools", each fnZero(List.Sum(Table.Column(_, "Membership (total)"))), type number},
        {"Headcount in those schools", each fnZero(List.Sum(Table.Column(_, "Headcount (total)"))), type number},
        {"Reps in those schools", each fnZero(List.Sum(Table.Column(_, "Rep count"))), Int64.Type},
        {"Schools with no rep", each Table.RowCount(Table.SelectRows(_, each [Has rep] = "No")), Int64.Type},
        {"School names", each Text.Combine(
            List.Select(Table.Column(_, "School name"), each _ <> null), "; "), type text}
    }),

    Joined = Table.NestedJoin(Source, {"ID"}, Rolled, {"ID"}, "Roll", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "Roll",
        {"Schools listed", "Schools found", "Membership in those schools",
         "Headcount in those schools", "Reps in those schools", "Schools with no rep", "School names"}),

    // A dispute with no URNs listed has no schools attached, and zero is the
    // true answer to "how many schools are on this dispute" — unlike the
    // membership figures, which stay blank because nothing was measured.
    Zeroed = Table.TransformColumns(Expanded, {
        {"Schools listed", fnZero, Int64.Type},
        {"Schools found", fnZero, Int64.Type}
    }),

    // Density across the schools in the dispute: summed above, divided here,
    // the same rule as everywhere else.
    Density = Table.AddColumn(Zeroed, "Density in those schools",
        each fnDensity([#"Membership in those schools"], [#"Headcount in those schools"]), type number),

    // ---- The ballots -------------------------------------------------------
    // Blank stays blank. A ballot with no percentage recorded is not a failed
    // ballot, and "No" would read as one.
    Indicative = Table.AddColumn(Density, "Indicative reached threshold",
        each if [#"Indicative %"] = null then null
             else if [#"Indicative %"] >= P_BallotThreshold then "Yes" else "No",
        type text),
    Formal = Table.AddColumn(Indicative, "Formal reached threshold",
        each if [#"Formal %"] = null then null
             else if [#"Formal %"] >= P_BallotThreshold then "Yes" else "No",
        type text),

    // Blank rather than "No", for the same reason: a dispute nobody has marked
    // either way is not a dispute that has ended.
    LiveFlag = Table.AddColumn(Formal, "Live now",
        each if [Live] = "" then null else if [Live] = "Yes" then "Yes" else "No", type text),

    Result = Table.SelectColumns(LiveFlag, {
        // Identity
        "ID", "Employer", "Branch", "MAT", "Live now", "Outcome (RAG)",
        // The schools in it
        "Schools listed", "Schools found", "Membership in those schools",
        "Headcount in those schools", "Density in those schools",
        "Reps in those schools", "Schools with no rep", "School names", "Affected URNs",
        // Who and what
        "Dispute issues", "Dispute lead (IO/ROR/SIO)", "Dispute lead (name)",
        // Ballots
        "Indicative opens (date)", "Indicative %", "Indicative reached threshold",
        "Membership at indicative", "Formal %", "Formal reached threshold",
        "Resolved prior to action (y/n)",
        // How it ended
        "Date of resolution", "Total strike days",
        // The paperwork
        "Trade dispute letter (doc link)", "Formal ballot request (doc link)",
        "Notice of formal ballot (doc link)", "Notice of strike dates (doc link)",
        "End of dispute report (doc link)"
    })
in
    Result
