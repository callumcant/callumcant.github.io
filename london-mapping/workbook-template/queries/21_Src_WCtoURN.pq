// Query name: Src_WCtoURN
//
// Workplace code to URN. The hinge of the whole model: Stratum and the Pay
// Dashboard key on workplace code, everything else keys on URN, and this table
// is the only thing that connects them. A code missing from here means that
// school has no membership data anywhere in the workbook.
//
// Hand-maintained, in Lookups.xlsx.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Lookups.xlsx", "WCtoURN"),

    Kept = fnExpect(Raw, {"Workplace code", "URN"}, "the WCtoURN table in Lookups.xlsx"),

    Typed = Table.TransformColumns(Kept, {
        {"Workplace code", each if _ = null then null else Text.Trim(Text.From(_)), type text},
        {"URN", each fnNumber(_), Int64.Type}
    }),

    Result = Table.SelectRows(Typed, each [Workplace code] <> null and [Workplace code] <> "" and [URN] <> null)
in
    Result
