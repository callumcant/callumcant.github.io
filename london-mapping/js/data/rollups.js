// Builds the school / MAT / branch / project views from the raw source tables.
//
// Replaces the original workbook's School-level, MAT-level, Branch-level and
// Project dashboard tabs, whose Google-Sheets-only array formulas don't survive
// being opened as a live Excel file on OneDrive.
//
// Sources, per data-dictionary/dictionary.json:
//   GIAS                  — the spine (one row per school, keyed by URN)
//   Stratum               — headcount AND membership, split by staff category
//   Pay Dashboard         — ballots, engagement, rep count
//   School workforce survey — third-party headcount cross-check, workload/pay
// Stratum and the Pay Dashboard key on workplace code and join via WCtoURN.
//
// buildSchoolLevel passes through every field from the source tables rather
// than a chosen subset: the site has to be a superset of the spreadsheet, and
// the view layer decides what to show, not this layer.
import { applyReconciliations, canonicalMat } from "./reconcile.js";

// The attendee count on a meeting row, or null when there isn't one. Meetings
// logged before the Attendees column existed carry no figure, and an empty
// Excel cell arrives as "" rather than as a number — so every total built on
// this reads as a floor, not an exact headcount.
export function meetingAttendees(meeting) {
  if (meeting?.attendees == null || meeting.attendees === "") return null;
  const n = Number(meeting.attendees);
  return Number.isFinite(n) ? n : null;
}

// Ballot "success" isn't in the source data as a flag — only the raw %. This
// treats >=50% Yes as successful, matching common NEU ballot reporting; adjust
// if your branches define it against the legal 50% turnout / 40% eligible tests.
const SUCCESS_THRESHOLD = 0.5;

function sum(arr, fn) {
  return arr.reduce((total, item) => total + (fn(item) || 0), 0);
}

