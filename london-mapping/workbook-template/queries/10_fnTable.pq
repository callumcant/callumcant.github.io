// Query name: fnTable
//
// One source table, from wherever the source tables currently live.
//
//   subPath    folder below Mapping, {} for Mapping itself
//   fileName   the file to read in normal use ("GIAS export.csv", "Field log.xlsx")
//   tableName  the table inside that file — and, in test mode, the CSV's name
//
// In test mode (P_LocalFolder set) every source is a CSV named after its
// table, so one dumper writing SourceGIAS.csv, WCtoURN.csv, Meetings.csv ...
// into a folder is enough to drive the whole workbook.
let
    fnTable = (subPath as list, fileName as text, tableName as text) as table =>
        let
            IsLocal = P_LocalFolder <> null and P_LocalFolder <> "",
            Name = if IsLocal then tableName & ".csv" else fileName,
            File = fnGetFile(subPath, Name),
            Data =
                if Comparer.OrdinalIgnoreCase(Text.End(Name, 4), ".csv") = 0 then
                    fnCsvTable(File)
                else
                    fnExcelTable(File, tableName)
        in
            Data
in
    fnTable
