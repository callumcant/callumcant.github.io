// Query name: Anomalies
//
// Everything that doesn't line up, in one list: workplace codes with no school,
// schools in one source and not another, members at a school GIAS says closed,
// weeks missing from the folder, notes filed against a name nothing has.
//
// Roughly 5–10% of schools don't match cleanly across GIAS, Stratum and the Pay
// Dashboard. That is normal and permanent — three systems, three sets of
// keys, updated on three different cadences. What is not acceptable is not
// knowing which 5%, because every one of them is membership sitting outside a
// total that still looks complete.
//
// THE DESIGN POINT, and it carries over from the app unchanged: detection is
// recomputed from the current data on every refresh, but DECISIONS ARE STORED.
// Cleaning an export fixes a problem once, until next week's export arrives
// with the same problem in it. Recording "this workplace code belongs to that
// school" on the Reconciliations sheet fixes it for every refresh from now on,
// and the row disappears from here.
//
// A row leaves this sheet when any decision — link, successor, exclude or plain
// accept — is recorded against its "Anomaly type" and "Key" pair. That is the
// same rule as detectAnomalies in js/data/reconcile.js, and it is why the slugs
// in Anomaly_Types must not be edited: they are the join key between a decision
// and the thing it decided.
//
// The first six kinds mirror the app's six. The rest the workbook found on its
// own, mostly because it reads the export files directly and the app only ever
// saw what had already been loaded.
//
// ONE DELIBERATE DIFFERENCE FROM THE APP, in "Members at a closed school": the
// app looks only at the FIRST workplace code on the school, so a closed school
// whose first code carries 0 members and whose second carries 50 is missed
// entirely. This sums the codes, and catches it. Worth fixing in the app rather
// than matching here.
//
// Load to: the "Anomalies" sheet, as a table.
let
    // ---- Shared ground -----------------------------------------------------
    Gias = Table.Buffer(Src_GIAS),
    Map = Table.Buffer(Rec_UrnByWorkplaceCode),
    Stratum = Table.Buffer(Src_Stratum),

    // Every anomaly is this shape. Name is what a person recognises the thing
    // by; Key is what a decision gets recorded against, and the two are
    // different on purpose — a school's name changes, its URN does not.
    Row = (kind as text, key as text, name as text, detail as text, members as nullable number) as record =>
        [#"Anomaly type" = kind, Key = key, Name = name, Detail = detail, Members = members],

    MappedCodes = List.Buffer(Table.Column(Map, "Workplace code")),
    GiasUrns = List.Buffer(Table.Column(Gias, "URN")),

    // The URNs Stratum data actually reaches, and how many members reach each.
    // Summed across codes, because a school with two codes has both.
    StratumMatched = Table.NestedJoin(Stratum, {"Workplace code"}, Map, {"Workplace code"}, "M", JoinKind.Inner),
    StratumMapped = Table.ExpandTableColumn(StratumMatched, "M", {"URN"}, {"URN"}),
    StratumByUrn = Table.Buffer(Table.Group(StratumMapped, {"URN"}, {
        {"Members", each fnZero(List.Sum(Table.Column(_, "Membership (total)"))), type number}
    })),
    StratumUrns = List.Buffer(Table.Column(StratumByUrn, "URN")),

    MembersFor = (urn as number) as number =>
        let
            Hit = Table.SelectRows(StratumByUrn, each [URN] = urn)
        in
            if Table.IsEmpty(Hit) then 0 else Table.First(Hit)[Members],

    NameFor = (urn as number) as text =>
        let
            Hit = Table.SelectRows(Gias, each [URN] = urn)
        in
            if Table.IsEmpty(Hit) then "URN " & Text.From(urn) else Table.First(Hit)[School name],

    Day = (d as nullable date) as text => if d = null then "(undated)" else Date.ToText(d, "yyyy-MM-dd"),

    // ---- 1. Workplace codes with no URN ------------------------------------
    // The most expensive kind: membership that is in an export, is real, and is
    // in no total anywhere.
    Codes = List.Distinct(List.RemoveNulls(List.Combine({
        Table.Column(Stratum, "Workplace code"),
        Table.Column(Src_PayDashboard, "Workplace code")
    }))),
    Unmatched = List.Select(Codes, each not List.Contains(MappedCodes, _)),
    A1 = List.Transform(Unmatched, (code) =>
        let
            Hit = Table.SelectRows(Stratum, each [Workplace code] = code),
            Found = not Table.IsEmpty(Hit),
            Name = if Found and Table.First(Hit)[Workplace name] <> null then Table.First(Hit)[Workplace name] else code,
            Members = if Found then Table.First(Hit)[#"Membership (total)"] else null
        in
            Row("unmatched-workplace-code", code, Name,
                code
                    & (if Members <> null and Members > 0 then " · " & Text.From(Members) & " members" else "")
                    & " has no row in WCtoURN.",
                Members)),

    // ---- 2. Rows with no workplace code at all -----------------------------
    A2 = List.Transform(Table.ToRecords(Src_StratumUnkeyed), (u) =>
        Row("stratum-row-without-workplace-code", Day(u[Snapshot date]),
            "Stratum export of " & Day(u[Snapshot date]),
            Text.From(u[#"Rows with no workplace code"]) & " rows in that week's export carry no workplace code, holding "
                & Text.From(u[#"Membership (total)"]) & " members. They join to nothing and are in no total, including London's.",
            u[#"Membership (total)"])),

    // ---- 3. Members at a closed school -------------------------------------
    OpenStatuses = {"open", "open, but proposed to close"},
    IsClosed = (status as any) as logical =>
        let
            S = Text.Lower(Text.Trim(if status = null then "" else Text.From(status)))
        in
            S <> "" and not List.Contains(OpenStatuses, S),
    Closed = Table.SelectRows(Gias, each IsClosed([Establishment status]) and List.Contains(StratumUrns, [URN])),
    A3 = List.RemoveNulls(List.Transform(Table.ToRecords(Closed), (g) =>
        let
            Members = MembersFor(g[URN])
        in
            if Members <= 0 then null
            else Row("members-at-closed-school", Text.From(g[URN]), g[School name],
                "Status """ & Text.From(g[Establishment status]) & """ but " & Text.From(Members)
                    & " members recorded. Point it at its successor school if it converted.",
                Members))),

    // ---- 4. In Stratum, not in GIAS ----------------------------------------
    A4 = List.Transform(List.Select(StratumUrns, each not List.Contains(GiasUrns, _)), (urn) =>
        Row("stratum-without-gias", Text.From(urn), "URN " & Text.From(urn),
            "Stratum data maps to URN " & Text.From(urn) & ", which isn't in the GIAS export.",
            MembersFor(urn))),

    // ---- 5. In GIAS, no Stratum record -------------------------------------
    // The most numerous kind, and the least alarming one at a time: a school
    // with no Stratum row reads as zero members and zero density everywhere,
    // which drags every borough figure it is in.
    A5 = List.Transform(Table.ToRecords(Table.SelectRows(Gias, each not List.Contains(StratumUrns, [URN]))), (g) =>
        Row("gias-without-stratum", Text.From(g[URN]), g[School name],
            "URN " & Text.From(g[URN]) & " (" & (if g[#"LA (borough)"] = null then "no borough recorded" else Text.From(g[#"LA (borough)"]))
                & ") has no Stratum record, so it has no headcount or membership.",
            null)),

    // ---- 6. Several workplace codes, one URN -------------------------------
    PerUrn = Table.Group(Map, {"URN"}, {
        {"Codes", each Table.Column(_, "Workplace code"), type list},
        {"Count", each Table.RowCount(_), Int64.Type}
    }),
    A6 = List.Transform(Table.ToRecords(Table.SelectRows(PerUrn, each [Count] > 1)), (d) =>
        Row("duplicate-workplace-code", Text.From(d[URN]), NameFor(d[URN]),
            Text.From(d[Count]) & " workplace codes map here (" & Text.Combine(d[Codes], ", ") & "). Their figures are summed.",
            MembersFor(d[URN]))),

    // ---- 7. One workplace, several rows in a week --------------------------
    // Should never fire. If it does, nothing is being double-counted — the
    // collapse in Src_StratumHistory takes the first row — but somebody needs
    // to know the export has changed shape before trusting a total.
    Repeated = Table.SelectRows(Src_StratumHistory, each [Rows in export] > 1),
    A7 = List.Transform(Table.ToRecords(Repeated), (r) =>
        Row("repeated-workplace-row", Day(r[Snapshot date]) & "|" & r[Workplace code],
            if r[Workplace name] = null then r[Workplace code] else r[Workplace name],
            Text.From(r[#"Rows in export"]) & " rows for workplace " & r[Workplace code] & " in the export of "
                & Day(r[Snapshot date]) & ". The first is used and the rest ignored; summing them would double this school's membership everywhere.",
            r[#"Membership (total)"])),

    // ---- 8. A week missing from the folder ---------------------------------
    // Ten days rather than seven, matching the app's cadence tolerance in
    // recentRun(): a capture taken a day or two late is not a missing week.
    TrendWeeks = List.Buffer(List.Sort(List.Distinct(Table.Column(Trend, "Week")), Order.Ascending)),
    WeekPairs =
        if List.Count(TrendWeeks) < 2 then {}
        else List.Transform({1 .. List.Count(TrendWeeks) - 1},
            (i) => [Previous = TrendWeeks{i - 1}, This = TrendWeeks{i}]),
    A8 = List.Transform(List.Select(WeekPairs, each Duration.Days([This] - [Previous]) > 10), (g) =>
        Row("week-missing-from-history", Day(g[This]),
            Day(g[Previous]) & " to " & Day(g[This]),
            Text.From(Duration.Days(g[This] - g[Previous])) & " days between exports. Every trend line crosses that gap as if it were one week. Dropping the missing file into the Stratum exports folder backfills it and moves no current figure.",
            null)),

    // ---- 9. A dispute listing a school that isn't there --------------------
    Lost = Table.SelectRows(Dispute_Schools, each [On the School view] = "No"),
    A9 = List.Transform(Table.ToRecords(Lost), (d) =>
        Row("dispute-urn-not-found", Text.From(d[URN]),
            (if d[Employer] = null then "Dispute " & Text.From(d[ID]) else Text.From(d[Employer])),
            "URN " & Text.From(d[URN]) & " is listed on this dispute but matches no school on the School view. The dispute counts on no school page, and the school is not counted as in dispute.",
            null)),

    // ---- 10. Trusts nobody is tracking -------------------------------------
    Keyed = Table.AddColumn(Gias, "Trust key",
        each Text.Lower(Text.Trim(if [#"Trusts (MAT)"] = null then "" else Text.From([#"Trusts (MAT)"]))), type text),
    AliasJoined = Table.NestedJoin(Keyed, {"Trust key"}, Src_MatAliases, {"Alias key"}, "A", JoinKind.LeftOuter),
    AliasExpanded = Table.ExpandTableColumn(AliasJoined, "A", {"Canonical MAT"}, {"Canonical MAT"}),
    Canonical = Table.AddColumn(AliasExpanded, "Trust",
        each if [Canonical MAT] <> null and [Canonical MAT] <> "" then [Canonical MAT]
             else Text.Trim(if [#"Trusts (MAT)"] = null then "" else Text.From([#"Trusts (MAT)"])), type text),
    Trusts = List.Distinct(List.Select(Table.Column(Canonical, "Trust"), each _ <> "")),
    Tracked = List.Buffer(Table.Column(Src_MatFacts, "MAT")),
    A10 = List.Transform(List.Select(Trusts, each not List.Contains(Tracked, _)), (mat) =>
        Row("mat-not-in-matfacts", mat, mat,
            """" & mat & """ appears in GIAS but has no MatFacts row. Add one if it should be tracked, or an alias if it's another name for a trust you already track.",
            null)),

    // ---- 11/12. Notes filed against a name nothing has ---------------------
    // Both views already work these out — they end with a row per unmatched
    // subject — so they are read from there rather than detected again.
    BranchOrphans = Table.SelectRows(BranchView, each [Row type] <> "Branch"),
    A11 = List.Transform(Table.ToRecords(BranchOrphans), (b) =>
        Row("note-matches-no-branch", b[Branch], b[Branch],
            Text.From(b[Notes]) & " note(s) filed against """ & b[Branch] & """, which is not a branch on the Branch view. Fix the spelling in the field log, or change what P_BranchColumn means.",
            null)),
    MatOrphans = Table.SelectRows(MatView, each [Row type] <> "MAT"),
    A12 = List.Transform(Table.ToRecords(MatOrphans), (m) =>
        Row("note-matches-no-trust", m[#"Trust (MAT)"], m[#"Trust (MAT)"],
            Text.From(m[Notes]) & " note(s) filed against """ & m[#"Trust (MAT)"] & """, which is not a trust on the MAT view. Add it to MatAliases if it is another name for one.",
            null)),

    // ---- 13. Do the staff groups add up? -----------------------------------
    // ONE ROW FOR THE REGION, not one per school. If Stratum counts trainee
    // members outside "Count of Members" this fires on thousands of schools at
    // once, and a sheet with 3,000 rows of the same finding on it is a sheet
    // nobody reads. The size of the gap is the finding.
    Gaps = Table.AddColumn(SchoolView, "Group gap",
        each [#"Membership (total)"] - ([#"Membership (teachers)"] + [#"Membership (leadership)"] + [#"Membership (support)"]),
        type number),
    Mismatched = Table.SelectRows(Gaps, each [Group gap] <> 0),
    A13 =
        if Table.IsEmpty(Mismatched) then {}
        else
            let
                Worst = Table.First(Table.Sort(Mismatched, {{"Group gap", Order.Descending}})),
                Total = fnZero(List.Sum(Table.Column(Mismatched, "Group gap"))),
                Trainees = fnZero(List.Sum(Table.Column(Mismatched, "Trainee members (employed)")))
                    + fnZero(List.Sum(Table.Column(Mismatched, "Trainee members (not employed)")))
            in
                {Row("membership-groups-dont-sum", "region",
                    Text.From(Table.RowCount(Mismatched)) & " schools",
                    "Teachers plus leadership plus support differs from total membership at "
                        & Text.From(Table.RowCount(Mismatched)) & " schools, by " & Text.From(Total)
                        & " members in all. Those schools hold " & Text.From(Trainees)
                        & " trainee members between them — if the two figures match, trainees sit outside the staff-group columns and inside the total, which nothing documents. Largest single gap: "
                        & Text.From(Worst[#"Group gap"]) & " at " & Worst[School name] & ".",
                    Total)},

    // ---- Together ----------------------------------------------------------
    All = Table.FromRecords(
        List.Combine({A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13}),
        type table [#"Anomaly type" = text, Key = text, Name = text, Detail = text, Members = number]),

    // Anything with a decision recorded against it drops out — link, successor,
    // exclude and accept alike. Rec_Decisions is already the latest decision
    // per key, so a superseded one cannot bring a row back.
    Unresolved = Table.NestedJoin(All, {"Anomaly type", "Key"}, Rec_Decisions, {"Anomaly", "Key"}, "Decision", JoinKind.LeftAnti),
    Cleaned = Table.RemoveColumns(Unresolved, {"Decision"}),

    Described = Table.NestedJoin(Cleaned, {"Anomaly type"}, Anomaly_Types, {"Anomaly type"}, "Type", JoinKind.LeftOuter),
    DescribedExpanded = Table.ExpandTableColumn(Described, "Type",
        {"Order", "What it is", "What it means", "What you can do", "Detected by"}),

    // Worst kind first, and within a kind the biggest membership first, so the
    // top of the sheet is the most data at stake. Rows with no membership
    // figure sort last rather than first.
    Sorted = Table.Sort(DescribedExpanded,
        {{"Order", Order.Ascending}, {"Members", Order.Descending}, {"Name", Order.Ascending}}),

    Result = Table.SelectColumns(Sorted, {
        "What it is", "Name", "Detail", "Members",
        // The two columns a decision is recorded against. Copy them into the
        // Reconciliations table with an action, and the row goes away.
        "Anomaly type", "Key", "What you can do",
        "What it means", "Detected by"
    })
in
    Result
