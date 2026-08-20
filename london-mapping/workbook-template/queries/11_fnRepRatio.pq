// Query name: fnRepRatio
//
// The rep:member ratio as it is written on the page — "1:34", or "No reps".
//
// Text, not a number, and deliberately so: the useful reading is "one rep for
// every 34 members", and a bare 0.029 is nobody's idea of that. It mirrors
// memberRepRatio in js/data/rollups.js exactly, rounding included.
//
// Zero reps gives "No reps" rather than a division by zero or a blank. It is a
// real answer and a stark one — the point of the column is to make it visible.
//
// ROUNDINGMODE.AWAYFROMZERO IS NOT OPTIONAL. M's Number.Round defaults to
// banker's rounding (RoundingMode.ToEven), which sends 34.5 to 34 and 35.5 to
// 36. JavaScript's Math.round always goes up on a half, so left at the default
// this would disagree with the app by one on any ratio landing exactly on .5 —
// rare, invisible, and exactly the kind of difference that wastes an afternoon.
let
    fnRepRatio = (members as nullable number, reps as nullable number) as text =>
        if reps = null or reps = 0 then "No reps"
        else "1:" & Text.From(Number.Round(fnZero(members) / reps, 0, RoundingMode.AwayFromZero))
in
    fnRepRatio
