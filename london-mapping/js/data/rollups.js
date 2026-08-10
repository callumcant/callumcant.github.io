// Port of the workbook's School-level / MAT-level / Branch-level / Project
// dashboard tabs, as plain joins and aggregations instead of spreadsheet
// formulas. The original used Google-Sheets-only FILTER/UNIQUE/ARRAYFORMULA
// (visible as __xludf.DUMMYFUNCTION wrappers when opened in Excel), which
// don't run reliably once the workbook lives on OneDrive — this reimplements
// the same *intent*, column by column, against the raw source tables.
//
// Ballot "success" isn't in the source data as a flag — the workbook only
// stores the raw %. This treats >=50% Yes as successful, matching common
// NEU ballot reporting; adjust SUCCESS_THRESHOLD if your branches define it
// differently (e.g. against the legal 50% turnout / 40% eligible thresholds).
const SUCCESS_THRESHOLD = 0.5;

function sum(arr, fn) {
  return arr.reduce((total, item) => total + (fn(item) || 0), 0);
}

function safeDiv(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

export function buildSchoolLevel(state) {
  const workforceByUrn = new Map(state.sourceWorkforce.map((w) => [w.urn, w]));
  const urnByWorkplaceCode = new Map(state.wcToUrn.map((r) => [r.workplaceCode, r.urn]));
  const neuByUrn = new Map();
  for (const row of state.sourceNeuDashboard) {
    const urn = urnByWorkplaceCode.get(row.workplaceCode);
    if (urn != null) neuByUrn.set(urn, row);
  }

  return state.sourceGIAS.map((school) => {
    const wf = workforceByUrn.get(school.urn) || {};
    const neu = neuByUrn.get(school.urn) || {};
    const notes = state.fieldNotes.filter(
      (n) => n.level === "School" && String(n.subject) === String(school.urn)
    );
    const lastNote = notes.reduce(
      (latest, n) => (!latest || n.date > latest.date ? n : latest),
      null
    );

    const overallMembers = neu.overallMembers ?? 0;
    const hcWorkforce = wf.hcWorkforce ?? 0;
    const repCount = neu.repCount ?? 0;

    return {
      urn: school.urn,
      schoolName: school.schoolName,
      laName: school.laName,
      phase: school.phase,
      establishmentStatus: school.establishmentStatus,
      trust: school.trusts || "",
      postcode: school.postcode,
      hcWorkforce,
      hcAllTeachers: wf.hcAllTeachers ?? 0,
      hcAllSupportStaff: wf.hcAllSupportStaff ?? 0,
      overallMembers,
      voted: neu.voted ?? 0,
      turnout: safeDiv(neu.voted, overallMembers),
      density: safeDiv(overallMembers, hcWorkforce),
      repCount,
      volunteers: neu.volunteers ?? 0,
      wpConversations: neu.wpConversations ?? 0,
      indicativeVoted2025: neu.indicativeVoted2025 ?? null,
      indicativeVoted2024: neu.indicativeVoted2024 ?? null,
      holdAMeeting: neu.holdAMeeting ?? 0,
      needsSupport: neu.needsSupport ?? 0,
      pledgedToVote: neu.pledgedToVote ?? 0,
      noteCount: notes.length,
      lastNoteDate: lastNote?.date ?? null,
    };
  });
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
    const totalStaffHeadcount = sum(matSchools, (s) => s.hcWorkforce);
    const totalMembers = sum(matSchools, (s) => s.overallMembers);
    const reps = sum(matSchools, (s) => s.repCount);
    const boroughsPresent = [...new Set(matSchools.map((s) => s.laName))].sort();
    const phasesPresent = [...new Set(matSchools.map((s) => s.phase))].sort();
    const notes = state.fieldNotes.filter((n) => n.level === "MAT" && n.subject === trust);
    const lastNote = notes.reduce((latest, n) => (!latest || n.date > latest.date ? n : latest), null);
    const facts = state.matFacts.find((f) => f.mat === trust) || { isTargetMat: false, repCommitteeExists: false };

    return {
      name: trust,
      isTargetMat: facts.isTargetMat,
      schoolCount,
      boroughsPresent,
      phasesPresent,
      totalStaffHeadcount,
      totalMembers,
      reps,
      memberRepRatio: reps === 0 ? "No reps" : `1:${Math.round(totalMembers / reps)}`,
      noRepSchools,
      trustDensity: safeDiv(totalMembers, totalStaffHeadcount),
      repCoveragePercent: safeDiv(schoolCount - noRepSchools, schoolCount),
      membersInNoRepSchools: sum(matSchools.filter((s) => s.repCount === 0), (s) => s.overallMembers),
      repCommitteeExists: !!facts.repCommitteeExists,
      noteCount: notes.length,
      lastNoteDate: lastNote?.date ?? null,
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
    const headcount = sum(branchSchools, (s) => s.hcWorkforce);
    const members = sum(branchSchools, (s) => s.overallMembers);
    const reps = sum(branchSchools, (s) => s.repCount);
    const noRepSchoolsList = branchSchools.filter((s) => s.repCount === 0);
    const biggestNoRep = noRepSchoolsList.reduce(
      (biggest, s) => (!biggest || s.overallMembers > biggest.overallMembers ? s : biggest),
      null
    );
    const notes = state.fieldNotes.filter((n) => n.level === "Branch" && n.subject === branch);
    const lastNote = notes.reduce((latest, n) => (!latest || n.date > latest.date ? n : latest), null);
    const facts = state.branchFacts.find((f) => f.branch === branch) || {
      isProjectBranch: false, schoolMeetingsHeld: 0, repsTrainedSinceStart: 0,
    };

    return {
      name: branch,
      isProjectBranch: facts.isProjectBranch,
      schoolsCount: branchSchools.length,
      headcount,
      members,
      density: safeDiv(members, headcount),
      teacherShare: safeDiv(sum(branchSchools, (s) => s.hcAllTeachers), headcount),
      supportShare: safeDiv(sum(branchSchools, (s) => s.hcAllSupportStaff), headcount),
      reps,
      memberRepRatio: reps === 0 ? "No reps" : `1:${Math.round(members / reps)}`,
      noRepSchools: noRepSchoolsList.length,
      membersInNoRepSchools: sum(noRepSchoolsList, (s) => s.overallMembers),
      workforceInNoRepSchools: sum(noRepSchoolsList, (s) => s.hcWorkforce),
      biggestNoRepSchool: biggestNoRep ? { name: biggestNoRep.schoolName, members: biggestNoRep.overallMembers } : null,
      schoolMeetingsHeld: facts.schoolMeetingsHeld,
      repsTrainedSinceStart: facts.repsTrainedSinceStart,
      noteCount: notes.length,
      lastNoteDate: lastNote?.date ?? null,
      schools: branchSchools,
    };
  });
}

