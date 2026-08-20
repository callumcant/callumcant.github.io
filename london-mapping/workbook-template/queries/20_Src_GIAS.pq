// Query name: Src_GIAS
//
// The DfE Get Information About Schools export — the spine. One row per URN;
// every other source joins onto it.
//
// Load to: connection only.
let
    Raw = fnTable({}, "GIAS export.csv", "SourceGIAS"),

    Kept = fnExpect(Raw,
        {
            "URN", "School name", "Type of establishment", "Phase", "LA (borough)",
            "Establishment status", "Religious character", "Diocese", "Trusts (MAT)",
            "School sponsors", "Federations", "Postcode", "School website", "Telephone",
            "Head title", "Head first name", "Head last name"
        },
        "the GIAS export"),

    // URN is the join key everywhere, so it is typed once here and never
    // guessed at again. Everything else stays text: GIAS puts "Not applicable"
    // in numeric-looking columns often enough that typing them is a trap.
    Typed = Table.TransformColumns(Kept, {{"URN", each fnNumber(_), Int64.Type}}),

    // A school with no URN cannot be joined to anything, so it would show as a
    // row of blanks. Dropped here rather than at the far end, where it would
    // look like a problem in Stratum instead of a problem in GIAS.
    WithUrn = Table.SelectRows(Typed, each [URN] <> null),

    // GIAS carries the head teacher in three columns; the app shows one.
    HeadName = Table.AddColumn(WithUrn, "Head teacher",
        each Text.Combine(
            List.Select({[Head title], [Head first name], [Head last name]},
                        each _ <> null and Text.Trim(Text.From(_)) <> ""), " "),
        type text),

    Result = Table.RemoveColumns(HeadName, {"Head title", "Head first name", "Head last name"})
in
    Result
