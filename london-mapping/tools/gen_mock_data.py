# Regenerates js/data/mock-data.js — the synthetic sample data the app runs on in
# preview mode. mock-data.js is GENERATED: edit this file, run it, commit both.
#
#   python3 london-mapping/tools/gen_mock_data.py
#
# Every name and number here is invented. Never put real membership, employer or
# dispute data in this file or in its output — this repository is public.

import json, datetime, pathlib, random

def js(o): return json.dumps(o, ensure_ascii=False)

# ---------------------------------------------------------------------------
# The original 16 schools. URNs 200001-200016 are load-bearing: field notes,
# disputes and meetings all reference them by URN, and 200015/200016 plus
# WP900001/WP200012B are the seeded anomalies the Anomalies page demonstrates.
# Leave these alone; add new schools below instead.
# ---------------------------------------------------------------------------
SCHOOLS = [
    # urn, name, type, phase, borough, religious, diocese, trust, sponsors, feds, postcode, status
    (200001,"Elmfield Primary School","Academy converter","Primary","Bromley","Does not apply","Not applicable","Oscar Romero","","","BR1 2AB","Open"),
    (200002,"Ravens Wood Secondary School","Community school","Secondary","Bromley","Does not apply","Not applicable","","","Bromley Secondary Federation","BR2 7EX","Open"),
    (200003,"Kingsway High School","Academy converter","Secondary","Bromley","Church of England","Diocese of Rochester","Haberdashers","","","BR3 1LP","Open"),
    (200004,"Oakdene Nursery School","LA maintained nursery","Nursery","Bromley","Does not apply","Not applicable","","","","BR1 4QW","Open"),
    (200005,"Woolwich Common Primary","Academy converter","Primary","Greenwich","Does not apply","Not applicable","Oscar Romero","","","SE18 4NN","Open"),
    (200006,"Charlton Park Academy","Academy sponsor led","Secondary","Greenwich","Does not apply","Not applicable","","Charlton Education Partnership","","SE7 8QF","Open"),
    (200007,"Blackheath Grove Primary","Community school","Primary","Greenwich","Roman Catholic","Archdiocese of Southwark","","","","SE3 9RT","Open"),
    (200008,"Uxbridge Meadow Primary","Academy converter","Primary","Hillingdon","Does not apply","Not applicable","Compass Partnership of Schools","","","UB8 2LJ","Open"),
    (200009,"Hayes Park Secondary","Academy converter","Secondary","Hillingdon","Does not apply","Not applicable","EKO Trust","","","UB4 0HJ","Open"),
    (200010,"Ickenham Community School","Community school","Primary","Hillingdon","Does not apply","Not applicable","","","","UB10 8QN","Open"),
    (200011,"Battersea Rise Primary","Academy converter","Primary","Wandsworth","Does not apply","Not applicable","Orchard Hill","","","SW11 1EJ","Open"),
    (200012,"Tooting Bec Academy","Academy converter","Secondary","Wandsworth","Does not apply","Not applicable","Orchard Hill","","","SW17 8ES","Open"),
    (200013,"Chelsea Riverside Primary","Academy converter","Primary","Kensington and Chelsea","Does not apply","Not applicable","COLA","","","SW10 0BZ","Open"),
    (200014,"Havering Park Community School","Community school","Secondary","Havering","Does not apply","Not applicable","","","","RM1 4LE","Open"),
    # Seeded anomaly: closed school that still carries members (converted to 200002)
    (200015,"Bromley Old Grammar (closed)","Community school","Secondary","Bromley","Does not apply","Not applicable","","","","BR2 9AA","Closed"),
    # Seeded anomaly: in GIAS, no Stratum record
    (200016,"Newpark Free School","Free school","Primary","Havering","Does not apply","Not applicable","","","","RM2 6QQ","Open"),
]

