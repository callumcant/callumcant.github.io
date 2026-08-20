// Query name: fnMedian
//
// The median of a list of numbers, averaging the two middle values on an
// even-length list.
//
// DO NOT REPLACE THIS WITH List.Median. M's built-in returns an ITEM from the
// list — on an even-length list it picks the lower of the two middle values
// rather than averaging them, because it works on any comparable type, not
// just numbers. The app's median() in js/ui/quadrant.js averages. Left to
// List.Median, every borough with an even number of plotted schools would sit
// its dividing line a fraction low, and a handful of schools would land in a
// different quadrant in the workbook than in the app for no visible reason.
//
// This mirrors the JS exactly, including the integer-halving:
//     const mid = sorted.length >> 1;
//     return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
let
    fnMedian = (values as list) as nullable number =>
        let
            Clean = List.RemoveNulls(values),
            Count = List.Count(Clean),
            Sorted = List.Sort(Clean, Order.Ascending),
            Mid = Number.IntegerDivide(Count, 2),
            Result =
                if Count = 0 then null
                else if Number.Mod(Count, 2) = 1 then Sorted{Mid}
                else (Sorted{Mid - 1} + Sorted{Mid}) / 2
        in
            Result
in
    fnMedian
