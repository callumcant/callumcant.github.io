// Anomaly detection and durable reconciliation.
//
// Roughly 5–10% of schools don't match cleanly across GIAS, Stratum and the Pay
// Dashboard: workplace codes with no URN, schools in one source and not
// another, members still attached to a school GIAS says has closed.
//
// The design point: detection is recomputed from live data every load, but
// *decisions are stored*. Cleaning a CSV fixes the problem once; recording
// "this workplace code belongs to that URN" fixes it for every future refresh.
// Reconciliations is append-only — superseding a decision means a newer row,
// so the audit trail survives.
import { getState } from "./store.js";

export const ANOMALY_TYPES = {
  "unmatched-workplace-code": {
    label: "Workplace code with no URN",
    explain: "Membership data that can't be attached to a school, so it's missing from every rollup.",
    actions: ["link", "accept", "exclude"],
  },
  "gias-without-stratum": {
    label: "In GIAS, no Stratum record",
    explain: "No headcount or membership, so density can't be calculated for this school.",
    actions: ["accept", "exclude"],
  },
  "stratum-without-gias": {
    label: "In Stratum, not in GIAS",
    explain: "Membership against a URN the school register doesn't know about.",
    actions: ["successor", "accept", "exclude"],
  },
  "members-at-closed-school": {
    label: "Members at a closed school",
    explain: "GIAS says this school is closed but it still carries members — usually a conversion or merger.",
    actions: ["successor", "accept", "exclude"],
  },
  "duplicate-workplace-code": {
    label: "Several workplace codes, one URN",
    explain: "More than one code maps to the same school. Their figures are summed, which may or may not be right.",
    actions: ["accept", "exclude"],
  },
  "mat-not-in-matfacts": {
    label: "MAT with no MatFacts row",
    explain: "A trust appears in GIAS but isn't tracked, so it can't be flagged as a project MAT.",
    actions: ["accept"],
  },
};

const OPEN_STATUSES = new Set(["open", "open, but proposed to close"]);

function isClosed(school) {
  const status = (school.establishmentStatus || "").trim().toLowerCase();
  if (!status) return false;
  return !OPEN_STATUSES.has(status);
}

// Latest decision per (type, key) — append-only means later rows supersede.
export function latestDecisions(state) {
  const byKey = new Map();
  for (const r of state.reconciliations || []) {
    const k = `${r.anomalyType}|${r.key}`;
    const prev = byKey.get(k);
    if (!prev || (r.decidedDate || "") >= (prev.decidedDate || "")) byKey.set(k, r);
  }
  return byKey;
}

// Folds merged / renamed / differently-spelled trusts onto one canonical name.
// Compass Eko (a merger of Compass Partnership of Schools and EKO Trust) is the
// case that prompted this, but renames and source spelling differences are the
// same shape of problem.
export function canonicalMat(state, rawName) {
  const name = (rawName || "").trim();
  if (!name) return "";
  const alias = (state.matAliases || []).find(
    (a) => (a.alias || "").trim().toLowerCase() === name.toLowerCase()
  );
  return alias ? alias.canonicalMat : name;
}

// The decisions that change how data is joined, in the shape buildSchoolLevel
// wants. Called once per rollup build.
export function applyReconciliations(state) {
  const decisions = latestDecisions(state);

  const urnByWorkplaceCode = new Map(
    state.wcToUrn.map((r) => [r.workplaceCode, r.urn])
  );
  const excludedUrns = new Set();
  const successorOf = new Map();

  for (const d of decisions.values()) {
    if (d.action === "link" && d.targetKey) {
      // Manual workplace-code -> URN mapping, overriding/extending WCtoURN.
      urnByWorkplaceCode.set(d.key, Number(d.targetKey));
    } else if (d.action === "successor" && d.targetKey) {
      successorOf.set(String(d.key), Number(d.targetKey));
    } else if (d.action === "exclude") {
      excludedUrns.add(String(d.key));
    }
  }

  return { urnByWorkplaceCode, excludedUrns, successorOf, decisions };
}

