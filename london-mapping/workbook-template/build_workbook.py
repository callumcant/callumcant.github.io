"""
Builds the OneDrive-ready Excel workbook the app reads from, as plain Excel
Tables (no formulas) — see js/data/table-schemas.js for the column order
each table must keep in sync with.

Run: python3 build_workbook.py
Output: London_Project_Mapping_template.xlsx (in this folder)

Every row in this file is a clearly-fake EXAMPLE — delete the example rows
before pasting in real data. Never commit real member/employer/dispute data
into this repo.
"""
import openpyxl
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.styles import Font

FONT = "Arial"

LONDON_BOROUGHS = [
    "Barking and Dagenham", "Barnet", "Bexley", "Brent", "Bromley", "Camden",
    "Croydon", "Ealing", "Enfield", "Greenwich", "Hackney",
    "Hammersmith and Fulham", "Haringey", "Harrow", "Havering", "Hillingdon",
    "Hounslow", "Islington", "Kensington and Chelsea", "Kingston Upon Thames",
    "Lambeth", "Lewisham", "Merton", "Newham", "Redbridge",
    "Richmond Upon Thames", "Southwark", "Sutton", "Tower Hamlets (&CoL)",
    "Waltham Forest", "Wandsworth", "Westminster",
]

# name, headers (Excel Table col order — must match js/data/table-schemas.js),
# example rows, optional {col_letter: dv-list} data validations
TABLES = [
    {
        "sheet": "SourceGIAS",
        "headers": ["URN", "School name", "Phase", "LA (borough)", "Establishment status", "Trusts (MAT)", "Postcode"],
        "rows": [
            [100097, "EXAMPLE Rachel McMillan Nursery School", "Nursery", "Greenwich", "Open", "", "SE8 3EH"],
            [100098, "EXAMPLE Pound Park Nursery School", "Nursery", "Greenwich", "Open", "EXAMPLE MAT", "SE7 8AF"],
        ],
        "note": "Paste your DfE GIAS export here (https://get-information-schools.service.gov.uk/). Not edited by the app.",
    },
    {
        "sheet": "SourceWorkforce",
        "headers": ["URN", "Workforce headcount", "All teachers", "Classroom teachers", "Leadership teachers", "All support staff", "Teaching assistants"],
        "rows": [
            [100097, 35, 8, 6, 2, 27, 15],
            [100098, 27, 6, 4, 2, 21, 14],
        ],
        "note": "Paste your DfE School Workforce Census export here. Not edited by the app.",
    },
    {
        "sheet": "WCtoURN",
        "headers": ["Workplace code", "URN"],
        "rows": [["WP020292", 100097], ["WP041624", 100098]],
        "note": "Maps NEU workplace codes to DfE URNs. Not edited by the app.",
    },
    {
        "sheet": "SourceNEUDashboard",
        "headers": ["Workplace code", "Overall members", "Voted", "Rep count", "Volunteers", "WP conversations", "2025 indicative voted", "2024 indicative voted", "Hold a meeting", "Needs support", "Pledged to vote"],
        "rows": [
            ["WP020292", 19, 14, 1, 3, 6, 0.72, 0.61, 1, 0, 5],
            ["WP041624", 21, 0, 0, 1, 2, 0, 0, 0, 1, 2],
        ],
        "note": "Paste your NEU membership/organising system export here. Not edited by the app.",
    },
    {
        "sheet": "FieldNotes",
        "headers": ["ID", "Date", "Level", "Subject", "Title", "Note", "Author"],
        "rows": [
            ["n1", "2026-01-15", "School", "100097", "EXAMPLE — how to log a school note", "This is how you write a note for a single school. Subject = the URN.", "EXAMPLE Author"],
            ["n2", "2026-01-15", "Branch", "Greenwich", "EXAMPLE — how to log a branch note", "This is how you write a note on a whole branch. Subject = the branch/borough name.", "EXAMPLE Author"],
        ],
        "dv": {"C": ["School", "MAT", "Branch"]},
        "note": "Edited by the app's Field notes page. Subject is a URN for School-level notes, or the branch/MAT name otherwise.",
    },
    {
        "sheet": "DisputeTracker",
        "headers": ["ID", "Employer", "MAT", "Branch", "Live", "# Schools", "ROR/IO", "Staff responsible", "Issues", "Date indicative opens", "Indicative %", "Membership at indicative", "Formal ballot %", "Date of resolution", "Outcome (RAG)", "Total strike days"],
        "rows": [
            ["d1", "EXAMPLE Academy Trust", "EXAMPLE MAT", "Greenwich", "Yes", 1, "ROR", "EXAMPLE Organiser", "Redundancies, Facility time", "2026-01-01", 0.72, 18, "", "", "", 0],
        ],
        "dv": {"E": ["Yes", "No"], "G": ["ROR", "IO", "SIO"], "O": ["Red", "Amber", "Green"]},
        "note": "Edited by the app's Dispute tracker page. Issues is a comma-separated list; Indicative %/Formal ballot % are fractions (0.72 = 72%).",
    },
    {
        "sheet": "BranchFacts",
        "headers": ["Branch", "Is project branch?", "School meetings held", "Reps trained since start"],
        "rows": [[b, "Yes" if b in ("Bromley", "Greenwich") else "No", 0, 0] for b in LONDON_BOROUGHS],
        "dv": {"B": ["Yes", "No"]},
        "note": "One row per London borough/branch. isProjectBranch controls whether it counts toward the dashboard's headline KPIs. Edit directly in Excel.",
    },
    {
        "sheet": "MatFacts",
        "headers": ["MAT", "Is target MAT?", "Rep committee exists?"],
        "rows": [["EXAMPLE MAT", "No", "No"]],
        "dv": {"B": ["Yes", "No"], "C": ["Yes", "No"]},
        "note": "Add a row per MAT you're tracking. Edit directly in Excel — add a row whenever a new MAT enters the project.",
    },
    {
        "sheet": "SourceHistoricalDisputes",
        "headers": ["School year", "Employer/school", "Branch", "RO/SRO responsible", "Ballot summary", "Notes"],
        "rows": [["2022-23", "EXAMPLE School", "Harrow", "EXAMPLE Officer", "56% turnout, 43% Yes", "Kept for institutional memory — not read by the app."]],
        "note": "Reference only, not read by the app or kept up to date automatically.",
    },
]


