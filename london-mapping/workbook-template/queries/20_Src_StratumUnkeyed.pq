// Query name: Src_StratumUnkeyed
//
// The rows Src_StratumHistory throws away: every row in every Stratum export
// that carries no workplace code, counted per week with the membership on it.
//
// A row with no workplace code joins to nothing. It has no URN, so it is in no
// school, no borough, no trust and no total — including the London total. That
// is the right thing to do with it and the wrong thing to do silently, because
// the workbook would go on looking complete while some of the region's
// membership sat outside every figure in it.
//
// So it gets a row on the Anomalies sheet instead, per week, saying how many
// rows and how many members are missing from everything. It should be empty.
//
// The historical weeks matter as much as the current one: a week that lost 400
// members this way is a dip in the Trend sheet that never happened.
//
// Load to: connection only.
let
    Source = Src_StratumRows,

    Unkeyed = Table.SelectRows(Source, each [Workplace code] = null or [Workplace code] = ""),

    // Summed, not collapsed. The de-duplication in Src_StratumHistory keys on
    // the workplace code, and these rows have none — there is nothing to
    // collapse them by, and two of them are two rows rather than one reported
    // twice.
    Grouped = Table.Group(Unkeyed, {"Snapshot date"}, {
        {"Rows with no workplace code", each Table.RowCount(_), Int64.Type},
        {"Membership (total)", each fnZero(List.Sum(Table.Column(_, "Membership (total)"))), type number},
        {"Headcount (total)", each fnZero(List.Sum(Table.Column(_, "Headcount (total)"))), type number}
    }),

    Result = Table.Sort(Grouped, {{"Snapshot date", Order.Ascending}})
in
    Result
