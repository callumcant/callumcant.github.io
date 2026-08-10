<!-- GENERATED FILE — do not edit by hand. -->
<!-- Source: data-dictionary/dictionary.json · regenerate with data-dictionary/generate_schemas.py -->

# Data dictionary

Every field the app holds, and where it comes from.

**Sources.** `GIAS` is the DfE's school register and the central spine — every
other source joins to it by URN. `Stratum` is the authoritative source for both
headcount and membership. `Pay Dashboard` covers ballots, engagement and rep
count. `School workforce survey` is a third-party cross-check on headcount plus
workload and pay indicators. `App form` means organisers enter it in the app.
`Derived` means the app calculates it.

**In dictionary** marks fields listed in the uploaded data dictionary.
Fields marked *carried* are kept because the source export contains them and
dropping data has bitten this project before — they cost nothing and stay
available.

## Derived figures

| Figure | Formula | Notes |
| --- | --- | --- |
| Density (total) | `Membership (total) / Headcount (total)` | MAT and borough density MUST be recalculated from summed headcount and membership. It cannot be averaged from constituent school densities. |
| Density (teachers) | `Membership (teachers) / Headcount (teachers)` | Same rule: sum the parts, then divide. |
| Density (leadership) | `Membership (leadership) / Headcount (leadership)` | Same rule: sum the parts, then divide. |
| Density (support) | `Membership (support) / Headcount (support)` | Same rule: sum the parts, then divide. |
| No rep schools | `count of schools where Rep count = 0` |  |
| Rep:member ratio | `summed membership / summed rep count` |  |
| Number of notes | `count of FieldNotes rows for the subject` |  |
| School meetings held | `count of Meetings rows in scope` |  |
| Reps recruited | `count of RepsRecruited rows in scope` |  |
| Number of schools (dispute) | `count of URNs in the dispute's Affected URNs` |  |
| In live dispute | `school URN appears in a dispute where Live = Yes` |  |

> **Density must never be averaged.** MAT and borough density are recalculated
> from summed headcount and summed membership. Averaging the constituent
> schools' densities gives a different — and wrong — answer, because it weights
> a 19-staff nursery the same as a 130-staff secondary.

## SourceGIAS

DfE Get Information About Schools export. The central spine: every other source joins to this by URN.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | URN | `urn` | number | GIAS | Central spine | yes |  |
| 2 | School name | `schoolName` | text | GIAS | Central spine | yes |  |
| 3 | Type of establishment | `typeOfEstablishment` | text | GIAS | Central spine | yes |  |
| 4 | Phase | `phase` | text | GIAS | Central spine | yes |  |
| 5 | LA (borough) | `laName` | text | GIAS | Central spine | yes |  |
| 6 | Establishment status | `establishmentStatus` | text | GIAS | Central spine | carried | Carried beyond the dictionary. Load-bearing for anomaly detection: identifies closed schools that still carry members. |
| 7 | Religious character | `religiousCharacter` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 8 | Diocese | `diocese` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 9 | Trusts (MAT) | `trusts` | text | GIAS | Central spine | yes | Normalised through MatAliases before grouping, so merged and renamed trusts fold together. |
| 10 | School sponsors | `schoolSponsors` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 11 | Federations | `federations` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 12 | Postcode | `postcode` | text | GIAS | Central spine | yes | Geocoded once into SchoolGeo for the map. |
| 13 | School website | `schoolWebsite` | text | GIAS | Central spine | yes |  |
| 14 | Telephone | `telephoneNum` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 15 | Head title | `headTitle` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 16 | Head first name | `headFirstName` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |
| 17 | Head last name | `headLastName` | text | GIAS | Central spine | carried | Carried beyond the dictionary. |

## SourceStratum

Stratum membership export. The authoritative source for BOTH headcount and membership, split teacher/leadership/support. Density is derived from these.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Workplace code | `workplaceCode` | text | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 2 | Workplace name | `workplaceName` | text | Stratum | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary; useful when reconciling unmatched codes. |
| 3 | Headcount (total) | `headcountTotal` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 4 | Headcount (teachers) | `headcountTeachers` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 5 | Headcount (leadership) | `headcountLeadership` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 6 | Headcount (support) | `headcountSupport` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 7 | Membership (total) | `membersTotal` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 8 | Membership (teachers) | `membersTeachers` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 9 | Membership (leadership) | `membersLeadership` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 10 | Membership (support) | `membersSupport` | number | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 11 | Export date | `exportDate` | date | Stratum | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary; records how current the figures are. |

## SourcePayDashboard

