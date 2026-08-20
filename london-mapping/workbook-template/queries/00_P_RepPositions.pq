// Query name: P_RepPositions
//
// Which committee position codes count as "a rep" for Rep count and the
// rep:member ratio.
//
// The five workplace rep types:
//
//   WPR   Workplace Rep
//   WHS   Workplace Health & Safety Rep
//   WEQ   Workplace Equality Rep
//   WLR   Workplace Learning Rep
//   WGO   Workplace Green Rep
//
// To count workplace reps only, cut this list to {"WPR"}. Every count in the
// workbook follows, and the individual breakdown columns stay on the School
// view either way, so nothing is lost by narrowing it.
//
// TWO CODES NOT IN THIS LIST, both on purpose:
//
//   WGV   Workplace GOVERNOR — a different thing entirely, and easily misread
//         as the green rep. Getting these the wrong way round puts governors in
//         the green-rep column and loses the green reps.
//   WBV   Ballot Volunteer — a standing position in the membership database,
//         counted separately as "Ballot volunteers". Not a rep, and NOT the
//         same as the SEVs in the Pay Dashboard export. See the note on
//         Src_ActivistHistory.
//
// Everything else in the activists export — 96 distinct codes — belongs to a
// district, branch, regional or national structure and lands in "Other activist
// positions".
let
    Source = {"WPR", "WHS", "WEQ", "WLR", "WGO"}
in
    Source
