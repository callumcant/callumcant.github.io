// Query name: P_LocalFolder
//
// TEST MODE SWITCH. Leave empty ("") for normal use.
//
// Set it to a folder on this PC and every query reads CSVs from there instead
// of SharePoint — one CSV per table, named after the table (SourceGIAS.csv,
// WCtoURN.csv, Meetings.csv ...), with "Stratum exports" as a subfolder.
// That is how the workbook gets built and checked against the app's sample
// data before any real data exists, which matters: no real member or dispute
// data should go anywhere near the repo.
//
// Example: "C:\Users\Callum.Cant\Desktop\Mapping test data"
let
    Source = ""
in
    Source