# ---------------------------------------------------------------------------
# Second cohort, URNs 200017-200048.
#
# Added so the organising quadrant chart has something real to draw: it needs
# at least five schools with BOTH a density and a 2026 turnout figure before it
# will plot, and the original 16 gave no branch more than four. Each school here
# carries a deliberate organising profile so all four quadrants are populated at
# branch and at trust level:
#
#   strong  — organised and mobilised (high density, high turnout)
#   core    — committed core (low density, high turnout)
#   members — members, not mobilised (high density, low turnout)
#   cold    — needs a rep and a first conversation (low both)
#
# payMode controls whether a school reaches the chart at all, so the
# "n schools not shown" footnote is exercised too:
#   full        — normal Pay Dashboard row
#   no-turnout  — Pay Dashboard row exists but the 2026 ballot figure is blank
#   none        — no Pay Dashboard row at all
#
# Still entirely invented. Names, postcodes and every number are synthetic.
# urn, name, type, phase, borough, trust, postcode, size, profile, payMode
# ---------------------------------------------------------------------------
NEW_SCHOOLS = [
    (200017,"St Aidan's Catholic Primary","Academy converter","Primary","Bromley","Oscar Romero","BR1 5TG","primary","strong","full"),
    (200018,"Bickley Hill Academy","Academy converter","Secondary","Bromley","Haberdashers","BR1 2NQ","secondary","members","full"),
    (200019,"Chislehurst Green Primary","Academy converter","Primary","Bromley","COLA","BR7 5AH","primary","core","full"),
    (200020,"Penge Vale Special School","Community special school","Special","Bromley","","SE20 7QP","special","core","full"),
    (200021,"Orpington Meadows Nursery","LA maintained nursery","Nursery","Bromley","","BR6 9DT","nursery","members","none"),

    (200022,"Eltham Ridge Academy","Academy converter","Secondary","Greenwich","Haberdashers","SE9 5LT","secondary","cold","full"),
    (200023,"Plumstead Fields Primary","Community school","Primary","Greenwich","","SE18 1XN","primary","strong","full"),
    (200048,"Kidbrooke Park Academy","Academy converter","Secondary","Greenwich","","SE3 9FS","secondary","members","full"),

    (200024,"Yiewsley Brook Primary","Academy converter","Primary","Hillingdon","Compass Partnership of Schools","UB7 7QT","primary","members","full"),
    (200025,"Ruislip Manor Academy","Academy converter","Secondary","Hillingdon","EKO Trust","HA4 9BN","secondary","cold","full"),
    (200026,"Northwood Gate Primary","Academy converter","Primary","Hillingdon","Compass Partnership of Schools","HA6 1LN","primary","strong","full"),
    (200027,"West Drayton Grove Primary","Academy converter","Primary","Hillingdon","Oscar Romero","UB7 9DP","primary","cold","full"),
    (200028,"Harlington Vale Special School","Community special school","Special","Hillingdon","","UB3 5AR","special","core","full"),
    (200029,"Cowley Bridge Primary","Community school","Primary","Hillingdon","","UB8 3PT","primary","core","no-turnout"),

    (200030,"Balham Heath Primary","Academy converter","Primary","Wandsworth","Orchard Hill","SW12 8QA","primary","cold","full"),
    (200031,"Earlsfield Bank Academy","Academy converter","Secondary","Wandsworth","Orchard Hill","SW18 3PT","secondary","members","full"),
    (200032,"Southfields Row Primary","Academy converter","Primary","Wandsworth","Orchard Hill","SW18 5RQ","primary","core","full"),
    (200033,"Putney Vale Special School","Academy special converter","Special","Wandsworth","Orchard Hill","SW15 3DZ","special","strong","full"),
    (200034,"Nine Elms Academy","Academy converter","Secondary","Wandsworth","COLA","SW8 5BN","secondary","cold","full"),
    (200035,"Roehampton Lane Community School","Community school","Secondary","Wandsworth","","SW15 5PU","secondary","members","full"),

    (200036,"Notting Dale Primary","Academy converter","Primary","Kensington and Chelsea","COLA","W11 4LG","primary","strong","full"),
    (200037,"Holland Park Rise Academy","Academy converter","Secondary","Kensington and Chelsea","COLA","W8 6LB","secondary","cold","full"),
    (200038,"Earls Court Green Primary","Academy converter","Primary","Kensington and Chelsea","COLA","SW5 9QT","primary","members","full"),
    (200039,"Ladbroke Hill Academy","Academy converter","Secondary","Kensington and Chelsea","Haberdashers","W10 5UX","secondary","core","full"),
    (200040,"St Bede's Catholic Primary","Academy converter","Primary","Kensington and Chelsea","Oscar Romero","SW7 3RP","primary","core","full"),
    (200041,"Kensal Town Nursery School","LA maintained nursery","Nursery","Kensington and Chelsea","","W10 4AA","nursery","strong","none"),

    (200042,"Romford Heath Academy","Academy converter","Secondary","Havering","Haberdashers","RM7 9NX","secondary","members","full"),
    (200043,"Gidea Park Primary","Academy converter","Primary","Havering","Haberdashers","RM2 5EL","primary","strong","full"),
    (200044,"Hornchurch Marsh Primary","Academy converter","Primary","Havering","EKO Trust","RM12 4QT","primary","cold","full"),
    (200045,"Upminster Fields Primary","Academy converter","Primary","Havering","Oscar Romero","RM14 2JN","primary","core","full"),
    (200046,"Rainham Lodge Special School","Community special school","Special","Havering","","RM13 9YZ","special","core","full"),
    (200047,"Collier Row Community School","Community school","Secondary","Havering","","RM5 2BH","secondary","members","full"),
]