// Recomputed on every load from the current data. Anything with an `accept`,
// `link`, `successor` or `exclude` decision recorded against it drops out.
export function detectAnomalies(state = getState()) {
  const decisions = latestDecisions(state);
  const resolved = (type, key) => decisions.has(`${type}|${key}`);

  const found = [];
  const add = (type, key, label, detail, extra = {}) => {
    if (resolved(type, key)) return;
    found.push({ type, key, label, detail, ...extra });
  };

  const giasByUrn = new Map(state.sourceGIAS.map((g) => [String(g.urn), g]));
  const { urnByWorkplaceCode } = applyReconciliations(state);

  // 1. Workplace codes in Stratum or the Pay Dashboard with no URN mapping.
  const codes = new Set([
    ...state.sourceStratum.map((r) => r.workplaceCode),
    ...state.sourcePayDashboard.map((r) => r.workplaceCode),
  ].filter(Boolean));
  for (const code of codes) {
    if (!urnByWorkplaceCode.has(code)) {
      const stratum = state.sourceStratum.find((r) => r.workplaceCode === code);
      add(
        "unmatched-workplace-code", code,
        stratum?.workplaceName || code,
        `${code}${stratum?.membersTotal ? ` · ${stratum.membersTotal} members` : ""} has no row in WCtoURN.`,
        { members: stratum?.membersTotal ?? null }
      );
    }
  }

  // 2/3. Presence mismatches between GIAS and Stratum.
  const stratumUrns = new Set();
  for (const row of state.sourceStratum) {
    const urn = urnByWorkplaceCode.get(row.workplaceCode);
    if (urn != null) stratumUrns.add(String(urn));
  }
  for (const school of state.sourceGIAS) {
    if (!stratumUrns.has(String(school.urn))) {
      add(
        "gias-without-stratum", String(school.urn),
        school.schoolName,
        `URN ${school.urn} (${school.laName}) has no Stratum record, so it has no headcount or membership.`
      );
    }
  }
  for (const urn of stratumUrns) {
    if (!giasByUrn.has(urn)) {
      add(
        "stratum-without-gias", urn,
        `URN ${urn}`,
        `Stratum data maps to URN ${urn}, which isn't in the GIAS export.`
      );
    }
  }

  // 4. Members still recorded against a school GIAS says is closed.
  for (const school of state.sourceGIAS) {
    if (!isClosed(school)) continue;
    const urn = String(school.urn);
    if (!stratumUrns.has(urn)) continue;
    const row = state.sourceStratum.find(
      (r) => String(urnByWorkplaceCode.get(r.workplaceCode)) === urn
    );
    if ((row?.membersTotal ?? 0) > 0) {
      add(
        "members-at-closed-school", urn,
        school.schoolName,
        `Status "${school.establishmentStatus}" but ${row.membersTotal} members recorded. Point it at its successor school if it converted.`,
        { members: row.membersTotal }
      );
    }
  }

  // 5. Several workplace codes resolving to one URN.
  const codesPerUrn = new Map();
  for (const [code, urn] of urnByWorkplaceCode.entries()) {
    const k = String(urn);
    if (!codesPerUrn.has(k)) codesPerUrn.set(k, []);
    codesPerUrn.get(k).push(code);
  }
  for (const [urn, list] of codesPerUrn.entries()) {
    if (list.length > 1) {
      add(
        "duplicate-workplace-code", urn,
        giasByUrn.get(urn)?.schoolName || `URN ${urn}`,
        `${list.length} workplace codes map here (${list.join(", ")}). Their figures are summed.`
      );
    }
  }

  // 6. Trusts present in GIAS with no MatFacts row — can't be flagged as a
  //    project MAT, and won't get a rep-committee status.
  const trackedMats = new Set((state.matFacts || []).map((m) => m.mat));
  const seenMats = new Set();
  for (const school of state.sourceGIAS) {
    const mat = canonicalMat(state, school.trusts);
    if (!mat || seenMats.has(mat)) continue;
    seenMats.add(mat);
    if (!trackedMats.has(mat)) {
      add(
        "mat-not-in-matfacts", mat, mat,
        `"${mat}" appears in GIAS but has no MatFacts row. Add one if it should be tracked, or an alias if it's another name for a trust you already track.`
      );
    }
  }

  const byType = new Map();
  for (const a of found) {
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type).push(a);
  }
  return { all: found, byType, resolvedCount: decisions.size };
}
