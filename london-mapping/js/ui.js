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

// A proportion rendered as a bar behind the value. Used ONLY for density and
// turnout — the two columns where "how big is this out of 100%" is the whole
// question, and where scanning a column for the high ones is the actual task.
// Everywhere else a bar would be decoration competing with the number.
export function barCell(value, formatted) {
  if (value == null || Number.isNaN(value)) return formatted;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return `<span class="cell-bar" style="width:${pct.toFixed(1)}%"></span><span class="cell-bar-value">${formatted}</span>`;
}

// Renders a sortable table into `container`. `columns` is
// [{ key, label, num?, wrap?, cellClass?, render?(row) }]. Sorting compares
// `row[key]` unless a column defines `sortValue(row)`.
//
// opts.visibleKeys (a Set) narrows which columns render; omit it to show all.
// opts.stickyFirst pins the first column while scrolling horizontally, which
// matters once a table is wide enough that the row's identity scrolls away.
// opts.sortState, if passed, is an object the caller owns and this function
// mutates — see the note below.
//
// opts.maxRows caps how many rows are actually put in the DOM. Opt-in, because
// most tables here are a single trust's or borough's schools and never come
// close: only the all-schools view needs it. It matters at London scale —
// laying out 3,000 rows costs about two seconds, and the Schools page redraws
// on every keystroke, so an uncapped table makes typing unusable. Nothing is
// unreachable when it bites: the caller's CSV export still receives the full
// filtered set, which is the escape hatch the footer line points at.
export function renderDataTable(container, allColumns, rows, opts = {}) {
  const columns = opts.visibleKeys
    ? allColumns.filter((c) => opts.visibleKeys.has(c.key))
    : allColumns;
  if (columns.length === 0) {
    container.innerHTML = `<div class="empty-state">No columns selected.</div>`;
    return;
  }

  // Sort lives in a caller-owned object when one is passed. Pages re-call this
  // function on every filter keystroke, so holding sort in a local closure
  // silently threw away the sort the user had chosen the moment they typed.
  const sortState = opts.sortState || {};
  if (!sortState.key) sortState.key = opts.defaultSort || columns[0].key;
  if (!sortState.dir) sortState.dir = opts.defaultDir || "asc";
  // A column can disappear via the picker while it's the active sort.
  if (!columns.some((c) => c.key === sortState.key)) sortState.key = columns[0].key;

  function sortedRows() {
    const sortKey = sortState.key;
    const sortDir = sortState.dir;
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

  // The plain-text behind a cell, for the truncation tooltip. Deliberately not
  // c.render() — that returns markup, and a title attribute full of tags helps
  // nobody. c.csv() is the column's own "this as text" answer where it has one.
  function cellTitle(c, row) {
    const raw = c.csv ? c.csv(row) : row[c.key];
    return raw == null ? "" : String(raw);
  }

  function draw() {
    // Sort first, then cap. The other way round would sort only the rows that
    // happened to survive the cap, so "top 200 by density" would silently mean
    // "the first 200 rows, sorted" — a plausible-looking wrong answer.
    const sorted = sortedRows();
    const shown = opts.maxRows && sorted.length > opts.maxRows
      ? sorted.slice(0, opts.maxRows)
      : sorted;

    const rowsHtml = shown
      .map(
        (row) => `<tr>${columns
          .map((c) => {
            // Numbers and dates keep nowrap; everything else is a text cell,
            // which is width-capped and ellipsised rather than allowed to shove
            // the rest of the table off-screen.
            const cls = [c.num ? "num" : "text", c.wrap ? "wrap" : "", c.cellClass || ""]
              .filter(Boolean)
              .join(" ");
            const text = c.num || c.wrap ? "" : cellTitle(c, row);
            const title = text ? ` title="${escapeHtml(text)}"` : "";
            return `<td class="${cls}"${title}>${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`;
          })
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
                  (c) => `<th class="${c.num ? "num" : ""}" data-key="${c.key}" aria-sort="${
                    sortState.key === c.key ? (sortState.dir === "asc" ? "ascending" : "descending") : "none"
                  }">${escapeHtml(c.label)}${
                    sortState.key === c.key ? `<span class="sort-arrow">${sortState.dir === "asc" ? "▲" : "▼"}</span>` : ""
                  }</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="${columns.length}"><div class="empty-state">No rows match.</div></td></tr>`}
          </tbody>
        </table>
      </div>
      ${shown.length < sorted.length
        ? `<p class="table-cap-note">Showing the first ${formatNumber(shown.length)} of
             ${formatNumber(sorted.length)} matches — narrow the filters, or use
             Export CSV to get all of them.</p>`
        : ""}`;

    container.querySelectorAll("th[data-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortState.key === key) {
          sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
        } else {
          sortState.key = key;
          sortState.dir = "asc";
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

// One document-level listener for the whole module, registered lazily, closing
// whichever popover is currently open. Previously every redraw of the control
// added another listener that was never removed, so they piled up for the life
// of the page.
let openPopoverCloser = null;
let popoverDismissWired = false;

function wirePopoverDismiss() {
  if (popoverDismissWired) return;
  popoverDismissWired = true;
  document.addEventListener("click", () => {
    if (openPopoverCloser) openPopoverCloser();
  });
}

// Renders the "Columns" control: preset buttons plus a toggle popover.
// `groups` is [{ label, keys: [...] }] purely for laying the checkboxes out.
//
// Returns { sync(keys) } so a caller that changes the visible set by some other
// route (a preset, a URL parameter) can bring the control back in step. The
// markup is built ONCE: ticking a checkbox used to re-render the whole control,
// which reset the popover to closed, so choosing five columns meant opening the
// popover five times.
export function renderColumnControls(container, { columns, groups, presets, visibleKeys, onChange }) {
  const lockedKeys = new Set(columns.filter((c) => c.always).map((c) => c.key));
  let current = new Set(visibleKeys);

  container.innerHTML = `
    <div class="column-controls">
      <div class="preset-row">
        ${Object.keys(presets)
          .map((name) => `<button type="button" class="chip" data-preset="${escapeHtml(name)}">${escapeHtml(presets[name].label)}</button>`)
          .join("")}
      </div>
      <div class="column-picker">
        <button type="button" class="btn btn-small column-toggle" aria-expanded="false">
          Columns (${current.size})
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
                      ${current.has(key) ? "checked" : ""} ${locked ? "disabled" : ""} />
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

  const toggle = container.querySelector(".column-toggle");
  const popover = container.querySelector(".column-popover");

  function closePopover() {
    popover.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (openPopoverCloser === closePopover) openPopoverCloser = null;
  }

  // Reflects `current` back into the control without rebuilding it, so the
  // popover keeps its scroll position and stays open across ticks.
  function syncUi() {
    toggle.textContent = `Columns (${current.size})`;
    container.querySelectorAll("[data-col]").forEach((cb) => {
      cb.checked = current.has(cb.dataset.col);
    });
  }

  container.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = presets[btn.dataset.preset];
      const keys = preset.keys === null ? columns.map((c) => c.key) : preset.keys;
      current = new Set([...lockedKeys, ...keys]);
      syncUi();
      onChange(current);
    });
  });

  wirePopoverDismiss();
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover.hidden) {
      if (openPopoverCloser && openPopoverCloser !== closePopover) openPopoverCloser();
      popover.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      openPopoverCloser = closePopover;
    } else {
      closePopover();
    }
  });
  popover.addEventListener("click", (e) => e.stopPropagation());
  popover.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePopover();
      toggle.focus();
    }
  });

  container.querySelectorAll("[data-col]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const next = new Set(current);
      if (cb.checked) next.add(cb.dataset.col);
      else next.delete(cb.dataset.col);
      current = next;
      syncUi();
      onChange(current);
    });
  });

  return {
    sync(keys) {
      current = new Set(keys);
      syncUi();
    },
  };
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

// Scoped, dated filenames: csvFilename("Wandsworth", "schools") gives
// "wandsworth-schools-2026-08-12.csv". Downloads land in one folder and stay
// there, so "schools.csv" three times over tells you nothing about which
// borough you exported or when.
export function csvFilename(...parts) {
  const slug = parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("-");
  return `${slug || "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
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

// --- Micro-form dialog -----------------------------------------------------
// A small native <dialog> for logging an event. Native rather than a custom
// overlay so focus trapping, Escape-to-close and the backdrop come from the
// browser rather than from code that has to be maintained.
//
// These replaced one-click buttons: a single click was close enough to a valid
// entry that a stray one would land in the workbook. A two-field form with an
// explicit submit is the smallest thing that makes the action deliberate.
//
// `fields` is [{ name, label, type, required, value, placeholder }].
export function openMicroForm({ title, fields, submitLabel = "Save", onSubmit }) {
  document.querySelector("dialog.micro-form")?.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "micro-form";
  dialog.innerHTML = `
    <form method="dialog">
      <h2>${escapeHtml(title)}</h2>
      <div class="micro-form-fields">
        ${fields
          .map(
            (f) => `
          <div class="field">
            <label for="mf-${escapeHtml(f.name)}">${escapeHtml(f.label)}${f.required ? " *" : ""}</label>
            <input id="mf-${escapeHtml(f.name)}" name="${escapeHtml(f.name)}"
              type="${escapeHtml(f.type || "text")}"
              ${f.required ? "required" : ""}
              ${f.value != null ? `value="${escapeHtml(f.value)}"` : ""}
              ${f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : ""} />
          </div>`
          )
          .join("")}
      </div>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary" value="save">${escapeHtml(submitLabel)}</button>
        <button type="button" class="btn" data-cancel>Cancel</button>
      </div>
    </form>`;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("form");

  dialog.querySelector("[data-cancel]").addEventListener("click", () => {
    dialog.close("cancel");
  });

  form.addEventListener("submit", (e) => {
    // `method="dialog"` closes the dialog on submit, but only after the
    // browser's own validation passes — so a missing required field keeps it
    // open with the native message, which is exactly what's wanted here.
    if (!form.reportValidity()) {
      e.preventDefault();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    dialog.addEventListener("close", () => onSubmit(data), { once: true });
  });

  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();

  // Focus the first field that isn't pre-filled, so the cursor lands where
  // there's actually something to type.
  const firstEmpty = [...dialog.querySelectorAll("input")].find((i) => !i.value);
  (firstEmpty || dialog.querySelector("input"))?.focus();

  return dialog;
}