# ---------------------------------------------------------------------------
# Third cohort, URNs 200101-200124: boroughs OUTSIDE the project.
#
# The dashboard's headline analytical claim is that membership rising in the
# project branches only means something set against a flat or falling
# rest-of-region. That comparison is only honest if the GIAS spine actually
# covers London rather than just the five project boroughs, and the dashboard
# refuses to draw it when it doesn't — so the sample data has to carry enough
# non-project boroughs for the check to pass, the same way the real all-London
# spine will.
#
# Their trusts are non-target MATs, which is also what makes the target-MAT
# side of that comparison possible.
# ---------------------------------------------------------------------------
OTHER_SCHOOLS = [
    (200101,"Deptford Bridge Primary","Community school","Primary","Lewisham","","SE8 4RJ","primary","cold","full"),
    (200102,"Catford Rise Academy","Academy converter","Secondary","Lewisham","Thameside Learning Trust","SE6 4RU","secondary","members","full"),
    (200103,"Sydenham Wells Primary","Academy converter","Primary","Lewisham","Thameside Learning Trust","SE26 4QN","primary","core","full"),
    (200104,"Peckham Rye Primary","Community school","Primary","Southwark","","SE15 3UA","primary","cold","full"),
    (200105,"Bermondsey Wharf Academy","Academy converter","Secondary","Southwark","Riverbank Education Trust","SE16 4TX","secondary","cold","full"),
    (200106,"Dulwich Heath Primary","Academy converter","Primary","Southwark","Riverbank Education Trust","SE22 8HT","primary","members","full"),
    (200107,"Stockwell Park Primary","Community school","Primary","Lambeth","","SW9 0QN","primary","core","full"),
    (200108,"Streatham Vale Academy","Academy converter","Secondary","Lambeth","Thameside Learning Trust","SW16 5QT","secondary","cold","full"),
    (200109,"Herne Hill Nursery School","LA maintained nursery","Nursery","Lambeth","","SE24 9LG","nursery","cold","none"),
    (200110,"Thornton Heath Primary","Community school","Primary","Croydon","","CR7 8LF","primary","cold","full"),
    (200111,"Selhurst Grange Academy","Academy converter","Secondary","Croydon","Riverbank Education Trust","SE25 6XA","secondary","members","full"),
    (200112,"Purley Downs Primary","Academy converter","Primary","Croydon","","CR8 1AT","primary","core","full"),
    (200113,"Acton Vale Primary","Community school","Primary","Ealing","","W3 7QE","primary","cold","full"),
    (200114,"Southall Green Academy","Academy converter","Secondary","Ealing","Lea Valley Academies","UB2 4BQ","secondary","core","full"),
    (200115,"Perivale Brook Primary","Academy converter","Primary","Ealing","Lea Valley Academies","UB6 8TJ","primary","cold","full"),
    (200116,"Willesden Junction Primary","Community school","Primary","Brent","","NW10 4QX","primary","cold","full"),
    (200117,"Kingsbury Ridge Academy","Academy converter","Secondary","Brent","Lea Valley Academies","NW9 9HY","secondary","members","full"),
    (200118,"Neasden Fields Special School","Community special school","Special","Brent","","NW2 7DY","special","core","full"),
    (200119,"Plaistow Marsh Primary","Community school","Primary","Newham","","E13 9AR","primary","cold","full"),
    (200120,"Stratford Levels Academy","Academy converter","Secondary","Newham","Riverbank Education Trust","E15 4BQ","secondary","core","full"),
    (200121,"Beckton Park Primary","Academy converter","Primary","Newham","","E6 5NA","primary","members","full"),
    (200122,"Wood Green Rise Primary","Community school","Primary","Haringey","","N22 6TR","primary","cold","full"),
    (200123,"Tottenham Hale Academy","Academy converter","Secondary","Haringey","Thameside Learning Trust","N17 9RT","secondary","cold","full"),
    (200124,"Muswell Brow Primary","Academy converter","Primary","Haringey","Lea Valley Academies","N10 3SH","primary","core","full"),
]

NON_TARGET_MATS = ["Thameside Learning Trust", "Riverbank Education Trust", "Lea Valley Academies"]

NEW_SCHOOLS = NEW_SCHOOLS + OTHER_SCHOOLS

# Headcount band and the teacher share of it, by school size. Support staff
# outnumber teachers in nurseries and special schools, which is exactly why
# support density is worth watching separately.
SIZES = {
    "nursery":   ((18, 24), 0.27),
    "primary":   ((38, 52), 0.42),
    "special":   ((54, 70), 0.35),
    "secondary": ((100, 140), 0.57),
}

# profile -> (density range, 2026 turnout range, Stratum rep count range)
PROFILES = {
    "strong":  ((0.52, 0.72), (0.62, 0.88), (1, 2)),
    "core":    ((0.24, 0.34), (0.58, 0.84), (0, 1)),
    "members": ((0.46, 0.66), (0.12, 0.34), (0, 1)),
    "cold":    ((0.12, 0.22), (0.06, 0.28), (0, 0)),
}

HEADS = [("Ms","Nicola","Ashworth"),("Mr","David","Okonkwo"),("Mrs","Solin","Farrah"),("Ms","Priya","Raman"),
         ("Mr","Tom","Blackwood"),("Dr","Helen","Vasquez"),("Mrs","Aisha","Bello"),("Mr","James","Whitfield"),
         ("Ms","Clara","Nowak"),("Mr","Samuel","Adeyemi"),("Mrs","Ruth","Kimani"),("Ms","Eleanor","Pike"),
         ("Mr","Marcus","Deane"),("Mrs","Fiona","Hargreaves"),("Mr","Alan","Prentice"),("Ms","Yara","Haddad"),
         ("Mrs","Beatrice","Sandoval"),("Mr","Kwame","Boateng"),("Ms","Lydia","Fenwick"),("Dr","Omar","Siddiqui"),
         ("Mr","Patrick","Guerin"),("Mrs","Ingrid","Halvorsen"),("Ms","Rosa","Marchetti"),("Mr","Nathan","Coombes"),
         ("Mrs","Adaeze","Nwosu"),("Ms","Bethan","Lloyd-Price"),("Mr","Vikram","Chandra"),("Dr","Josephine","Okafor"),
         ("Mrs","Karolina","Zielinska"),("Mr","Douglas","Ferrier"),("Ms","Simone","Bekele"),("Mr","Rory","MacAllister"),
         ("Mrs","Tanvir","Chowdhury"),("Ms","Grace","Ellingham"),("Mr","Louis","Barbier"),("Dr","Miriam","Kaplan"),
         ("Mrs","Chidinma","Eze"),("Mr","Stefan","Novak"),("Ms","Harriet","Vale"),("Mr","Idris","Mahmood"),
         ("Mrs","Cerys","Anwyl"),("Ms","Delphine","Roche"),("Mr","Callum","Strachan"),("Dr","Ayesha","Qureshi"),
         ("Mrs","Norah","Bannerman"),("Mr","Ezra","Lindgren"),("Ms","Paloma","Ruiz"),("Mr","Hugh","Trelawney")]

