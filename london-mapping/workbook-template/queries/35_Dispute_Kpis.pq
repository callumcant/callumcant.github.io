// Query name: Dispute_Kpis
//
// The five dispute figures the app put on its dashboard, plus three the
// workbook can add for free — as a small block of labelled rows rather than a
// wide table, because that is the shape a KPI strip wants on a sheet.
//
// The first five mirror disputeKpis in js/data/rollups.js exactly, threshold
// included, so the app and the workbook can be run against the same tracker and
// their numbers compared.
//
// A "Measure / Value / What it counts" table rather than one row of eight
// columns: the definitions are the point. "Successful indicative ballots" is a
// count of ballots that reached a legal threshold, not of ballots people were
// pleased with, and a number on a dashboard with no definition beside it gets
// quoted in a meeting as whatever the reader assumed.
//
// Load to: the "Disputes" sheet, as a table, above the dispute list.
let
    D = Table.Buffer(Src_Disputes),
    S = Table.Buffer(Dispute_Schools),

    Count = (predicate as function) as number => Table.RowCount(Table.SelectRows(D, predicate)),

    Live = Table.SelectRows(S, each [Live] = "Yes"),
    LiveSchools = Table.Distinct(Table.SelectColumns(Table.SelectRows(Live, each [On the School view] = "Yes"), {"URN", "Membership (total)"}), {"URN"}),

    Threshold = Number.ToText(P_BallotThreshold * 100) & "%",

    Result = #table(
        type table [Measure = text, Value = number, #"What it counts" = text],
        {
            {"Disputes tracked", Table.RowCount(D),
             "Every row on the tracker, live or closed."},

            {"Live disputes", Count(each [Live] = "Yes"),
             "Disputes marked Live = Yes. A blank is not live."},

            {"Successful indicative ballots",
             Count(each [#"Indicative %"] <> null and [#"Indicative %"] >= P_BallotThreshold),
             "Indicative ballots reaching " & Threshold & " turnout. A ballot with no percentage recorded is not counted as a failure — it is not counted at all."},

            {"Successful formal ballots",
             Count(each [#"Formal %"] <> null and [#"Formal %"] >= P_BallotThreshold),
             "Formal ballots reaching " & Threshold & " turnout, the Trade Union Act threshold."},

            {"Strike days", fnZero(List.Sum(Table.Column(D, "Total strike days"))),
             "Total strike days across every dispute on the tracker, added up as recorded."},

            {"Disputes resolved green",
             Count(each Text.Trim(if [#"Outcome (RAG)"] = null then "" else Text.From([#"Outcome (RAG)"])) = "Green"),
             "Disputes whose RAG outcome is Green. Amber, Red and blank are all not-green."},

            {"Schools in a live dispute", Table.RowCount(LiveSchools),
             "Schools listed on a live dispute and found on the School view. Counted once even if two live disputes name them."},

            {"Members in those schools", fnZero(List.Sum(Table.Column(LiveSchools, "Membership (total)"))),
             "Membership across those schools, from the current Stratum export — not the membership at ballot, which is on the dispute row itself."}
        })
in
    Result
