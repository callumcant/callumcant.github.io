// Query name: BranchView
//
// One row per branch, every figure summed up from the School view.
//
// It mirrors buildBranchLevel in js/data/rollups.js field for field, so the app
// and the workbook can be run against the same inputs and their numbers
// compared. Any difference is a bug in one of them.
//
// SchoolView is the only input. Nothing here reaches back to Stratum, GIAS or
// the Pay Dashboard, because everything they carry has already been joined,
// zeroed and reconciled once at school level. Rolling up from the sources
// instead would be a second implementation of the same joins, free to disagree
// with the first.
//
// WHAT "BRANCH" MEANS IS A SETTING — P_BranchColumn, defaulting to
// LA (borough) because that is what the app does. See the note there; it is an
// open decision, not a preference.
//
// Order of assembly:
//   1. Group the School view by the branch column
//   2. Sum membership and headcount inside the group
//   3. Reps, and the schools that have none
//   4. Meetings, and the hand-kept training figure
//   5. Branch-level notes
//   6. Densities — added LAST, after every sum
//
// Step 6 is the density rule made structural, the same way SchoolView does it.
// The division happens outside the Group By, on columns that are already sums,
// so no edit can turn a branch density into a mean of its schools' densities.
// Averaging a 10-staff school at 90% with a 200-staff school at 10% gives 50%;
// the right figure is 13.8%.
//
// Load to: the "Branch view" sheet, as a table.
let
    // ---- 1. The grouping key ----------------------------------------------
    Key = P_BranchColumn,

    // A school with no branch recorded is still a school, and hiding it would
    // quietly shrink London. It gets a named group of its own instead, which
    // reads as the data problem it is. With the default LA (borough) this never
    // fires — GIAS always has one. With "NEU branch" it collects every school
    // missing from the Stratum export.
    Filled = Table.TransformColumns(SchoolView, {
        {Key, each if _ = null or _ = "" then "(No branch recorded)" else _, type text}
    }),

    Grouped = Table.Group(Filled, {Key}, {{"Rows", each _, type table}}),
    Named = Table.RenameColumns(Grouped, {{Key, "Branch"}}),

    // ---- 2. Membership and headcount --------------------------------------
    // fnZero on every sum, because List.Sum over an all-null column returns
    // null where the app's `|| 0` gives 0 — and a null headcount and a zero
    // headcount must reach the density rule as the same thing.
    Summed = Table.AddColumn(Named, "Sums", each
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
                Reps = Total("Rep count"),
                NoRepSchools = Table.RowCount(NoRep),
                MembersNoRep = fnZero(List.Sum(Table.Column(NoRep, "Membership (total)"))),
                HeadcountNoRep = fnZero(List.Sum(Table.Column(NoRep, "Headcount (total)"))),
                // The biggest school in the branch with nobody in post. On a
                // tie the first row wins, which is what the app's reduce does —
                // it only replaces its running answer on a strictly bigger
                // school.
                Biggest =
                    let
                        Largest = List.Max(Table.Column(NoRep, "Membership (total)"))
                    in
                        if Table.RowCount(NoRep) = 0 then null
                        else Table.First(Table.SelectRows(NoRep, each [#"Membership (total)"] = Largest)),
                // ---- 4. Meetings --------------------------------------------
                Meetings = Total("Meetings logged"),
                Attendees = Total("Meeting attendees")
            ]),

    Expanded = Table.ExpandRecordColumn(Summed, "Sums",
        {"Schools", "MembersTotal", "MembersTeachers", "MembersLeadership", "MembersSupport",
         "HeadTotal", "HeadTeachers", "HeadLeadership", "HeadSupport",
         "Reps", "NoRepSchools", "MembersNoRep", "HeadcountNoRep", "Biggest",
         "Meetings", "Attendees"},
        {"Schools", "Membership (total)", "Membership (teachers)", "Membership (leadership)",
         "Membership (support)", "Headcount (total)", "Headcount (teachers)",
         "Headcount (leadership)", "Headcount (support)",
         "Rep count", "Schools with no rep", "Members in schools with no rep",
         "Headcount in schools with no rep", "Biggest",
         "Meetings logged", "Meeting attendees"}),

    BiggestName = Table.AddColumn(Expanded, "Biggest school with no rep",
        each if [Biggest] = null then null else Record.Field([Biggest], "School name"), type text),
    BiggestMembers = Table.AddColumn(BiggestName, "Members in that school",
        each if [Biggest] = null then null else Record.Field([Biggest], "Membership (total)"), type number),
    BiggestDropped = Table.RemoveColumns(BiggestMembers, {"Biggest"}),

    // ---- 3b. Rep coverage --------------------------------------------------
    // Expressed as a share rather than a count so the Branch and MAT views can
    // be read side by side. A branch with no schools at all cannot have a
    // coverage figure, hence the guard — the app's safeDiv does the same.
    Coverage = Table.AddColumn(BiggestDropped, "Rep coverage",
        each if [Schools] = 0 then null else ([Schools] - [#"Schools with no rep"]) / [Schools],
        type number),
    Ratio = Table.AddColumn(Coverage, "Rep:member ratio",
        each fnRepRatio([#"Membership (total)"], [#"Rep count"]), type text),

    // ---- 4b. The hand-kept facts ------------------------------------------
    FactsJoined = Table.NestedJoin(Ratio, {"Branch"}, Src_BranchFacts, {"Branch"}, "Facts", JoinKind.LeftOuter),
    FactsExpanded = Table.ExpandTableColumn(FactsJoined, "Facts",
        {"Is project branch?", "Reps trained since start"},
        {"Project branch flag", "Reps trained since start"}),

    // Yes/No rather than TRUE/FALSE, so a slicer button reads as a sentence.
    // A branch with no BranchFacts row is not a project branch — same as the
    // app's `|| { isProjectBranch: false }`.
    ProjectFlag = Table.AddColumn(FactsExpanded, "Is project branch",
        each if [Project branch flag] = true then "Yes" else "No", type text),
    Trained = Table.TransformColumns(ProjectFlag, {
        {"Reps trained since start", fnZero, type number}
    }),

    // ---- 5. Notes ----------------------------------------------------------
    BranchNotes = fnNotesByLevel("Branch"),
    NotesJoined = Table.NestedJoin(Trained, {"Branch"}, BranchNotes, {"Subject"}, "NoteRows", JoinKind.LeftOuter),
    NotesExpanded = Table.ExpandTableColumn(NotesJoined, "NoteRows",
        {"Notes", "Last note date", "Latest note title"}),
    NotesZeroed = Table.TransformColumns(NotesExpanded, {{"Notes", fnZero, Int64.Type}}),

    // ---- 6. Densities ------------------------------------------------------
    // Summed above, divided here. Never the other way round.
    Density = Table.AddColumn(NotesZeroed, "Density (total)",
        each fnDensity([#"Membership (total)"], [#"Headcount (total)"]), type number),
    DensityT = Table.AddColumn(Density, "Density (teachers)",
        each fnDensity([#"Membership (teachers)"], [#"Headcount (teachers)"]), type number),
    DensityL = Table.AddColumn(DensityT, "Density (leadership)",
        each fnDensity([#"Membership (leadership)"], [#"Headcount (leadership)"]), type number),
    DensityS = Table.AddColumn(DensityL, "Density (support)",
        each fnDensity([#"Membership (support)"], [#"Headcount (support)"]), type number),

    Typed = Table.AddColumn(DensityS, "Row type", each "Branch", type text),

    // ---- Rows for notes that matched no branch -----------------------------
    // A note whose Subject is spelled differently from the branch name matches
    // nothing, and would otherwise be indistinguishable from a note nobody
    // wrote. It gets a row of its own, with no schools and no figures, so it
    // shows up on the sheet as the typo it almost always is. Every numeric
    // column is blank, so no total in the workbook moves.
    KnownBranches = Table.Column(Typed, "Branch"),
    Orphans = Table.SelectRows(BranchNotes, each not List.Contains(KnownBranches, [Subject])),
    OrphanRows = Table.SelectColumns(
        Table.AddColumn(
            Table.AddColumn(
                Table.RenameColumns(Orphans, {{"Subject", "Branch"}}),
                "Row type", each "Notes only — no branch of this name", type text),
            "Schools", each 0, Int64.Type),
        {"Branch", "Row type", "Schools", "Notes", "Last note date", "Latest note title"}),

    // Table.Combine fills the columns the orphan rows do not have with null,
    // which is exactly right: they have no membership, no reps and no density,
    // and a 0 in those columns would read as a measurement.
    Combined = Table.Combine({Typed, OrphanRows}),

    // ---- Final shape -------------------------------------------------------
    Result = Table.SelectColumns(Combined, {
        "Branch", "Is project branch", "Row type", "Schools",
        // Membership and density
        "Membership (total)", "Headcount (total)", "Density (total)",
        "Membership (teachers)", "Headcount (teachers)", "Density (teachers)",
        "Membership (leadership)", "Headcount (leadership)", "Density (leadership)",
        "Membership (support)", "Headcount (support)", "Density (support)",
        // Reps. Coverage, members and headcount are all about the same set of
        // schools — the ones with nobody in post — read three ways: how many
        // schools there are, how many members are in them, and how big they are.
        "Rep count", "Rep:member ratio", "Rep coverage", "Schools with no rep",
        "Members in schools with no rep", "Headcount in schools with no rep",
        "Biggest school with no rep", "Members in that school",
        "Reps trained since start",
        // Our activity. Attendees is a FLOOR — meetings logged before the
        // column existed carry no figure at all. Report it as "at least".
        "Meetings logged", "Meeting attendees",
        "Notes", "Last note date", "Latest note title"
    })
in
    Result
