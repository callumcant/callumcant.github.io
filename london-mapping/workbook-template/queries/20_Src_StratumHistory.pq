// Query name: Src_StratumHistory
//
// One row per workplace per week — every weekly Stratum export, stacked. This
// replaces the app's Snapshots table outright, and it is what the Trend sheet
// and the current week (Src_Stratum) are both built from.
//
// The reading, renaming and dating happens in Src_StratumRows. Two things
// happen here and nowhere else: rows with no workplace code are dropped, and
// rows that share a workplace code within one week are collapsed.
//
// A row with no workplace code cannot be attached to a school at all. It is
// dropped rather than zeroed — it is membership data with nothing to attach it
// to, and it belongs on the Anomalies sheet where someone can look at it, not
// quietly inside a total. Src_StratumUnkeyed is what puts it there.
//
// One more thing this shape means: rows sharing a workplace code within one
// week are collapsed to one rather than summed. With one row per workplace
// that should never trigger — which is exactly why it stays. If Stratum ever
// starts repeating a workplace, summing the rows would silently double that
// school's membership in every total in the workbook. "Rows in export" is kept
// so the Anomalies sheet can show it happening.
//
// Load to: connection only. One row per school per week — at London scale that
// is thousands of rows a week, and nothing needs it on a sheet.
let
    Source = Src_StratumRows,

    // Dropped, not zeroed. Src_StratumUnkeyed picks these up for the Anomalies
    // sheet, so membership that is in the export but in no total is visible.
    Coded = Table.SelectRows(Source, each [Workplace code] <> null and [Workplace code] <> ""),

    // ONE ROW PER WORKPLACE PER WEEK. That is what the export already gives us,
    // so this should never do anything. It stays because the failure it
    // prevents is silent and expensive: if Stratum ever starts repeating a
    // workplace, summing those rows would double that school's membership and
    // headcount in every borough and trust total in the workbook. The figures
    // are taken from the first row rather than added, because a repeated row is
    // one workplace reported twice, not two workplaces.
    Collapsed = Table.Group(Coded, {"Snapshot date", "Workplace code"}, {
        {"Workplace name", each Table.First(_)[Workplace name], type text},
        {"NEU branch", each Table.First(_)[NEU branch], type text},
        {"Membership (total)", each Table.First(_)[#"Membership (total)"], type number},
        {"Membership (teachers)", each Table.First(_)[#"Membership (teachers)"], type number},
        {"Membership (leadership)", each Table.First(_)[#"Membership (leadership)"], type number},
        {"Membership (support)", each Table.First(_)[#"Membership (support)"], type number},
        {"Headcount (total)", each Table.First(_)[#"Headcount (total)"], type number},
        {"Headcount (teachers)", each Table.First(_)[#"Headcount (teachers)"], type number},
        {"Headcount (leadership)", each Table.First(_)[#"Headcount (leadership)"], type number},
        {"Headcount (support)", each Table.First(_)[#"Headcount (support)"], type number},
        {"Trainee members (employed)", each Table.First(_)[#"Trainee members (employed)"], type number},
        {"Trainee members (not employed)", each Table.First(_)[#"Trainee members (not employed)"], type number},
        {"Headcount (teaching assistants)", each Table.First(_)[#"Headcount (teaching assistants)"], type number},
        {"Headcount (non-classroom support)", each Table.First(_)[#"Headcount (non-classroom support)"], type number},
        {"Headcount (auxiliary)", each Table.First(_)[#"Headcount (auxiliary)"], type number},

        // The only rep fact the export carries, and the only one anything in
        // this workbook is built on. Every rep measure — coverage, schools
        // without a rep, members in schools without a rep — comes from this
        // column and nothing else.
        {"Has rep", each List.AnyTrue(List.Transform(Table.Column(_, "Has rep"), each fnYesNo(_))), type logical},

        // Kept for the Anomalies sheet: anything other than 1 here means the
        // export has started repeating workplaces, and somebody needs to look
        // at it before trusting a total.
        {"Rows in export", each Table.RowCount(_), Int64.Type}
    }),

    Result = Collapsed
in
    Result
