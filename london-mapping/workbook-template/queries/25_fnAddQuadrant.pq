// Query name: fnAddQuadrant
//
// Adds one organising-quadrant column to the school table, classifying each
// school against its peers in the named column — its borough, or its trust.
//
//   x  density  (members / headcount, from Stratum)
//   y  turnout  (2026 indicative ballot, from the Pay Dashboard)
//
//   Strong                 at or above both medians — organised and mobilised
//   Committed core         mobilised, low density — recruitment ground
//   Members, not mobilised density without turnout — contact and rep capacity
//   Cold                   needs a rep and a first conversation
//
// THE DIVIDING LINES ARE MEDIANS OF THE PEER GROUP, not thresholds someone
// invented. A school is strong relative to its own borough or its own trust.
// That is why the same school can be Strong against its borough and Cold
// against its trust, and why both columns exist rather than one: the medians
// are computed over different sets, and the tension between them is the
// interesting part.
//
// Three cases give a blank rather than a guess, matching js/ui/quadrant.js:
//   * the school has no density or no turnout — nothing to plot
//   * the school has fewer than P_QuadrantMinMembers members — too small to
//     read anything into, and it takes no part in the medians either
//   * its peer group has fewer than P_QuadrantMinPlotted qualifying schools,
//     or they are so alike that a median divides nothing
//
// A blank is an answer here. Naming a quadrant off four schools, or off a
// median every school sits exactly on, reads as a finding and is not one.
//
// FIXED BASIS. These columns always use all phases and the P_QuadrantMinMembers
// floor — the app's badge defaults. The Quadrant sheet's chart has its own
// filters, so it can disagree with these columns. That is not a bug, and the
// note on the sheet says so.
let
    fnAddQuadrant = (schools as table, peerColumn as text, newColumn as text) as table =>
        let
            // Who counts, both for the medians and for being classified. The
            // same test, so the set that draws the lines is the set the lines
            // are drawn for.
            Qualifies = (row as record) as logical =>
                Record.Field(row, "Density (total)") <> null
                and Record.Field(row, "Turnout (2026 indicative)") <> null
                and fnZero(Record.Field(row, "Membership (total)")) >= P_QuadrantMinMembers
                and Record.Field(row, peerColumn) <> null
                and Record.Field(row, peerColumn) <> "",

            Eligible = Table.SelectRows(schools, each Qualifies(_)),

            Peers = Table.Group(Eligible, {peerColumn}, {
                {"Peer count", each Table.RowCount(_), Int64.Type},
                // fnMedian, never List.Median — see the note in fnMedian about
                // even-length lists.
                {"Median density", each fnMedian(Table.Column(_, "Density (total)")), type number},
                {"Median turnout", each fnMedian(Table.Column(_, "Turnout (2026 indicative)")), type number},
                // A median only divides anything if the values actually differ.
                // Where every school in a trust has the same turnout, the line
                // would run through all of them and the split would be an
                // artefact of the tie-breaking, not a finding.
                {"Density splits", each List.Min(Table.Column(_, "Density (total)")) <> List.Max(Table.Column(_, "Density (total)")), type logical},
                {"Turnout splits", each List.Min(Table.Column(_, "Turnout (2026 indicative)")) <> List.Max(Table.Column(_, "Turnout (2026 indicative)")), type logical}
            }),

            Joined = Table.NestedJoin(schools, {peerColumn}, Peers, {peerColumn}, "Peers", JoinKind.LeftOuter),
            Expanded = Table.ExpandTableColumn(Joined, "Peers",
                {"Peer count", "Median density", "Median turnout", "Density splits", "Turnout splits"},
                {"Peer count", "Median density", "Median turnout", "Density splits", "Turnout splits"}),

            Classified = Table.AddColumn(Expanded, newColumn,
                each
                    if not Qualifies(_) then null
                    else if [Peer count] = null or [Peer count] < P_QuadrantMinPlotted then null
                    else if [Density splits] <> true or [Turnout splits] <> true then null
                    else
                        let
                            Dense = [#"Density (total)"] >= [Median density],
                            Mobilised = [#"Turnout (2026 indicative)"] >= [Median turnout]
                        in
                            if Dense and Mobilised then "Strong"
                            else if not Dense and Mobilised then "Committed core"
                            else if Dense and not Mobilised then "Members, not mobilised"
                            else "Cold",
                type text),

            Result = Table.RemoveColumns(Classified,
                {"Peer count", "Median density", "Median turnout", "Density splits", "Turnout splits"})
        in
            Result
in
    fnAddQuadrant