DIOCESE_BY_BOROUGH = {
    "Bromley": "Archdiocese of Southwark",
    "Kensington and Chelsea": "Archdiocese of Westminster",
}

# urn -> (hc_total, hc_teach, hc_lead, hc_supp, mem_total, mem_teach, mem_lead,
#         mem_supp, reps)
# reps is the rep count Stratum carries per workplace, and it is the only rep
# figure the app has. It used to sit on the Pay Dashboard rows next to a
# hand-kept RepsRecruited log; both are gone.
STRATUM = {
    200001:(42,18,3,21,19,11,1,7,1), 200002:(118,68,10,40,21,15,1,5,0),
    200003:(96,55,8,33,34,24,3,7,1), 200004:(19,5,1,13,9,4,1,4,1),
    200005:(48,20,3,25,16,9,1,6,1),  200006:(132,74,11,47,44,30,4,10,2),
    200007:(39,16,3,20,8,5,0,3,0),   200008:(44,19,3,22,17,10,1,6,1),
    200009:(121,70,10,41,38,27,3,8,1), 200010:(37,15,3,19,6,4,0,2,0),
    200011:(45,19,3,23,14,9,1,4,1),  200012:(109,61,9,39,41,29,4,8,2),
    200013:(41,17,3,21,12,8,1,3,1),  200014:(126,71,10,45,33,23,3,7,1),
    200015:(0,0,0,0,4,3,0,1,0),      # closed but retains members
}

# urn -> (voted26, voted25, voted24, turnout26, volunteers, conv, activeSEV)
PAY = {
    200001:(15,14,12,0.79,3,6,2), 200002:(2,0,0,0.10,1,2,0),
    200003:(26,25,20,0.76,4,9,2), 200004:(6,6,5,0.67,2,3,1),
    200005:(11,10,8,0.69,2,5,1),  200006:(38,36,30,0.86,5,12,3),
    200007:(1,0,0,0.13,1,1,0),    200008:(12,11,9,0.71,2,4,1),
    200009:(31,30,26,0.82,3,8,2), 200010:(1,0,0,0.17,0,1,0),
    200011:(9,8,7,0.64,2,3,1),    200012:(34,32,28,0.83,4,10,3),
    200013:(8,7,6,0.67,2,4,1),    200014:(22,20,18,0.67,3,6,2),
}

# urn -> (headcountThirdParty, turnover, ptr, meanPay, vacancies, sickDays,
#         hcTeach, hcClass, hcLead, hcSupp, hcTA, schoolType)
SURVEY = {
    200001:(41,0.14,20.1,39800,1,4.2,18,15,3,24,16,"LA maintained primary"),
    200002:(120,0.11,16.8,44100,3,5.1,68,58,10,50,12,"LA maintained secondary"),
    200003:(94,0.18,17.2,43200,4,6.0,55,47,8,41,9,"LA maintained secondary"),
    200004:(20,0.09,12.0,36400,0,3.4,5,4,1,14,11,"LA maintained nursery"),
    200005:(47,0.16,21.3,39100,2,4.8,20,17,3,28,19,"LA maintained primary"),
    200006:(130,0.13,15.9,45600,2,5.5,74,63,11,58,14,"LA maintained secondary"),
    200007:(40,0.21,22.0,38700,3,6.7,16,13,3,23,15,"LA maintained primary"),
    200008:(43,0.12,19.8,40200,1,4.0,19,16,3,25,17,"LA maintained primary"),
    200009:(119,0.15,16.4,44800,3,5.3,70,60,10,51,13,"LA maintained secondary"),
    200010:(38,0.24,21.7,38200,2,7.1,15,12,3,22,14,"LA maintained primary"),
    200011:(46,0.13,20.4,40500,1,4.4,19,16,3,26,18,"LA maintained primary"),
    200012:(107,0.14,16.1,45100,2,5.0,61,52,9,48,11,"LA maintained secondary"),
    200013:(40,0.17,19.2,41800,1,4.6,17,14,3,24,16,"LA maintained primary"),
    200014:(124,0.19,17.0,43600,5,6.2,71,61,10,45,13,"LA maintained secondary"),
    200016:(28,0.10,18.5,40000,0,3.9,12,10,2,16,10,"LA maintained primary"),
}

SURVEY_TYPE = {
    "nursery": "LA maintained nursery", "primary": "LA maintained primary",
    "special": "LA maintained special", "secondary": "LA maintained secondary",
}