NEU Pay Dashboard export. Source for ballot participation, organising engagement and rep count.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Workplace code | `workplaceCode` | text | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 2 | Workplace name | `workplaceName` | text | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 3 | Rep count | `repCount` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Not listed in the dictionary, but 'No rep schools' and 'Rep:member ratio' derive from it. Confirmed as a Pay Dashboard field. |
| 4 | Members voted (2026 indicative) | `membersVoted2026` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 5 | Members voted (2025 indicative) | `membersVoted2025` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 6 | Members voted (2024 indicative) | `membersVoted2024` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 7 | Turnout (2026 indicative) | `turnout2026` | percent | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes | Stored as a fraction (0.72 = 72%). Only 2026 carries a turnout figure in the dictionary; earlier years are counts only. |
| 8 | Volunteers | `volunteers` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 9 | WP conversations | `wpConversations` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 10 | Active SEVs | `activeSEVs` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 11 | Rep recruited volunteer | `repRecruitedVolunteer` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 12 | Joined community | `joinedCommunity` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 13 | Completed activate action | `completedActivateAction` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 14 | Agreed to briefing | `agreedToBriefing` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 15 | Hold a meeting | `holdAMeeting` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 16 | Needs support | `needsSupport` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 17 | Pledged to vote | `pledgedToVote` | number | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 18 | Branch name | `branchName` | text | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 19 | District name | `districtName` | text | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 20 | Region name | `regionName` | text | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |
| 21 | Import date | `importDate` | date | Pay Dashboard | Matched to GIAS via Workplace code to URN conversion | carried | Carried beyond the dictionary. |

## SourceWorkforceSurvey

DfE School Workforce Census. Third-party cross-check on headcount, plus workload and pay indicators not available elsewhere.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | URN | `urn` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 2 | Headcount (third party) | `headcountThirdParty` | number | School workforce survey | Matched to GIAS via URN | yes | The census's own headcount. Kept as a cross-check against Stratum, not used as the density denominator. |
| 3 | Annual turnover (total) | `annualTurnover` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 4 | Pupil:teacher ratio (qualified) | `pupilTeacherRatio` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 5 | Average mean pay | `averageMeanPay` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 6 | Vacancies | `vacancies` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 7 | Average sick days | `averageSickDays` | number | School workforce survey | Matched to GIAS via URN | yes |  |
| 8 | School name | `schoolName` | text | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 9 | LA (borough) | `laName` | text | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 10 | School type | `schoolType` | text | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 11 | All teachers | `hcAllTeachers` | number | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 12 | Classroom teachers | `hcClassroomTeachers` | number | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 13 | Leadership teachers | `hcLeadershipTeachers` | number | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 14 | All support staff | `hcAllSupportStaff` | number | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |
| 15 | Teaching assistants | `hcTeachingAssistants` | number | School workforce survey | Matched to GIAS via URN | carried | Carried beyond the dictionary. |

## WCtoURN

Lookup joining NEU workplace codes to DfE URNs. Both Stratum and the Pay Dashboard key on workplace code; everything else keys on URN.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Workplace code | `workplaceCode` | text | Stratum | Matched to GIAS via Workplace code to URN conversion | yes |  |
| 2 | URN | `urn` | number | GIAS | Central spine | yes |  |

## MatAliases

Folds variant trust names onto one canonical MAT — mergers, renames, and GIAS/Stratum spelling differences.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Alias (as it appears in source data) | `alias` | text | Derived | — | carried |  |
| 2 | Canonical MAT name | `canonicalMat` | text | Derived | — | carried |  |

## FieldNotes

Free-text notes attached to a school, MAT or branch.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | `id` | text | App form | — | carried |  |
| 2 | Date | `date` | date | App form | URN search on entry | yes |  |
| 3 | Level | `level` | text | App form | — | carried |  |
| 4 | Subject | `subject` | text | App form | URN search on entry | yes |  |
| 5 | Title | `title` | text | App form | — | carried | Carried beyond the dictionary; used as the link text in list views. |
| 6 | Note | `note` | text | App form | URN search on entry | yes |  |
| 7 | Author | `author` | text | App form | — | carried | Carried beyond the dictionary. |

## DisputeTracker

Live and closed industrial disputes, attached to the specific schools affected.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | `id` | text | App form | — | carried |  |
| 2 | Employer | `employer` | text | App form | URN search on entry | yes |  |
| 3 | MAT | `mat` | text | App form | — | carried |  |
| 4 | Branch | `branch` | text | App form | — | carried |  |
| 5 | Affected URNs | `urns` | list | App form | URN search on entry | yes | Comma-separated URNs. Makes the map's dispute layer exact rather than inferred from branch/MAT. |
| 6 | Live | `live` | text | App form | URN search on entry | yes |  |
| 7 | Dispute lead (IO/ROR/SIO) | `rorIo` | text | App form | URN search on entry | yes |  |
| 8 | Dispute lead (name) | `staffResponsible` | text | App form | URN search on entry | yes |  |
| 9 | Dispute issues | `issues` | list | App form | URN search on entry | yes |  |
| 10 | Indicative opens (date) | `dateIndicativeOpens` | date | App form | URN search on entry | yes |  |
| 11 | Trade dispute letter (doc link) | `tradeDisputeLetter` | text | App form | URN search on entry | yes |  |
| 12 | Resolved prior to action (y/n) | `resolvedPriorToAction` | text | App form | URN search on entry | yes |  |
| 13 | Indicative % | `indicativePercent` | percent | App form | URN search on entry | yes |  |
| 14 | Membership at indicative | `membershipAtIndicative` | number | App form | URN search on entry | yes |  |
| 15 | Formal ballot request (doc link) | `formalBallotRequest` | text | App form | — | carried | Carried from the original spreadsheet. |
| 16 | Notice of formal ballot (doc link) | `noticeOfFormalBallot` | text | App form | URN search on entry | yes |  |
| 17 | Formal % | `formalBallotPercent` | percent | App form | URN search on entry | yes |  |
| 18 | Notice of strike dates (doc link) | `noticeOfStrikeDates` | text | App form | URN search on entry | yes |  |
| 19 | Date of resolution | `dateOfResolution` | date | App form | URN search on entry | yes |  |
| 20 | Outcome (RAG) | `outcome` | text | App form | URN search on entry | yes |  |
| 21 | Total strike days | `totalStrikeDays` | number | App form | URN search on entry | yes |  |
| 22 | End of dispute report (doc link) | `endOfDisputeReport` | text | App form | URN search on entry | yes |  |

