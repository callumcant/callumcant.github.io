// Query name: MatView
//
// One row per trust, every figure summed up from the School view.
//
// It mirrors buildMatLevel in js/data/rollups.js field for field, so the app
// and the workbook can be run against the same inputs and their numbers
// compared. Any difference is a bug in one of them. Two columns have no app
// equivalent and add no number of their own — "Number of boroughs", which just
// counts the list in "Boroughs present", and "Rep committee basis", which says
// which of the two sources answered.
//
// SchoolView is the only input, for the same reason as the Branch view: the
// joins have already been done once, at school level, and doing them again here
// would be a second implementation free to disagree with the first.
//
// GROUPED ON "Trust (MAT)", THE CANONICAL NAME — the one SchoolView has already
// folded the source spellings into via MatAliases. Grouping on "Trust as
// sourced" instead would split Compass Eko into three trusts with a third of
// its schools each, and give each of the three its own density.
//
// Order of assembly:
//   1. Group the School view by trust, dropping schools that have none
//   2. Sum membership and headcount inside the group
//   3. Reps, and the schools that have none
//   4. Where the trust is, and what phases it covers
//   5. The rep committee, and the hand-kept target flag
//   6. MAT-level notes
//   7. Densities — added LAST, after every sum
//
// Step 7 is the density rule made structural, the same way SchoolView and
// BranchView do it. The division happens outside the Group By, on columns that
// are already sums, so no edit can turn a trust density into a mean of its
// schools' densities.
//
// Load to: the "MAT view" sheet, as a table.
let
    // ---- 1. The spine ------------------------------------------------------
    // A maintained school belongs to no trust, and there is no useful row to
    // give it here — the app skips it too (`if (!s.trust) continue`). Those
    // schools are not lost: every one of them is on the School view and counted
    // on the Branch view. This sheet is about trusts, and they are not in one.
    InTrust = Table.SelectRows(SchoolView, each [#"Trust (MAT)"] <> null and [#"Trust (MAT)"] <> ""),

    Grouped = Table.Group(InTrust, {"Trust (MAT)"}, {{"Rows", each _, type table}}),

    // ---- 2. Membership and headcount --------------------------------------
    // fnZero on every sum — List.Sum over an all-null column returns null where
    // the app's `|| 0` gives 0, and the density rule must see those as the same.
    Summed = Table.AddColumn(Grouped, "Sums", each
        let
            R = [Rows],
            Total = (col as text) as number => fnZero(List.Sum(Table.Column(R, col))),
            NoRep = Table.SelectRows(R, each [#"Rep count"] = 0)
        in
            [
                Schools = Table.RowCount(R),
                MembersTotal = Total("Membership (total)"),
                MembersTeachers = Total("Membership (teachers)"),
                MembersLeadership = Total("Membership (leadership)"),
                MembersSupport = Total("Membership (support)"),
                HeadTotal = Total("Headcount (total)"),
                HeadTeachers = Total("Headcount (teachers)"),
                HeadLeadership = Total("Headcount (leadership)"),
                HeadSupport = Total("Headcount (support)"),
                // ---- 3. Reps ------------------------------------------------
                // The Branch view also names the biggest school with no rep and
                // totals their headcount; this one does not. That asymmetry is
                // the app's, kept so the two can be compared field for field.
                // Add it to both or neither.
                Reps = Total("Rep count"),
                NoRepSchools = Table.RowCount(NoRep),
                MembersNoRep = fnZero(List.Sum(Table.Column(NoRep, "Membership (total)"))),
                // ---- 4. Where it is -----------------------------------------
                // Sorted and comma-joined, so the column is readable and sorts
                // the same way in the workbook as the app's sorted array reads.
                // A trust spanning eight boroughs is a different organising
                // problem from one sitting inside a single branch, and this is
                // the column that says which you are looking at.
                Boroughs = Text.Combine(
                    List.Sort(List.Distinct(List.RemoveNulls(Table.Column(R, "LA (borough)")))), ", "),
                Phases = Text.Combine(
                    List.Sort(List.Distinct(List.RemoveNulls(Table.Column(R, "Phase")))), ", "),
                BoroughCount = List.Count(List.Distinct(List.RemoveNulls(Table.Column(R, "LA (borough)")))),
                Meetings = Total("Meetings logged"),
                Attendees = Total("Meeting attendees")
            ]),

    Expanded = Table.ExpandRecordColumn(Summed, "Sums",
        {"Schools", "MembersTotal", "MembersTeachers", "MembersLeadership", "MembersSupport",
         "HeadTotal", "HeadTeachers", "HeadLeadership", "HeadSupport",
         "Reps", "NoRepSchools", "MembersNoRep",
         "Boroughs", "Phases", "BoroughCount", "Meetings", "Attendees"},
        {"Schools", "Membership (total)", "Membership (teachers)", "Membership (leadership)",
         "Membership (support)", "Headcount (total)", "Headcount (teachers)",
         "Headcount (leadership)", "Headcount (support)",
         "Rep count", "Schools with no rep", "Members in schools with no rep",
         "Boroughs present", "Phases present", "Number of boroughs", "Meetings logged", "Meeting attendees"}),

    // ---- 3b. Rep coverage --------------------------------------------------
    // The same share as the Branch view, worked out the same way, so a trust and
    // a borough can be read against each other without converting anything.
    Coverage = Table.AddColumn(Expanded, "Rep coverage",
        each if [Schools] = 0 then null else ([Schools] - [#"Schools with no rep"]) / [Schools],
        type number),
    Ratio = Table.AddColumn(Coverage, "Rep:member ratio",
        each fnRepRatio([#"Membership (total)"], [#"Rep count"]), type text),

    // ---- 5. The committee, and the target flag -----------------------------
    FactsJoined = Table.NestedJoin(Ratio, {"Trust (MAT)"}, Src_MatFacts, {"MAT"}, "Facts", JoinKind.LeftOuter),
    FactsExpanded = Table.ExpandTableColumn(FactsJoined, "Facts",
        {"Is target MAT?", "Rep committee exists?"},
        {"Target MAT flag", "Committee fallback"}),

    CommitteeJoined = Table.NestedJoin(FactsExpanded, {"Trust (MAT)"}, Committee_ByMat, {"MAT"}, "Committee", JoinKind.LeftOuter),
    CommitteeExpanded = Table.ExpandTableColumn(CommitteeJoined, "Committee",
        {"Committee exists", "Committee since", "Committee logged by", "Committee reported"}),

    TargetFlag = Table.AddColumn(CommitteeExpanded, "Is target MAT",
        each if [Target MAT flag] = true then "Yes" else "No", type text),

    // The logged report wins over the typed fallback, because it carries a date
    // and an author and the fallback carries neither. A trust nobody has
    // reported on falls back to MatFacts; a trust in neither reads No.
    HasCommittee = Table.AddColumn(TargetFlag, "Rep committee",
        each if [Committee reported] = true then (if [Committee exists] = true then "Yes" else "No")
        else (if [Committee fallback] = true then "Yes" else "No"), type text),

    // Which of the two answered. Without this column a "Yes" from a dated report
    // and a "Yes" somebody typed into Lookups.xlsx a year ago look identical,
    // and only one of them can be checked.
    CommitteeBasis = Table.AddColumn(HasCommittee, "Rep committee basis",
        each if [Committee reported] = true then "Reported" else "Not reported — from MatFacts", type text),

    CommitteeSince = Table.RenameColumns(CommitteeBasis, {{"Committee since", "Rep committee since"}}),

    // ---- 6. Notes ----------------------------------------------------------
    MatNotes = fnNotesByLevel("MAT"),
    NotesJoined = Table.NestedJoin(CommitteeSince, {"Trust (MAT)"}, MatNotes, {"Subject"}, "NoteRows", JoinKind.LeftOuter),
    NotesExpanded = Table.ExpandTableColumn(NotesJoined, "NoteRows",
        {"Notes", "Last note date", "Latest note title"}),
    NotesZeroed = Table.TransformColumns(NotesExpanded, {{"Notes", fnZero, Int64.Type}}),

    // ---- 7. Densities ------------------------------------------------------
    // Summed above, divided here. Never the other way round.
    Density = Table.AddColumn(NotesZeroed, "Density (total)",
        each fnDensity([#"Membership (total)"], [#"Headcount (total)"]), type number),
    DensityT = Table.AddColumn(Density, "Density (teachers)",
        each fnDensity([#"Membership (teachers)"], [#"Headcount (teachers)"]), type number),
    DensityL = Table.AddColumn(DensityT, "Density (leadership)",
        each fnDensity([#"Membership (leadership)"], [#"Headcount (leadership)"]), type number),
    DensityS = Table.AddColumn(DensityL, "Density (support)",
        each fnDensity([#"Membership (support)"], [#"Headcount (support)"]), type number),

    Typed = Table.AddColumn(DensityS, "Row type", each "MAT", type text),

    // ---- Rows for notes that matched no trust ------------------------------
    // Same as the Branch view, and more likely to fire here: trust names are
    // long, and MatAliases only folds the spellings that appear in the source
    // data, not the ones an organiser types into the field log. A note against
    // "Harris Fed" matches nothing and would otherwise vanish. It gets a row
    // with no schools and no figures instead, so somebody can fix the spelling
    // or add the alias.
    KnownTrusts = Table.Column(Typed, "Trust (MAT)"),
    Orphans = Table.SelectRows(MatNotes, each not List.Contains(KnownTrusts, [Subject])),
    OrphanRows = Table.SelectColumns(
        Table.AddColumn(
            Table.AddColumn(
                Table.RenameColumns(Orphans, {{"Subject", "Trust (MAT)"}}),
                "Row type", each "Notes only — no trust of this name", type text),
            "Schools", each 0, Int64.Type),
        {"Trust (MAT)", "Row type", "Schools", "Notes", "Last note date", "Latest note title"}),

    // Table.Combine leaves every column the orphan rows lack as null, which is
    // right: they have no membership, no reps and no density, and a 0 there
    // would read as a measurement.
    Combined = Table.Combine({Typed, OrphanRows}),

    // ---- Final shape -------------------------------------------------------
    Result = Table.SelectColumns(Combined, {
        "Trust (MAT)", "Is target MAT", "Row type", "Schools", "Number of boroughs",
        "Boroughs present", "Phases present",
        // Membership and density
        "Membership (total)", "Headcount (total)", "Density (total)",
        "Membership (teachers)", "Headcount (teachers)", "Density (teachers)",
        "Membership (leadership)", "Headcount (leadership)", "Density (leadership)",
        "Membership (support)", "Headcount (support)", "Density (support)",
        // Reps
        "Rep count", "Rep:member ratio", "Rep coverage", "Schools with no rep",
        "Members in schools with no rep",
        // The committee. "Since" is the date it started or stopped existing,
        // not the date it was typed in.
        "Rep committee", "Rep committee since", "Rep committee basis",
        "Committee logged by",
        // Our activity. Attendees is a FLOOR — meetings logged before the
        // column existed carry no figure at all. Report it as "at least".
        "Meetings logged", "Meeting attendees",
        "Notes", "Last note date", "Latest note title"
    })
in
    Result
