// Query name: fnNumber
//
// A number out of whatever a spreadsheet cell happens to hold, or null.
//
// Exports arrive as CSV and as .xlsx, from Stratum and from hand-maintained
// files, so a count can turn up as 12, as "12", as "12 " or as "". Number.From
// errors on the last two; this does not. Nothing downstream should ever see a
// refresh fail because someone typed a space.
let
    fnNumber = (value as any) as nullable number =>
        let
            Text0 = if value = null then "" else Text.Trim(Text.From(value)),
            Result = if Text0 = "" then null else try Number.From(Text0) otherwise null
        in
            Result
in
    fnNumber
