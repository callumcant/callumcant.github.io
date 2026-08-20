// Query name: fnFolderContents
//
// The files sitting directly in one folder of the mapping area. Returns a
// table with (at least) [Name] and [Content], one row per FILE — subfolders
// are dropped.
//
// subPath is a list of folder names BELOW the Mapping folder:
//     fnFolderContents({})                   the Mapping folder itself
//     fnFolderContents({"Stratum exports"})  the weekly exports
//
// Three deliberate choices, each of which has a wrong-looking obvious
// alternative:
//
//  * SharePoint.Contents, not SharePoint.Files. SharePoint.Files enumerates
//    every file on the whole team site and then filters; on a busy site that
//    is minutes rather than seconds.
//  * Navigation steps, not a folder URL — sidesteps the spaces and brackets
//    in "London data (do not delete)".
//  * Folder.Contents, not Folder.Files, in test mode. Folder.Files walks
//    subfolders too, so every weekly Stratum export would also appear as if it
//    sat loose in Mapping.
//
// Authentication for the SharePoint branch is Organizational account: Power
// Query signs in as whoever hits Refresh and reads with their own SharePoint
// permissions. No app registration, no Files.ReadWrite.All, and someone who
// cannot open a file cannot query it either.
let
    fnFolderContents = (subPath as list) as table =>
        let
            IsLocal = P_LocalFolder <> null and P_LocalFolder <> "",

            LocalPath = Text.Combine(List.Combine({{P_LocalFolder}, subPath}), "\"),

            // One navigation step. Named rather than inlined so the error can
            // say which folder name it failed on.
            Step = (parent as table, name as text) as table =>
                let
                    Matches = Table.SelectRows(parent, each [Name] = name)
                in
                    if Table.IsEmpty(Matches) then
                        error Error.Record(
                            "Folder not found",
                            "Could not find a folder called """ & name & """.",
                            "Looked in: " & Text.Combine(Table.Column(parent, "Name"), ", ")
                        )
                    else
                        Matches{0}[Content],

            Source =
                if IsLocal then
                    Folder.Contents(LocalPath)
                else
                    List.Accumulate(
                        List.Combine({{P_Library}, P_MappingFolder, subPath}),
                        SharePoint.Contents(P_SiteUrl, [ApiVersion = 15]),
                        (state, name) => Step(state, name)
                    ),

            // Files carry a binary in [Content]; folders carry a table. Testing
            // the value rather than the Extension column works the same way for
            // both connectors, which do not agree on which columns they return.
            Files = Table.SelectRows(Source, each Value.Is([Content], type binary))
        in
            Files
in
    fnFolderContents
