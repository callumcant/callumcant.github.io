// Query name: Src_MatAliases
//
// Trust names as the sources spell them, against the one name we use.
//
// Compass Eko is the case that prompted it — a merger of Compass Partnership
// of Schools and EKO Trust, so GIAS carries schools under all three names —
// but renames and plain spelling differences are the same shape of problem.
// Without this, one trust arrives as three trusts, each with a third of its
// schools and its own density.
//
// Hand-maintained, in Lookups.xlsx.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Lookups.xlsx", "MatAliases"),

    Kept = fnExpect(Raw,
        {"Alias (as it appears in source data)", "Canonical MAT name"},
        "the MatAliases table in Lookups.xlsx"),

    Renamed = Table.RenameColumns(Kept, {
        {"Alias (as it appears in source data)", "Alias"},
        {"Canonical MAT name", "Canonical MAT"}
    }),

    Trimmed = Table.TransformColumns(Renamed, {
        {"Alias", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"Canonical MAT", each if _ = null then "" else Text.Trim(Text.From(_)), type text}
    }),

    Filled = Table.SelectRows(Trimmed, each [Alias] <> "" and [Canonical MAT] <> ""),

    // The join key. Matching is case-insensitive and ignores surrounding
    // spaces, because these names are typed by hand in one place and pasted
    // out of an export in the other.
    Keyed = Table.AddColumn(Filled, "Alias key", each Text.Lower([Alias]), type text),

    // The app takes the FIRST alias row that matches; a left join on a
    // duplicated key would duplicate the school instead. Same rule, applied
    // where it cannot go wrong.
    Result = Table.Distinct(Keyed, {"Alias key"})
in
    Result
