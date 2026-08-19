// Links out to the NEU's Bargaining Dashboard — the separate tool that holds
// financial detail on employers.
//
// Two URL shapes, and they key on different things:
//   school ->  ?school_urn=140807   (the DfE URN, which we already hold)
//   trust  ->  ?trust=06228587      (the Companies House number, which comes
//                                    from the MatFacts sheet — a trust with no
//                                    number in the workbook simply gets no link)
//
// Nothing here fetches anything: the dashboard has no API we can read, so the
// button is a plain link and the sign-in happens on their side.
import { escapeHtml } from "../ui.js";

const BASE = "https://bsudashboard.neu.org.uk";

// A URN is digits. Anything else means a bad row, and a malformed link into
// someone else's employer page is worse than no link at all.
export function bargainingSchoolUrl(urn) {
  const clean = String(urn ?? "").trim();
  if (!/^\d{4,8}$/.test(clean)) return null;
  return `${BASE}/school?school_urn=${encodeURIComponent(clean)}`;
}

// Companies House numbers are 8 characters: either 8 digits, or a 2-letter
// prefix (SC, NI, OC…) plus 6 digits. Excel strips the leading zero off
// "06228587" the moment anyone retypes it in a numeric cell, so pad an
// all-digit number back to 8 rather than rejecting it — 6228587 is a typo we
// can fix, not a different company.
export function normaliseCompanyNumber(value) {
  const clean = String(value ?? "").trim().toUpperCase().replace(/\s/g, "");
  if (!clean) return null;
  if (/^\d{1,8}$/.test(clean)) return clean.padStart(8, "0");
  if (/^[A-Z]{2}\d{6}$/.test(clean)) return clean;
  return null;
}

export function bargainingTrustUrl(companyNumber) {
  const clean = normaliseCompanyNumber(companyNumber);
  if (!clean) return null;
  return `${BASE}/trust?trust=${encodeURIComponent(clean)}`;
}

// The button. Returns "" when there's nothing to link to, so callers can drop
// it straight into a btn-row without a conditional.
//
// The ↗ is doing real work: it's the only thing marking this as leaving the
// app, and per the project's rule nothing carries meaning by colour alone.
export function bargainingButtonHtml(url, label = "Bargaining Dashboard") {
  if (!url) return "";
  return `<a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
    title="Opens the NEU Bargaining Dashboard in a new tab">${escapeHtml(label)} ↗</a>`;
}
