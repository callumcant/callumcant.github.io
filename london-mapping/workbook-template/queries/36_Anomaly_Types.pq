// Query name: Anomaly_Types
//
// The catalogue: every kind of anomaly the workbook can detect, what it means,
// and what can be done about it.
//
// The first six are ANOMALY_TYPES in js/data/reconcile.js, slug for slug and
// wording for wording. THE SLUGS MATTER: they are what goes in the "Anomaly
// type" column of the Reconciliations table, so a decision recorded in the app
// silences the same anomaly in the workbook and the other way round. Change a
// slug here and every decision ever recorded against it stops matching.
//
// The rest are the ones the workbook found on its own, mostly because it reads
// the export files directly and the app never did. They can be silenced the
// same way, by recording a decision against them — but the app does not detect
// them, so it will ignore those rows. That is fine and worth knowing.
//
// "Order" is only for sorting the Anomalies sheet: worst first, roughly by how
// much of the region's data a single row of that kind can take out.
//
// Load to: connection only. It reaches the sheet through Anomalies and
// Anomaly_Counts.
let
    Source = #table(
        type table [Order = number, #"Anomaly type" = text, #"What it is" = text,
                    #"What it means" = text, #"What you can do" = text, #"Detected by" = text],
        {
            {1, "unmatched-workplace-code", "Workplace code with no URN",
             "Membership data that can't be attached to a school, so it's missing from every rollup.",
             "link, accept, exclude", "App and workbook"},

            {2, "stratum-row-without-workplace-code", "Stratum row with no workplace code",
             "Rows in the export carrying members but no workplace code. They can't be attached to anything, so they are in no school, no borough, no trust and not in London's total either.",
             "accept", "Workbook only"},

            {3, "members-at-closed-school", "Members at a closed school",
             "GIAS says this school is closed but it still carries members — usually a conversion or merger.",
             "successor, accept, exclude", "App and workbook"},

            {4, "stratum-without-gias", "In Stratum, not in GIAS",
             "Membership against a URN the school register doesn't know about.",
             "successor, accept, exclude", "App and workbook"},

            {5, "gias-without-stratum", "In GIAS, no Stratum record",
             "No headcount or membership, so density can't be calculated for this school.",
             "accept, exclude", "App and workbook"},

            {6, "duplicate-workplace-code", "Several workplace codes, one URN",
             "More than one code maps to the same school. Their figures are summed, which may or may not be right.",
             "accept, exclude", "App and workbook"},

            {7, "repeated-workplace-row", "One workplace, several rows in a week",
             "The export has more than one row for a workplace in the same week. Only the first is used; if they were summed the school's membership would double.",
             "accept", "Workbook only"},

            {8, "week-missing-from-history", "A week missing from the exports folder",
             "No export was dropped in for one or more weeks, so the trend jumps that gap. A fortnight's change plotted next to a week's looks like a surge.",
             "accept", "Workbook only"},

            {9, "dispute-urn-not-found", "Dispute lists a school that isn't there",
             "A URN on the dispute tracker matches no school on the School view — a typo, an excluded school, or a school outside London.",
             "accept", "Workbook only"},

            {10, "mat-not-in-matfacts", "MAT with no MatFacts row",
             "A trust appears in GIAS but isn't tracked, so it can't be flagged as a project MAT.",
             "accept", "App and workbook"},

            {11, "note-matches-no-branch", "Branch note matching no branch",
             "A note filed against a branch name that no branch has. It is on nobody's page, and reads as a note nobody wrote.",
             "accept", "Workbook only"},

            {12, "note-matches-no-trust", "MAT note matching no trust",
             "A note filed against a trust name that no trust has — usually a short form like \"Harris Fed\". Add an alias or fix the spelling.",
             "accept", "Workbook only"},

            {13, "membership-groups-dont-sum", "Staff groups don't add up to the total",
             "Teachers plus leadership plus support does not equal total membership. Reported once for the region: it tells us whether Stratum's trainee members sit inside the total or outside it, which nothing documents.",
             "accept", "Workbook only"}
        })
in
    Source
