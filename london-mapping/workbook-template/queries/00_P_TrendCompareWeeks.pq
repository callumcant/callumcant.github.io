// Query name: P_TrendCompareWeeks
//
// The short comparison that sits alongside the baseline one: how many weeks
// back "recently" means.
//
// 4 matches pointWeeksBefore's default in js/data/snapshots.js. The rule is the
// same as the app's, and worth stating: the comparison week is the most recent
// week AT LEAST this many weeks earlier, not the row four rows up. Those are
// the same thing only while no week is missing from the folder, and the whole
// point of the "Compared with" column is that you can see when they are not.
//
// A row with no week far enough back gets blank comparison columns rather than
// a comparison against the oldest week there is. An unstated starting line
// reads as authoritative and is not.
let
    Source = 4
in
    Source
