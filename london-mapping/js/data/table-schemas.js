// Column order for each Excel Table in the live workbook (see
// /workbook-template/build_workbook.py, which generates the matching headers).
// graph-client.js uses this to convert between Graph's row `values` arrays and
// the plain objects the rest of the app works with.
//
// Principle: the Source* tables mirror their raw exports column-for-column, so
// refreshing data stays a straight paste and no export field gets silently
// dropped. Do not trim these to "just what the UI shows today" — that is what
// caused the granularity loss this file was rewritten to fix.
//
// Keep in sync with build_workbook.py if either changes.
export const TABLE_SCHEMAS = {
  // DfE Get Information About Schools export — all 17 columns.
  SourceGIAS: [
    "urn", "schoolName", "typeOfEstablishment", "phase", "laName",
    "establishmentStatus", "religiousCharacter", "diocese", "trusts",
    "schoolSponsors", "federations", "postcode", "schoolWebsite",
    "telephoneNum", "headTitle", "headFirstName", "headLastName",
  ],

  // DfE School Workforce Census export.
  SourceWorkforce: [
    "urn", "schoolName", "laName", "schoolType", "hcWorkforce",
    "hcAllTeachers", "hcClassroomTeachers", "hcLeadershipTeachers",
    "hcAllSupportStaff", "hcTeachingAssistants",
  ],

  WCtoURN: ["workplaceCode", "urn"],

  // NEU membership/organising system export. `turnout` is stored as exported
  // rather than only derived, so the app can show the source figure alongside
  // its own calculation if the two ever disagree.
  SourceNEUDashboard: [
    "workplaceCode", "workplaceName", "overallMembers", "voted", "turnout",
    "repCount", "branchName", "districtName", "regionName", "volunteers",
    "wpConversations", "repRecruitedVolunteer", "joinedCommunity",
    "completedActivateAction", "agreedToBriefing", "indicativeVoted2025",
    "indicativeVoted2024", "holdAMeeting", "needsSupport", "pledgedToVote",
    "activeSEVs", "importDate",
  ],

  FieldNotes: ["id", "date", "level", "subject", "title", "note", "author"],

  DisputeTracker: [
    "id", "employer", "mat", "branch", "live", "schoolsCount", "rorIo",
    "staffResponsible", "issues", "dateIndicativeOpens", "indicativePercent",
    "membershipAtIndicative", "formalBallotPercent", "dateOfResolution",
    "outcome", "totalStrikeDays",
  ],

  // schoolMeetingsHeld is no longer here — it is derived from the Meetings
  // event log. repsTrainedSinceStart stays a manual counter until training
  // data is pipelined in.
  BranchFacts: ["branch", "isProjectBranch", "repsTrainedSinceStart"],
  MatFacts: ["mat", "isTargetMat", "repCommitteeExists"],

  // Append-only. One row per school per capture; branch/MAT/project trends all
  // aggregate up from this grain.
  Snapshots: [
    "snapshotDate", "urn", "overallMembers", "repCount", "hcWorkforce",
    "voted", "volunteers", "wpConversations",
  ],

  // Append-only event logs. Deliberately minimal — date + school is the whole
  // entry, with loggedBy filled from the signed-in account.
  Meetings: ["id", "date", "urn", "loggedBy"],
  RepsRecruited: ["id", "date", "urn", "repName", "loggedBy"],

  // Geocoded postcodes, cached so the lookup runs once. Unused until the map
  // view is built; defined now so the workbook needn't be re-issued for it.
  SchoolGeo: ["urn", "lat", "lon", "geocodedDate"],
};

// Booleans in JS, "Yes"/"No" text in Excel so they read like the workbook's
// other Yes/No dropdowns.
const YES_NO_FIELDS = new Set(["isProjectBranch", "isTargetMat", "repCommitteeExists"]);

// Stored as numbers, and blank must stay blank rather than becoming 0.
const NUMERIC_FIELDS = new Set([
  "urn", "hcWorkforce", "hcAllTeachers", "hcClassroomTeachers",
  "hcLeadershipTeachers", "hcAllSupportStaff", "hcTeachingAssistants",
  "overallMembers", "voted", "turnout", "repCount", "volunteers",
  "wpConversations", "repRecruitedVolunteer", "joinedCommunity",
  "completedActivateAction", "agreedToBriefing", "indicativeVoted2025",
  "indicativeVoted2024", "holdAMeeting", "needsSupport", "pledgedToVote",
  "activeSEVs", "schoolsCount", "indicativePercent", "membershipAtIndicative",
  "formalBallotPercent", "totalStrikeDays", "repsTrainedSinceStart",
  "lat", "lon",
]);

export function rowToObject(tableName, values) {
  const fields = TABLE_SCHEMAS[tableName];
  const obj = {};
  fields.forEach((field, i) => {
    let value = values[i];
    if (value === "" || value === undefined) value = null;
    if (YES_NO_FIELDS.has(field)) {
      value = value === "Yes";
    } else if (field === "issues") {
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
    if (field === "issues" && Array.isArray(value)) return value.join(", ");
    return value ?? "";
  });
}
