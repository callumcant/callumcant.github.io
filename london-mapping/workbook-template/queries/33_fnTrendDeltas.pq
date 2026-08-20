// Query name: fnTrendDeltas
//
// The comparison columns on a weekly series: how far each week is from the
// baseline week, and from a few weeks earlier.
//
//   series   a table from fnTrendSeries
//
// Two comparisons, both the app's, both from js/data/snapshots.js:
//
//   * SINCE THE BASELINE — baselinePoint(). The baseline week is the earliest
//     week on or after P_BaselineDate. Weeks before it, and the baseline week
//     itself, get blanks: there is nothing to compare them against, and an
//     unstated starting line reads as authoritative when it is not.
//
//   * SINCE A FEW WEEKS EARLIER — pointWeeksBefore(), P_TrendCompareWeeks
//     weeks. The most recent week AT LEAST that far back, not the row that many
//     rows up. "Compared with" says which week it found, so a missing export is
//     visible rather than quietly widening the comparison.
//
// A CHANGE IN DENSITY IS A DIFFERENCE OF TWO PROPORTIONS, not a percentage
// change. 0.34 to 0.36 gives 0.02 here, which formats as 2% on the sheet and
// means two percentage points. It is not "up 6%", and the sheet must not label
// it that way.
//
// The gap columns are the one thing here with no app equivalent, and they exist
// because the workbook's history has a different failure mode. The app's
// history was windowed, so a series could have a hole in it by design and
// recentRun() existed to find the unbroken run. Nothing is windowed here — the
// whole folder is read every time — so a hole means a week's export was never
// dropped in. That is worth naming rather than working around: a fortnight's
// change plotted next to a week's looks like a surge.
//
// Load to: connection only.
let
    fnTrendDeltas = (series as table) as table =>
        let
            Sorted = Table.Buffer(Table.Sort(series, {{"Week", Order.Ascending}})),
            Weeks = List.Buffer(Table.Column(Sorted, "Week")),

            PointAt = (week as nullable date) as nullable record =>
                if week = null then null
                else
                    let
                        Match = Table.SelectRows(Sorted, each [Week] = week)
                    in
                        if Table.IsEmpty(Match) then null else Table.First(Match),

            // Subtraction that survives a blank on either side. A density is
            // null where there is no headcount, and null minus a number is a
            // number in M — so without this a school-less week would report a
            // confident-looking fall to zero.
            Diff = (now as nullable record, before as nullable record, col as text) as nullable number =>
                if now = null or before = null then null
                else
                    let
                        A = Record.Field(now, col),
                        B = Record.Field(before, col)
                    in
                        if A = null or B = null then null else A - B,

            // ---- The baseline week ------------------------------------------
            OnOrAfter = List.Select(Weeks, each _ >= P_BaselineDate),
            BaselineWeek = if List.IsEmpty(OnOrAfter) then null else List.Min(OnOrAfter),
            BaselineRow = PointAt(BaselineWeek),

            // Blank against itself and against anything earlier. Mirrors
            // baselinePoint() returning null when the baseline is also the
            // newest point — there is no delta to state yet.
            BaselineFor = (week as date) as nullable record =>
                if BaselineWeek = null or week <= BaselineWeek then null else BaselineRow,

            // ---- The short comparison ---------------------------------------
            EarlierWeekFor = (week as date) as nullable date =>
                let
                    Cutoff = Date.AddDays(week, - (P_TrendCompareWeeks * 7)),
                    Candidates = List.Select(Weeks, each _ <= Cutoff)
                in
                    if List.IsEmpty(Candidates) then null else List.Max(Candidates),

            PreviousWeekFor = (week as date) as nullable date =>
                let
                    Candidates = List.Select(Weeks, each _ < week)
                in
                    if List.IsEmpty(Candidates) then null else List.Max(Candidates),

            // ---- The columns -------------------------------------------------
            Marked = Table.AddColumn(Sorted, "Baseline week",
                each if BaselineWeek <> null and [Week] = BaselineWeek then "Yes" else "No", type text),

            Previous = Table.AddColumn(Marked, "Weeks since previous reading",
                each
                    let
                        Prev = PreviousWeekFor([Week])
                    in
                        if Prev = null then null else Duration.Days([Week] - Prev) / 7,
                type number),

            // A weekly cadence with slack for a capture taken a day or two
            // late, matching the app's 10-day tolerance in recentRun().
            Gap = Table.AddColumn(Previous, "Gap in the history",
                each if [Weeks since previous reading] = null then "No"
                     else if [Weeks since previous reading] > 10 / 7 then "Yes"
                     else "No",
                type text),

            Based = Table.AddColumn(Gap, "Baseline", each BaselineFor([Week]), type any),
            Compared = Table.AddColumn(Based, "Compared with", each EarlierWeekFor([Week]), type date),
            ComparedRow = Table.AddColumn(Compared, "Earlier", each PointAt([Compared with]), type any),

            BaseMembers = Table.AddColumn(ComparedRow, "Membership since baseline",
                each Diff(_, [Baseline], "Membership (total)"), type number),
            BaseDensity = Table.AddColumn(BaseMembers, "Density since baseline",
                each Diff(_, [Baseline], "Density (total)"), type number),
            BaseReps = Table.AddColumn(BaseDensity, "Rep count since baseline",
                each Diff(_, [Baseline], "Rep count"), type number),
            BaseCoverage = Table.AddColumn(BaseReps, "Rep coverage since baseline",
                each Diff(_, [Baseline], "Rep coverage"), type number),

            EarlierMembers = Table.AddColumn(BaseCoverage, "Membership since compared week",
                each Diff(_, [Earlier], "Membership (total)"), type number),
            EarlierDensity = Table.AddColumn(EarlierMembers, "Density since compared week",
                each Diff(_, [Earlier], "Density (total)"), type number),
            EarlierReps = Table.AddColumn(EarlierDensity, "Rep count since compared week",
                each Diff(_, [Earlier], "Rep count"), type number),

            Result = Table.RemoveColumns(EarlierReps, {"Baseline", "Earlier"})
        in
            Result
in
    fnTrendDeltas
