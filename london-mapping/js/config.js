// Central config. Flip USE_MOCK_DATA to false once Entra/Graph are wired up
// (see SETUP.md) and fill in the msal/graph values below.
export const CONFIG = {
  USE_MOCK_DATA: true,

  msal: {
    clientId: "REPLACE_WITH_ENTRA_APP_CLIENT_ID",
    tenantId: "REPLACE_WITH_ENTRA_TENANT_ID",
    redirectUri: window.location.origin + window.location.pathname,
  },

  graph: {
    // SharePoint site id and the workbook's driveItem id — see SETUP.md
    // for how to find these once the file is uploaded.
    siteId: "REPLACE_WITH_SHAREPOINT_SITE_ID",
    driveItemId: "REPLACE_WITH_WORKBOOK_ITEM_ID",
  },
};

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

// The dashboard's "Project branches" / "Project MATs" scope. In the live
// workbook this should live in a small ProjectScope table so it can be
// edited without a code change; mock mode reads the equivalent from
// mock-data.js. Kept here as the fallback/shape reference.
export const DEFAULT_PROJECT_BRANCHES = [
  "Bromley", "Greenwich", "Havering", "Hillingdon",
  "Kensington and Chelsea", "Wandsworth",
];
