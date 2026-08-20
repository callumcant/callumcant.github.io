// Query name: Rec_UrnByWorkplaceCode
//
// The workplace code to URN map actually used for joining: WCtoURN, plus any
// "link" decisions recorded on the Reconciliations sheet, which override it.
//
// A linked code beats the lookup table. That is the point of recording the
// decision: the code was unmatched, someone worked out which school it belongs
// to, and from then on it joins — without anyone having to edit a source file
// that gets overwritten every week.
//
// Load to: connection only.
let
    // Links first, so that when duplicates are dropped below the link is the
    // row that survives.
    Links = Table.SelectRows(Rec_Decisions, each [Action] = "link" and [Target] <> null and [Target] <> ""),

    LinkPairs = Table.SelectColumns(
        Table.AddColumn(
            Table.AddColumn(Links, "Workplace code", each [Key], type text),
            "URN", each fnNumber([Target]), Int64.Type),
        {"Workplace code", "URN"}),

    ValidLinks = Table.SelectRows(LinkPairs, each [URN] <> null),

    // WCtoURN reversed before combining: Table.Distinct keeps the FIRST row for
    // each key, and where the lookup table itself repeats a code the app takes
    // the last one (it builds a Map, where a later entry replaces an earlier).
    // Reversing makes "first surviving" and "last written" the same row.
    Base = Table.ReverseRows(Table.SelectColumns(Src_WCtoURN, {"Workplace code", "URN"})),

    Combined = Table.Combine({ValidLinks, Base}),

    Result = Table.Distinct(Combined, {"Workplace code"})
in
    Result
