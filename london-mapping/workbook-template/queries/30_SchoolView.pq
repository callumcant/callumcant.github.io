// Query name: SchoolView
//
// One row per school in London, every source joined onto it. This is the bulk
// of the workbook: the Branch view, the MAT view, the dashboard, the exceptions
// band and the quadrant chart all read this and nothing else.
//
// It mirrors buildSchoolLevel in js/data/rollups.js step for step, so that the
// app and the workbook can be run against the same inputs and their numbers
// compared. Any difference is a bug in one of them.
//
// Order of assembly:
//   1. GIAS as the spine, minus anything excluded by a recorded decision
//   2. Stratum, already grouped by URN and summed  (Stratum_ByUrn)
//   3. Pay Dashboard, likewise                     (Pay_ByUrn)
//   4. Workforce survey, joined on URN directly
//   5. Trust name folded through the alias table
//   6. Meetings, notes and disputes counted per school
//   7. Densities — added LAST, after every sum
//   8. The two quadrant columns
//
// Step 7 is the density rule made structural. Membership and headcount are
// summed upstream, in Stratum_ByUrn and again in the Branch and MAT views, and
// the division only ever happens afterwards on the summed columns. There is no
// step at which a density could be averaged, because at the point densities
// exist the summing is already done.
//
// Load to: the "School view" sheet, as a table.
let
    // ---- 1. The spine -----------------------------------------------------
    // Anti-join: keep the schools that are NOT in the exclusion list.
    Excluded = Table.NestedJoin(Src_GIAS, {"URN"}, Rec_Excluded, {"URN"}, "Excluded", JoinKind.LeftAnti),
    Spine = Table.RemoveColumns(Excluded, {"Excluded"}),

    // ---- 5. The trust name ------------------------------------------------
    // Done early so it is available as a grouping key everywhere below.
    Sourced = Table.RenameColumns(Spine, {{"Trusts (MAT)", "Trust as sourced"}}),
    TrustTrimmed = Table.TransformColumns(Sourced,
        {{"Trust as sourced", each if _ = null then "" else Text.Trim(Text.From(_)), type text}}),
    TrustKeyed = Table.AddColumn(TrustTrimmed, "Trust key", each Text.Lower([Trust as sourced]), type text),
    AliasJoined = Table.NestedJoin(TrustKeyed, {"Trust key"}, Src_MatAliases, {"Alias key"}, "Alias", JoinKind.LeftOuter),
    AliasExpanded = Table.ExpandTableColumn(AliasJoined, "Alias", {"Canonical MAT"}, {"Canonical MAT"}),
    Trusted = Table.AddColumn(AliasExpanded, "Trust (MAT)",
        each if [Canonical MAT] <> null and [Canonical MAT] <> "" then [Canonical MAT] else [Trust as sourced],
        type text),

    // ---- 2. Stratum -------------------------------------------------------
    StratumJoined = Table.NestedJoin(Trusted, {"URN"}, Stratum_ByUrn, {"URN"}, "Stratum", JoinKind.LeftOuter),
    StratumExpanded = Table.ExpandTableColumn(StratumJoined, "Stratum",
        {"Workplace code", "Headcount (total)", "Headcount (teachers)", "Headcount (leadership)",
         "Headcount (support)", "Membership (total)", "Membership (teachers)",
         "Membership (leadership)", "Membership (support)", "Has rep", "Rep count", "Rep count basis",
         "Reps (workplace)", "Reps (health & safety)", "Reps (equality)",
         "Reps (learning)", "Reps (green)", "Ballot volunteers",
         "Other activist positions", "Activists (people)",
         "NEU branch", "Trainee members (employed)", "Trainee members (not employed)",
         "Headcount (teaching assistants)", "Headcount (non-classroom support)",
         "Headcount (auxiliary)", "Stratum export date",
         "Workplace codes merged", "Rows in export"},
        {"Workplace code", "Headcount (total)", "Headcount (teachers)", "Headcount (leadership)",
         "Headcount (support)", "Membership (total)", "Membership (teachers)",
         "Membership (leadership)", "Membership (support)", "Has rep flag", "Rep count", "Rep count basis",
         "Reps (workplace)", "Reps (health & safety)", "Reps (equality)",
         "Reps (learning)", "Reps (green)", "Ballot volunteers",
         "Other activist positions", "Activists (people)",
         "NEU branch", "Trainee members (employed)", "Trainee members (not employed)",
         "Headcount (teaching assistants)", "Headcount (non-classroom support)",
         "Headcount (auxiliary)", "Stratum export date",
         "Workplace codes merged", "Rows in export"}),

    // A school with no Stratum row reads as zero members and zero headcount,
    // the same as the app, and as having no rep. Worth knowing what that means:
    // "missing from the export" and "genuinely has no rep" are
    // indistinguishable here. Such a school also shows zero membership and no
    // density, so it is visibly broken by other means — but the rep column
    // alone does not say so. The Anomalies sheet is where it gets named.
    Zeroed = Table.TransformColumns(StratumExpanded, {
        {"Headcount (total)", fnZero, type number},
        {"Headcount (teachers)", fnZero, type number},
        {"Headcount (leadership)", fnZero, type number},
        {"Headcount (support)", fnZero, type number},
        {"Membership (total)", fnZero, type number},
        {"Membership (teachers)", fnZero, type number},
        {"Membership (leadership)", fnZero, type number},
        {"Membership (support)", fnZero, type number},
        {"Rep count", fnZero, type number},
        {"Reps (workplace)", fnZero, Int64.Type},
        {"Reps (health & safety)", fnZero, Int64.Type},
        {"Reps (equality)", fnZero, Int64.Type},
        {"Reps (learning)", fnZero, Int64.Type},
        {"Reps (green)", fnZero, Int64.Type},
        {"Ballot volunteers", fnZero, Int64.Type},
        {"Other activist positions", fnZero, Int64.Type},
        {"Activists (people)", fnZero, Int64.Type},
        {"Trainee members (employed)", fnZero, type number},
        {"Trainee members (not employed)", fnZero, type number},
        {"Headcount (teaching assistants)", fnZero, type number},
        {"Headcount (non-classroom support)", fnZero, type number},
        {"Headcount (auxiliary)", fnZero, type number}
    }),

    // ---- 3. Pay Dashboard -------------------------------------------------
    PayJoined = Table.NestedJoin(Zeroed, {"URN"}, Pay_ByUrn, {"URN"}, "Pay", JoinKind.LeftOuter),
    PayExpanded = Table.ExpandTableColumn(PayJoined, "Pay",
        {"Members voted (2026 indicative)", "Members voted (2025 indicative)",
         "Members voted (2024 indicative)", "Turnout (2026 indicative)",
         "SEVs", "WP conversations", "Active SEVs", "Reps recruited by a SEV",
         "Joined community", "Completed activate action", "Agreed to briefing",
         "Hold a meeting", "Needs support", "Pledged to vote",
         "Branch name", "District name", "Region name", "Import date"}),

    // Activity counts default to zero; ballot figures stay blank.
    //
    // The distinction matters and is the app's. A school with no Pay Dashboard
    // row has held no WP conversations, so 0 is true. Its turnout is not 0% —
    // it is unknown, and printing 0% would put it at the bottom of every sort
    // and drag any average down. Blank also keeps it off the quadrant chart,
    // which is the honest place for a school nobody has ballot data for.
    PayZeroed = Table.TransformColumns(PayExpanded, {
        {"SEVs", fnZero, type number},
        {"WP conversations", fnZero, type number},
        {"Active SEVs", fnZero, type number},
        {"Reps recruited by a SEV", fnZero, type number},
        {"Joined community", fnZero, type number},
        {"Completed activate action", fnZero, type number},
        {"Agreed to briefing", fnZero, type number},
        {"Hold a meeting", fnZero, type number},
        {"Needs support", fnZero, type number},
        {"Pledged to vote", fnZero, type number}
    }),

    // ---- 4. Workforce survey ----------------------------------------------
    SurveyJoined = Table.NestedJoin(PayZeroed, {"URN"}, Src_WorkforceSurvey, {"URN"}, "Survey", JoinKind.LeftOuter),
    SurveyExpanded = Table.ExpandTableColumn(SurveyJoined, "Survey",
        {"Headcount (third party)", "Annual turnover (total)", "Pupil:teacher ratio (qualified)",
         "Average mean pay", "Vacancies", "Average sick days", "School type",
         "All teachers", "Classroom teachers", "Leadership teachers",
         "All support staff", "Teaching assistants"}),

    // ---- 6. Meetings, notes, disputes -------------------------------------
    MeetingsJoined = Table.NestedJoin(SurveyExpanded, {"URN"}, Meetings_ByUrn, {"URN"}, "Meetings", JoinKind.LeftOuter),
    MeetingsExpanded = Table.ExpandTableColumn(MeetingsJoined, "Meetings",
        {"Meetings logged", "Meeting attendees", "Last meeting date"}),

    NotesJoined = Table.NestedJoin(MeetingsExpanded, {"URN"}, Notes_BySchool, {"URN"}, "NoteRows", JoinKind.LeftOuter),
    NotesExpanded = Table.ExpandTableColumn(NotesJoined, "NoteRows",
        {"Notes", "Last note date", "Latest note title"}),

    DisputesJoined = Table.NestedJoin(NotesExpanded, {"URN"}, Disputes_ByUrn, {"URN"}, "DisputeRows", JoinKind.LeftOuter),
    DisputesExpanded = Table.ExpandTableColumn(DisputesJoined, "DisputeRows",
        {"Disputes", "In live dispute"}, {"Disputes", "Live dispute flag"}),

    ActivityZeroed = Table.TransformColumns(DisputesExpanded, {
        {"Meetings logged", fnZero, Int64.Type},
        {"Meeting attendees", fnZero, type number},
        {"Notes", fnZero, Int64.Type},
        {"Disputes", fnZero, Int64.Type}
    }),

    // ---- 7. Densities -----------------------------------------------------
    // Every one of these divides a summed membership by a summed headcount. See
    // the note at the top, and the one in fnDensity.
    Density = Table.AddColumn(ActivityZeroed, "Density (total)",
        each fnDensity([#"Membership (total)"], [#"Headcount (total)"]), type number),
    DensityT = Table.AddColumn(Density, "Density (teachers)",
        each fnDensity([#"Membership (teachers)"], [#"Headcount (teachers)"]), type number),
    DensityL = Table.AddColumn(DensityT, "Density (leadership)",
        each fnDensity([#"Membership (leadership)"], [#"Headcount (leadership)"]), type number),
    DensityS = Table.AddColumn(DensityL, "Density (support)",
        each fnDensity([#"Membership (support)"], [#"Headcount (support)"]), type number),

    // Yes/No rather than TRUE/FALSE because slicers show the value as typed,
    // and "Has rep: Yes" reads better on a filter button than "TRUE".
    //
    // This follows Rep count and nothing else, so the two columns can never
    // contradict each other on the sheet — "Has rep: Yes" beside "Rep count: 0"
    // reads as a bug whatever the footnote says.
    //
    // That is not the same as ignoring the flag. Rep count already gives way to
    // the flag wherever the activists export has nothing for a school, so a
    // flagged school with no position record still counts as 1 and reads Yes.
    // The one case that reads No against the flag is a school the activists
    // export DOES cover and records no rep position for. There the position
    // record is the better evidence, and "Rep count basis" names the
    // disagreement rather than burying it — it is worth an organiser's
    // attention, not a silent 1.
    //
    // A school with no Stratum row at all reads as No, which is
    // indistinguishable from "missing from the export", exactly as in the app.
    // It also shows zero membership and no density, so it is visibly broken by
    // other means — but the rep column alone does not say so.
    HasRep = Table.AddColumn(DensityS, "Has rep",
        each if [#"Rep count"] > 0 then "Yes" else "No", type text),

    // A school missing from Stratum entirely has no basis either. Filled in so
    // the column never has a blank that has to be interpreted.
    RepBasis = Table.TransformColumns(HasRep, {
        {"Rep count basis", each if _ = null then "None reported" else _, type text}
    }),
    InDispute = Table.AddColumn(RepBasis, "In live dispute",
        each if [#"Live dispute flag"] = true then "Yes" else "No", type text),

    // ---- 8. The quadrant columns ------------------------------------------
    // Both peer groups, side by side. A school can be Strong in its borough and
    // Cold in its trust; that is real, and showing one at a time hides it.
    QuadrantBranch = fnAddQuadrant(InDispute, "LA (borough)", "Quadrant (vs branch)"),
    QuadrantMat = fnAddQuadrant(QuadrantBranch, "Trust (MAT)", "Quadrant (vs MAT)"),

    // ---- Final shape ------------------------------------------------------
    // Explicit and ordered, so the sheet does not reshuffle itself when a
    // source gains a column. Column grouping on the sheet follows these blocks.
    Result = Table.SelectColumns(QuadrantMat, {
        // Identity
        "URN", "School name", "Type of establishment", "Phase", "LA (borough)",
        "NEU branch", "Establishment status", "Trust (MAT)", "Trust as sourced",
        // Membership and density
        "Membership (total)", "Headcount (total)", "Density (total)",
        "Membership (teachers)", "Headcount (teachers)", "Density (teachers)",
        "Membership (leadership)", "Headcount (leadership)", "Density (leadership)",
        "Membership (support)", "Headcount (support)", "Density (support)",
        "Trainee members (employed)", "Trainee members (not employed)",
        // Reps. "Rep count basis" says where each school's figure came from:
        // a counted source, or Stratum's flag standing in as a floor of 1.
        // Keep it next to the count — a rep:member ratio needs to be able to
        // say what it is built on. Src_RepCounts is where the source is set.
        "Has rep", "Rep count", "Rep count basis",
        "Reps (workplace)", "Reps (health & safety)", "Reps (equality)",
        "Reps (learning)", "Reps (green)",
        // Activists who are not reps. "Ballot volunteers" is the WBV position
        // in the membership database and is NOT the same thing as "SEVs"
        // below, which comes from the ballot export. Never merge the two.
        "Ballot volunteers", "Other activist positions", "Activists (people)",
        // Ballots and engagement
        "Turnout (2026 indicative)", "Members voted (2026 indicative)",
        "Members voted (2025 indicative)", "Members voted (2024 indicative)",
        "SEVs", "WP conversations", "Active SEVs", "Reps recruited by a SEV",
        "Joined community", "Completed activate action", "Agreed to briefing",
        "Hold a meeting", "Needs support", "Pledged to vote",
        // Organising quadrant
        "Quadrant (vs branch)", "Quadrant (vs MAT)",
        // Our activity
        "Meetings logged", "Meeting attendees", "Last meeting date",
        "Notes", "Last note date", "Latest note title",
        "Disputes", "In live dispute",
        // Workforce survey
        "Headcount (third party)", "Annual turnover (total)",
        "Pupil:teacher ratio (qualified)", "Average mean pay", "Vacancies",
        "Average sick days", "School type", "All teachers", "Classroom teachers",
        "Leadership teachers", "All support staff", "Teaching assistants",
        // Stratum's own census breakdown of the support workforce — a second
        // opinion on the survey's figures above, from a different source
        "Headcount (teaching assistants)", "Headcount (non-classroom support)",
        "Headcount (auxiliary)",
        // Contact and admin
        "Head teacher", "Postcode", "Telephone", "School website",
        "Religious character", "Diocese", "School sponsors", "Federations",
        "Branch name", "District name", "Region name",
        // Provenance — which export each row came from, and how many workplace
        // codes were merged to make it
        "Workplace code", "Workplace codes merged", "Rows in export",
        "Stratum export date", "Import date"
    })
in
    Result
