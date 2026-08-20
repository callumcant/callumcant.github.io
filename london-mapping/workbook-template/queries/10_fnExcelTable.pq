// Query name: fnExcelTable
//
// One named Excel TABLE (a real ListObject, not a sheet) out of a workbook
// binary. Named tables are what the field log and Lookups.xlsx hold, and
// reading the table rather than the sheet means rows added at the bottom are
// picked up without anyone adjusting a range.
let
    fnExcelTable = (file as binary, tableName as text) as table =>
        let
            Book = Excel.Workbook(file, true),
            Matches = Table.SelectRows(Book, each [Kind] = "Table" and [Item] = tableName),
            Result =
                if Table.IsEmpty(Matches) then
                    error Error.Record(
                        "Table not found",
                        "The workbook has no table called """ & tableName & """.",
                        "It holds: " & Text.Combine(Table.Column(Book, "Item"), ", ")
                            & ". A named table is made with Insert > Table, then renamed in the Table Design tab —"
                            & " a sheet with the right name is not the same thing."
                    )
                else
                    Matches{0}[Data]
        in
            Result
in
    fnExcelTable
