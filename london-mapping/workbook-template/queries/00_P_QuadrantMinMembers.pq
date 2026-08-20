// Query name: P_QuadrantMinMembers
//
// The member floor for the two Quadrant columns on the School view: a school
// below it is left blank rather than classified, and it takes no part in the
// medians either.
//
// 10 matches the app's badge default (minMembers in quadrantBadge, js/ui/
// quadrant.js). The Quadrant SHEET's own dropdown can differ — that is why
// the School view columns are documented as a fixed basis.
let
    Source = 10
in
    Source
