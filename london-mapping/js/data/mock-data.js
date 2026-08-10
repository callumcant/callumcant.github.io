// Synthetic data shaped exactly like the real workbook's tables, so the data
// layer (rollups.js) exercises the same joins it will run against live Graph
// data. Every name/number here is invented — never replace this file with
// real membership or dispute data; that only ever lives in the workbook.

export const sourceGIAS = [
  { urn: 200001, schoolName: "Elmfield Primary School", typeOfEstablishment: "Academy converter", phase: "Primary", laName: "Bromley", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Bright Futures Learning Trust", postcode: "BR1 2AB" },
  { urn: 200002, schoolName: "Ravens Wood Secondary School", typeOfEstablishment: "Community school", phase: "Secondary", laName: "Bromley", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "BR2 7EX" },
  { urn: 200003, schoolName: "Kingsway High School", typeOfEstablishment: "Academy converter", phase: "Secondary", laName: "Bromley", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Kingsway Education Trust", postcode: "BR3 1LP" },
  { urn: 200004, schoolName: "Oakdene Nursery School", typeOfEstablishment: "LA maintained nursery", phase: "Nursery", laName: "Bromley", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "BR1 4QW" },
  { urn: 200005, schoolName: "Woolwich Common Primary", typeOfEstablishment: "Academy converter", phase: "Primary", laName: "Greenwich", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Bright Futures Learning Trust", postcode: "SE18 4NN" },
  { urn: 200006, schoolName: "Charlton Park Academy", typeOfEstablishment: "Academy sponsor led", phase: "Secondary", laName: "Greenwich", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "SE7 8QF" },
  { urn: 200007, schoolName: "Blackheath Grove Primary", typeOfEstablishment: "Community school", phase: "Primary", laName: "Greenwich", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "SE3 9RT" },
  { urn: 200008, schoolName: "Uxbridge Meadow Primary", typeOfEstablishment: "Academy converter", phase: "Primary", laName: "Hillingdon", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Riverside Academies Trust", postcode: "UB8 2LJ" },
  { urn: 200009, schoolName: "Hayes Park Secondary", typeOfEstablishment: "Academy converter", phase: "Secondary", laName: "Hillingdon", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Riverside Academies Trust", postcode: "UB4 0HJ" },
  { urn: 200010, schoolName: "Ickenham Community School", typeOfEstablishment: "Community school", phase: "Primary", laName: "Hillingdon", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "UB10 8QN" },
  { urn: 200011, schoolName: "Battersea Rise Primary", typeOfEstablishment: "Academy converter", phase: "Primary", laName: "Wandsworth", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Thameside Multi-Academy Trust", postcode: "SW11 1EJ" },
  { urn: 200012, schoolName: "Tooting Bec Academy", typeOfEstablishment: "Academy converter", phase: "Secondary", laName: "Wandsworth", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Thameside Multi-Academy Trust", postcode: "SW17 8ES" },
  { urn: 200013, schoolName: "Camden Square Primary", typeOfEstablishment: "Academy converter", phase: "Primary", laName: "Camden", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "Thameside Multi-Academy Trust", postcode: "NW1 9XA" },
  { urn: 200014, schoolName: "Regents Park Community School", typeOfEstablishment: "Community school", phase: "Secondary", laName: "Camden", establishmentStatus: "Open", religiousCharacter: "Does not apply", trusts: "", postcode: "NW1 4LE" },
];

export const sourceWorkforce = [
  { urn: 200001, hcWorkforce: 42, hcAllTeachers: 18, hcClassroomTeachers: 15, hcLeadershipTeachers: 3, hcAllSupportStaff: 24, hcTeachingAssistants: 16 },
  { urn: 200002, hcWorkforce: 118, hcAllTeachers: 68, hcClassroomTeachers: 58, hcLeadershipTeachers: 10, hcAllSupportStaff: 50, hcTeachingAssistants: 12 },
  { urn: 200003, hcWorkforce: 96, hcAllTeachers: 55, hcClassroomTeachers: 47, hcLeadershipTeachers: 8, hcAllSupportStaff: 41, hcTeachingAssistants: 9 },
  { urn: 200004, hcWorkforce: 19, hcAllTeachers: 5, hcClassroomTeachers: 4, hcLeadershipTeachers: 1, hcAllSupportStaff: 14, hcTeachingAssistants: 11 },
  { urn: 200005, hcWorkforce: 48, hcAllTeachers: 20, hcClassroomTeachers: 17, hcLeadershipTeachers: 3, hcAllSupportStaff: 28, hcTeachingAssistants: 19 },
  { urn: 200006, hcWorkforce: 132, hcAllTeachers: 74, hcClassroomTeachers: 63, hcLeadershipTeachers: 11, hcAllSupportStaff: 58, hcTeachingAssistants: 14 },
  { urn: 200007, hcWorkforce: 39, hcAllTeachers: 16, hcClassroomTeachers: 13, hcLeadershipTeachers: 3, hcAllSupportStaff: 23, hcTeachingAssistants: 15 },
  { urn: 200008, hcWorkforce: 44, hcAllTeachers: 19, hcClassroomTeachers: 16, hcLeadershipTeachers: 3, hcAllSupportStaff: 25, hcTeachingAssistants: 17 },
  { urn: 200009, hcWorkforce: 121, hcAllTeachers: 70, hcClassroomTeachers: 60, hcLeadershipTeachers: 10, hcAllSupportStaff: 51, hcTeachingAssistants: 13 },
  { urn: 200010, hcWorkforce: 37, hcAllTeachers: 15, hcClassroomTeachers: 12, hcLeadershipTeachers: 3, hcAllSupportStaff: 22, hcTeachingAssistants: 14 },
  { urn: 200011, hcWorkforce: 45, hcAllTeachers: 19, hcClassroomTeachers: 16, hcLeadershipTeachers: 3, hcAllSupportStaff: 26, hcTeachingAssistants: 18 },
  { urn: 200012, hcWorkforce: 109, hcAllTeachers: 61, hcClassroomTeachers: 52, hcLeadershipTeachers: 9, hcAllSupportStaff: 48, hcTeachingAssistants: 11 },
  { urn: 200013, hcWorkforce: 41, hcAllTeachers: 17, hcClassroomTeachers: 14, hcLeadershipTeachers: 3, hcAllSupportStaff: 24, hcTeachingAssistants: 16 },
  { urn: 200014, hcWorkforce: 126, hcAllTeachers: 71, hcClassroomTeachers: 61, hcLeadershipTeachers: 10, hcAllSupportStaff: 55, hcTeachingAssistants: 13 },
];

export const wcToUrn = [
  { workplaceCode: "WP200001", urn: 200001 }, { workplaceCode: "WP200002", urn: 200002 },
  { workplaceCode: "WP200003", urn: 200003 }, { workplaceCode: "WP200004", urn: 200004 },
  { workplaceCode: "WP200005", urn: 200005 }, { workplaceCode: "WP200006", urn: 200006 },
  { workplaceCode: "WP200007", urn: 200007 }, { workplaceCode: "WP200008", urn: 200008 },
  { workplaceCode: "WP200009", urn: 200009 }, { workplaceCode: "WP200010", urn: 200010 },
  { workplaceCode: "WP200011", urn: 200011 }, { workplaceCode: "WP200012", urn: 200012 },
  { workplaceCode: "WP200013", urn: 200013 }, { workplaceCode: "WP200014", urn: 200014 },
];

export const sourceNeuDashboard = [
  { workplaceCode: "WP200001", overallMembers: 19, voted: 14, repCount: 1, volunteers: 3, wpConversations: 6, indicativeVoted2025: 0.72, indicativeVoted2024: 0.61, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 5 },
  { workplaceCode: "WP200002", overallMembers: 21, voted: 0, repCount: 0, volunteers: 1, wpConversations: 2, indicativeVoted2025: 0, indicativeVoted2024: 0, holdAMeeting: 0, needsSupport: 1, pledgedToVote: 2 },
  { workplaceCode: "WP200003", overallMembers: 34, voted: 25, repCount: 1, volunteers: 4, wpConversations: 9, indicativeVoted2025: 0.72, indicativeVoted2024: 0.65, holdAMeeting: 2, needsSupport: 0, pledgedToVote: 8 },
  { workplaceCode: "WP200004", overallMembers: 9, voted: 6, repCount: 1, volunteers: 2, wpConversations: 3, indicativeVoted2025: 0.55, indicativeVoted2024: 0.40, holdAMeeting: 0, needsSupport: 0, pledgedToVote: 2 },
  { workplaceCode: "WP200005", overallMembers: 16, voted: 10, repCount: 1, volunteers: 2, wpConversations: 5, indicativeVoted2025: 0.44, indicativeVoted2024: 0.38, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 4 },
  { workplaceCode: "WP200006", overallMembers: 44, voted: 36, repCount: 2, volunteers: 5, wpConversations: 12, indicativeVoted2025: 0.81, indicativeVoted2024: 0.70, holdAMeeting: 2, needsSupport: 0, pledgedToVote: 14 },
  { workplaceCode: "WP200007", overallMembers: 8, voted: 0, repCount: 0, volunteers: 1, wpConversations: 1, indicativeVoted2025: 0, indicativeVoted2024: 0, holdAMeeting: 0, needsSupport: 1, pledgedToVote: 1 },
  { workplaceCode: "WP200008", overallMembers: 17, voted: 11, repCount: 1, volunteers: 2, wpConversations: 4, indicativeVoted2025: 0.65, indicativeVoted2024: 0.52, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 5 },
  { workplaceCode: "WP200009", overallMembers: 38, voted: 30, repCount: 1, volunteers: 3, wpConversations: 8, indicativeVoted2025: 0.65, indicativeVoted2024: 0.58, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 9 },
  { workplaceCode: "WP200010", overallMembers: 6, voted: 0, repCount: 0, volunteers: 0, wpConversations: 1, indicativeVoted2025: 0, indicativeVoted2024: 0, holdAMeeting: 0, needsSupport: 1, pledgedToVote: 1 },
  { workplaceCode: "WP200011", overallMembers: 14, voted: 8, repCount: 1, volunteers: 2, wpConversations: 3, indicativeVoted2025: 0.55, indicativeVoted2024: 0.44, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 4 },
  { workplaceCode: "WP200012", overallMembers: 41, voted: 32, repCount: 2, volunteers: 4, wpConversations: 10, indicativeVoted2025: 0.60, indicativeVoted2024: 0.55, holdAMeeting: 1, needsSupport: 0, pledgedToVote: 11 },
  { workplaceCode: "WP200013", overallMembers: 12, voted: 7, repCount: 1, volunteers: 1, wpConversations: 3, indicativeVoted2025: 0.40, indicativeVoted2024: 0.35, holdAMeeting: 0, needsSupport: 0, pledgedToVote: 3 },
  { workplaceCode: "WP200014", overallMembers: 33, voted: 20, repCount: 1, volunteers: 3, wpConversations: 6, indicativeVoted2025: 0.35, indicativeVoted2024: 0.30, holdAMeeting: 1, needsSupport: 1, pledgedToVote: 6 },
];

// Manually-entered per-branch facts — mirrors the "BranchFacts" Excel Table
// in the live workbook. isProjectBranch/schoolMeetingsHeld/repsTrainedSinceStart
// were direct manual entries on the old Branch-level tab, not computed values,
// so they get their own small editable table rather than a formula.
export const branchFacts = [
  { branch: "Bromley", isProjectBranch: true, schoolMeetingsHeld: 3, repsTrainedSinceStart: 2 },
  { branch: "Greenwich", isProjectBranch: true, schoolMeetingsHeld: 2, repsTrainedSinceStart: 1 },
  { branch: "Hillingdon", isProjectBranch: true, schoolMeetingsHeld: 4, repsTrainedSinceStart: 3 },
  { branch: "Wandsworth", isProjectBranch: true, schoolMeetingsHeld: 1, repsTrainedSinceStart: 1 },
  { branch: "Camden", isProjectBranch: false, schoolMeetingsHeld: 0, repsTrainedSinceStart: 0 },
];

// Manually-entered per-MAT facts — mirrors the "MatFacts" Excel Table.
// Matches the old MAT-level tab's "Target MAT?" and "MAT rep committee
// exists?" columns, both manual entries.
export const matFacts = [
  { mat: "Bright Futures Learning Trust", isTargetMat: true, repCommitteeExists: true },
  { mat: "Kingsway Education Trust", isTargetMat: false, repCommitteeExists: false },
  { mat: "Riverside Academies Trust", isTargetMat: false, repCommitteeExists: false },
  { mat: "Thameside Multi-Academy Trust", isTargetMat: true, repCommitteeExists: true },
];

export const fieldNotes = [
  { id: "n1", date: "2026-07-22", level: "School", subject: "200001", title: "Density strong, needs a second rep", note: "72% turnout on the informal check-in. Worth identifying a co-rep before the current rep goes on leave in September.", author: "Amara O." },
  { id: "n2", date: "2026-07-25", level: "School", subject: "200002", title: "No rep — approached SLT contact", note: "Head of department seemed open to a workplace meeting. Follow up with branch sec before half term.", author: "Jide K." },
  { id: "n3", date: "2026-08-01", level: "Branch", subject: "Bromley", title: "Branch meeting notes", note: "Agreed to prioritise Ravens Wood and Oakdene for rep recruitment this term.", author: "Amara O." },
  { id: "n4", date: "2026-08-03", level: "MAT", subject: "Kingsway Education Trust", title: "Trust-wide facility time dispute brewing", note: "Trust proposing to cut facility time allocation across all sites from January. Coordinating a joint response with reps.", author: "Priya S." },
  { id: "n5", date: "2026-07-18", level: "School", subject: "200008", title: "Recruited 3 new members after lunch stall", note: "Good response to the TA-focused leaflet. Two of the three are TAs.", author: "Tom R." },
  { id: "n6", date: "2026-08-05", level: "School", subject: "200011", title: "Indicative ballot planning underway", note: "Issue is H&S — unaddressed maintenance backlog. Timeline agreed with branch.", author: "Priya S." },
  { id: "n7", date: "2026-08-07", level: "Branch", subject: "Greenwich", title: "Density improving across primaries", note: "Blackheath Grove is the outlier — no rep and low density, worth a target visit.", author: "Jide K." },
  { id: "n8", date: "2026-08-09", level: "MAT", subject: "Bright Futures Learning Trust", title: "Rep committee meeting scheduled", note: "First cross-trust rep committee meeting booked for September, covering both mapped schools.", author: "Amara O." },
];

export const disputeTracker = [
  {
    id: "d1", employer: "Kingsway Education Trust", mat: "Kingsway Education Trust", branch: "Bromley",
    live: "Yes", schoolsCount: 1, rorIo: "ROR", staffResponsible: "Amara O.",
    issues: ["Redundancies", "Facility time"], dateIndicativeOpens: "2026-07-01",
    indicativePercent: 0.72, membershipAtIndicative: 18, formalBallotPercent: null,
    dateOfResolution: null, outcome: null, totalStrikeDays: 0,
  },
  {
    id: "d2", employer: "Riverside Academies Trust", mat: "Riverside Academies Trust", branch: "Hillingdon",
    live: "Yes", schoolsCount: 2, rorIo: "SIO", staffResponsible: "Priya S.",
    issues: ["Workload", "Management style"], dateIndicativeOpens: "2026-06-10",
    indicativePercent: 0.65, membershipAtIndicative: 42, formalBallotPercent: 0.58,
    dateOfResolution: null, outcome: "Amber", totalStrikeDays: 0,
  },
  {
    id: "d3", employer: "Charlton Park Academy", mat: "", branch: "Greenwich",
    live: "Yes", schoolsCount: 1, rorIo: "IO", staffResponsible: "Jide K.",
    issues: ["Pay policy (inc TLRs)"], dateIndicativeOpens: "2026-05-14",
    indicativePercent: 0.81, membershipAtIndicative: 36, formalBallotPercent: 0.77,
    dateOfResolution: null, outcome: "Red", totalStrikeDays: 2,
  },
  {
    id: "d4", employer: "Thameside Multi-Academy Trust", mat: "Thameside Multi-Academy Trust", branch: "Wandsworth",
    live: "No", schoolsCount: 2, rorIo: "ROR", staffResponsible: "Tom R.",
    issues: ["H&S"], dateIndicativeOpens: "2026-04-02",
    indicativePercent: 0.55, membershipAtIndicative: 22, formalBallotPercent: 0.60,
    dateOfResolution: "2026-06-15", outcome: "Green", totalStrikeDays: 0,
  },
  {
    id: "d5", employer: "Ickenham Community School", mat: "", branch: "Hillingdon",
    live: "Yes", schoolsCount: 1, rorIo: "IO", staffResponsible: "Priya S.",
    issues: ["Staffing", "Consultation"], dateIndicativeOpens: null,
    indicativePercent: null, membershipAtIndicative: null, formalBallotPercent: null,
    dateOfResolution: null, outcome: null, totalStrikeDays: 0,
  },
];