# Expand the second cohort into the same source-table shapes. Seeded per URN so
# regenerating this file produces byte-identical output.
for (urn, name, typ, phase, boro, trust, pc, size, profile, pay_mode) in NEW_SCHOOLS:
    rng = random.Random(urn)
    (hc_lo, hc_hi), teach_share = SIZES[size]
    (d_lo, d_hi), (t_lo, t_hi), (r_lo, r_hi) = PROFILES[profile]

    hc = rng.randint(hc_lo, hc_hi)
    hc_lead = max(1, round(hc * 0.08))
    hc_teach = round(hc * teach_share)
    hc_supp = hc - hc_teach - hc_lead

    # Density is never flat across staff categories: teachers organise best,
    # support staff worst, leadership barely at all. Membership is derived from
    # the three category densities and then summed, so the school's headline
    # density is genuinely summed-not-averaged like everything downstream.
    density = round(rng.uniform(d_lo, d_hi), 3)
    mem_teach = round(hc_teach * min(0.95, density * 1.25))
    mem_lead = round(hc_lead * density * 0.70)
    mem_supp = round(hc_supp * density * 0.80)
    mem = mem_teach + mem_lead + mem_supp

    # Every school gets a rep count, because Stratum covers every workplace.
    # The Pay Dashboard doesn't, which is exactly why the rep figure moved here.
    reps = rng.randint(r_lo, r_hi)
    STRATUM[urn] = (hc, hc_teach, hc_lead, hc_supp, mem, mem_teach, mem_lead, mem_supp, reps)

    if pay_mode != "none":
        turnout = None if pay_mode == "no-turnout" else round(rng.uniform(t_lo, t_hi), 2)
        voted26 = round(mem * turnout) if turnout is not None else 0
        PAY[urn] = (voted26, max(0, voted26 - rng.randint(0, 3)),
                    max(0, voted26 - rng.randint(2, 6)), turnout,
                    max(0, reps + rng.randint(0, 3)), rng.randint(1, 12), rng.randint(0, 3))

    SURVEY[urn] = (hc + rng.randint(-3, 3), round(rng.uniform(0.08, 0.24), 2),
                   round(rng.uniform(12.0, 22.0), 1), rng.randrange(36000, 46000, 100),
                   rng.randint(0, 5), round(rng.uniform(3.2, 7.2), 1),
                   hc_teach, round(hc_teach * 0.85), hc_lead, hc_supp,
                   round(hc_supp * 0.6), SURVEY_TYPE[size])

    SCHOOLS.append((urn, name, typ, phase, boro,
                    "Roman Catholic" if "Catholic" in name else "Does not apply",
                    DIOCESE_BY_BOROUGH.get(boro, "Not applicable") if "Catholic" in name else "Not applicable",
                    trust, "", "", pc, "Open"))

SCHOOLS.sort(key=lambda s: s[0])
STRATUM = dict(sorted(STRATUM.items()))
PAY = dict(sorted(PAY.items()))
SURVEY = dict(sorted(SURVEY.items()))

L = []
L.append('''// Synthetic data shaped exactly like the real workbook's tables, so the data
// layer (rollups.js) exercises the same joins it will run against live Graph
// data. Every name/number here is invented — never replace this file with
// real membership or dispute data; that only ever lives in the workbook.
//
// Generated to match data-dictionary/dictionary.json field-for-field.
// Deliberately includes one of each anomaly type so the Anomalies page is
// demonstrable in preview mode:
//   - URN 200015: closed school still carrying members
//   - URN 200016: in GIAS, no Stratum record
//   - WP900001:   workplace code with no URN mapping
//   - URN 200012: two workplace codes mapping to one school
// (mat-not-in-matfacts and stratum-without-gias aren't seeded: every trust
// here has a MatFacts row, which is the correct state to ship in.)
//
// Sized so the organising quadrant chart has something to draw: every project
// branch and every target MAT carries at least five schools with both a
// density and a 2026 turnout, spread across all four quadrants. Three schools
// deliberately lack ballot data so the chart's "not shown" footnote is
// exercised too.
''')

L.append("export const sourceGIAS = [")
for i,(urn,name,typ,phase,boro,relig,dioc,trust,spons,feds,pc,status) in enumerate(SCHOOLS):
    t,fn,ln = HEADS[i % len(HEADS)]
    L.append("  " + js({"urn":urn,"schoolName":name,"typeOfEstablishment":typ,"phase":phase,"laName":boro,
        "establishmentStatus":status,"religiousCharacter":relig,"diocese":dioc,"trusts":trust,
        "schoolSponsors":spons,"federations":feds,"postcode":pc,
        "schoolWebsite":f"www.{name.lower().replace(' ','').replace('(','').replace(')','').replace(chr(39),'')[:22]}.example.sch.uk",
        "telephoneNum":f"020 7946 {1000+i*37:04d}","headTitle":t,"headFirstName":fn,"headLastName":ln}) + ",")
L.append("];\n")

L.append("export const sourceStratum = [")
for urn,(ht,htt,hl,hs,mt,mtt,ml,ms,rc) in STRATUM.items():
    nm = next(s[1] for s in SCHOOLS if s[0]==urn)
    L.append("  " + js({"workplaceCode":f"WP{urn}","workplaceName":nm,"headcountTotal":ht,
        "headcountTeachers":htt,"headcountLeadership":hl,"headcountSupport":hs,"membersTotal":mt,
        "membersTeachers":mtt,"membersLeadership":ml,"membersSupport":ms,"repCount":rc,
        "exportDate":"2026-07-21"}) + ",")
# extra code for 200012 (duplicate-code anomaly) and an unmatched code
L.append("  " + js({"workplaceCode":"WP200012B","workplaceName":"Tooting Bec Academy (sixth form)","headcountTotal":14,
    "headcountTeachers":9,"headcountLeadership":1,"headcountSupport":4,"membersTotal":6,"membersTeachers":5,
    "membersLeadership":0,"membersSupport":1,"repCount":0,"exportDate":"2026-07-21"}) + ",")
L.append("  " + js({"workplaceCode":"WP900001","workplaceName":"Unknown workplace (no URN mapping)","headcountTotal":30,
    "headcountTeachers":16,"headcountLeadership":2,"headcountSupport":12,"membersTotal":11,"membersTeachers":8,
    "membersLeadership":1,"membersSupport":2,"repCount":1,"exportDate":"2026-07-21"}) + ",")