## BranchFacts

Per-borough facts that aren't derivable from any export.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Branch | `branch` | text | Derived | — | carried |  |
| 2 | Is project branch? | `isProjectBranch` | yesno | Derived | — | yes | Highlighted in multiple locations via star. |
| 3 | Reps trained since start | `repsTrainedSinceStart` | number | Derived | — | carried | Manual until training data is pipelined in. Distinct from reps RECRUITED, which is an event log. |

## MatFacts

Per-MAT facts that aren't derivable from any export.

*Pasted in / edited in Excel.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | MAT | `mat` | text | Derived | — | carried |  |
| 2 | Is target MAT? | `isTargetMat` | yesno | Derived | — | yes | Highlighted in multiple locations via star. |
| 3 | Rep committee exists? | `repCommitteeExists` | yesno | Derived | — | carried |  |

## Meetings

Append-only log of school meetings held.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | `id` | text | App form | — | carried |  |
| 2 | Date | `date` | date | App form | URN linked form | yes |  |
| 3 | URN | `urn` | number | App form | URN linked form | yes |  |
| 4 | Logged by | `loggedBy` | text | App form | — | carried |  |

## RepsRecruited

Append-only log of reps recruited.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | `id` | text | App form | — | carried |  |
| 2 | Date | `date` | date | App form | URN linked form | yes |  |
| 3 | URN | `urn` | number | App form | URN linked form | yes |  |
| 4 | Rep name | `repName` | text | App form | URN linked form | yes |  |
| 5 | Logged by | `loggedBy` | text | App form | — | carried |  |

## Snapshots

Append-only weekly capture of the figures that move, so organising impact is measurable over time.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Snapshot date | `snapshotDate` | date | Derived | — | carried |  |
| 2 | URN | `urn` | number | Derived | — | carried |  |
| 3 | Membership (total) | `membersTotal` | number | Derived | — | carried |  |
| 4 | Membership (teachers) | `membersTeachers` | number | Derived | — | carried |  |
| 5 | Membership (leadership) | `membersLeadership` | number | Derived | — | carried |  |
| 6 | Membership (support) | `membersSupport` | number | Derived | — | carried |  |
| 7 | Headcount (total) | `headcountTotal` | number | Derived | — | carried |  |
| 8 | Headcount (teachers) | `headcountTeachers` | number | Derived | — | carried |  |
| 9 | Headcount (leadership) | `headcountLeadership` | number | Derived | — | carried |  |
| 10 | Headcount (support) | `headcountSupport` | number | Derived | — | carried |  |
| 11 | Rep count | `repCount` | number | Derived | — | carried |  |

## Reconciliations

Durable decisions about data anomalies, so the same reconciliation isn't redone at every data refresh.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | `id` | text | App form | — | carried |  |
| 2 | Anomaly type | `anomalyType` | text | App form | — | carried |  |
| 3 | Key (URN or workplace code) | `key` | text | App form | — | carried |  |
| 4 | Action | `action` | text | App form | — | carried | link | successor | accept | exclude |
| 5 | Target key | `targetKey` | text | App form | — | carried | The URN a link/successor points at. Blank for accept/exclude. |
| 6 | Note | `note` | text | App form | — | carried |  |
| 7 | Decided by | `decidedBy` | text | App form | — | carried |  |
| 8 | Decided date | `decidedDate` | date | App form | — | carried |  |

## SchoolGeo

Cached postcode coordinates for the map, so the lookup runs once rather than every page load.

*Written by the app.*

| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | URN | `urn` | number | Derived | — | carried |  |
| 2 | Latitude | `lat` | number | Derived | — | carried |  |
| 3 | Longitude | `lon` | number | Derived | — | carried |  |
| 4 | Geocoded date | `geocodedDate` | date | Derived | — | carried |  |