function disputeKpis(disputes) {
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

  const branchWorkforce = sum(projectBranches, (b) => b.headcount);
  const branchMembers = sum(projectBranches, (b) => b.members);
  const branchReps = sum(projectBranches, (b) => b.reps);

  const matWorkforce = sum(projectMats, (m) => m.totalStaffHeadcount);
  const matMembers = sum(projectMats, (m) => m.totalMembers);
  const matReps = sum(projectMats, (m) => m.reps);

  const projectBranchNames = projectBranches.map((b) => b.name);
  const projectMatNames = projectMats.map((m) => m.name);
  const branchDisputes = disputes.filter((d) => projectBranchNames.includes(d.branch));
  const matDisputes = disputes.filter((d) => d.mat && projectMatNames.includes(d.mat));

  return {
    projectBranches: {
      workforce: branchWorkforce,
      membership: branchMembers,
      density: safeDiv(branchMembers, branchWorkforce),
      noRepSchools: sum(projectBranches, (b) => b.noRepSchools),
      memberRepRatio: branchReps === 0 ? "No reps" : `1:${Math.round(branchMembers / branchReps)}`,
      schoolMeetingsHeld: sum(projectBranches, (b) => b.schoolMeetingsHeld),
      repsTrainedSinceStart: sum(projectBranches, (b) => b.repsTrainedSinceStart),
      ...disputeKpis(branchDisputes),
    },
    projectMats: {
      workforce: matWorkforce,
      membership: matMembers,
      density: safeDiv(matMembers, matWorkforce),
      noRepSchools: sum(projectMats, (m) => m.noRepSchools),
      memberRepRatio: matReps === 0 ? "No reps" : `1:${Math.round(matMembers / matReps)}`,
      membersInNoRepSchools: sum(projectMats, (m) => m.membersInNoRepSchools),
      repCommittees: projectMats.filter((m) => m.repCommitteeExists).length,
      ...disputeKpis(matDisputes),
    },
    branchList: projectBranches,
    matList: projectMats,
  };
}
