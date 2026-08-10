// Small shared rendering helpers used across every page module. Pages build
// HTML with template literals and attach listeners after inserting into the
// DOM — there's no framework here, just enough structure to stay consistent.

export function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "–";
  return Math.round(n).toLocaleString("en-GB");
}

export function formatPercent(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatDate(isoOrDate) {
  if (!isoOrDate) return "–";
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function statTile(label, value, opts = {}) {
  const deltaHtml = opts.delta != null
    ? `<div class="tile-delta ${opts.delta >= 0 ? "up" : "down"}">${opts.delta >= 0 ? "▲" : "▼"} ${Math.abs(opts.delta)}</div>`
    : "";
  return `
    <div class="tile">
      <div class="tile-label">${escapeHtml(label)}</div>
      <div class="tile-value">${escapeHtml(value)}</div>
      ${deltaHtml}
    </div>`;
}

export function ragPill(outcome) {
  if (!outcome) return `<span class="pill rag-none">Not yet set</span>`;
  const cls = { Green: "rag-green", Amber: "rag-amber", Red: "rag-red" }[outcome] || "rag-none";
  return `<span class="pill ${cls}">${escapeHtml(outcome)}</span>`;
}

export function livePill(live) {
  return live === "Yes"
    ? `<span class="badge live">Live</span>`
    : `<span class="badge">Closed</span>`;
}

// Renders a sortable table into `container`. `columns` is
// [{ key, label, num?, render?(row) }]. Sorting compares `row[key]` unless
// a column defines `sortValue(row)`.
export function renderDataTable(container, columns, rows, opts = {}) {
  let sortKey = opts.defaultSort || columns[0].key;
  let sortDir = opts.defaultDir || "asc";

  function sortedRows() {
    const col = columns.find((c) => c.key === sortKey);
    const valueOf = col?.sortValue || ((row) => row[sortKey]);
    return [...rows].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }

  function draw() {
    const rowsHtml = sortedRows()
      .map(
        (row) => `<tr>${columns
          .map((c) => `<td class="${c.num ? "num" : ""} ${c.wrap ? "wrap" : ""}">${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`)
          .join("")}</tr>`
      )
      .join("");

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${columns
                .map(
                  (c) => `<th class="${c.num ? "num" : ""}" data-key="${c.key}">${escapeHtml(c.label)}${
                    sortKey === c.key ? `<span class="sort-arrow">${sortDir === "asc" ? "▲" : "▼"}</span>` : ""
                  }</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="${columns.length}"><div class="empty-state">No rows match.</div></td></tr>`}
          </tbody>
        </table>
      </div>`;

    container.querySelectorAll("th[data-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = key;
          sortDir = "asc";
        }
        draw();
      });
    });
  }

  draw();
}