L.append("];\n")

L.append("export const sourcePayDashboard = [")
for urn,(v26,v25,v24,t26,vol,conv,sev) in PAY.items():
    nm = next(s[1] for s in SCHOOLS if s[0]==urn)
    boro = next(s[4] for s in SCHOOLS if s[0]==urn)
    # The Pay Dashboard no longer carries a rep count. These four columns are
    # engagement counters that happen to correlate with having a rep, so they
    # read the authoritative Stratum figure rather than one of their own.
    rc = STRATUM[urn][8]
    L.append("  " + js({"workplaceCode":f"WP{urn}","workplaceName":nm,"membersVoted2026":v26,
        "membersVoted2025":v25,"membersVoted2024":v24,"turnout2026":t26,"volunteers":vol,"wpConversations":conv,
        "activeSEVs":sev,"repRecruitedVolunteer":max(0,rc-1),"joinedCommunity":round(vol*0.5),
        "completedActivateAction":round(conv*1.6),"agreedToBriefing":1 if rc else 0,"holdAMeeting":1 if rc else 0,
        "needsSupport":0 if rc else 1,"pledgedToVote":round(v26*0.4),"branchName":f"{boro} State Education",
        "districtName":boro,"regionName":"London","importDate":"2026-07-21"}) + ",")
L.append("];\n")

L.append("export const sourceWorkforceSurvey = [")
for urn,(h3,to,ptr,pay,vac,sick,ht,hc,hl,hsu,hta,stype) in SURVEY.items():
    nm = next(s[1] for s in SCHOOLS if s[0]==urn)
    boro = next(s[4] for s in SCHOOLS if s[0]==urn)
    L.append("  " + js({"urn":urn,"headcountThirdParty":h3,"annualTurnover":to,"pupilTeacherRatio":ptr,
        "averageMeanPay":pay,"vacancies":vac,"averageSickDays":sick,"schoolName":nm,"laName":boro,
        "schoolType":stype,"hcAllTeachers":ht,"hcClassroomTeachers":hc,"hcLeadershipTeachers":hl,
        "hcAllSupportStaff":hsu,"hcTeachingAssistants":hta}) + ",")
L.append("];\n")

L.append("export const wcToUrn = [")
for urn in STRATUM:
    L.append("  " + js({"workplaceCode":f"WP{urn}","urn":urn}) + ",")
L.append("  " + js({"workplaceCode":"WP200012B","urn":200012}) + ",")
L.append("];\n")

L.append('''// Compass Eko is a merger of two trusts; GIAS still names either half.
// Aliasing folds them into one MAT rather than two half-sized ones.''')
L.append("export const matAliases = [")
for a,c in [("Compass Partnership of Schools","Compass Eko"),("EKO Trust","Compass Eko")]:
    L.append("  " + js({"alias":a,"canonicalMat":c}) + ",")
L.append("];\n")

PROJECT_BRANCHES = ["Havering","Hillingdon","Bromley","Wandsworth","Kensington and Chelsea"]
OTHER_BRANCHES = sorted({s[4] for s in OTHER_SCHOOLS} | {"Greenwich"})
L.append("export const branchFacts = [")
for b in PROJECT_BRANCHES + OTHER_BRANCHES:
    proj = b in PROJECT_BRANCHES
    L.append("  " + js({"branch":b,"isProjectBranch":proj,"repsTrainedSinceStart":{"Bromley":2,"Hillingdon":3,"Wandsworth":1}.get(b,0)}) + ",")
L.append("];\n")

L.append('''// Non-target trusts get a row too, with isTargetMat false. Without one they
// would show on the Anomalies page as "MAT not in MatFacts", and a trust the
// project simply isn't working in is not an anomaly.''')
L.append("export const matFacts = [")
for m in ["Oscar Romero","COLA","Haberdashers","Compass Eko","Orchard Hill"]:
    L.append("  " + js({"mat":m,"isTargetMat":True,"repCommitteeExists":m in ("Oscar Romero","Orchard Hill")}) + ",")
for m in NON_TARGET_MATS:
    L.append("  " + js({"mat":m,"isTargetMat":False,"repCommitteeExists":False}) + ",")
L.append("];\n")

NOTES = [
 ("n1","2026-07-22","School","200001","Density strong, needs a second rep","72% turnout on the informal check-in. Worth identifying a co-rep before the current rep goes on leave in September.","Amara O."),
 ("n2","2026-07-25","School","200002","No rep — approached SLT contact","Head of department seemed open to a workplace meeting. Follow up with branch sec before half term.","Jide K."),
 ("n3","2026-08-01","Branch","Bromley","Branch meeting notes","Agreed to prioritise Ravens Wood and Oakdene for rep recruitment this term.","Amara O."),
 ("n4","2026-08-03","MAT","Haberdashers","Trust-wide facility time dispute brewing","Trust proposing to cut facility time allocation across all sites from January. Coordinating a joint response with reps.","Priya S."),
 ("n5","2026-07-18","School","200008","Recruited 3 new members after lunch stall","Good response to the TA-focused leaflet. Two of the three are TAs.","Tom R."),
 ("n6","2026-08-05","School","200011","Indicative ballot planning underway","Issue is H&S — unaddressed maintenance backlog. Timeline agreed with branch.","Priya S."),
 ("n7","2026-08-07","Branch","Hillingdon","Support staff density lagging","Teacher density is respectable across the borough but support density is roughly half that. Worth a targeted TA campaign.","Jide K."),
 ("n8","2026-08-09","MAT","Oscar Romero","Rep committee meeting scheduled","First cross-trust rep committee meeting booked for September, covering both mapped schools.","Amara O."),
 ("n9","2026-08-04","School","200031","Big membership, quiet ballot","Sixty-odd members and a 20% return. This is a contact problem, not a recruitment one — needs a rep and a proper phone round.","Tom R."),
 ("n10","2026-08-06","School","200039","Small but highly mobilised","Turnout well above the trust average on a low membership base. Recruitment ground: the people who voted will vouch for us.","Priya S."),
 ("n11","2026-08-08","Branch","Wandsworth","Quadrant review with the branch committee","Walked through the density/turnout split. Agreed the priority is the members-not-mobilised group rather than chasing new joiners.","Amara O."),
]
L.append("export const fieldNotes = [")
for n in NOTES:
    L.append("  " + js(dict(zip(["id","date","level","subject","title","note","author"],n))) + ",")
