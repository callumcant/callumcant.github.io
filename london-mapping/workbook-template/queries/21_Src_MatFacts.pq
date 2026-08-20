// Query name: Src_MatFacts
//
// The two things about a trust that no export knows: whether it is a target
// MAT, and whether it has a rep committee.
//
// Hand-maintained, in Lookups.xlsx. One row per trust.
//
// USE THE CANONICAL TRUST NAME — the one on the right-hand side of
// MatAliases. The School view has already folded the source spellings into it
// before the MAT view groups by it, so a row typed here against a source
// spelling matches nothing and the trust silently reads as not-a-target.
//
// "Rep committee exists?" here is only the FALLBACK. A trust with any row in
// RepCommittees takes its answer from the newest of those rows instead, because
// that one carries a date and this one does not. See Committee_ByMat.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Lookups.xlsx", "MatFacts"),

    Kept = fnExpect(Raw, {"MAT", "Is target MAT?", "Rep committee exists?"},
        "the MatFacts table in Lookups.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"MAT", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Is target MAT?", fnYesNo, type logical},
        {"Rep committee exists?", fnYesNo, type logical}
    }),

    Named = Table.SelectRows(Typed, each [MAT] <> ""),

    Result = Table.Distinct(Named, {"MAT"})
in
    Result
