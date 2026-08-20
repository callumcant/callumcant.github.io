// Query name: P_BallotThreshold
//
// The turnout a ballot has to reach to count as successful: 0.5, fifty per
// cent of the members balloted.
//
// It is SUCCESS_THRESHOLD from js/data/rollups.js, and it is not an arbitrary
// reporting choice — it is the turnout threshold in the Trade Union Act 2016,
// below which industrial action is unlawful however the vote went. That is why
// it is a setting with its own name rather than a 0.5 typed into the two places
// that need it: if the law changes, this changes, and nothing else does.
//
// A percentage here is a proportion (0.5), the same scale as every density and
// turnout figure in the workbook.
let
    Source = 0.5
in
    Source
