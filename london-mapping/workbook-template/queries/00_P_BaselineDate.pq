// Query name: P_BaselineDate
//
// The starting line every "since" figure on the Trend sheet is measured from:
// the first week of data.
//
// It is BASELINE_DATE from js/data/snapshots.js, to the day, so that "up 12%
// since the baseline" means the same thing in the workbook as it does in the
// app. Defined once, here, because a delta measured from a different starting
// line in two places on the same page is worse than no delta at all.
//
// The baseline WEEK is the earliest week in the history on or after this date —
// not this date itself. Nothing has to have been exported on the ninth of
// August; the first export on or after it is the baseline, and the Trend sheet
// names which week that turned out to be.
//
// Changing this re-bases every "since baseline" column in the workbook. It is
// not a filter: weeks before it stay on the sheet, they just have nothing to be
// compared against.
let
    Source = #date(2026, 8, 9)
in
    Source