L.append("];\n")

DISPUTES = [
 ("d1","Haberdashers","Haberdashers","Bromley",[200003],"Yes","ROR","Amara O.",["Redundancies","Facility time"],"2026-07-01",0.72,18,None,None,None,0),
 ("d2","Compass Eko","Compass Eko","Hillingdon",[200008,200009],"Yes","SIO","Priya S.",["Workload","Management style"],"2026-06-10",0.65,42,0.58,None,"Amber",0),
 ("d3","Charlton Park Academy","","Greenwich",[200006],"Yes","IO","Jide K.",["Pay policy (inc TLRs)"],"2026-05-14",0.81,36,0.77,None,"Red",2),
 ("d4","Orchard Hill","Orchard Hill","Wandsworth",[200011,200012],"No","ROR","Tom R.",["H&S"],"2026-04-02",0.55,22,0.60,"2026-06-15","Green",0),
 ("d5","Ickenham Community School","","Hillingdon",[200010],"Yes","IO","Priya S.",["Staffing","Consultation"],None,None,None,None,None,None,0),
 ("d6","COLA","COLA","Kensington and Chelsea",[200036,200037,200038],"Yes","SIO","Amara O.",["Workload","Consultation"],"2026-07-08",0.68,64,None,None,"Amber",0),
]
L.append("export const disputeTracker = [")
for (did,emp,mat,br,urns,live,ror,staff,issues,dio,ip,mai,fbp,dor,out,sd) in DISPUTES:
    L.append("  " + js({"id":did,"employer":emp,"mat":mat,"branch":br,"urns":[str(u) for u in urns],"live":live,
        "rorIo":ror,"staffResponsible":staff,"issues":issues,"dateIndicativeOpens":dio,"tradeDisputeLetter":"",
        "resolvedPriorToAction":"No","indicativePercent":ip,"membershipAtIndicative":mai,"formalBallotRequest":"",
        "noticeOfFormalBallot":"","formalBallotPercent":fbp,"noticeOfStrikeDates":"","dateOfResolution":dor,
        "outcome":out,"totalStrikeDays":sd,"endOfDisputeReport":""}) + ",")
L.append("];\n")

L.append('''// Dated across the snapshot window rather than before it, so "no meetings
// logged in N weeks" measures a real gap. Havering's last meeting is
// deliberately early: it is the one project branch that stops logging, which
// is what the Exceptions band's activity-stall rule exists to catch.
//
// Attendees mixes the three things this log actually holds: 1-2-1s (1), small
// group conversations, and mass meetings. m5 and m11 are null on purpose —
// they stand for rows logged before the Attendees column existed, which is
// what every real row will look like on the day this ships.''')
L.append("export const meetings = [")
for mid,d,urn,att in [("m1","2026-08-19",200001,24),("m2","2026-09-16",200001,1),("m3","2026-10-02",200003,38),
                      ("m4","2026-09-09",200006,7),("m5","2026-08-26",200009,None),("m6","2026-09-30",200009,15),
                      ("m7","2026-09-23",200008,1),("m8","2026-10-05",200012,31),("m9","2026-09-11",200036,6),
                      ("m10","2026-10-07",200033,12),("m11","2026-08-14",200043,None),("m12","2026-10-01",200026,2),
                      ("m13","2026-09-18",200017,19),("m14","2026-10-06",200038,9)]:
    L.append("  " + js({"id":mid,"date":d,"urn":urn,"loggedBy":"Amara O.","attendees":att}) + ",")
L.append("];\n")

L.append('''// Two trusts have reported a committee through the app; the rest fall back to
// the MatFacts column. Orchard Hill is the case worth having in sample data:
// MatFacts says it has a committee, but a later report says it stopped, so the
// page has to show the reported answer rather than the static one.''')
L.append("export const repCommittees = [")
for rid, mat, exists, eff in [
    ("rcm1", "Oscar Romero", True, "2026-05-12"),
    ("rcm2", "Orchard Hill", True, "2026-03-02"),
    ("rcm3", "Orchard Hill", False, "2026-09-14"),
]:
    L.append("  " + js({"id":rid,"mat":mat,"exists":exists,"effectiveFrom":eff,"loggedBy":"Amara O."}) + ",")
L.append("];\n")

L.append('''// No decisions recorded yet, so every seeded anomaly shows on the Anomalies
// page. Resolving one in preview appends here in memory.''')
L.append("export const reconciliations = [];\n")