def build():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    for spec in TABLES:
        ws = wb.create_sheet(spec["sheet"])
        ws.append(spec["headers"])
        for row in ws[1]:
            row.font = Font(name=FONT, bold=True)
        for row in spec["rows"]:
            ws.append(row)

        n_rows = len(spec["rows"]) + 1
        n_cols = len(spec["headers"])
        last_col = openpyxl.utils.get_column_letter(n_cols)
        table_ref = f"A1:{last_col}{n_rows}"
        table = Table(displayName=spec["sheet"], ref=table_ref)
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2", showRowStripes=True
        )
        ws.add_table(table)

        for col_idx in range(1, n_cols + 1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = max(
                12, len(spec["headers"][col_idx - 1]) + 2
            )
        for row in ws.iter_rows(min_row=1, max_row=n_rows, max_col=n_cols):
            for cell in row:
                if cell.row > 1:
                    cell.font = Font(name=FONT)

        for col_letter, options in spec.get("dv", {}).items():
            dv = DataValidation(
                type="list", formula1='"' + ",".join(options) + '"', allow_blank=True
            )
            dv.add(f"{col_letter}2:{col_letter}1000")
            ws.add_data_validation(dv)

        ws["A1"].comment = None
        note_cell = ws.cell(row=n_rows + 2, column=1, value=f"Note: {spec['note']}")
        note_cell.font = Font(name=FONT, italic=True, size=9, color="898781")

    wb.save("London_Project_Mapping_template.xlsx")
    print("Wrote London_Project_Mapping_template.xlsx")


if __name__ == "__main__":
    build()
