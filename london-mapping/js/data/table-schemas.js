// GENERATED FILE — do not edit by hand.
// Source of truth: data-dictionary/dictionary.json
// Regenerate with: python3 data-dictionary/generate_schemas.py
//
// Column order here must match the workbook exactly — the app maps Graph's
// positional row `values` arrays onto field names by this order.
// workbook-template/build_workbook.py reads the same dictionary, so the two
// cannot drift apart.

export const TABLE_SCHEMAS = {
  // DfE Get Information About Schools export. The central spine: every other source joins to this by URN.
  SourceGIAS: [
    "urn", "schoolName", "typeOfEstablishment", "phase", "laName",
    "establishmentStatus", "religiousCharacter", "diocese", "trusts",
    "schoolSponsors", "federations", "postcode", "schoolWebsite",
    "telephoneNum", "headTitle", "headFirstName", "headLastName"
  ],
  // Stratum membership export. The authoritative source for BOTH headcount and membership, split teacher/leadership/support. Density is derived from these.
  SourceStratum: [
    "workplaceCode", "workplaceName", "headcountTotal", "headcountTeachers",
    "headcountLeadership", "headcountSupport", "membersTotal",
    "membersTeachers", "membersLeadership", "membersSupport", "exportDate"
  ],
  // NEU Pay Dashboard export. Source for ballot participation, organising engagement and rep count.
  SourcePayDashboard: [
    "workplaceCode", "workplaceName", "repCount", "membersVoted2026",
    "membersVoted2025", "membersVoted2024", "turnout2026", "volunteers",
    "wpConversations", "activeSEVs", "repRecruitedVolunteer",
    "joinedCommunity", "completedActivateAction", "agreedToBriefing",
    "holdAMeeting", "needsSupport", "pledgedToVote", "branchName",
    "districtName", "regionName", "importDate"
  ],
  // DfE School Workforce Census. Third-party cross-check on headcount, plus workload and pay indicators not available elsewhere.
  SourceWorkforceSurvey: [
    "urn", "headcountThirdParty", "annualTurnover", "pupilTeacherRatio",
    "averageMeanPay", "vacancies", "averageSickDays", "schoolName",
    "laName", "schoolType", "hcAllTeachers", "hcClassroomTeachers",
    "hcLeadershipTeachers", "hcAllSupportStaff", "hcTeachingAssistants"
  ],
  // Lookup joining NEU workplace codes to DfE URNs. Both Stratum and the Pay Dashboard key on workplace code; everything else keys on URN.
  WCtoURN: [
    "workplaceCode", "urn"
  ],
  // Folds variant trust names onto one canonical MAT — mergers, renames, and GIAS/Stratum spelling differences.
  MatAliases: [
    "alias", "canonicalMat"
  ],
  // Free-text notes attached to a school, MAT or branch.
  FieldNotes: [
    "id", "date", "level", "subject", "title", "note", "author"
  ],
  // Live and closed industrial disputes, attached to the specific schools affected.
  DisputeTracker: [
    "id", "employer", "mat", "branch", "urns", "live", "rorIo",
    "staffResponsible", "issues", "dateIndicativeOpens",
    "tradeDisputeLetter", "resolvedPriorToAction", "indicativePercent",
    "membershipAtIndicative", "formalBallotRequest", "noticeOfFormalBallot",
    "formalBallotPercent", "noticeOfStrikeDates", "dateOfResolution",
    "outcome", "totalStrikeDays", "endOfDisputeReport"
  ],
  // Per-borough facts that aren't derivable from any export.
  BranchFacts: [
    "branch", "isProjectBranch", "repsTrainedSinceStart"
  ],
  // Per-MAT facts that aren't derivable from any export.
  MatFacts: [
    "mat", "isTargetMat", "repCommitteeExists"
  ],
  // Append-only log of school meetings held.
  Meetings: [
    "id", "date", "urn", "loggedBy"
  ],
  // Append-only log of reps recruited.
  RepsRecruited: [
    "id", "date", "urn", "repName", "loggedBy"
  ],
  // Append-only weekly capture of the figures that move, so organising impact is measurable over time.
  Snapshots: [
    "snapshotDate", "urn", "membersTotal", "membersTeachers",
    "membersLeadership", "membersSupport", "headcountTotal",
    "headcountTeachers", "headcountLeadership", "headcountSupport",
    "repCount"
  ],
  // Durable decisions about data anomalies, so the same reconciliation isn't redone at every data refresh.
  Reconciliations: [
    "id", "anomalyType", "key", "action", "targetKey", "note", "decidedBy",
    "decidedDate"
  ],
  // Cached postcode coordinates for the map, so the lookup runs once rather than every page load.
  SchoolGeo: [
    "urn", "lat", "lon", "geocodedDate"
  ],
};

// Booleans in JS, "Yes"/"No" text in Excel so they read like the workbook's
// other Yes/No dropdowns.
const YES_NO_FIELDS = new Set([
    "isProjectBranch", "isTargetMat", "repCommitteeExists"
]);

// Stored as numbers, and blank must stay blank rather than becoming 0.
const NUMERIC_FIELDS = new Set([
    "urn", "headcountTotal", "headcountTeachers", "headcountLeadership",
    "headcountSupport", "membersTotal", "membersTeachers",
    "membersLeadership", "membersSupport", "repCount", "membersVoted2026",
    "membersVoted2025", "membersVoted2024", "turnout2026", "volunteers",
    "wpConversations", "activeSEVs", "repRecruitedVolunteer",
    "joinedCommunity", "completedActivateAction", "agreedToBriefing",
    "holdAMeeting", "needsSupport", "pledgedToVote", "headcountThirdParty",
    "annualTurnover", "pupilTeacherRatio", "averageMeanPay", "vacancies",
    "averageSickDays", "hcAllTeachers", "hcClassroomTeachers",
    "hcLeadershipTeachers", "hcAllSupportStaff", "hcTeachingAssistants",
    "indicativePercent", "membershipAtIndicative", "formalBallotPercent",
    "totalStrikeDays", "repsTrainedSinceStart", "lat", "lon"
]);

// Comma-separated in Excel, arrays in JS.
const LIST_FIELDS = new Set([
    "urns", "issues"
]);

export function rowToObject(tableName, values) {
  const fields = TABLE_SCHEMAS[tableName];
  const obj = {};
  fields.forEach((field, i) => {
    let value = values[i];
    if (value === "" || value === undefined) value = null;
    if (YES_NO_FIELDS.has(field)) {
      value = value === "Yes";
    } else if (LIST_FIELDS.has(field)) {
      value = typeof value === "string"
        ? value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    } else if (NUMERIC_FIELDS.has(field) && value != null) {
      const n = Number(value);
      value = Number.isNaN(n) ? null : n;
    }
    obj[field] = value;
  });
  return obj;
}

export function objectToRow(tableName, obj) {
  const fields = TABLE_SCHEMAS[tableName];
  return fields.map((field) => {
    const value = obj[field];
    if (YES_NO_FIELDS.has(field)) return value ? "Yes" : "No";
    if (LIST_FIELDS.has(field)) return Array.isArray(value) ? value.join(", ") : (value ?? "");
    return value ?? "";
  });
}
