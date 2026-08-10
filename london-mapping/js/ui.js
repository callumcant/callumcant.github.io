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
//
// opts.visibleKeys (a Set) narrows which columns render; omit it to show all.
// opts.stickyFirst pins the first column while scrolling horizontally, which
// matters once a table is wide enough that the row's identity scrolls away.
export function renderDataTable(container, allColumns, rows, opts = {}) {
  const columns = opts.visibleKeys
    ? allColumns.filter((c) => opts.visibleKeys.has(c.key))
    : allColumns;
  if (columns.length === 0) {
    container.innerHTML = `<div class="empty-state">No columns selected.</div>`;
    return;
  }

  let sortKey = opts.defaultSort || columns[0].key;
  let sortDir = opts.defaultDir || "asc";
  if (!columns.some((c) => c.key === sortKey)) sortKey = columns[0].key;

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
        <table class="data-table${opts.stickyFirst ? " sticky-first" : ""}">
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

// --- Column visibility -----------------------------------------------------
// Wide tables (the Schools view carries ~40 columns) need a light default and
// an easy way to reach everything else. Presets cover the common shapes;
// per-column checkboxes cover the rest. The choice is remembered so an
// organiser who lives in one view doesn't reset it every visit.

export function loadColumnPrefs(storageKey, fallbackKeys) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set(fallbackKeys);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return new Set(fallbackKeys);
    return new Set(parsed);
  } catch {
    // Private-browsing or a corrupted value shouldn't break the page.
    return new Set(fallbackKeys);
  }
}

export function saveColumnPrefs(storageKey, visibleKeys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...visibleKeys]));
  } catch {
    /* non-fatal — the table still works, the choice just won't persist */
  }
}

// Renders the "Columns" control: preset buttons plus a toggle popover.
// `groups` is [{ label, keys: [...] }] purely for laying the checkboxes out.
export function renderColumnControls(container, { columns, groups, presets, visibleKeys, onChange }) {
  const lockedKeys = new Set(columns.filter((c) => c.always).map((c) => c.key));

  function draw() {
    container.innerHTML = `
      <div class="column-controls">
        <div class="preset-row">
          ${Object.keys(presets)
            .map((name) => `<button type="button" class="chip" data-preset="${escapeHtml(name)}">${escapeHtml(presets[name].label)}</button>`)
            .join("")}
        </div>
        <div class="column-picker">
          <button type="button" class="btn btn-small" id="column-toggle" aria-expanded="false">
            Columns (${visibleKeys.size})
          </button>
          <div class="column-popover" hidden>
            ${groups
              .map(
                (g) => `
              <div class="column-group">
                <div class="column-group-label">${escapeHtml(g.label)}</div>
                ${g.keys
                  .map((key) => {
                    const col = columns.find((c) => c.key === key);
                    if (!col) return "";
                    const locked = lockedKeys.has(key);
                    return `<label class="${locked ? "is-locked" : ""}">
                      <input type="checkbox" data-col="${escapeHtml(key)}"
                        ${visibleKeys.has(key) ? "checked" : ""} ${locked ? "disabled" : ""} />
                      ${escapeHtml(col.label)}
                    </label>`;
                  })
                  .join("")}
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`;

    container.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = presets[btn.dataset.preset];
        const keys = preset.keys === null ? columns.map((c) => c.key) : preset.keys;
        onChange(new Set([...lockedKeys, ...keys]));
      });
    });

    const toggle = container.querySelector("#column-toggle");
    const popover = container.querySelector(".column-popover");
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !popover.hidden;
      popover.hidden = open;
      toggle.setAttribute("aria-expanded", String(!open));
    });
    popover.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      popover.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });

    container.querySelectorAll("[data-col]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const next = new Set(visibleKeys);
        if (cb.checked) next.add(cb.dataset.col);
        else next.delete(cb.dataset.col);
        onChange(next);
      });
    });
  }

  draw();
}

// --- CSV export ------------------------------------------------------------
// The habit this app replaces is "copy the columns you need into Excel".
// Exporting exactly what's on screen keeps that possible, and is the real
// guarantee that moving off the spreadsheet doesn't cost anyone their data.

function csvCell(value) {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvCell(c.csv ? c.csv(row) : row[c.key])).join(","))
    .join("\n");
  // BOM so Excel opens UTF-8 (school names carry accents) without mangling it.
  const blob = new Blob(["﻿" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Toast -----------------------------------------------------------------
// Used by the one-click event logs: the entry is created without a
// confirmation step, so the undo has to be right there.
export function showToast(message, { actionLabel, onAction, duration = 6000 } = {}) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    ${actionLabel ? `<button type="button" class="toast-action">${escapeHtml(actionLabel)}</button>` : ""}`;
  document.body.appendChild(toast);

  const dismiss = () => toast.remove();
  const timer = setTimeout(dismiss, duration);
  toast.querySelector(".toast-action")?.addEventListener("click", async () => {
    clearTimeout(timer);
    dismiss();
    await onAction?.();
  });
  return dismiss;
}

// --- Sparkline -------------------------------------------------------------
// A trend line small enough to sit inside a stat tile. Deliberately spare:
// 2px stroke, no axes, no gridlines, no dots — it shows shape, and the tile's
// figure carries the actual number. `currentColor` keeps it theme-correct in
// both light and dark without a second definition.
//
// The <title> is what a screen reader announces; the shape alone is not
// accessible, so it always states start, end and direction in words.
export function sparkline(values, { width = 96, height = 28, label = "" } = {}) {
  const points = values.filter((v) => v != null && !Number.isNaN(v));
  if (points.length < 2) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  // 2px inset top and bottom so the stroke isn't clipped at the extremes.
  const y = (v) => height - 2 - ((v - min) / span) * (height - 4);

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const direction = last > first ? "up" : last < first ? "down" : "flat";
  const summary = `${label} trend ${direction}, from ${Math.round(first)} to ${Math.round(last)}`;

  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
      role="img" aria-label="${escapeHtml(summary)}" preserveAspectRatio="none">
    <title>${escapeHtml(summary)}</title>
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}

// Formats a change between two numbers as a signed, direction-marked string.
// The arrow is there so direction isn't carried by colour alone.
export function formatDelta(from, to, { percent = false } = {}) {
  if (from == null || to == null) return null;
  const diff = to - from;
  if (Math.abs(diff) < (percent ? 0.0005 : 0.5)) {
    return { text: "No change", direction: "flat" };
  }
  const arrow = diff > 0 ? "▲" : "▼";
  const body = percent
    ? `${Math.abs(diff * 100).toFixed(1)} pts`
    : Math.abs(Math.round(diff)).toLocaleString("en-GB");
  return { text: `${arrow} ${body}`, direction: diff > 0 ? "up" : "down" };
}
