// Query name: Src_WorkforceSurvey
//
// The school workforce survey: a third-party headcount to check Stratum
// against, plus workload and pay figures. Keyed on URN, so it joins to the
// spine directly with no workplace code in the way.
//
// Load to: connection only.
let
    Raw = fnTable({}, "Workforce Survey export.csv", "SourceWorkforceSurvey"),

    // "School name" and "LA (borough)" are in this export too and are
    // deliberately not kept: GIAS is the spine and owns both. Two columns of
    // the same name from two sources is how a school ends up filed under one
    // borough in the table and another in the rollups.
    Kept = fnExpect(Raw,
        {
            "URN", "Headcount (third party)", "Annual turnover (total)",
            "Pupil:teacher ratio (qualified)", "Average mean pay", "Vacancies",
            "Average sick days", "School type", "All teachers", "Classroom teachers",
            "Leadership teachers", "All support staff", "Teaching assistants"
        },
        "the Workforce Survey export"),

    Typed = Table.TransformColumns(Kept, {
        {"URN", each fnNumber(_), Int64.Type},
        {"Headcount (third party)", each fnNumber(_), type number},
        {"Annual turnover (total)", each fnNumber(_), type number},
        {"Pupil:teacher ratio (qualified)", each fnNumber(_), type number},
        {"Average mean pay", each fnNumber(_), type number},
        {"Vacancies", each fnNumber(_), type number},
        {"Average sick days", each fnNumber(_), type number},
        {"All teachers", each fnNumber(_), type number},
        {"Classroom teachers", each fnNumber(_), type number},
        {"Leadership teachers", each fnNumber(_), type number},
        {"All support staff", each fnNumber(_), type number},
        {"Teaching assistants", each fnNumber(_), type number}
    }),

    WithUrn = Table.SelectRows(Typed, each [URN] <> null),

    // One row per URN. A left join onto a source with a repeated URN does not
    // fail — it DUPLICATES the school in the table, and the school count and
    // every total quietly rise. So the duplicate is resolved here.
    //
    // Last row wins, which is why the rows are reversed before Table.Distinct
    // (which keeps the first of each key). That matches the app, where the
    // lookup is built with new Map(...) and a later row replaces an earlier
    // one. It is an arbitrary rule; what matters is that both sides apply the
    // same arbitrary rule and reach the same figure.
    Result = Table.Distinct(Table.ReverseRows(WithUrn), {"URN"})
in
    Result
