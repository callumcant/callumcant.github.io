// Synthetic data shaped exactly like the real workbook's tables, so the data
// layer (rollups.js) exercises the same joins it will run against live Graph
// data. Every name/number here is invented — never replace this file with
// real membership or dispute data; that only ever lives in the workbook.
//
// Generated to match TABLE_SCHEMAS in table-schemas.js field-for-field, so the
// preview exercises the full column set rather than a convenient subset.

export const sourceGIAS = [
  {"urn": 200001, "schoolName": "Elmfield Primary School", "typeOfEstablishment": "Academy converter", "phase": "Primary", "laName": "Bromley", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Bright Futures Learning Trust", "schoolSponsors": "", "federations": "", "postcode": "BR1 2AB", "schoolWebsite": "www.elmfieldprimaryschool.example.sch.uk", "telephoneNum": "020 7946 1000", "headTitle": "Ms", "headFirstName": "Nicola", "headLastName": "Ashworth"},
  {"urn": 200002, "schoolName": "Ravens Wood Secondary School", "typeOfEstablishment": "Community school", "phase": "Secondary", "laName": "Bromley", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "", "schoolSponsors": "", "federations": "Bromley Secondary Federation", "postcode": "BR2 7EX", "schoolWebsite": "www.ravenswoodsecondarysch.example.sch.uk", "telephoneNum": "020 7946 1037", "headTitle": "Mr", "headFirstName": "David", "headLastName": "Okonkwo"},
  {"urn": 200003, "schoolName": "Kingsway High School", "typeOfEstablishment": "Academy converter", "phase": "Secondary", "laName": "Bromley", "establishmentStatus": "Open", "religiousCharacter": "Church of England", "diocese": "Diocese of Rochester", "trusts": "Kingsway Education Trust", "schoolSponsors": "", "federations": "", "postcode": "BR3 1LP", "schoolWebsite": "www.kingswayhighschool.example.sch.uk", "telephoneNum": "020 7946 1074", "headTitle": "Mrs", "headFirstName": "Solin", "headLastName": "Farrah"},
  {"urn": 200004, "schoolName": "Oakdene Nursery School", "typeOfEstablishment": "LA maintained nursery", "phase": "Nursery", "laName": "Bromley", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "", "schoolSponsors": "", "federations": "", "postcode": "BR1 4QW", "schoolWebsite": "www.oakdenenurseryschool.example.sch.uk", "telephoneNum": "020 7946 1111", "headTitle": "Ms", "headFirstName": "Priya", "headLastName": "Raman"},
  {"urn": 200005, "schoolName": "Woolwich Common Primary", "typeOfEstablishment": "Academy converter", "phase": "Primary", "laName": "Greenwich", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Bright Futures Learning Trust", "schoolSponsors": "", "federations": "", "postcode": "SE18 4NN", "schoolWebsite": "www.woolwichcommonprimary.example.sch.uk", "telephoneNum": "020 7946 1148", "headTitle": "Mr", "headFirstName": "Tom", "headLastName": "Blackwood"},
  {"urn": 200006, "schoolName": "Charlton Park Academy", "typeOfEstablishment": "Academy sponsor led", "phase": "Secondary", "laName": "Greenwich", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "", "schoolSponsors": "Charlton Education Partnership", "federations": "", "postcode": "SE7 8QF", "schoolWebsite": "www.charltonparkacademy.example.sch.uk", "telephoneNum": "020 7946 1185", "headTitle": "Dr", "headFirstName": "Helen", "headLastName": "Vasquez"},
  {"urn": 200007, "schoolName": "Blackheath Grove Primary", "typeOfEstablishment": "Community school", "phase": "Primary", "laName": "Greenwich", "establishmentStatus": "Open", "religiousCharacter": "Roman Catholic", "diocese": "Archdiocese of Southwark", "trusts": "", "schoolSponsors": "", "federations": "", "postcode": "SE3 9RT", "schoolWebsite": "www.blackheathgroveprimary.example.sch.uk", "telephoneNum": "020 7946 1222", "headTitle": "Mrs", "headFirstName": "Aisha", "headLastName": "Bello"},
  {"urn": 200008, "schoolName": "Uxbridge Meadow Primary", "typeOfEstablishment": "Academy converter", "phase": "Primary", "laName": "Hillingdon", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Riverside Academies Trust", "schoolSponsors": "", "federations": "", "postcode": "UB8 2LJ", "schoolWebsite": "www.uxbridgemeadowprimary.example.sch.uk", "telephoneNum": "020 7946 1259", "headTitle": "Mr", "headFirstName": "James", "headLastName": "Whitfield"},
  {"urn": 200009, "schoolName": "Hayes Park Secondary", "typeOfEstablishment": "Academy converter", "phase": "Secondary", "laName": "Hillingdon", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Riverside Academies Trust", "schoolSponsors": "", "federations": "", "postcode": "UB4 0HJ", "schoolWebsite": "www.hayesparksecondary.example.sch.uk", "telephoneNum": "020 7946 1296", "headTitle": "Ms", "headFirstName": "Clara", "headLastName": "Nowak"},
  {"urn": 200010, "schoolName": "Ickenham Community School", "typeOfEstablishment": "Community school", "phase": "Primary", "laName": "Hillingdon", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "", "schoolSponsors": "", "federations": "", "postcode": "UB10 8QN", "schoolWebsite": "www.ickenhamcommunityschoo.example.sch.uk", "telephoneNum": "020 7946 1333", "headTitle": "Mr", "headFirstName": "Samuel", "headLastName": "Adeyemi"},
  {"urn": 200011, "schoolName": "Battersea Rise Primary", "typeOfEstablishment": "Academy converter", "phase": "Primary", "laName": "Wandsworth", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Thameside Multi-Academy Trust", "schoolSponsors": "", "federations": "", "postcode": "SW11 1EJ", "schoolWebsite": "www.batterseariseprimary.example.sch.uk", "telephoneNum": "020 7946 1370", "headTitle": "Mrs", "headFirstName": "Ruth", "headLastName": "Kimani"},
  {"urn": 200012, "schoolName": "Tooting Bec Academy", "typeOfEstablishment": "Academy converter", "phase": "Secondary", "laName": "Wandsworth", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Thameside Multi-Academy Trust", "schoolSponsors": "", "federations": "", "postcode": "SW17 8ES", "schoolWebsite": "www.tootingbecacademy.example.sch.uk", "telephoneNum": "020 7946 1407", "headTitle": "Ms", "headFirstName": "Eleanor", "headLastName": "Pike"},
  {"urn": 200013, "schoolName": "Camden Square Primary", "typeOfEstablishment": "Academy converter", "phase": "Primary", "laName": "Camden", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "Thameside Multi-Academy Trust", "schoolSponsors": "", "federations": "", "postcode": "NW1 9XA", "schoolWebsite": "www.camdensquareprimary.example.sch.uk", "telephoneNum": "020 7946 1444", "headTitle": "Mr", "headFirstName": "Marcus", "headLastName": "Deane"},
  {"urn": 200014, "schoolName": "Regents Park Community School", "typeOfEstablishment": "Community school", "phase": "Secondary", "laName": "Camden", "establishmentStatus": "Open", "religiousCharacter": "Does not apply", "diocese": "Not applicable", "trusts": "", "schoolSponsors": "", "federations": "", "postcode": "NW1 4LE", "schoolWebsite": "www.regentsparkcommunitysc.example.sch.uk", "telephoneNum": "020 7946 1481", "headTitle": "Mrs", "headFirstName": "Fiona", "headLastName": "Hargreaves"},
];

export const sourceWorkforce = [
  {"urn": 200001, "schoolName": "Elmfield Primary School", "laName": "Bromley", "schoolType": "LA maintained primary", "hcWorkforce": 42, "hcAllTeachers": 18, "hcClassroomTeachers": 15, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 24, "hcTeachingAssistants": 16},
  {"urn": 200002, "schoolName": "Ravens Wood Secondary School", "laName": "Bromley", "schoolType": "LA maintained secondary", "hcWorkforce": 118, "hcAllTeachers": 68, "hcClassroomTeachers": 58, "hcLeadershipTeachers": 10, "hcAllSupportStaff": 50, "hcTeachingAssistants": 12},
  {"urn": 200003, "schoolName": "Kingsway High School", "laName": "Bromley", "schoolType": "LA maintained secondary", "hcWorkforce": 96, "hcAllTeachers": 55, "hcClassroomTeachers": 47, "hcLeadershipTeachers": 8, "hcAllSupportStaff": 41, "hcTeachingAssistants": 9},
  {"urn": 200004, "schoolName": "Oakdene Nursery School", "laName": "Bromley", "schoolType": "LA maintained nursery", "hcWorkforce": 19, "hcAllTeachers": 5, "hcClassroomTeachers": 4, "hcLeadershipTeachers": 1, "hcAllSupportStaff": 14, "hcTeachingAssistants": 11},
  {"urn": 200005, "schoolName": "Woolwich Common Primary", "laName": "Greenwich", "schoolType": "LA maintained primary", "hcWorkforce": 48, "hcAllTeachers": 20, "hcClassroomTeachers": 17, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 28, "hcTeachingAssistants": 19},
  {"urn": 200006, "schoolName": "Charlton Park Academy", "laName": "Greenwich", "schoolType": "LA maintained secondary", "hcWorkforce": 132, "hcAllTeachers": 74, "hcClassroomTeachers": 63, "hcLeadershipTeachers": 11, "hcAllSupportStaff": 58, "hcTeachingAssistants": 14},
  {"urn": 200007, "schoolName": "Blackheath Grove Primary", "laName": "Greenwich", "schoolType": "LA maintained primary", "hcWorkforce": 39, "hcAllTeachers": 16, "hcClassroomTeachers": 13, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 23, "hcTeachingAssistants": 15},
  {"urn": 200008, "schoolName": "Uxbridge Meadow Primary", "laName": "Hillingdon", "schoolType": "LA maintained primary", "hcWorkforce": 44, "hcAllTeachers": 19, "hcClassroomTeachers": 16, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 25, "hcTeachingAssistants": 17},
  {"urn": 200009, "schoolName": "Hayes Park Secondary", "laName": "Hillingdon", "schoolType": "LA maintained secondary", "hcWorkforce": 121, "hcAllTeachers": 70, "hcClassroomTeachers": 60, "hcLeadershipTeachers": 10, "hcAllSupportStaff": 51, "hcTeachingAssistants": 13},
  {"urn": 200010, "schoolName": "Ickenham Community School", "laName": "Hillingdon", "schoolType": "LA maintained primary", "hcWorkforce": 37, "hcAllTeachers": 15, "hcClassroomTeachers": 12, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 22, "hcTeachingAssistants": 14},
  {"urn": 200011, "schoolName": "Battersea Rise Primary", "laName": "Wandsworth", "schoolType": "LA maintained primary", "hcWorkforce": 45, "hcAllTeachers": 19, "hcClassroomTeachers": 16, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 26, "hcTeachingAssistants": 18},
  {"urn": 200012, "schoolName": "Tooting Bec Academy", "laName": "Wandsworth", "schoolType": "LA maintained secondary", "hcWorkforce": 109, "hcAllTeachers": 61, "hcClassroomTeachers": 52, "hcLeadershipTeachers": 9, "hcAllSupportStaff": 48, "hcTeachingAssistants": 11},
  {"urn": 200013, "schoolName": "Camden Square Primary", "laName": "Camden", "schoolType": "LA maintained primary", "hcWorkforce": 41, "hcAllTeachers": 17, "hcClassroomTeachers": 14, "hcLeadershipTeachers": 3, "hcAllSupportStaff": 24, "hcTeachingAssistants": 16},
  {"urn": 200014, "schoolName": "Regents Park Community School", "laName": "Camden", "schoolType": "LA maintained secondary", "hcWorkforce": 126, "hcAllTeachers": 71, "hcClassroomTeachers": 61, "hcLeadershipTeachers": 10, "hcAllSupportStaff": 55, "hcTeachingAssistants": 13},
];

export const wcToUrn = [
  {"workplaceCode": "WP200001", "urn": 200001},
  {"workplaceCode": "WP200002", "urn": 200002},
  {"workplaceCode": "WP200003", "urn": 200003},
  {"workplaceCode": "WP200004", "urn": 200004},
  {"workplaceCode": "WP200005", "urn": 200005},
  {"workplaceCode": "WP200006", "urn": 200006},
  {"workplaceCode": "WP200007", "urn": 200007},
  {"workplaceCode": "WP200008", "urn": 200008},
  {"workplaceCode": "WP200009", "urn": 200009},
  {"workplaceCode": "WP200010", "urn": 200010},
  {"workplaceCode": "WP200011", "urn": 200011},
  {"workplaceCode": "WP200012", "urn": 200012},
  {"workplaceCode": "WP200013", "urn": 200013},
  {"workplaceCode": "WP200014", "urn": 200014},
];

export const sourceNeuDashboard = [
  {"workplaceCode": "WP200001", "workplaceName": "Elmfield Primary School", "overallMembers": 19, "voted": 14, "turnout": 0.737, "repCount": 1, "branchName": "Bromley State Education", "districtName": "Bromley", "regionName": "London", "volunteers": 3, "wpConversations": 6, "repRecruitedVolunteer": 0, "joinedCommunity": 2, "completedActivateAction": 10, "agreedToBriefing": 1, "indicativeVoted2025": 0.72, "indicativeVoted2024": 0.61, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 5, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200002", "workplaceName": "Ravens Wood Secondary School", "overallMembers": 21, "voted": 0, "turnout": 0.0, "repCount": 0, "branchName": "Bromley State Education", "districtName": "Bromley", "regionName": "London", "volunteers": 1, "wpConversations": 2, "repRecruitedVolunteer": 0, "joinedCommunity": 0, "completedActivateAction": 3, "agreedToBriefing": 0, "indicativeVoted2025": 0, "indicativeVoted2024": 0, "holdAMeeting": 0, "needsSupport": 1, "pledgedToVote": 2, "activeSEVs": 0, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200003", "workplaceName": "Kingsway High School", "overallMembers": 34, "voted": 25, "turnout": 0.735, "repCount": 1, "branchName": "Bromley State Education", "districtName": "Bromley", "regionName": "London", "volunteers": 4, "wpConversations": 9, "repRecruitedVolunteer": 1, "joinedCommunity": 2, "completedActivateAction": 14, "agreedToBriefing": 1, "indicativeVoted2025": 0.72, "indicativeVoted2024": 0.65, "holdAMeeting": 2, "needsSupport": 0, "pledgedToVote": 8, "activeSEVs": 2, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200004", "workplaceName": "Oakdene Nursery School", "overallMembers": 9, "voted": 6, "turnout": 0.667, "repCount": 1, "branchName": "Bromley State Education", "districtName": "Bromley", "regionName": "London", "volunteers": 2, "wpConversations": 3, "repRecruitedVolunteer": 0, "joinedCommunity": 1, "completedActivateAction": 5, "agreedToBriefing": 0, "indicativeVoted2025": 0.55, "indicativeVoted2024": 0.4, "holdAMeeting": 0, "needsSupport": 0, "pledgedToVote": 2, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200005", "workplaceName": "Woolwich Common Primary", "overallMembers": 16, "voted": 10, "turnout": 0.625, "repCount": 1, "branchName": "Greenwich State Education", "districtName": "Greenwich", "regionName": "London", "volunteers": 2, "wpConversations": 5, "repRecruitedVolunteer": 0, "joinedCommunity": 1, "completedActivateAction": 8, "agreedToBriefing": 1, "indicativeVoted2025": 0.44, "indicativeVoted2024": 0.38, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 4, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200006", "workplaceName": "Charlton Park Academy", "overallMembers": 44, "voted": 36, "turnout": 0.818, "repCount": 2, "branchName": "Greenwich State Education", "districtName": "Greenwich", "regionName": "London", "volunteers": 5, "wpConversations": 12, "repRecruitedVolunteer": 2, "joinedCommunity": 2, "completedActivateAction": 19, "agreedToBriefing": 1, "indicativeVoted2025": 0.81, "indicativeVoted2024": 0.7, "holdAMeeting": 2, "needsSupport": 0, "pledgedToVote": 14, "activeSEVs": 3, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200007", "workplaceName": "Blackheath Grove Primary", "overallMembers": 8, "voted": 0, "turnout": 0.0, "repCount": 0, "branchName": "Greenwich State Education", "districtName": "Greenwich", "regionName": "London", "volunteers": 1, "wpConversations": 1, "repRecruitedVolunteer": 0, "joinedCommunity": 0, "completedActivateAction": 2, "agreedToBriefing": 0, "indicativeVoted2025": 0, "indicativeVoted2024": 0, "holdAMeeting": 0, "needsSupport": 1, "pledgedToVote": 1, "activeSEVs": 0, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200008", "workplaceName": "Uxbridge Meadow Primary", "overallMembers": 17, "voted": 11, "turnout": 0.647, "repCount": 1, "branchName": "Hillingdon State Education", "districtName": "Hillingdon", "regionName": "London", "volunteers": 2, "wpConversations": 4, "repRecruitedVolunteer": 0, "joinedCommunity": 1, "completedActivateAction": 6, "agreedToBriefing": 1, "indicativeVoted2025": 0.65, "indicativeVoted2024": 0.52, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 5, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200009", "workplaceName": "Hayes Park Secondary", "overallMembers": 38, "voted": 30, "turnout": 0.789, "repCount": 1, "branchName": "Hillingdon State Education", "districtName": "Hillingdon", "regionName": "London", "volunteers": 3, "wpConversations": 8, "repRecruitedVolunteer": 0, "joinedCommunity": 2, "completedActivateAction": 13, "agreedToBriefing": 1, "indicativeVoted2025": 0.65, "indicativeVoted2024": 0.58, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 9, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200010", "workplaceName": "Ickenham Community School", "overallMembers": 6, "voted": 0, "turnout": 0.0, "repCount": 0, "branchName": "Hillingdon State Education", "districtName": "Hillingdon", "regionName": "London", "volunteers": 0, "wpConversations": 1, "repRecruitedVolunteer": 0, "joinedCommunity": 0, "completedActivateAction": 2, "agreedToBriefing": 0, "indicativeVoted2025": 0, "indicativeVoted2024": 0, "holdAMeeting": 0, "needsSupport": 1, "pledgedToVote": 1, "activeSEVs": 0, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200011", "workplaceName": "Battersea Rise Primary", "overallMembers": 14, "voted": 8, "turnout": 0.571, "repCount": 1, "branchName": "Wandsworth State Education", "districtName": "Wandsworth", "regionName": "London", "volunteers": 2, "wpConversations": 3, "repRecruitedVolunteer": 0, "joinedCommunity": 1, "completedActivateAction": 5, "agreedToBriefing": 1, "indicativeVoted2025": 0.55, "indicativeVoted2024": 0.44, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 4, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200012", "workplaceName": "Tooting Bec Academy", "overallMembers": 41, "voted": 32, "turnout": 0.78, "repCount": 2, "branchName": "Wandsworth State Education", "districtName": "Wandsworth", "regionName": "London", "volunteers": 4, "wpConversations": 10, "repRecruitedVolunteer": 2, "joinedCommunity": 2, "completedActivateAction": 16, "agreedToBriefing": 1, "indicativeVoted2025": 0.6, "indicativeVoted2024": 0.55, "holdAMeeting": 1, "needsSupport": 0, "pledgedToVote": 11, "activeSEVs": 3, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200013", "workplaceName": "Camden Square Primary", "overallMembers": 12, "voted": 7, "turnout": 0.583, "repCount": 1, "branchName": "Camden State Education", "districtName": "Camden", "regionName": "London", "volunteers": 1, "wpConversations": 3, "repRecruitedVolunteer": 0, "joinedCommunity": 0, "completedActivateAction": 5, "agreedToBriefing": 0, "indicativeVoted2025": 0.4, "indicativeVoted2024": 0.35, "holdAMeeting": 0, "needsSupport": 0, "pledgedToVote": 3, "activeSEVs": 1, "importDate": "2026-07-21"},
  {"workplaceCode": "WP200014", "workplaceName": "Regents Park Community School", "overallMembers": 33, "voted": 20, "turnout": 0.606, "repCount": 1, "branchName": "Camden State Education", "districtName": "Camden", "regionName": "London", "volunteers": 3, "wpConversations": 6, "repRecruitedVolunteer": 0, "joinedCommunity": 2, "completedActivateAction": 10, "agreedToBriefing": 1, "indicativeVoted2025": 0.35, "indicativeVoted2024": 0.3, "holdAMeeting": 1, "needsSupport": 1, "pledgedToVote": 6, "activeSEVs": 1, "importDate": "2026-07-21"},
];

// Manually-entered per-branch facts — mirrors the "BranchFacts" Excel Table.
// schoolMeetingsHeld is no longer here: it is derived from the Meetings event
// log. repsTrainedSinceStart stays manual until training data is pipelined in.
export const branchFacts = [
  {"branch": "Bromley", "isProjectBranch": true, "repsTrainedSinceStart": 2},
  {"branch": "Greenwich", "isProjectBranch": true, "repsTrainedSinceStart": 1},
  {"branch": "Hillingdon", "isProjectBranch": true, "repsTrainedSinceStart": 3},
  {"branch": "Wandsworth", "isProjectBranch": true, "repsTrainedSinceStart": 1},
  {"branch": "Camden", "isProjectBranch": false, "repsTrainedSinceStart": 0},
];

// Manually-entered per-MAT facts — mirrors the "MatFacts" Excel Table.
export const matFacts = [
  {"mat": "Bright Futures Learning Trust", "isTargetMat": true, "repCommitteeExists": true},
  {"mat": "Kingsway Education Trust", "isTargetMat": false, "repCommitteeExists": false},
  {"mat": "Riverside Academies Trust", "isTargetMat": false, "repCommitteeExists": false},
  {"mat": "Thameside Multi-Academy Trust", "isTargetMat": true, "repCommitteeExists": true},
];

export const fieldNotes = [
  {"id": "n1", "date": "2026-07-22", "level": "School", "subject": "200001", "title": "Density strong, needs a second rep", "note": "72% turnout on the informal check-in. Worth identifying a co-rep before the current rep goes on leave in September.", "author": "Amara O."},
  {"id": "n2", "date": "2026-07-25", "level": "School", "subject": "200002", "title": "No rep — approached SLT contact", "note": "Head of department seemed open to a workplace meeting. Follow up with branch sec before half term.", "author": "Jide K."},
  {"id": "n3", "date": "2026-08-01", "level": "Branch", "subject": "Bromley", "title": "Branch meeting notes", "note": "Agreed to prioritise Ravens Wood and Oakdene for rep recruitment this term.", "author": "Amara O."},
  {"id": "n4", "date": "2026-08-03", "level": "MAT", "subject": "Kingsway Education Trust", "title": "Trust-wide facility time dispute brewing", "note": "Trust proposing to cut facility time allocation across all sites from January. Coordinating a joint response with reps.", "author": "Priya S."},
  {"id": "n5", "date": "2026-07-18", "level": "School", "subject": "200008", "title": "Recruited 3 new members after lunch stall", "note": "Good response to the TA-focused leaflet. Two of the three are TAs.", "author": "Tom R."},
  {"id": "n6", "date": "2026-08-05", "level": "School", "subject": "200011", "title": "Indicative ballot planning underway", "note": "Issue is H&S — unaddressed maintenance backlog. Timeline agreed with branch.", "author": "Priya S."},
  {"id": "n7", "date": "2026-08-07", "level": "Branch", "subject": "Greenwich", "title": "Density improving across primaries", "note": "Blackheath Grove is the outlier — no rep and low density, worth a target visit.", "author": "Jide K."},
  {"id": "n8", "date": "2026-08-09", "level": "MAT", "subject": "Bright Futures Learning Trust", "title": "Rep committee meeting scheduled", "note": "First cross-trust rep committee meeting booked for September, covering both mapped schools.", "author": "Amara O."},
];

export const disputeTracker = [
  {"id": "d1", "employer": "Kingsway Education Trust", "mat": "Kingsway Education Trust", "branch": "Bromley", "live": "Yes", "schoolsCount": 1, "rorIo": "ROR", "staffResponsible": "Amara O.", "issues": ["Redundancies", "Facility time"], "dateIndicativeOpens": "2026-07-01", "indicativePercent": 0.72, "membershipAtIndicative": 18, "formalBallotPercent": null, "dateOfResolution": null, "outcome": null, "totalStrikeDays": 0},
  {"id": "d2", "employer": "Riverside Academies Trust", "mat": "Riverside Academies Trust", "branch": "Hillingdon", "live": "Yes", "schoolsCount": 2, "rorIo": "SIO", "staffResponsible": "Priya S.", "issues": ["Workload", "Management style"], "dateIndicativeOpens": "2026-06-10", "indicativePercent": 0.65, "membershipAtIndicative": 42, "formalBallotPercent": 0.58, "dateOfResolution": null, "outcome": "Amber", "totalStrikeDays": 0},
  {"id": "d3", "employer": "Charlton Park Academy", "mat": "", "branch": "Greenwich", "live": "Yes", "schoolsCount": 1, "rorIo": "IO", "staffResponsible": "Jide K.", "issues": ["Pay policy (inc TLRs)"], "dateIndicativeOpens": "2026-05-14", "indicativePercent": 0.81, "membershipAtIndicative": 36, "formalBallotPercent": 0.77, "dateOfResolution": null, "outcome": "Red", "totalStrikeDays": 2},
  {"id": "d4", "employer": "Thameside Multi-Academy Trust", "mat": "Thameside Multi-Academy Trust", "branch": "Wandsworth", "live": "No", "schoolsCount": 2, "rorIo": "ROR", "staffResponsible": "Tom R.", "issues": ["H&S"], "dateIndicativeOpens": "2026-04-02", "indicativePercent": 0.55, "membershipAtIndicative": 22, "formalBallotPercent": 0.6, "dateOfResolution": "2026-06-15", "outcome": "Green", "totalStrikeDays": 0},
  {"id": "d5", "employer": "Ickenham Community School", "mat": "", "branch": "Hillingdon", "live": "Yes", "schoolsCount": 1, "rorIo": "IO", "staffResponsible": "Priya S.", "issues": ["Staffing", "Consultation"], "dateIndicativeOpens": null, "indicativePercent": null, "membershipAtIndicative": null, "formalBallotPercent": null, "dateOfResolution": null, "outcome": null, "totalStrikeDays": 0},
];

// Append-only event logs. Deliberately minimal: date + school, with loggedBy
// filled from the signed-in account.
export const meetings = [
  {"id": "m1", "date": "2026-06-12", "urn": 200001, "loggedBy": "Amara O."},
  {"id": "m2", "date": "2026-07-03", "urn": 200001, "loggedBy": "Amara O."},
  {"id": "m3", "date": "2026-07-15", "urn": 200003, "loggedBy": "Amara O."},
  {"id": "m4", "date": "2026-06-25", "urn": 200006, "loggedBy": "Amara O."},
  {"id": "m5", "date": "2026-07-30", "urn": 200009, "loggedBy": "Amara O."},
  {"id": "m6", "date": "2026-08-04", "urn": 200009, "loggedBy": "Amara O."},
  {"id": "m7", "date": "2026-07-09", "urn": 200008, "loggedBy": "Amara O."},
  {"id": "m8", "date": "2026-08-06", "urn": 200012, "loggedBy": "Amara O."},
];

export const repsRecruited = [
  {"id": "r1", "date": "2026-06-20", "urn": 200001, "repName": "Dana Whitlock", "loggedBy": "Jide K."},
  {"id": "r2", "date": "2026-07-11", "urn": 200006, "repName": "Femi Adebayo", "loggedBy": "Jide K."},
  {"id": "r3", "date": "2026-08-02", "urn": 200012, "repName": "Sarah Lindqvist", "loggedBy": "Jide K."},
];

// Eight weekly captures trending up to the current figures, so trend views
// have something to draw in preview mode. Real deployments start empty and
// accumulate from the first capture — history cannot be reconstructed.
export const snapshots = [
  {"snapshotDate": "2026-06-19", "urn": 200001, "overallMembers": 16, "repCount": 0, "hcWorkforce": 42, "voted": 11, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-06-19", "urn": 200002, "overallMembers": 17, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-06-19", "urn": 200003, "overallMembers": 28, "repCount": 0, "hcWorkforce": 96, "voted": 20, "volunteers": 3, "wpConversations": 7},
  {"snapshotDate": "2026-06-19", "urn": 200004, "overallMembers": 7, "repCount": 0, "hcWorkforce": 19, "voted": 5, "volunteers": 2, "wpConversations": 2},
  {"snapshotDate": "2026-06-19", "urn": 200005, "overallMembers": 13, "repCount": 0, "hcWorkforce": 48, "voted": 8, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-06-19", "urn": 200006, "overallMembers": 36, "repCount": 1, "hcWorkforce": 132, "voted": 30, "volunteers": 4, "wpConversations": 10},
  {"snapshotDate": "2026-06-19", "urn": 200007, "overallMembers": 7, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-06-19", "urn": 200008, "overallMembers": 14, "repCount": 0, "hcWorkforce": 44, "voted": 9, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-06-19", "urn": 200009, "overallMembers": 31, "repCount": 0, "hcWorkforce": 121, "voted": 25, "volunteers": 2, "wpConversations": 7},
  {"snapshotDate": "2026-06-19", "urn": 200010, "overallMembers": 5, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-06-19", "urn": 200011, "overallMembers": 11, "repCount": 0, "hcWorkforce": 45, "voted": 7, "volunteers": 2, "wpConversations": 2},
  {"snapshotDate": "2026-06-19", "urn": 200012, "overallMembers": 34, "repCount": 1, "hcWorkforce": 109, "voted": 26, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-06-19", "urn": 200013, "overallMembers": 10, "repCount": 0, "hcWorkforce": 41, "voted": 6, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-06-19", "urn": 200014, "overallMembers": 27, "repCount": 0, "hcWorkforce": 126, "voted": 16, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-06-26", "urn": 200001, "overallMembers": 16, "repCount": 0, "hcWorkforce": 42, "voted": 12, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-06-26", "urn": 200002, "overallMembers": 18, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-06-26", "urn": 200003, "overallMembers": 29, "repCount": 0, "hcWorkforce": 96, "voted": 21, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-06-26", "urn": 200004, "overallMembers": 8, "repCount": 0, "hcWorkforce": 19, "voted": 5, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-06-26", "urn": 200005, "overallMembers": 14, "repCount": 0, "hcWorkforce": 48, "voted": 8, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-06-26", "urn": 200006, "overallMembers": 37, "repCount": 1, "hcWorkforce": 132, "voted": 30, "volunteers": 4, "wpConversations": 10},
  {"snapshotDate": "2026-06-26", "urn": 200007, "overallMembers": 7, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-06-26", "urn": 200008, "overallMembers": 14, "repCount": 0, "hcWorkforce": 44, "voted": 9, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-06-26", "urn": 200009, "overallMembers": 32, "repCount": 0, "hcWorkforce": 121, "voted": 25, "volunteers": 3, "wpConversations": 7},
  {"snapshotDate": "2026-06-26", "urn": 200010, "overallMembers": 5, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-06-26", "urn": 200011, "overallMembers": 12, "repCount": 0, "hcWorkforce": 45, "voted": 7, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-06-26", "urn": 200012, "overallMembers": 35, "repCount": 1, "hcWorkforce": 109, "voted": 27, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-06-26", "urn": 200013, "overallMembers": 10, "repCount": 0, "hcWorkforce": 41, "voted": 6, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-06-26", "urn": 200014, "overallMembers": 28, "repCount": 0, "hcWorkforce": 126, "voted": 17, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-07-03", "urn": 200001, "overallMembers": 17, "repCount": 1, "hcWorkforce": 42, "voted": 12, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-07-03", "urn": 200002, "overallMembers": 18, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-07-03", "urn": 200003, "overallMembers": 30, "repCount": 1, "hcWorkforce": 96, "voted": 22, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-07-03", "urn": 200004, "overallMembers": 8, "repCount": 1, "hcWorkforce": 19, "voted": 5, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-03", "urn": 200005, "overallMembers": 14, "repCount": 1, "hcWorkforce": 48, "voted": 9, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-03", "urn": 200006, "overallMembers": 38, "repCount": 2, "hcWorkforce": 132, "voted": 31, "volunteers": 4, "wpConversations": 10},
  {"snapshotDate": "2026-07-03", "urn": 200007, "overallMembers": 7, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-07-03", "urn": 200008, "overallMembers": 15, "repCount": 1, "hcWorkforce": 44, "voted": 10, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-03", "urn": 200009, "overallMembers": 33, "repCount": 1, "hcWorkforce": 121, "voted": 26, "volunteers": 3, "wpConversations": 7},
  {"snapshotDate": "2026-07-03", "urn": 200010, "overallMembers": 5, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-07-03", "urn": 200011, "overallMembers": 12, "repCount": 1, "hcWorkforce": 45, "voted": 7, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-03", "urn": 200012, "overallMembers": 36, "repCount": 2, "hcWorkforce": 109, "voted": 28, "volunteers": 3, "wpConversations": 9},
  {"snapshotDate": "2026-07-03", "urn": 200013, "overallMembers": 10, "repCount": 1, "hcWorkforce": 41, "voted": 6, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-07-03", "urn": 200014, "overallMembers": 29, "repCount": 1, "hcWorkforce": 126, "voted": 17, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-07-10", "urn": 200001, "overallMembers": 17, "repCount": 1, "hcWorkforce": 42, "voted": 13, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-07-10", "urn": 200002, "overallMembers": 19, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-07-10", "urn": 200003, "overallMembers": 31, "repCount": 1, "hcWorkforce": 96, "voted": 22, "volunteers": 4, "wpConversations": 8},
  {"snapshotDate": "2026-07-10", "urn": 200004, "overallMembers": 8, "repCount": 1, "hcWorkforce": 19, "voted": 5, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-10", "urn": 200005, "overallMembers": 14, "repCount": 1, "hcWorkforce": 48, "voted": 9, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-10", "urn": 200006, "overallMembers": 39, "repCount": 2, "hcWorkforce": 132, "voted": 32, "volunteers": 4, "wpConversations": 11},
  {"snapshotDate": "2026-07-10", "urn": 200007, "overallMembers": 7, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-07-10", "urn": 200008, "overallMembers": 15, "repCount": 1, "hcWorkforce": 44, "voted": 10, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-10", "urn": 200009, "overallMembers": 34, "repCount": 1, "hcWorkforce": 121, "voted": 27, "volunteers": 3, "wpConversations": 7},
  {"snapshotDate": "2026-07-10", "urn": 200010, "overallMembers": 5, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-07-10", "urn": 200011, "overallMembers": 13, "repCount": 1, "hcWorkforce": 45, "voted": 7, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-10", "urn": 200012, "overallMembers": 37, "repCount": 2, "hcWorkforce": 109, "voted": 29, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-07-10", "urn": 200013, "overallMembers": 11, "repCount": 1, "hcWorkforce": 41, "voted": 6, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-07-10", "urn": 200014, "overallMembers": 30, "repCount": 1, "hcWorkforce": 126, "voted": 18, "volunteers": 3, "wpConversations": 5},
  {"snapshotDate": "2026-07-17", "urn": 200001, "overallMembers": 18, "repCount": 1, "hcWorkforce": 42, "voted": 13, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-07-17", "urn": 200002, "overallMembers": 19, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-07-17", "urn": 200003, "overallMembers": 31, "repCount": 1, "hcWorkforce": 96, "voted": 23, "volunteers": 4, "wpConversations": 8},
  {"snapshotDate": "2026-07-17", "urn": 200004, "overallMembers": 8, "repCount": 1, "hcWorkforce": 19, "voted": 6, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-17", "urn": 200005, "overallMembers": 15, "repCount": 1, "hcWorkforce": 48, "voted": 9, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-07-17", "urn": 200006, "overallMembers": 41, "repCount": 2, "hcWorkforce": 132, "voted": 33, "volunteers": 5, "wpConversations": 11},
  {"snapshotDate": "2026-07-17", "urn": 200007, "overallMembers": 7, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-07-17", "urn": 200008, "overallMembers": 16, "repCount": 1, "hcWorkforce": 44, "voted": 10, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-17", "urn": 200009, "overallMembers": 35, "repCount": 1, "hcWorkforce": 121, "voted": 28, "volunteers": 3, "wpConversations": 7},
  {"snapshotDate": "2026-07-17", "urn": 200010, "overallMembers": 6, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-07-17", "urn": 200011, "overallMembers": 13, "repCount": 1, "hcWorkforce": 45, "voted": 7, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-17", "urn": 200012, "overallMembers": 38, "repCount": 2, "hcWorkforce": 109, "voted": 30, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-07-17", "urn": 200013, "overallMembers": 11, "repCount": 1, "hcWorkforce": 41, "voted": 6, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-07-17", "urn": 200014, "overallMembers": 30, "repCount": 1, "hcWorkforce": 126, "voted": 18, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-07-24", "urn": 200001, "overallMembers": 18, "repCount": 1, "hcWorkforce": 42, "voted": 13, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-07-24", "urn": 200002, "overallMembers": 20, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-07-24", "urn": 200003, "overallMembers": 32, "repCount": 1, "hcWorkforce": 96, "voted": 24, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-07-24", "urn": 200004, "overallMembers": 9, "repCount": 1, "hcWorkforce": 19, "voted": 6, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-24", "urn": 200005, "overallMembers": 15, "repCount": 1, "hcWorkforce": 48, "voted": 9, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-07-24", "urn": 200006, "overallMembers": 42, "repCount": 2, "hcWorkforce": 132, "voted": 34, "volunteers": 5, "wpConversations": 11},
  {"snapshotDate": "2026-07-24", "urn": 200007, "overallMembers": 8, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-07-24", "urn": 200008, "overallMembers": 16, "repCount": 1, "hcWorkforce": 44, "voted": 10, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-24", "urn": 200009, "overallMembers": 36, "repCount": 1, "hcWorkforce": 121, "voted": 28, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-07-24", "urn": 200010, "overallMembers": 6, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-07-24", "urn": 200011, "overallMembers": 13, "repCount": 1, "hcWorkforce": 45, "voted": 8, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-24", "urn": 200012, "overallMembers": 39, "repCount": 2, "hcWorkforce": 109, "voted": 30, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-07-24", "urn": 200013, "overallMembers": 11, "repCount": 1, "hcWorkforce": 41, "voted": 7, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-07-24", "urn": 200014, "overallMembers": 31, "repCount": 1, "hcWorkforce": 126, "voted": 19, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-07-31", "urn": 200001, "overallMembers": 19, "repCount": 1, "hcWorkforce": 42, "voted": 14, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-07-31", "urn": 200002, "overallMembers": 20, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-07-31", "urn": 200003, "overallMembers": 33, "repCount": 1, "hcWorkforce": 96, "voted": 24, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-07-31", "urn": 200004, "overallMembers": 9, "repCount": 1, "hcWorkforce": 19, "voted": 6, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-31", "urn": 200005, "overallMembers": 16, "repCount": 1, "hcWorkforce": 48, "voted": 10, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-07-31", "urn": 200006, "overallMembers": 43, "repCount": 2, "hcWorkforce": 132, "voted": 35, "volunteers": 5, "wpConversations": 12},
  {"snapshotDate": "2026-07-31", "urn": 200007, "overallMembers": 8, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-07-31", "urn": 200008, "overallMembers": 17, "repCount": 1, "hcWorkforce": 44, "voted": 11, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-07-31", "urn": 200009, "overallMembers": 37, "repCount": 1, "hcWorkforce": 121, "voted": 29, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-07-31", "urn": 200010, "overallMembers": 6, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-07-31", "urn": 200011, "overallMembers": 14, "repCount": 1, "hcWorkforce": 45, "voted": 8, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-07-31", "urn": 200012, "overallMembers": 40, "repCount": 2, "hcWorkforce": 109, "voted": 31, "volunteers": 4, "wpConversations": 10},
  {"snapshotDate": "2026-07-31", "urn": 200013, "overallMembers": 12, "repCount": 1, "hcWorkforce": 41, "voted": 7, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-07-31", "urn": 200014, "overallMembers": 32, "repCount": 1, "hcWorkforce": 126, "voted": 19, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-08-07", "urn": 200001, "overallMembers": 19, "repCount": 1, "hcWorkforce": 42, "voted": 14, "volunteers": 3, "wpConversations": 6},
  {"snapshotDate": "2026-08-07", "urn": 200002, "overallMembers": 21, "repCount": 0, "hcWorkforce": 118, "voted": 0, "volunteers": 1, "wpConversations": 2},
  {"snapshotDate": "2026-08-07", "urn": 200003, "overallMembers": 34, "repCount": 1, "hcWorkforce": 96, "voted": 25, "volunteers": 4, "wpConversations": 9},
  {"snapshotDate": "2026-08-07", "urn": 200004, "overallMembers": 9, "repCount": 1, "hcWorkforce": 19, "voted": 6, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-08-07", "urn": 200005, "overallMembers": 16, "repCount": 1, "hcWorkforce": 48, "voted": 10, "volunteers": 2, "wpConversations": 5},
  {"snapshotDate": "2026-08-07", "urn": 200006, "overallMembers": 44, "repCount": 2, "hcWorkforce": 132, "voted": 36, "volunteers": 5, "wpConversations": 12},
  {"snapshotDate": "2026-08-07", "urn": 200007, "overallMembers": 8, "repCount": 0, "hcWorkforce": 39, "voted": 0, "volunteers": 1, "wpConversations": 1},
  {"snapshotDate": "2026-08-07", "urn": 200008, "overallMembers": 17, "repCount": 1, "hcWorkforce": 44, "voted": 11, "volunteers": 2, "wpConversations": 4},
  {"snapshotDate": "2026-08-07", "urn": 200009, "overallMembers": 38, "repCount": 1, "hcWorkforce": 121, "voted": 30, "volunteers": 3, "wpConversations": 8},
  {"snapshotDate": "2026-08-07", "urn": 200010, "overallMembers": 6, "repCount": 0, "hcWorkforce": 37, "voted": 0, "volunteers": 0, "wpConversations": 1},
  {"snapshotDate": "2026-08-07", "urn": 200011, "overallMembers": 14, "repCount": 1, "hcWorkforce": 45, "voted": 8, "volunteers": 2, "wpConversations": 3},
  {"snapshotDate": "2026-08-07", "urn": 200012, "overallMembers": 41, "repCount": 2, "hcWorkforce": 109, "voted": 32, "volunteers": 4, "wpConversations": 10},
  {"snapshotDate": "2026-08-07", "urn": 200013, "overallMembers": 12, "repCount": 1, "hcWorkforce": 41, "voted": 7, "volunteers": 1, "wpConversations": 3},
  {"snapshotDate": "2026-08-07", "urn": 200014, "overallMembers": 33, "repCount": 1, "hcWorkforce": 126, "voted": 20, "volunteers": 3, "wpConversations": 6},
];

// Cached postcode coordinates for the map. Real London locations for the
// invented schools, so the preview map looks like the real thing.
export const schoolGeo = [
  {"urn": 200001, "lat": 51.4059, "lon": 0.0148, "geocodedDate": "2026-08-01"},
  {"urn": 200002, "lat": 51.3845, "lon": 0.0562, "geocodedDate": "2026-08-01"},
  {"urn": 200003, "lat": 51.4085, "lon": -0.0255, "geocodedDate": "2026-08-01"},
  {"urn": 200004, "lat": 51.4159, "lon": 0.0248, "geocodedDate": "2026-08-01"},
  {"urn": 200005, "lat": 51.4835, "lon": 0.0698, "geocodedDate": "2026-08-01"},
  {"urn": 200006, "lat": 51.4869, "lon": 0.0413, "geocodedDate": "2026-08-01"},
  {"urn": 200007, "lat": 51.4652, "lon": 0.0195, "geocodedDate": "2026-08-01"},
  {"urn": 200008, "lat": 51.5432, "lon": -0.4784, "geocodedDate": "2026-08-01"},
  {"urn": 200009, "lat": 51.5215, "lon": -0.4012, "geocodedDate": "2026-08-01"},
  {"urn": 200010, "lat": 51.5620, "lon": -0.4472, "geocodedDate": "2026-08-01"},
  {"urn": 200011, "lat": 51.4640, "lon": -0.1660, "geocodedDate": "2026-08-01"},
  {"urn": 200012, "lat": 51.4288, "lon": -0.1594, "geocodedDate": "2026-08-01"},
  {"urn": 200013, "lat": 51.5423, "lon": -0.1310, "geocodedDate": "2026-08-01"},
  {"urn": 200014, "lat": 51.5265, "lon": -0.1490, "geocodedDate": "2026-08-01"},
];
