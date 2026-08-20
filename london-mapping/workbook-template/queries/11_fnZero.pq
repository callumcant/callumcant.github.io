// Query name: fnZero
//
// null as 0. Every count that gets summed goes through this, because M's
// List.Sum returns null for an all-null list where the app's `|| 0` gives 0 —
// and a null headcount and a zero headcount must reach the density rule as the
// same thing.
let
    fnZero = (value as nullable number) as number =>
        if value = null then 0 else value
in
    fnZero
