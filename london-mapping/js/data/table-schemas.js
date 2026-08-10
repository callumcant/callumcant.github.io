// Column order for each Excel Table in the live workbook (see
// /workbook-template/build_workbook.py for the sheet that defines these).
// graph-client.js uses this to convert between Graph's row `values` arrays
// and the plain objects the rest of the app works with. Keep this in sync
// with the workbook template if either changes.
export const TABLE_SCHEMAS = {
  SourceGIAS: ["urn", "schoolName", "phase", "laName", "establishmentStatus", "trusts", "postcode"],
  SourceWorkforce: ["urn", "hcWorkforce", "hcAllTeachers", "hcClassroomTeachers", "hcLeadershipTeachers", "hcAllSupportStaff", "hcTeachingAssistants"],
  WCtoURN: ["workplaceCode", "urn"],
  SourceNEUDashboard: ["workplaceCode", "overallMembers", "voted", "repCount", "volunteers", "wpConversations", "indicativeVoted2025", "indicativeVoted2024", "holdAMeeting", "needsSupport", "pledgedToVote"],
  FieldNotes: ["id", "date", "level", "subject", "title", "note", "author"],
  DisputeTracker: ["id", "employer", "mat", "branch", "live", "schoolsCount", "rorIo", "staffResponsible", "issues", "dateIndicativeOpens", "indicativePercent", "membershipAtIndicative", "formalBallotPercent", "dateOfResolution", "outcome", "totalStrikeDays"],
  BranchFacts: ["branch", "isProjectBranch", "schoolMeetingsHeld", "repsTrainedSinceStart"],
  MatFacts: ["mat", "isTargetMat", "repCommitteeExists"],
};

// Fields that are booleans in JS but stored as "Yes"/"No" text in Excel
// (so they read the same as the workbook's other Yes/No dropdowns).
const YES_NO_FIELDS = new Set(["isProjectBranch", "isTargetMat", "repCommitteeExists"]);

export function rowToObject(tableName, values) {
  const fields = TABLE_SCHEMAS[tableName];
  const obj = {};
  fields.forEach((field, i) => {
    let value = values[i];
    if (value === "" || value === undefined) value = null;
    if (YES_NO_FIELDS.has(field)) value = value === "Yes";
    if (field === "issues" && typeof value === "string") value = value.split(",").map((s) => s.trim()).filter(Boolean);
    if (field === "urn" && value != null) value = Number(value);
    obj[field] = value;
  });
  return obj;
}

export function objectToRow(tableName, obj) {
  const fields = TABLE_SCHEMAS[tableName];
  return fields.map((field) => {
    let value = obj[field];
    if (YES_NO_FIELDS.has(field)) return value ? "Yes" : "No";
    if (field === "issues" && Array.isArray(value)) return value.join(", ");
    return value ?? "";
  });
}
