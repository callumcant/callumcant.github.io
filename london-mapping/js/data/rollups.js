// Port of the workbook's School-level / MAT-level / Branch-level / Project
// dashboard tabs, as plain joins and aggregations instead of spreadsheet
// formulas. The original used Google-Sheets-only FILTER/UNIQUE/ARRAYFORMULA
// (visible as __xludf.DUMMYFUNCTION wrappers when opened in Excel), which
// don't run reliably once the workbook lives on OneDrive — this reimplements
// the same *intent*, column by column, against the raw source tables.
//
// buildSchoolLevel passes through every field from the source tables rather
// than a chosen subset: the site has to be a superset of the spreadsheet, and
// the view layer decides what to show, not this layer.
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

function latestBy(rows, key = "date") {
  return rows.reduce((latest, r) => (!latest || r[key] > latest[key] ? r : latest), null);
}

export function buildSchoolLevel(state) {
  const workforceByUrn = new Map(state.sourceWorkforce.map((w) => [w.urn, w]));
  const urnByWorkplaceCode = new Map(state.wcToUrn.map((r) => [r.workplaceCode, r.urn]));
  const neuByUrn = new Map();
  for (const row of state.sourceNeuDashboard) {
    const urn = urnByWorkplaceCode.get(row.workplaceCode);
    if (urn != null) neuByUrn.set(urn, row);
  }

  const meetingsByUrn = new Map();
  for (const m of state.meetings) {
    meetingsByUrn.set(m.urn, (meetingsByUrn.get(m.urn) || 0) + 1);
  }
  const recruitedByUrn = new Map();
  for (const r of state.repsRecruited) {
    recruitedByUrn.set(r.urn, (recruitedByUrn.get(r.urn) || 0) + 1);
  }

  return state.sourceGIAS.map((school) => {
    const wf = workforceByUrn.get(school.urn) || {};
    const neu = neuByUrn.get(school.urn) || {};
    const notes = state.fieldNotes.filter(
      (n) => n.level === "School" && String(n.subject) === String(school.urn)
    );
    const lastNote = latestBy(notes);

    const overallMembers = neu.overallMembers ?? 0;
    const hcWorkforce = wf.hcWorkforce ?? 0;

    return {
      // --- GIAS ---
      urn: school.urn,
      schoolName: school.schoolName,
      typeOfEstablishment: school.typeOfEstablishment ?? "",
      phase: school.phase ?? "",
      laName: school.laName ?? "",
      establishmentStatus: school.establishmentStatus ?? "",
      religiousCharacter: school.religiousCharacter ?? "",
      diocese: school.diocese ?? "",
      trust: school.trusts || "",
      schoolSponsors: school.schoolSponsors ?? "",
      federations: school.federations ?? "",
      postcode: school.postcode ?? "",
      schoolWebsite: school.schoolWebsite ?? "",
      telephoneNum: school.telephoneNum ?? "",
      headName: [school.headTitle, school.headFirstName, school.headLastName]
        .filter(Boolean).join(" "),

      // --- Workforce census ---
      schoolType: wf.schoolType ?? "",
      hcWorkforce,
      hcAllTeachers: wf.hcAllTeachers ?? 0,
      hcClassroomTeachers: wf.hcClassroomTeachers ?? 0,
      hcLeadershipTeachers: wf.hcLeadershipTeachers ?? 0,
      hcAllSupportStaff: wf.hcAllSupportStaff ?? 0,
      hcTeachingAssistants: wf.hcTeachingAssistants ?? 0,

      // --- NEU membership & ballots ---
      workplaceName: neu.workplaceName ?? "",
      branchName: neu.branchName ?? "",
      districtName: neu.districtName ?? "",
      regionName: neu.regionName ?? "",
      overallMembers,
      voted: neu.voted ?? 0,
      // Derived here; `turnoutReported` is the figure as exported, kept so the
      // two can be compared if they ever disagree.
      turnout: safeDiv(neu.voted, overallMembers),
      turnoutReported: neu.turnout ?? null,
      density: safeDiv(overallMembers, hcWorkforce),
      indicativeVoted2025: neu.indicativeVoted2025 ?? null,
      indicativeVoted2024: neu.indicativeVoted2024 ?? null,

      // --- Organising engagement ---
      repCount: neu.repCount ?? 0,
      volunteers: neu.volunteers ?? 0,
      wpConversations: neu.wpConversations ?? 0,
      repRecruitedVolunteer: neu.repRecruitedVolunteer ?? 0,
      joinedCommunity: neu.joinedCommunity ?? 0,
      completedActivateAction: neu.completedActivateAction ?? 0,
      agreedToBriefing: neu.agreedToBriefing ?? 0,
      holdAMeeting: neu.holdAMeeting ?? 0,
      needsSupport: neu.needsSupport ?? 0,
      pledgedToVote: neu.pledgedToVote ?? 0,
      activeSEVs: neu.activeSEVs ?? 0,
      importDate: neu.importDate ?? null,

      // --- Derived from app activity ---
      meetingsLogged: meetingsByUrn.get(school.urn) || 0,
      repsRecruitedLogged: recruitedByUrn.get(school.urn) || 0,
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
    const lastNote = latestBy(notes);
    const facts = state.matFacts.find((f) => f.mat === trust)
      || { isTargetMat: false, repCommitteeExists: false };

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
      meetingsHeld: sum(matSchools, (s) => s.meetingsLogged),
      repsRecruited: sum(matSchools, (s) => s.repsRecruitedLogged),
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
    const lastNote = latestBy(notes);
    const facts = state.branchFacts.find((f) => f.branch === branch)
      || { isProjectBranch: false, repsTrainedSinceStart: 0 };

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
      biggestNoRepSchool: biggestNoRep
        ? { name: biggestNoRep.schoolName, members: biggestNoRep.overallMembers }
        : null,
      // Derived from the Meetings event log rather than a hand-kept counter,
      // so it carries a trend and can be drilled into.
      schoolMeetingsHeld: sum(branchSchools, (s) => s.meetingsLogged),
      repsRecruited: sum(branchSchools, (s) => s.repsRecruitedLogged),
      // Still a manual counter: rep *training* data is a later pipeline and is
      // not the same thing as recruitment.
      repsTrainedSinceStart: facts.repsTrainedSinceStart ?? 0,
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
      repsRecruited: sum(projectBranches, (b) => b.repsRecruited),
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
      meetingsHeld: sum(projectMats, (m) => m.meetingsHeld),
      repsRecruited: sum(projectMats, (m) => m.repsRecruited),
      ...disputeKpis(matDisputes),
    },
    branchList: projectBranches,
    matList: projectMats,
  };
}