L.append('''// Ten weekly captures, starting on the 9 August 2026 baseline that every
// "since" figure on the dashboard is measured from. The last capture carries
// the same numbers as the source tables above, so the trend ends where the
// current figures start.
//
// NOTE: this sample series runs FORWARD of today's date on purpose. The
// baseline is the first data upload, so a realistic series anchored to it
// would hold one point and the dashboard would correctly show no trends at
// all — which demonstrates nothing. The real workbook accumulates these one
// week at a time; this file fast-forwards so the bands can be seen working.
//
// Boroughs move differently so the Exceptions band has something true to find:
// Bromley's density is falling, Hillingdon is growing strongly, and the
// non-project boroughs are broadly flat — which is what makes the project
// against rest-of-region comparison worth drawing.
//
// Real deployments start empty and accumulate. History cannot be
// reconstructed, which is why Snapshots is append-only.''')

# borough -> (multiplier at the baseline, multiplier at the latest capture).
# The last capture is always 1.0, i.e. the current source figures.
BOROUGH_TRAJECTORY = {
    "Bromley": (1.075, 1.0),                 # falling — the exception the band should surface
    "Hillingdon": (0.87, 1.0),               # strongest growth in the project
    "Wandsworth": (0.965, 1.0),
    "Kensington and Chelsea": (0.925, 1.0),
    "Havering": (0.995, 1.0),                # flat, and stops logging meetings
    "Greenwich": (1.02, 1.0),                # non-project, drifting down
}
FLAT = (1.005, 1.0)

# urn -> (rep count before the switch, week it switches to the current count).
# One trust losing a rep and two schools gaining one, so the reps figure is not
# uniformly good news.
REP_SWITCH = {200003: (2, 5), 200026: (0, 6), 200036: (0, 7)}

SNAPSHOT_START = datetime.date(2026, 8, 9)
SNAPSHOT_WEEKS = 10
BOROUGH_BY_URN = {s[0]: s[4] for s in SCHOOLS}

L.append("export const snapshots = [")
for wk in range(SNAPSHOT_WEEKS):
    d = SNAPSHOT_START + datetime.timedelta(weeks=wk)
    progress = wk / (SNAPSHOT_WEEKS - 1)
    for urn,(ht,htt,hl,hs,mt,mtt,ml,ms,reps) in STRATUM.items():
        start, end = BOROUGH_TRAJECTORY.get(BOROUGH_BY_URN.get(urn), FLAT)
        # A little deterministic wobble, so a sparkline reads as a real series
        # rather than a ruled line.
        wobble = 1 + (random.Random(urn * 100 + wk).uniform(-0.012, 0.012) if wk < SNAPSHOT_WEEKS - 1 else 0)
        factor = (start + (end - start) * progress) * wobble
        rc = reps
        if urn in REP_SWITCH:
            before, switch = REP_SWITCH[urn]
            rc = before if wk < switch else rc
        L.append("  " + js({"snapshotDate":d.isoformat(),"urn":urn,
            "membersTotal":max(0,round(mt*factor)),"membersTeachers":max(0,round(mtt*factor)),
            "membersLeadership":max(0,round(ml*factor)),"membersSupport":max(0,round(ms*factor)),
            "headcountTotal":ht,"headcountTeachers":htt,"headcountLeadership":hl,"headcountSupport":hs,
            "repCount":rc}) + ",")
L.append("];\n")

GEO = {200001:(51.4059,0.0148),200002:(51.3845,0.0562),200003:(51.4085,-0.0255),200004:(51.4159,0.0248),
       200005:(51.4835,0.0698),200006:(51.4869,0.0413),200007:(51.4652,0.0195),200008:(51.5432,-0.4784),
       200009:(51.5215,-0.4012),200010:(51.5620,-0.4472),200011:(51.4640,-0.1660),200012:(51.4288,-0.1594),
       200013:(51.4835,-0.1780),200014:(51.5812,0.1837),200015:(51.3900,0.0500),200016:(51.5760,0.2100)}

# Second-cohort coordinates scattered around each borough's rough centre, so
# the map clusters plausibly without pretending to be real addresses.
BOROUGH_CENTRE = {
    "Bromley":(51.406,0.015), "Greenwich":(51.482,0.038), "Hillingdon":(51.535,-0.448),
    "Wandsworth":(51.452,-0.191), "Kensington and Chelsea":(51.502,-0.196), "Havering":(51.578,0.212),
    "Lewisham":(51.462,-0.011), "Southwark":(51.474,-0.080), "Lambeth":(51.460,-0.116),
    "Croydon":(51.372,-0.099), "Ealing":(51.513,-0.305), "Brent":(51.558,-0.276),
    "Newham":(51.525,0.035), "Haringey":(51.590,-0.110),
}
for (urn,_n,_t,_p,boro,_tr,_pc,_s,_pf,_pm) in NEW_SCHOOLS:
    rng = random.Random(urn + 900000)
    lat,lon = BOROUGH_CENTRE[boro]
    GEO[urn] = (round(lat + rng.uniform(-0.022,0.022),4), round(lon + rng.uniform(-0.028,0.028),4))

L.append("export const schoolGeo = [")
for urn,(lat,lon) in sorted(GEO.items()):
    L.append("  " + js({"urn":urn,"lat":lat,"lon":lon,"geocodedDate":"2026-08-01"}) + ",")
L.append("];")

OUT = pathlib.Path(__file__).resolve().parent.parent / "js" / "data" / "mock-data.js"
OUT.write_text("\n".join(L)+"\n")
print(f"wrote {OUT} — {len(SCHOOLS)} schools, {len(PAY)} pay rows")
