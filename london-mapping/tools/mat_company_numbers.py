#!/usr/bin/env python3
"""
Matches the MATs in the workbook to their Companies House numbers, using the
GIAS "groups" download.

    python3 tools/mat_company_numbers.py groups.csv                # sample MATs
    python3 tools/mat_company_numbers.py groups.csv --mats mine.txt
    python3 tools/mat_company_numbers.py groups.csv --workbook London_Project.xlsx

GIAS holds a Companies House number against every academy trust, on the group
record rather than the school record. The groups download is one row per trust;
this reads it, finds the row for each of our MATs, and prints the number.

The join is on NAME, which is the weak link: the workbook holds the organiser's
shorthand ("Haberdashers") and GIAS holds the registered name ("HABERDASHERS'
ACADEMIES TRUST SOUTH"). So this PROPOSES matches and refuses to guess between
two candidates — a wrong company number links the app to another employer's
finances, which is worse than a blank cell. Anything ambiguous or unmatched is
listed for you to resolve by hand.

Column headers are sniffed rather than hardcoded, because GIAS has renamed
columns before and this script shouldn't need a code change when it does.
"""
import argparse
import csv
import pathlib
import re
import sys

# Substrings we look for in the header row, in priority order.
UID_HINTS = ["group uid", "groupuid", "uid"]
NAME_HINTS = ["group name", "groupname", "name"]
COMPANY_HINTS = ["companies house", "company number", "companieshouse", "companynumber"]
TYPE_HINTS = ["group type", "grouptype"]
STATUS_HINTS = ["group status", "groupstatus", "status"]

# GIAS group types that are employers we'd link to. Federations and LAs have
# group records too and are not companies.
TRUST_TYPES = ["multi-academy trust", "single-academy trust", "trust", "sponsor"]

SAMPLE_MATS = ["Oscar Romero", "COLA", "Haberdashers", "Compass Eko", "Orchard Hill"]

# Words that carry no distinguishing information when comparing names.
NOISE = {"the", "trust", "academy", "academies", "multi", "multiacademy", "mat",
         "school", "schools", "education", "educational", "limited", "ltd",
         "partnership", "federation", "learning", "group", "of", "and"}


def find_column(headers, hints):
    lowered = [h.lower().strip() for h in headers]
    for hint in hints:
        for i, h in enumerate(lowered):
            if hint in h:
                return i
    return None


def tokens(name):
    """Comparable word set: lowercase, punctuation stripped, noise words gone."""
    words = re.sub(r"[^a-z0-9 ]", " ", str(name).lower()).split()
    meaningful = [w for w in words if w not in NOISE]
    # A name made entirely of noise words ("The Learning Trust") still has to
    # match on something, so fall back to the full word list.
    return set(meaningful or words)


def normalise_company_number(value):
    """Mirrors normaliseCompanyNumber in js/ui/bargaining-link.js."""
    clean = re.sub(r"\s", "", str(value or "").strip().upper())
    if not clean:
        return None
    if re.fullmatch(r"\d{1,8}", clean):
        return clean.rjust(8, "0")
    if re.fullmatch(r"[A-Z]{2}\d{6}", clean):
        return clean
    return None


def load_groups(path):
    # GIAS ships these Windows-encoded, not UTF-8.
    with open(path, newline="", encoding="cp1252", errors="replace") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        sys.exit(f"{path} is empty")
    headers = rows[0]
    cols = {
        "uid": find_column(headers, UID_HINTS),
        "name": find_column(headers, NAME_HINTS),
        "company": find_column(headers, COMPANY_HINTS),
        "type": find_column(headers, TYPE_HINTS),
        "status": find_column(headers, STATUS_HINTS),
    }
    if cols["name"] is None or cols["company"] is None:
        sys.exit(
            "Couldn't find a group-name column and a Companies House column in:\n  "
            + ", ".join(headers)
            + "\n\nThis is probably the wrong GIAS download — you want the one with "
              "one row per group/trust, not one row per school."
        )

    def cell(row, key):
        i = cols[key]
        return "" if i is None or i >= len(row) else row[i].strip()

    groups = []
    for row in rows[1:]:
        if not any(row):
            continue
        company = normalise_company_number(cell(row, "company"))
        if not company:
            continue
        gtype = cell(row, "type").lower()
        if cols["type"] is not None and gtype and not any(t in gtype for t in TRUST_TYPES):
            continue
        status = cell(row, "status").lower()
        groups.append({
            "uid": cell(row, "uid"),
            "name": cell(row, "name"),
            "company": company,
            "type": cell(row, "type"),
            "closed": "closed" in status,
        })
    return groups, cols, headers


def match(mat, groups):
    """Exact name match first; otherwise every group whose words contain ours."""
    want = tokens(mat)
    exact = [g for g in groups if tokens(g["name"]) == want]
    if exact:
        return exact
    # Our shorthand should be a subset of the registered name, not the reverse:
    # "Haberdashers" is inside "Haberdashers' Academies Trust South".
    return [g for g in groups if want and want <= tokens(g["name"])]


def read_mats(args):
    if args.mats:
        names = [l.strip() for l in pathlib.Path(args.mats).read_text().splitlines()]
        return [n for n in names if n]
    if args.workbook:
        try:
            import openpyxl
        except ImportError:
            sys.exit("--workbook needs openpyxl:  pip install openpyxl")
        ws = openpyxl.load_workbook(args.workbook, read_only=True)["MatFacts"]
        rows = ws.iter_rows(min_row=2, max_col=1, values_only=True)
        return [str(r[0]).strip() for r in rows if r[0]]
    print("No --mats or --workbook given; using the sample MAT names.\n", file=sys.stderr)
    return SAMPLE_MATS


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("groups_csv", help="the GIAS groups download")
    ap.add_argument("--mats", help="text file, one MAT name per line")
    ap.add_argument("--workbook", help="read the names from the workbook's MatFacts sheet")
    args = ap.parse_args()

    groups, cols, headers = load_groups(args.groups_csv)
    print(f"Read {len(groups)} trusts with a company number from {args.groups_csv}",
          file=sys.stderr)
    print(f"  name column: {headers[cols['name']]!r}   "
          f"company column: {headers[cols['company']]!r}\n", file=sys.stderr)

    mats = read_mats(args)
    resolved, needs_you = [], []

    for mat in mats:
        found = match(mat, groups)
        open_found = [g for g in found if not g["closed"]] or found
        if len(open_found) == 1:
            resolved.append((mat, open_found[0]))
        else:
            needs_you.append((mat, open_found))

    print("Paste this into the MatFacts sheet's 'Companies House number' column.")
    print("Check each line first — the match is on name, not on anything solid.\n")
    print("MAT\tCompanies House number\tMatched GIAS group")
    for mat, g in resolved:
        print(f"{mat}\t{g['company']}\t{g['name']}")
    for mat, _ in needs_you:
        print(f"{mat}\t\t** unresolved, see below **")

    if needs_you:
        print("\n" + "=" * 70, file=sys.stderr)
        print("These need a human. Left blank, the MAT page just shows no button.",
              file=sys.stderr)
        for mat, candidates in needs_you:
            print(f"\n  {mat}: {len(candidates)} candidates", file=sys.stderr)
            for g in candidates[:10]:
                closed = " [CLOSED]" if g["closed"] else ""
                print(f"      {g['company']}  {g['name']}{closed}", file=sys.stderr)
            if not candidates:
                print("      nothing matched — search the trust by name on GIAS",
                      file=sys.stderr)


if __name__ == "__main__":
    main()
