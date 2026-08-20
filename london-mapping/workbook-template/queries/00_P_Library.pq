// Query name: P_Library
//
// The document library on that site, as its name appears in the connector's
// navigator — NOT as it appears in the browser address bar.
//
// CHECK THIS ON FIRST CONNECTION. The default library is usually listed as
// "Documents" even though its URL says "Shared Documents". If the refresh
// errors with "Folder not found: Documents", open the navigator, read the name
// off the top level and put it here.
let
    Source = "Documents"
in
    Source
