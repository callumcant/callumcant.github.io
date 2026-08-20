// Query name: Stratum_ByUrn
//
// This week's Stratum export, attached to schools: one row per URN, with
// headcount, membership and reps summed.
//
// THE ORDER OF THESE STEPS IS THE POINT. Group by URN and sum BEFORE joining to
// the school, so that several workplace codes landing on one school merge into
// it rather than duplicating it. A left join first and a group afterwards would
// silently double a school with two codes — its members, its headcount, and its
// weight in every borough and trust total.
//
// The summing here is across DIFFERENT workplace codes that belong to the same
// school, which is right: they are different bits of one workforce. Repeated
// rows for a single code were already collapsed upstream in Src_StratumHistory,
// where summing them would have been wrong. The two steps look alike and do
// opposite things on purpose.
//
// Rows whose workplace code has no URN are dropped, not zeroed. They are
// membership data that cannot be attached to a school, and they belong on the
// Anomalies sheet where someone can link them, not quietly inside a total.
//
// Load to: connection only.
let
    Source = Src_Stratum,

    // 1. Workplace code to URN. Inner join: no mapping, no row.
    //    NestedJoin then expand, rather than Table.Join, because both sides
    //    have a Workplace code column and Table.Join refuses to return two
    //    columns of the same name.
    Matched = Table.NestedJoin(Source, {"Workplace code"}, Rec_UrnByWorkplaceCode, {"Workplace code"}, "Map", JoinKind.Inner),
    Mapped = Table.ExpandTableColumn(Matched, "Map", {"URN"}, {"URN"}),

    // 1b. Rep counts, from whatever Src_RepCounts is currently reading. Joined
    //     on workplace code and BEFORE the grouping, so a school with several
    //     codes has its reps summed by the same step that sums its members.
    RepsJoined = Table.NestedJoin(Mapped, {"Workplace code"}, Src_RepCounts, {"Workplace code"}, "Reps", JoinKind.LeftOuter),
    WithReps = Table.ExpandTableColumn(RepsJoined, "Reps",
        {"Rep count", "Reps (workplace)", "Reps (health & safety)", "Reps (equality)",
         "Reps (learning)", "Reps (green)", "Ballot volunteers",
         "Other activist positions", "Activists (people)"},
        {"Reps counted", "Reps (workplace)", "Reps (health & safety)", "Reps (equality)",
         "Reps (learning)", "Reps (green)", "Ballot volunteers",
         "Other activist positions", "Activists (people)"}),

    // 2. Members follow a closed school to its successor, where that decision
    //    has been recorded. Done before the grouping so two predecessors can
    //    feed one successor and their figures add together.
    WithSuccessor = Table.NestedJoin(WithReps, {"URN"}, Rec_Successors, {"From URN"}, "Successor", JoinKind.LeftOuter),
    Successor = Table.ExpandTableColumn(WithSuccessor, "Successor", {"To URN"}, {"To URN"}),
    Redirected = Table.AddColumn(Successor, "School URN",
        each if [To URN] = null then [URN] else [To URN], Int64.Type),

    // 3. Sum. Every count goes through fnZero so that an all-blank column
    //    reaches the density rule as 0 rather than as null.
    Grouped = Table.Group(Redirected, {"School URN"}, {
        {"Workplace code", each Table.First(_)[Workplace code], type text},
        {"Headcount (total)", each fnZero(List.Sum(Table.Column(_, "Headcount (total)"))), type number},
        {"Headcount (teachers)", each fnZero(List.Sum(Table.Column(_, "Headcount (teachers)"))), type number},
        {"Headcount (leadership)", each fnZero(List.Sum(Table.Column(_, "Headcount (leadership)"))), type number},
        {"Headcount (support)", each fnZero(List.Sum(Table.Column(_, "Headcount (support)"))), type number},
        {"Membership (total)", each fnZero(List.Sum(Table.Column(_, "Membership (total)"))), type number},
        {"Membership (teachers)", each fnZero(List.Sum(Table.Column(_, "Membership (teachers)"))), type number},
        {"Membership (leadership)", each fnZero(List.Sum(Table.Column(_, "Membership (leadership)"))), type number},
        {"Membership (support)", each fnZero(List.Sum(Table.Column(_, "Membership (support)"))), type number},

        // Trainee members are counted separately by Stratum. Whether they are
        // already inside Count of Members is not documented anywhere we can
        // see, and it changes the total membership figure — so they are carried
        // through unused for now, and the Anomalies sheet gets a check on
        // whether the four staff groups add up to the total.
        {"Trainee members (employed)", each fnZero(List.Sum(Table.Column(_, "Trainee members (employed)"))), type number},
        {"Trainee members (not employed)", each fnZero(List.Sum(Table.Column(_, "Trainee members (not employed)"))), type number},

        // Census breakdowns of the support workforce. Taken to mean what their
        // names suggest; carried, not yet used anywhere.
        {"Headcount (teaching assistants)", each fnZero(List.Sum(Table.Column(_, "Headcount (teaching assistants)"))), type number},
        {"Headcount (non-classroom support)", each fnZero(List.Sum(Table.Column(_, "Headcount (non-classroom support)"))), type number},
        {"Headcount (auxiliary)", each fnZero(List.Sum(Table.Column(_, "Headcount (auxiliary)"))), type number},

        // Reps. A school with two workplace codes has a rep if either code
        // does, and its reps add up.
        //
        // "Reps counted" stays null when no source has a figure for this school
        // — which is not the same as zero reps, and must not become one. The
        // fallback happens below, where it can be labelled.
        {"Has rep", each List.AnyTrue(Table.Column(_, "Has rep")), type logical},
        {"Reps counted", each
            let
                Values = List.RemoveNulls(Table.Column(_, "Reps counted"))
            in
                if List.IsEmpty(Values) then null else List.Sum(Values),
            type number},

        // The breakdown by rep type. These are counts of POSITIONS; a member
        // holding three of them appears in three of these columns and once in
        // "Activists (people)", so the columns do not add up to the people
        // figure and must not be summed to make one.
        {"Reps (workplace)", each fnZero(List.Sum(Table.Column(_, "Reps (workplace)"))), Int64.Type},
        {"Reps (health & safety)", each fnZero(List.Sum(Table.Column(_, "Reps (health & safety)"))), Int64.Type},
        {"Reps (equality)", each fnZero(List.Sum(Table.Column(_, "Reps (equality)"))), Int64.Type},
        {"Reps (learning)", each fnZero(List.Sum(Table.Column(_, "Reps (learning)"))), Int64.Type},
        {"Reps (green)", each fnZero(List.Sum(Table.Column(_, "Reps (green)"))), Int64.Type},
        {"Ballot volunteers", each fnZero(List.Sum(Table.Column(_, "Ballot volunteers"))), Int64.Type},
        {"Other activist positions", each fnZero(List.Sum(Table.Column(_, "Other activist positions"))), Int64.Type},
        {"Activists (people)", each fnZero(List.Sum(Table.Column(_, "Activists (people)"))), Int64.Type},

        {"NEU branch", each Table.First(_)[NEU branch], type text},

        // Codes merged into one school can in principle carry different dates.
        // The first is taken, and they are the same date in practice because a
        // week is one file.
        {"Stratum export date", each Table.First(_)[Snapshot date], type date},

        // Both kept for the Anomalies sheet: more than one code on a school is
        // worth a look even though summing them is usually right, and anything
        // other than one row per code means the export has changed shape.
        {"Workplace codes merged", each Table.RowCount(_), Int64.Type},
        {"Rows in export", each fnZero(List.Sum(Table.Column(_, "Rows in export"))), Int64.Type}
    }),

    Named = Table.RenameColumns(Grouped, {{"School URN", "URN"}}),

    // 4. The rep count, and how good it is.
    //
    // The counted figure from the activists export is used wherever there is
    // one. Where there is not, the workplace totals export's Yes/No flag gives
    // a FLOOR of 1 or 0 — because a school the union says has a rep is nearer
    // to 1 than to blank, and blanking it would drop it out of every total and
    // understate the region.
    //
    // The two sources disagreeing is normal rather than alarming: they are
    // different exports taken at different moments, and a rep whose position
    // was recorded after the flag was set shows up in one and not the other.
    //
    // "Rep count basis" is what keeps that honest. It travels with the number
    // all the way to the School view, so a rep:member ratio can say what it is
    // built on, and so you can see at a glance how much of London the activists
    // export actually covers.
    Counted = Table.AddColumn(Named, "Rep count",
        each if [Reps counted] <> null then [Reps counted]
             else if [Has rep] = true then 1
             else 0,
        type number),

    // Four states, not three. The extra one is worth having: a school the
    // totals export flags as having a rep, where the activists export records
    // no rep position, is a real organising signal — someone is acting as the
    // rep without the position being on the system. It is also exactly the case
    // that would otherwise hide inside a bare "Counted".
    Basis = Table.AddColumn(Counted, "Rep count basis",
        each if [Reps counted] <> null and [Reps counted] > 0 then "Counted"
             else if [Reps counted] <> null and [Has rep] = true then "Flagged, but no rep position recorded"
             else if [Reps counted] <> null then "None"
             else if [Has rep] = true then "At least one (flag only)"
             else "None reported",
        type text),

    Result = Table.RemoveColumns(Basis, {"Reps counted"})
in
    Result
