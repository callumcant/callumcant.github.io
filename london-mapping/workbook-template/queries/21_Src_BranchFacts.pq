// Query name: Src_BranchFacts
//
// The two things about a borough that no export knows: whether it is a project
// branch, and how many reps have been trained there.
//
// Hand-maintained, in Lookups.xlsx. One row per branch.
//
// "Reps trained since start" is a HAND-KEPT NUMBER and the only one left in the
// workbook. Training data has no pipeline yet. It is not the rep count and must
// never be added to it: the rep count comes from Stratum every week, and a
// trained rep may or may not hold a position.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Lookups.xlsx", "BranchFacts"),

    Kept = fnExpect(Raw, {"Branch", "Is project branch?", "Reps trained since start"},
        "the BranchFacts table in Lookups.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"Branch", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Is project branch?", fnYesNo, type logical},
        {"Reps trained since start", each fnZero(fnNumber(_)), type number}
    }),

    Named = Table.SelectRows(Typed, each [Branch] <> ""),

    // A branch listed twice would duplicate every school in it on the join.
    // The app takes the first match (Array.find); so does this.
    Result = Table.Distinct(Named, {"Branch"})
in
    Result
