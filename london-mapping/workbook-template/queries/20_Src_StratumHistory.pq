// Query name: Src_StratumHistory
//
// Every weekly Stratum export in the folder, stacked into one table with a
// Snapshot date on each row. This replaces the app's Snapshots table outright.
//
// Why this is the part of the pivot that gets BETTER: the app captured a
// snapshot from whoever opened it first each week, wrote 3,000 rows in batches,
// and could not resume if the tab was closed — a half-finished capture showed
// on the dashboard as a real-looking dip. Here the history is DERIVED from the
// export files. Nobody can corrupt a past week by editing a row, because there
// are no rows to edit, only files that are never touched again once dropped in.
// A week is either there or it is not.
//
// The weekly routine becomes: drop the file in the folder, open the master,
// Refresh All.
//
// ---------------------------------------------------------------------------
// THE REAL EXPORT — column mapping, confirmed August 2026
//
// Stratum's actual headers, and what each becomes here. Anything not listed is
// deliberately dropped, and the reason is given below.
//
//   Workplace Code            -> Workplace code        (the join key)
//   Workplace Name            -> Workplace name
//   Neu Branch Desc$$neu      -> NEU branch
//   Count of Members          -> Membership (total)
//   Standard And NQ Members   -> Membership (teachers)
//   Leadership Members        -> Membership (leadership)
//   Support Members           -> Membership (support)
//   Total Workforce (Census)  -> Headcount (total)
//   Standard (Census)         -> Headcount (teachers)
//   Leaders (Census)          -> Headcount (leadership)
//   Support Members (Census)  -> Headcount (support)
//   Trainee Emp Count$$neu    -> Trainee members (employed)
//   Trainee Not Emp Count$$neu-> Trainee members (not employed)
//   Total Assist Teacher$$neu -> Headcount (teaching assistants)
//   Total Non Class Supp$$neu -> Headcount (non-classroom support)
//   Total Auxiliary$$neu      -> Headcount (auxiliary)
//   Workplace has a rep?      -> Has rep
//
// Dropped on purpose:
//
//   Leadership Density %, Standard Density, Standard Density %,
//   Support Density %, Member Density %
//       Stratum works these out per workplace. We recalculate every density
//       ourselves, because a borough or trust density has to be
//       sum(members) / sum(headcount) and cannot be built from per-school
//       percentages at all. Carrying both would give two columns that disagree
//       in the third decimal place and invite someone to use the wrong one.
//       One of them is worth putting on the Anomalies sheet later as a check
//       that our arithmetic matches theirs.
//
//   District Name, District Code, Region, Neu Branch$$neu, Phase,
//   Phase Of Workplace, Workplace Type, Sector, Workplace Group
//       GIAS owns phase, type and borough; the Pay Dashboard owns district and
//       region. Two columns of the same meaning from two sources is exactly how
//       a school ends up filed one way in the table and another in the
//       rollups. NEU branch is the exception and is kept, because nothing else
//       in the model carries it — see the note on it below.
//
//   Rep MemNo
//       A membership number: it identifies a person. NOT READ AT ALL, and not
//       even required to be present. See below for why it turned out to be of
//       no use, and note that not reading it is the better answer regardless:
//       data protection is what stopped the app, and pulling an identifiable
//       member record through the workbook for no analytical gain would be
//       indefensible.
//
// THERE IS NO REP COUNT IN THIS EXPORT.
//
// Stratum gives a Yes/No flag per workplace and one membership number. The
// export is one row per WORKPLACE (confirmed with the data team, August 2026),
// so that number is one rep, and counting distinct numbers could only ever
// return 0 or 1 — the flag again, under a name that invites people to sum it
// and call the answer "reps". So the flag is all this query carries.
//
// The rep count itself comes from Src_RepCounts, which is the one place its
// source is decided, and which falls back to this flag as a floor where it has
// nothing better. Read the note at the top of that query before changing
// anything about reps.
//
// IF THE REP COUNT ENDS UP IN THIS WEEKLY EXPORT, that is the better outcome by
// some distance: add it to Expected and Renamed below and it gets a weekly
// history for free, from the first file that carries it. A count sourced from
// anywhere else can be reported but not trended, and rep recruitment over time
// is most of what it is for.
//
// One more thing this shape means: rows sharing a workplace code within one
// week are collapsed to one rather than summed. With one row per workplace
// that should never trigger — which is exactly why it stays. If Stratum ever
// starts repeating a workplace, summing the rows would silently double that
// school's membership in every total in the workbook. "Rows in export" is kept
// so the Anomalies sheet can show it happening.
// ---------------------------------------------------------------------------
//
// Load to: connection only. One row per school per week — at London scale that
// is thousands of rows a week, and nothing needs it on a sheet.
let
    Files = fnFolderContents({"Stratum exports"}),

    // .xlsx from a scripted pull, .csv from a manual one. Both happen.
    Supported = Table.SelectRows(Files,
        each Comparer.OrdinalIgnoreCase(Text.End([Name], 4), ".csv") = 0
          or Comparer.OrdinalIgnoreCase(Text.End([Name], 5), ".xlsx") = 0),

    Guarded =
        if Table.IsEmpty(Supported) then
            error Error.Record(
                "No Stratum exports found",
                "The Stratum exports folder holds no .csv or .xlsx files.",
                "Every membership figure and every trend in this workbook comes from that folder. Drop the export in and refresh again."
            )
        else
            Supported,

    // Read one export file. Kept as a step inside this query rather than as a
    // separate one so the two file formats and the dating rule stay together.
    ReadOne = (name as text, content as binary) as table =>
        let
            Data =
                if Comparer.OrdinalIgnoreCase(Text.End(name, 4), ".csv") = 0 then
                    fnCsvTable(content)
                else
                    // The first named table if the export has one, otherwise the
                    // first sheet. A Stratum pull is usually a plain sheet.
                    let
                        Book = Excel.Workbook(content, true),
                        Tables = Table.SelectRows(Book, each [Kind] = "Table"),
                        Sheets = Table.SelectRows(Book, each [Kind] = "Sheet")
                    in
                        if not Table.IsEmpty(Tables) then Tables{0}[Data]
                        else if not Table.IsEmpty(Sheets) then Sheets{0}[Data]
                        else error Error.Record("Empty export", "There is nothing readable in " & name & ".", null),

            // Several of Stratum's headers carry a trailing space — "Workplace
            // Code ", "Count of Members ", "Region " — and whether it
            // survives depends on how the file was saved. Trimming every header
            // on the way in means the names below match either way, instead of
            // the refresh failing on an invisible character.
            Trimmed = Table.TransformColumnNames(Data, Text.Trim),

            // ================================================================
            // THE ONE PLACE TO EDIT IF THE STRATUM EXPORT CHANGES AGAIN.
            //
            // These are the real headers as of August 2026. If a refresh stops
            // here naming a column, the export has been changed: fix the name
            // here, and make the matching edit in
            // data-dictionary/dictionary.json so the app goes on describing the
            // same thing.
            // ================================================================
            Expected = {
                "Workplace Code", "Workplace Name", "Neu Branch Desc$$neu",
                "Count of Members", "Standard And NQ Members", "Leadership Members", "Support Members",
                "Total Workforce (Census)", "Standard (Census)", "Leaders (Census)", "Support Members (Census)",
                "Trainee Emp Count$$neu", "Trainee Not Emp Count$$neu",
                "Total Assist Teacher$$neu", "Total Non Class Supp$$neu", "Total Auxiliary$$neu",
                "Workplace has a rep?"
            },

            // Export date is genuinely optional — the real export does not have
            // one, so the filename is the route in practice. Kept because an
            // export that grows the column later should win over the filename.
            HasExportDate = List.Contains(Table.ColumnNames(Trimmed), "Export date"),
            Kept = fnExpect(Trimmed,
                List.Combine({Expected, (if HasExportDate then {"Export date"} else {})}),
                "the Stratum export " & name),

            Renamed = Table.RenameColumns(Kept, {
                {"Workplace Code", "Workplace code"},
                {"Workplace Name", "Workplace name"},
                {"Neu Branch Desc$$neu", "NEU branch"},
                {"Count of Members", "Membership (total)"},
                {"Standard And NQ Members", "Membership (teachers)"},
                {"Leadership Members", "Membership (leadership)"},
                {"Support Members", "Membership (support)"},
                {"Total Workforce (Census)", "Headcount (total)"},
                {"Standard (Census)", "Headcount (teachers)"},
                {"Leaders (Census)", "Headcount (leadership)"},
                {"Support Members (Census)", "Headcount (support)"},
                {"Trainee Emp Count$$neu", "Trainee members (employed)"},
                {"Trainee Not Emp Count$$neu", "Trainee members (not employed)"},
                {"Total Assist Teacher$$neu", "Headcount (teaching assistants)"},
                {"Total Non Class Supp$$neu", "Headcount (non-classroom support)"},
                {"Total Auxiliary$$neu", "Headcount (auxiliary)"},
                {"Workplace has a rep?", "Has rep"}
            }),

            FromName = try Date.FromText(Text.Start(name, 10)) otherwise null,

            // A file that cannot be dated is an error, not a row that quietly
            // lands on today. Since the real export carries no date of its own,
            // THE FILENAME IS THE DATE: name each file for the week it covers,
            // as 2026-08-16.xlsx. An undated week would otherwise attach itself
            // to whatever week happens to be current and move the trend without
            // anyone asking.
            Dated = Table.AddColumn(Renamed, "Snapshot date",
                each
                    let
                        FromColumn = if HasExportDate then (try Date.From([Export date]) otherwise null) else null,
                        Chosen = if FromColumn <> null then FromColumn else FromName
                    in
                        if Chosen <> null then Chosen
                        else error Error.Record(
                            "Cannot date a Stratum export",
                            "The file " & name & " does not begin with a date, and carries no Export date column.",
                            "Rename it to the week it covers, in the form 2026-08-16.xlsx."
                        ),
                type date),

            Final = if HasExportDate then Table.RemoveColumns(Dated, {"Export date"}) else Dated
        in
            Final,

    Read = Table.AddColumn(Guarded, "Data", each ReadOne([Name], [Content]), type table),

    Combined = Table.Combine(Table.Column(Read, "Data")),

    Typed = Table.TransformColumns(Combined, {
        {"Workplace code", each if _ = null then null else Text.Trim(Text.From(_)), type text},
        {"Workplace name", each if _ = null then null else Text.From(_), type text},
        {"NEU branch", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Membership (total)", each fnNumber(_), type number},
        {"Membership (teachers)", each fnNumber(_), type number},
        {"Membership (leadership)", each fnNumber(_), type number},
        {"Membership (support)", each fnNumber(_), type number},
        {"Headcount (total)", each fnNumber(_), type number},
        {"Headcount (teachers)", each fnNumber(_), type number},
        {"Headcount (leadership)", each fnNumber(_), type number},
        {"Headcount (support)", each fnNumber(_), type number},
        {"Trainee members (employed)", each fnNumber(_), type number},
        {"Trainee members (not employed)", each fnNumber(_), type number},
        {"Headcount (teaching assistants)", each fnNumber(_), type number},
        {"Headcount (non-classroom support)", each fnNumber(_), type number},
        {"Headcount (auxiliary)", each fnNumber(_), type number}
    }),

    // A row with no workplace code cannot be attached to a school at all. It
    // surfaces on the Anomalies sheet rather than here.
    Coded = Table.SelectRows(Typed, each [Workplace code] <> null and [Workplace code] <> ""),

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
