// Query name: fnCsvTable
//
// A CSV binary as a table with its first row promoted to headers.
//
// No Columns count is passed on purpose: a row with a stray extra comma then
// arrives as an extra column that fnExpect can complain about, rather than
// being silently truncated.
let
    fnCsvTable = (file as binary) as table =>
        let
            Csv = Csv.Document(file, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
            Promoted = Table.PromoteHeaders(Csv, [PromoteAllScalars = true])
        in
            Promoted
in
    fnCsvTable
