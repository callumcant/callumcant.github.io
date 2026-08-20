// Query name: fnYesNo
//
// A Yes/No column as a true/false.
//
// "Yes" and nothing else — not "y", not "TRUE", not 1 — matching the app's
// rowToObject, which does `value === "Yes"`. Kept that strict rather than made
// generous on purpose: if the workbook were the more forgiving of the two, a
// branch could be flagged as a project branch in one and not in the other.
//
// The one deliberate difference is case. These columns are typed by hand into
// Lookups.xlsx, where "yes" and "YES" both happen, so the comparison ignores
// case where the app's does not. Anything that isn't the word yes is still no.
let
    fnYesNo = (value as any) as logical =>
        Comparer.OrdinalIgnoreCase(Text.Trim(if value = null then "" else Text.From(value)), "Yes") = 0
in
    fnYesNo
