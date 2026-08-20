// Query name: Src_ActivistHistory
//
// Every weekly "all workplace activists" export, stacked into one table: one row
// per (member, committee position, week), reduced to just a workplace code, a
// position code and a date.
//
// This is where Rep count comes from. Summing rep positions per workplace code
// is the only route to a real rep count — the workplace totals export carries a
// Yes/No flag and nothing more.
//
// ===========================================================================
// THIS EXPORT IS THE MOST SENSITIVE FILE IN THE WHOLE BUILD.
//
// Its 46 columns include every activist's name, home address, postcode, age,
// personal email, mobile and home telephone number. It is a membership list of
// named individuals.
//
// It sits in the shared team library with the other exports. That is settled
// and correct: every member of the team has a right to pull this data from
// Stratum themselves, so a copy of it in a folder they can all read gives
// nobody access to anything they did not already have. It is NOT the dispute
// tracker, which is restricted because its audience is genuinely narrower.
//
// What this query still does, because it costs nothing and is simply good
// practice: FOUR COLUMNS ARE READ AND THE OTHER 42 ARE NEVER TOUCHED. Nothing
// below the first step can see a name, an address or a phone number. The
// membership number is used only to stitch the file's continuation rows
// together and to count distinct people, and is dropped before anything is
// stored. What reaches the master is counts per workplace — so the master
// itself carries no personal data at all, whoever opens it.
// ===========================================================================
//
// THREE TRAPS IN THIS EXPORT, all learned the hard way elsewhere in the union
// and all handled below. Do not "simplify" any of them away.
//
//  1. A MEMBER'S SECOND AND FURTHER POSITIONS ARE ON CONTINUATION ROWS, blank
//     in every column except the position ones. Roughly a quarter of all rows.
//     Read the file without filling those down and you silently lose a quarter
//     of all positions — and mis-attribute none of them, which is the worst
//     shape of bug there is, because every number still looks plausible.
//
//  2. "Comm End Date" IS AN EXPIRY DATE, NOT EVIDENCE A POSITION HAS ENDED.
//     Where it is populated at all, it is in the future. Nothing is filtered on
//     it. Treating it as an end date would delete live reps.
//
//  3. "Employer Code" IS BLANK ON ROUGHLY A THIRD OF ROWS. Attribution is done
//     through Workplace Code, which is complete, and then through WCtoURN like
//     every other source. The export's own employer column is not read.
//
// AND ONE NAMING TRAP. "Ballot Volunteer" (position code WBV) is a standing
// position in the membership database. The "Volunteers" column in the Pay
// Dashboard ballot export is a SEV — a Save Education Volunteer — which is a
// different thing, from a different system, roughly three times as numerous.
// They are similar enough to be confused and an order of magnitude apart. That
// is why the Pay Dashboard column is called "SEVs" in this workbook and this
// one is called "Ballot volunteers", and why nothing anywhere is called just
// "volunteers".
//
// Load to: connection only.
let
    Files = fnFolderContents({"Activist exports"}),

    Supported = Table.SelectRows(Files,
        each Comparer.OrdinalIgnoreCase(Text.End([Name], 4), ".csv") = 0
          or Comparer.OrdinalIgnoreCase(Text.End([Name], 5), ".xlsx") = 0),

    Guarded =
        if Table.IsEmpty(Supported) then
            error Error.Record(
                "No activist exports found",
                "The Activist exports folder holds no .csv or .xlsx files.",
                "Every rep count in this workbook comes from that folder. Drop the export in and refresh again."
            )
        else
            Supported,

    ReadOne = (name as text, content as binary) as table =>
        let
            Data =
                if Comparer.OrdinalIgnoreCase(Text.End(name, 4), ".csv") = 0 then
                    fnCsvTable(content)
                else
                    let
                        Book = Excel.Workbook(content, true),
                        Tables = Table.SelectRows(Book, each [Kind] = "Table"),
                        Sheets = Table.SelectRows(Book, each [Kind] = "Sheet")
                    in
                        if not Table.IsEmpty(Tables) then Tables{0}[Data]
                        else if not Table.IsEmpty(Sheets) then Sheets{0}[Data]
                        else error Error.Record("Empty export", "There is nothing readable in " & name & ".", null),

            // Stratum pads headers with trailing spaces, inconsistently.
            Headers = Table.TransformColumnNames(Data, Text.Trim),

            // THE ONLY FOUR COLUMNS READ. Everything else in the file — names,
            // addresses, ages, emails, phone numbers — is discarded here, in
            // the first step, and cannot be reached by anything below.
            Kept = fnExpect(Headers,
                {"Membership Number", "Workplace Code", "Committee Position", "Comm Start Date"},
                "the activists export " & name),

            // Blanks must be null before they can be filled down.
            Blanked = Table.TransformColumns(Kept, {
                {"Membership Number", each if _ = null or Text.Trim(Text.From(_)) = "" then null else Text.Trim(Text.From(_)), type text},
                {"Workplace Code", each if _ = null or Text.Trim(Text.From(_)) = "" then null else Text.Trim(Text.From(_)), type text},
                {"Committee Position", each if _ = null then "" else Text.Upper(Text.Trim(Text.From(_))), type text}
            }),

            // TRAP 1. Fill the member and their workplace down onto their
            // continuation rows, so a member's second and third positions are
            // attributed to the same workplace as their first.
            //
            // Table.Buffer first: FillDown depends on row order, and an
            // unbuffered lazy source is not guaranteed to keep the file's.
            Filled = Table.FillDown(Table.Buffer(Blanked), {"Membership Number", "Workplace Code"}),

            FromName = try Date.FromText(Text.Start(name, 10)) otherwise null,
            Dated = Table.AddColumn(Filled, "Snapshot date",
                each if FromName <> null then FromName
                     else error Error.Record(
                        "Cannot date an activists export",
                        "The file " & name & " does not begin with a date.",
                        "Rename it to the week it covers, in the form 2026-08-16.csv. "
                            & "The rep count for that week hangs on the filename."
                     ),
                type date)
        in
            Dated,

    Read = Table.AddColumn(Guarded, "Data", each ReadOne([Name], [Content]), type table),

    Combined = Table.Combine(Table.Column(Read, "Data")),

    // A row with no position is not a position, and a row with no workplace
    // cannot be attached to a school. Note that neither is filtered on
    // "Comm End Date" — see trap 2 above.
    Result = Table.SelectRows(Combined,
        each [Committee Position] <> "" and [Workplace Code] <> null and [Workplace Code] <> "")
in
    Result
