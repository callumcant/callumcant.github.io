// ===========================================================================
// GOING LIVE: fill in these three values and the site switches from sample
// data to your real workbook. There is nothing else to change — no flag to
// flip, no IDs to look up. See SETUP.md for where each value comes from.
//
// You can edit this file directly on github.com (open it, click the pencil
// icon, commit) — no need to install anything.
// ===========================================================================
export const CONFIG = {
  // From your IT/Microsoft 365 admin, after they register the app.
  clientId: "REPLACE_WITH_ENTRA_APP_CLIENT_ID",
  tenantId: "REPLACE_WITH_ENTRA_TENANT_ID",

  // The workbook's address in SharePoint/Teams. Open the file in the browser
  // and copy the URL from the address bar — the app resolves the rest itself.
  workbookUrl: "https://neu365.sharepoint.com/:x:/r/sites/NEULondonTeam/Shared%20Documents/London%20data%20(do%20not%20delete)/London_Project_%20all%20london%20data%20spine%20GIAS.xlsx?d=w79c93a834bb7491488ec5a1870dd8a74&csf=1&web=1&e=HvPR4h",

  redirectUri: window.location.origin + window.location.pathname,
};

// Preview mode is inferred, never set by hand: if the config above still
// holds placeholders, the app runs on sample data. That removes the
// "filled in the config but forgot the flag" failure entirely — and its
// opposite, a half-configured app trying to reach a workbook that isn't
// there yet.
export function isPlaceholder(value) {
  return !value || value.startsWith("REPLACE_WITH_");
}

export function isPreviewMode() {
  return (
    isPlaceholder(CONFIG.clientId) ||
    isPlaceholder(CONFIG.tenantId) ||
    isPlaceholder(CONFIG.workbookUrl)
  );
}

// Which of the three are still unfilled — used by the setup page to say
// exactly what's outstanding rather than just "not configured".
export function missingConfigKeys() {
  return ["clientId", "tenantId", "workbookUrl"].filter((k) => isPlaceholder(CONFIG[k]));
}

// Fixed lists mirroring the spreadsheet's data-validation dropdowns, so the
// web forms accept exactly what the workbook accepted. Kept here rather than
// hardcoded in each page so they only need updating in one place.
export const LONDON_BOROUGHS = [
  "Barking and Dagenham", "Barnet", "Bexley", "Brent", "Bromley", "Camden",
  "Croydon", "Ealing", "Enfield", "Greenwich", "Hackney",
  "Hammersmith and Fulham", "Haringey", "Harrow", "Havering", "Hillingdon",
  "Hounslow", "Islington", "Kensington and Chelsea", "Kingston Upon Thames",
  "Lambeth", "Lewisham", "Merton", "Newham", "Redbridge",
  "Richmond Upon Thames", "Southwark", "Sutton", "Tower Hamlets (&CoL)",
  "Waltham Forest", "Wandsworth", "Westminster",
];

export const DISPUTE_ISSUE_TYPES = [
  "Redundancies", "Workload", "TU victimisation", "Management style",
  "Pay policy (inc TLRs)", "Sick pay", "Maternity pay", "Behaviour",
  "Leave policy", "Facility time", "Recognition", "Staffing",
  "Flexible working", "Consultation", "H&S", "Support staff specific",
];

export const ROR_IO_OPTIONS = ["ROR", "IO", "SIO"];
export const RAG_OPTIONS = ["Red", "Amber", "Green"];
export const FIELD_NOTE_LEVELS = ["School", "MAT", "Branch"];