function safeDiv(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

function latestBy(rows, key = "date") {
  return rows.reduce((latest, r) => (!latest || r[key] > latest[key] ? r : latest), null);
}

// ---------------------------------------------------------------------------
// Density
//
// THE RULE, from the data dictionary: density at MAT and borough level must be
// recalculated from summed headcount and summed membership. It cannot be
// averaged from the constituent schools' densities.
//
// Averaging weights a 19-staff nursery the same as a 130-staff secondary and
// gives a materially different — wrong — answer. Every aggregate below goes
// through this helper for exactly that reason; if you are tempted to
// "simplify" it into a mean of school densities, don't.
// ---------------------------------------------------------------------------
function densities(members, headcount) {
  return {
    densityTotal: safeDiv(members.total, headcount.total),
    densityTeachers: safeDiv(members.teachers, headcount.teachers),
    densityLeadership: safeDiv(members.leadership, headcount.leadership),
    densitySupport: safeDiv(members.support, headcount.support),
  };
}

function sumMembers(schools) {
  return {
    total: sum(schools, (s) => s.membersTotal),
    teachers: sum(schools, (s) => s.membersTeachers),
    leadership: sum(schools, (s) => s.membersLeadership),
    support: sum(schools, (s) => s.membersSupport),
  };
}

function sumHeadcount(schools) {
  return {
    total: sum(schools, (s) => s.headcountTotal),
    teachers: sum(schools, (s) => s.headcountTeachers),
    leadership: sum(schools, (s) => s.headcountLeadership),
    support: sum(schools, (s) => s.headcountSupport),
  };
}

export function buildSchoolLevel(state) {
  // Manual reconciliation decisions are applied before any joining, so a
  // resolved anomaly actually moves the numbers rather than just leaving the
  // Anomalies page.
  const { urnByWorkplaceCode, excludedUrns, successorOf } = applyReconciliations(state);

  const stratumByUrn = new Map();
  for (const row of state.sourceStratum) {
    let urn = urnByWorkplaceCode.get(row.workplaceCode);
    if (urn == null) continue;
    urn = successorOf.get(String(urn)) ?? urn; // members follow a closed school to its successor
    const existing = stratumByUrn.get(String(urn));
    // A successor URN can receive rows from more than one predecessor code.
    stratumByUrn.set(String(urn), existing ? mergeStratum(existing, row) : row);
  }

  const payByUrn = new Map();
  for (const row of state.sourcePayDashboard) {
    let urn = urnByWorkplaceCode.get(row.workplaceCode);
    if (urn == null) continue;
    urn = successorOf.get(String(urn)) ?? urn;
    const existing = payByUrn.get(String(urn));
    payByUrn.set(String(urn), existing ? mergePay(existing, row) : row);
  }

  const surveyByUrn = new Map(state.sourceWorkforceSurvey.map((w) => [String(w.urn), w]));

  const meetingsByUrn = new Map();
  const attendeesByUrn = new Map();
  for (const m of state.meetings) {
    const key = String(m.urn);
    meetingsByUrn.set(key, (meetingsByUrn.get(key) || 0) + 1);
    attendeesByUrn.set(key, (attendeesByUrn.get(key) || 0) + (meetingAttendees(m) ?? 0));
  }

  // A school is in dispute if its URN is listed on a live dispute — exact,
  // rather than inferred from the dispute's branch or MAT.
  const disputeUrns = new Map();
  for (const d of state.disputeTracker) {
    for (const urn of d.urns || []) {
      if (!disputeUrns.has(String(urn))) disputeUrns.set(String(urn), []);
      disputeUrns.get(String(urn)).push(d);
    }
  }

  return state.sourceGIAS
    .filter((school) => !excludedUrns.has(String(school.urn)))
    .map((school) => {
      const key = String(school.urn);
      const st = stratumByUrn.get(key) || {};
      const pay = payByUrn.get(key) || {};
      const sv = surveyByUrn.get(key) || {};
      const notes = state.fieldNotes.filter(
        (n) => n.level === "School" && String(n.subject) === key
      );
      const lastNote = latestBy(notes);
      const schoolDisputes = disputeUrns.get(key) || [];

      const members = {
        total: st.membersTotal ?? 0,
        teachers: st.membersTeachers ?? 0,
        leadership: st.membersLeadership ?? 0,
        support: st.membersSupport ?? 0,
      };
      const headcount = {
        total: st.headcountTotal ?? 0,
        teachers: st.headcountTeachers ?? 0,
        leadership: st.headcountLeadership ?? 0,
        support: st.headcountSupport ?? 0,
      };

      return {
        // --- GIAS (the spine) ---
        urn: school.urn,
        schoolName: school.schoolName,
        typeOfEstablishment: school.typeOfEstablishment ?? "",
        phase: school.phase ?? "",
        laName: school.laName ?? "",
        establishmentStatus: school.establishmentStatus ?? "",
        religiousCharacter: school.religiousCharacter ?? "",
        diocese: school.diocese ?? "",
        trust: canonicalMat(state, school.trusts),
        trustAsSourced: school.trusts || "",
        schoolSponsors: school.schoolSponsors ?? "",
        federations: school.federations ?? "",
        postcode: school.postcode ?? "",
        schoolWebsite: school.schoolWebsite ?? "",
        telephoneNum: school.telephoneNum ?? "",
        headName: [school.headTitle, school.headFirstName, school.headLastName]
          .filter(Boolean).join(" "),

        // --- Stratum: headcount, membership and reps ---
        workplaceCode: st.workplaceCode ?? pay.workplaceCode ?? "",
        headcountTotal: headcount.total,
        headcountTeachers: headcount.teachers,
        headcountLeadership: headcount.leadership,
        headcountSupport: headcount.support,
        membersTotal: members.total,
        membersTeachers: members.teachers,
        membersLeadership: members.leadership,
        membersSupport: members.support,
        repCount: st.repCount ?? 0,
        stratumExportDate: st.exportDate ?? null,
        ...densities(members, headcount),

        // --- Pay Dashboard: ballots and engagement ---
        membersVoted2026: pay.membersVoted2026 ?? null,
        membersVoted2025: pay.membersVoted2025 ?? null,
        membersVoted2024: pay.membersVoted2024 ?? null,
        turnout2026: pay.turnout2026 ?? null,
        volunteers: pay.volunteers ?? 0,
        wpConversations: pay.wpConversations ?? 0,
        activeSEVs: pay.activeSEVs ?? 0,
        repRecruitedVolunteer: pay.repRecruitedVolunteer ?? 0,
        joinedCommunity: pay.joinedCommunity ?? 0,
        completedActivateAction: pay.completedActivateAction ?? 0,
        agreedToBriefing: pay.agreedToBriefing ?? 0,
        holdAMeeting: pay.holdAMeeting ?? 0,
        needsSupport: pay.needsSupport ?? 0,
        pledgedToVote: pay.pledgedToVote ?? 0,
        branchName: pay.branchName ?? "",
        districtName: pay.districtName ?? "",
        regionName: pay.regionName ?? "",
        importDate: pay.importDate ?? null,

        // --- Workforce survey: third-party cross-check + workload/pay ---
        headcountThirdParty: sv.headcountThirdParty ?? null,
        annualTurnover: sv.annualTurnover ?? null,
        pupilTeacherRatio: sv.pupilTeacherRatio ?? null,
        averageMeanPay: sv.averageMeanPay ?? null,
        vacancies: sv.vacancies ?? null,
        averageSickDays: sv.averageSickDays ?? null,
        schoolType: sv.schoolType ?? "",
        hcAllTeachers: sv.hcAllTeachers ?? null,
        hcClassroomTeachers: sv.hcClassroomTeachers ?? null,
        hcLeadershipTeachers: sv.hcLeadershipTeachers ?? null,
        hcAllSupportStaff: sv.hcAllSupportStaff ?? null,
        hcTeachingAssistants: sv.hcTeachingAssistants ?? null,

        // --- Derived from app activity ---
        meetingsLogged: meetingsByUrn.get(key) || 0,
        meetingAttendees: attendeesByUrn.get(key) || 0,
        noteCount: notes.length,
        lastNoteDate: lastNote?.date ?? null,
        latestNoteTitle: lastNote?.title ?? null,
        disputes: schoolDisputes,
        inLiveDispute: schoolDisputes.some((d) => d.live === "Yes"),
      };
    });
}

function mergeStratum(a, b) {
  return {
    ...a,
    headcountTotal: (a.headcountTotal || 0) + (b.headcountTotal || 0),
    headcountTeachers: (a.headcountTeachers || 0) + (b.headcountTeachers || 0),
    headcountLeadership: (a.headcountLeadership || 0) + (b.headcountLeadership || 0),
    headcountSupport: (a.headcountSupport || 0) + (b.headcountSupport || 0),
    membersTotal: (a.membersTotal || 0) + (b.membersTotal || 0),
    membersTeachers: (a.membersTeachers || 0) + (b.membersTeachers || 0),
    membersLeadership: (a.membersLeadership || 0) + (b.membersLeadership || 0),
    membersSupport: (a.membersSupport || 0) + (b.membersSupport || 0),
    repCount: (a.repCount || 0) + (b.repCount || 0),
  };
}

function mergePay(a, b) {
  return {
    ...a,
    volunteers: (a.volunteers || 0) + (b.volunteers || 0),
    wpConversations: (a.wpConversations || 0) + (b.wpConversations || 0),
    activeSEVs: (a.activeSEVs || 0) + (b.activeSEVs || 0),
  };
}

// The same measures over any arbitrary set of schools — a branch, a trust, the
// project as a whole, or everything outside it. The dashboard runs every scope
// through this one function so a regional figure and a branch figure are
// genuinely the same calculation, and density goes through densities() like
// everywhere else rather than being averaged.
export function summariseSchools(schools) {
  const members = sumMembers(schools);
  const headcount = sumHeadcount(schools);
  const reps = sum(schools, (s) => s.repCount);
  return {
    schoolCount: schools.length,
    membersTotal: members.total,
    membersTeachers: members.teachers,
    membersLeadership: members.leadership,
    membersSupport: members.support,
    headcountTotal: headcount.total,
    ...densities(members, headcount),
    reps,
    memberRepRatio: reps === 0 ? "No reps" : `1:${Math.round(members.total / reps)}`,
    noRepSchools: schools.filter((s) => s.repCount === 0).length,
    meetingsHeld: sum(schools, (s) => s.meetingsLogged),
    meetingAttendeesTotal: sum(schools, (s) => s.meetingAttendees),
  };
}

// Rep committee status: the most recent RepCommittees row by effective date,
// falling back to the manual MatFacts column for trusts nobody has reported on
// yet. Resolved here rather than at the page, so the MAT page's toggle and the
// dashboard's committee count can never disagree.
//
// Ties on effectiveFrom are broken by row order, which for an append-only table
// means the later report wins — the same rule a person would apply.
function resolveRepCommittee(state, trust, fallback) {
  let latest = null;
  for (const row of state.repCommittees || []) {
    if (row.mat !== trust || !row.effectiveFrom) continue;
    if (!latest || row.effectiveFrom >= latest.effectiveFrom) latest = row;
  }
  if (!latest) return { exists: !!fallback, since: null, reported: false };
  return { exists: !!latest.exists, since: latest.effectiveFrom, reported: true };
}

export function buildMatLevel(schools, state) {
  const byTrust = new Map();
  for (const s of schools) {
    if (!s.trust) continue;
    if (!byTrust.has(s.trust)) byTrust.set(s.trust, []);
    byTrust.get(s.trust).push(s);
  }

  return [...byTrust.entries()].map(([trust, matSchools]) => {
    const schoolCount = matSchools.length;
    const noRepSchools = matSchools.filter((s) => s.repCount === 0).length;
    const members = sumMembers(matSchools);
    const headcount = sumHeadcount(matSchools);
    const reps = sum(matSchools, (s) => s.repCount);
    const notes = state.fieldNotes.filter((n) => n.level === "MAT" && n.subject === trust);
    const lastNote = latestBy(notes);
    const facts = state.matFacts.find((f) => f.mat === trust)
      || { isTargetMat: false, repCommitteeExists: false, companyNumber: null };
    const committee = resolveRepCommittee(state, trust, facts.repCommitteeExists);

    return {
      name: trust,
      isTargetMat: facts.isTargetMat,
      // Only used to build the Bargaining Dashboard link; null is normal.
      companyNumber: facts.companyNumber || null,
      schoolCount,
      boroughsPresent: [...new Set(matSchools.map((s) => s.laName))].sort(),
      phasesPresent: [...new Set(matSchools.map((s) => s.phase))].sort(),
      headcountTotal: headcount.total,
      headcountTeachers: headcount.teachers,
      headcountLeadership: headcount.leadership,
      headcountSupport: headcount.support,
      membersTotal: members.total,
      membersTeachers: members.teachers,
      membersLeadership: members.leadership,
      membersSupport: members.support,
      // Recalculated from the sums above — never averaged. See the note on
      // densities().
      ...densities(members, headcount),
      reps,
      memberRepRatio: reps === 0 ? "No reps" : `1:${Math.round(members.total / reps)}`,
      noRepSchools,
      repCoveragePercent: safeDiv(schoolCount - noRepSchools, schoolCount),
      membersInNoRepSchools: sum(matSchools.filter((s) => s.repCount === 0), (s) => s.membersTotal),
      repCommitteeExists: committee.exists,
      repCommitteeSince: committee.since,
      repCommitteeReported: committee.reported,
      meetingsHeld: sum(matSchools, (s) => s.meetingsLogged),
      meetingAttendeesTotal: sum(matSchools, (s) => s.meetingAttendees),
      noteCount: notes.length,
      lastNoteDate: lastNote?.date ?? null,
      latestNoteTitle: lastNote?.title ?? null,
      schools: matSchools,
    };
  });
}

export function buildBranchLevel(schools, state) {
  const byBranch = new Map();
  for (const s of schools) {
    if (!byBranch.has(s.laName)) byBranch.set(s.laName, []);
    byBranch.get(s.laName).push(s);
  }

  return [...byBranch.entries()].map(([branch, branchSchools]) => {
    const members = sumMembers(branchSchools);
    const headcount = sumHeadcount(branchSchools);
    const reps = sum(branchSchools, (s) => s.repCount);
    const noRepSchoolsList = branchSchools.filter((s) => s.repCount === 0);
    const biggestNoRep = noRepSchoolsList.reduce(
      (biggest, s) => (!biggest || s.membersTotal > biggest.membersTotal ? s : biggest),
      null
    );
    const notes = state.fieldNotes.filter((n) => n.level === "Branch" && n.subject === branch);
    const lastNote = latestBy(notes);
    const facts = state.branchFacts.find((f) => f.branch === branch)
      || { isProjectBranch: false, repsTrainedSinceStart: 0 };

    return {
      name: branch,
      isProjectBranch: facts.isProjectBranch,
      schoolsCount: branchSchools.length,
      headcountTotal: headcount.total,
      headcountTeachers: headcount.teachers,
      headcountLeadership: headcount.leadership,
      headcountSupport: headcount.support,
      membersTotal: members.total,
      membersTeachers: members.teachers,
      membersLeadership: members.leadership,
      membersSupport: members.support,
      // Recalculated from the sums above — never averaged.
      ...densities(members, headcount),
      reps,
      memberRepRatio: reps === 0 ? "No reps" : `1:${Math.round(members.total / reps)}`,
      noRepSchools: noRepSchoolsList.length,
      // Expressed the same way as the MAT figure, so the two pages are
      // comparable rather than one carrying a count and the other a share.
      repCoveragePercent: safeDiv(branchSchools.length - noRepSchoolsList.length, branchSchools.length),
      membersInNoRepSchools: sum(noRepSchoolsList, (s) => s.membersTotal),
      headcountInNoRepSchools: sum(noRepSchoolsList, (s) => s.headcountTotal),
      biggestNoRepSchool: biggestNoRep
        ? { name: biggestNoRep.schoolName, members: biggestNoRep.membersTotal }
        : null,
      // Derived from the Meetings event log rather than a hand-kept counter, so
      // it carries a trend and can be drilled into.
      schoolMeetingsHeld: sum(branchSchools, (s) => s.meetingsLogged),
      // A floor rather than a headcount: meetings logged before the Attendees
      // column existed contribute nothing to it.
      meetingAttendeesTotal: sum(branchSchools, (s) => s.meetingAttendees),
      // Still manual: rep *training* data is a later pipeline and is not the
      // same thing as recruitment.
      repsTrainedSinceStart: facts.repsTrainedSinceStart ?? 0,
      noteCount: notes.length,
      lastNoteDate: lastNote?.date ?? null,
      latestNoteTitle: lastNote?.title ?? null,
      schools: branchSchools,
    };
  });
}

export function disputeKpis(disputes) {
  return {
    liveDisputes: disputes.filter((d) => d.live === "Yes").length,
    successfulIndicativeBallots: disputes.filter(
      (d) => d.indicativePercent != null && d.indicativePercent >= SUCCESS_THRESHOLD
    ).length,
    successfulFormalBallots: disputes.filter(
      (d) => d.formalBallotPercent != null && d.formalBallotPercent >= SUCCESS_THRESHOLD
    ).length,
    strikeDays: sum(disputes, (d) => d.totalStrikeDays),
    greenDisputes: disputes.filter((d) => d.outcome === "Green").length,
  };
}

export function buildProjectDashboard(branches, mats, disputes) {
  const projectBranches = branches.filter((b) => b.isProjectBranch);
  const projectMats = mats.filter((m) => m.isTargetMat);

  // Aggregated from the schools themselves rather than from the branch/MAT
  // figures, so density is summed once at the finest grain — see densities().
  const branchSchools = projectBranches.flatMap((b) => b.schools);
  const matSchools = projectMats.flatMap((m) => m.schools);

  const branchMembers = sumMembers(branchSchools);
  const branchHeadcount = sumHeadcount(branchSchools);
  const matMembers = sumMembers(matSchools);
  const matHeadcount = sumHeadcount(matSchools);

  const branchReps = sum(projectBranches, (b) => b.reps);
  const matReps = sum(projectMats, (m) => m.reps);

  const projectBranchNames = projectBranches.map((b) => b.name);
  const projectMatNames = projectMats.map((m) => m.name);
  const branchDisputes = disputes.filter((d) => projectBranchNames.includes(d.branch));
  const matDisputes = disputes.filter((d) => d.mat && projectMatNames.includes(d.mat));

  return {
    projectBranches: {
      membersTotal: branchMembers.total,
      headcountTotal: branchHeadcount.total,
      ...densities(branchMembers, branchHeadcount),
      noRepSchools: sum(projectBranches, (b) => b.noRepSchools),
      memberRepRatio: branchReps === 0 ? "No reps" : `1:${Math.round(branchMembers.total / branchReps)}`,
      schoolMeetingsHeld: sum(projectBranches, (b) => b.schoolMeetingsHeld),
      meetingAttendeesTotal: sum(projectBranches, (b) => b.meetingAttendeesTotal),
      repsTrainedSinceStart: sum(projectBranches, (b) => b.repsTrainedSinceStart),
      ...disputeKpis(branchDisputes),
    },
    projectMats: {
      membersTotal: matMembers.total,
      headcountTotal: matHeadcount.total,
      ...densities(matMembers, matHeadcount),
      noRepSchools: sum(projectMats, (m) => m.noRepSchools),
      memberRepRatio: matReps === 0 ? "No reps" : `1:${Math.round(matMembers.total / matReps)}`,
      repCommittees: projectMats.filter((m) => m.repCommitteeExists).length,
      meetingsHeld: sum(projectMats, (m) => m.meetingsHeld),
      meetingAttendeesTotal: sum(projectMats, (m) => m.meetingAttendeesTotal),
      ...disputeKpis(matDisputes),
    },
    branchList: projectBranches,
    matList: projectMats,
  };
}
