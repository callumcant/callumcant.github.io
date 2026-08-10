#!/usr/bin/env python3
"""
Generates js/data/table-schemas.js and docs/data-dictionary.md from
dictionary.json — the single source of truth for the app's data model.

    python3 generate_schemas.py           # write the generated files
    python3 generate_schemas.py --check   # fail if they have drifted

The point of generating rather than hand-maintaining: the JS schema and the
Excel template must agree column-for-column, because the app maps Graph's
positional row `values` arrays onto field names by order. Keeping them in step
by hand is what lost ten GIAS columns and eleven Pay Dashboard columns earlier
in this project. build_workbook.py reads the same dictionary directly, so the
two cannot diverge.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
DICT_PATH = HERE / "dictionary.json"
JS_PATH = ROOT / "js" / "data" / "table-schemas.js"
MD_PATH = ROOT / "docs" / "data-dictionary.md"

BANNER = "// GENERATED FILE — do not edit by hand."


def load():
    return json.loads(DICT_PATH.read_text())


def js_array(items, indent="    "):
    """Wrap a list of quoted strings at a sensible width."""
    out, line = [], indent
    for i, item in enumerate(items):
        piece = f'"{item}",' if i < len(items) - 1 else f'"{item}",'
        if len(line) + len(piece) > 76 and line.strip():
            out.append(line.rstrip())
            line = indent
        line += piece + " "
    if line.strip():
        out.append(line.rstrip().rstrip(","))
    return "\n".join(out)


def render_js(doc):
    lines = [
        BANNER,
        "// Source of truth: data-dictionary/dictionary.json",
        "// Regenerate with: python3 data-dictionary/generate_schemas.py",
        "//",
        "// Column order here must match the workbook exactly — the app maps Graph's",
        "// positional row `values` arrays onto field names by this order.",
        "// workbook-template/build_workbook.py reads the same dictionary, so the two",
        "// cannot drift apart.",
        "",
        "export const TABLE_SCHEMAS = {",
    ]
    for t in doc["tables"]:
        keys = [f["key"] for f in t["fields"]]
        lines.append(f"  // {t['description']}")
        lines.append(f"  {t['name']}: [")
        lines.append(js_array(keys))
        lines.append("  ],")
    lines.append("};")
    lines.append("")

    yesno, numeric, listy = [], [], []
    for t in doc["tables"]:
        for f in t["fields"]:
            if f["type"] == "yesno":
                yesno.append(f["key"])
            elif f["type"] in ("number", "percent"):
                numeric.append(f["key"])
            elif f["type"] == "list":
                listy.append(f["key"])

    def dedupe(seq):
        seen, out = set(), []
        for x in seq:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    lines += [
        "// Booleans in JS, \"Yes\"/\"No\" text in Excel so they read like the workbook's",
        "// other Yes/No dropdowns.",
        "const YES_NO_FIELDS = new Set([",
        js_array(dedupe(yesno)),
        "]);",
        "",
        "// Stored as numbers, and blank must stay blank rather than becoming 0.",
        "const NUMERIC_FIELDS = new Set([",
        js_array(dedupe(numeric)),
        "]);",
        "",
        "// Comma-separated in Excel, arrays in JS.",
        "const LIST_FIELDS = new Set([",
        js_array(dedupe(listy)),
        "]);",
        "",
        "export function rowToObject(tableName, values) {",
        "  const fields = TABLE_SCHEMAS[tableName];",
        "  const obj = {};",
        "  fields.forEach((field, i) => {",
        "    let value = values[i];",
        '    if (value === "" || value === undefined) value = null;',
        "    if (YES_NO_FIELDS.has(field)) {",
        '      value = value === "Yes";',
        "    } else if (LIST_FIELDS.has(field)) {",
        '      value = typeof value === "string"',
        '        ? value.split(",").map((s) => s.trim()).filter(Boolean)',
        "        : [];",
        "    } else if (NUMERIC_FIELDS.has(field) && value != null) {",
        "      const n = Number(value);",
        "      value = Number.isNaN(n) ? null : n;",
        "    }",
        "    obj[field] = value;",
        "  });",
        "  return obj;",
        "}",
        "",
        "export function objectToRow(tableName, obj) {",
        "  const fields = TABLE_SCHEMAS[tableName];",
        "  return fields.map((field) => {",
        "    const value = obj[field];",
        '    if (YES_NO_FIELDS.has(field)) return value ? "Yes" : "No";',
        '    if (LIST_FIELDS.has(field)) return Array.isArray(value) ? value.join(", ") : (value ?? "");',
        '    return value ?? "";',
        "  });",
        "}",
        "",
    ]
    return "\n".join(lines)


def render_md(doc):
    lines = [
        "<!-- GENERATED FILE — do not edit by hand. -->",
        "<!-- Source: data-dictionary/dictionary.json · regenerate with data-dictionary/generate_schemas.py -->",
        "",
        "# Data dictionary",
        "",
        "Every field the app holds, and where it comes from.",
        "",
        "**Sources.** `GIAS` is the DfE's school register and the central spine — every",
        "other source joins to it by URN. `Stratum` is the authoritative source for both",
        "headcount and membership. `Pay Dashboard` covers ballots, engagement and rep",
        "count. `School workforce survey` is a third-party cross-check on headcount plus",
        "workload and pay indicators. `App form` means organisers enter it in the app.",
        "`Derived` means the app calculates it.",
        "",
        "**In dictionary** marks fields listed in the uploaded data dictionary.",
        "Fields marked *carried* are kept because the source export contains them and",
        "dropping data has bitten this project before — they cost nothing and stay",
        "available.",
        "",
        "## Derived figures",
        "",
        "| Figure | Formula | Notes |",
        "| --- | --- | --- |",
    ]
    for d in doc["derivedFields"]:
        lines.append(f"| {d['name']} | `{d['formula']}` | {d.get('notes', '')} |")

    lines += [
        "",
        "> **Density must never be averaged.** MAT and borough density are recalculated",
        "> from summed headcount and summed membership. Averaging the constituent",
        "> schools' densities gives a different — and wrong — answer, because it weights",
        "> a 19-staff nursery the same as a 130-staff secondary.",
        "",
    ]

    for t in doc["tables"]:
        lines += [
            f"## {t['name']}",
            "",
            t["description"],
            "",
            f"*{'Written by the app' if t.get('editedByApp') else 'Pasted in / edited in Excel'}.*",
            "",
            "| # | Column (Excel) | Field (app) | Type | Source | Joins via | In dictionary | Notes |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
        for i, f in enumerate(t["fields"], 1):
            lines.append(
                f"| {i} | {f['header']} | `{f['key']}` | {f['type']} | {f['source']} | "
                f"{f.get('spine', '—')} | {'yes' if f['inDictionary'] else 'carried'} | {f.get('notes', '')} |"
            )
        lines.append("")

    return "\n".join(lines)


def main():
    check = "--check" in sys.argv
    doc = load()
    outputs = {JS_PATH: render_js(doc), MD_PATH: render_md(doc)}

    drifted = []
    for path, content in outputs.items():
        existing = path.read_text() if path.exists() else None
        if check:
            if existing != content:
                drifted.append(path)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)

    if check:
        if drifted:
            print("DRIFT: these files no longer match dictionary.json:")
            for p in drifted:
                print(f"  {p.relative_to(ROOT)}")
            print("Run: python3 data-dictionary/generate_schemas.py")
            sys.exit(1)
        print("OK — generated files match dictionary.json")
    else:
        for p in outputs:
            print(f"wrote {p.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
