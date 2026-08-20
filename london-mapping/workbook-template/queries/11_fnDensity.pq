// Query name: fnDensity
//
// Membership divided by headcount, or null when there is no headcount to
// divide by.
//
// THE RULE, from the data dictionary: a MAT or borough density is
// sum(members) / sum(headcount) across its schools — never the mean of the
// constituent school densities. Averaging a 10-staff school at 90% with a
// 200-staff school at 10% gives 50%; the right figure is 13.8%.
//
// Power Query enforces this structurally in a way the app could not: every
// rollup sums inside a Group By and then calls this function on the summed
// columns AFTERWARDS. The division is downstream of the sum, so it cannot
// accidentally become an average.
//
// Zero headcount gives null, not 0% — "we don't know" and "nobody is in the
// union" are different answers and must not print the same.
let
    fnDensity = (members as nullable number, headcount as nullable number) as nullable number =>
        if headcount = null or headcount = 0 then null
        else (if members = null then 0 else members) / headcount
in
    fnDensity
