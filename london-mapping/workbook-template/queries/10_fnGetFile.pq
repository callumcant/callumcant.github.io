// Query name: fnGetFile
//
// One named file from a mapping folder, as a binary. Errors by name if it
// isn't there — "Disputes.xlsx is missing" is a message an organiser can act
// on; the connector's own error is not.
let
    fnGetFile = (subPath as list, fileName as text) as binary =>
        let
            Files = fnFolderContents(subPath),
            Matches = Table.SelectRows(Files, each Comparer.OrdinalIgnoreCase([Name], fileName) = 0),
            Result =
                if Table.IsEmpty(Matches) then
                    error Error.Record(
                        "File not found",
                        "Could not find """ & fileName & """ in the mapping folder"
                            & (if List.Count(subPath) = 0 then "" else " / " & Text.Combine(subPath, " / ")) & ".",
                        "Files there now: " & Text.Combine(Table.Column(Files, "Name"), ", ")
                    )
                else
                    Matches{0}[Content]
        in
            Result
in
    fnGetFile
