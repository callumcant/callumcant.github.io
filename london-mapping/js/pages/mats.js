import { loadAll } from "../data/store.js";
import { buildSchoolLevel, buildMatLevel } from "../data/rollups.js";
import { renderDataTable, formatNumber, formatPercent, formatDate, escapeHtml, showToast, downloadCsv, csvFilename, barCell } from "../ui.js";
import { renderQuadrant } from "../ui/quadrant.js";
import { renderSearchSelect } from "../ui/search-select.js";
import { levelHeaderHtml, headlineTiles, footerStat } from "../ui/level-header.js";
import { snapshotSeries, baselinePoint } from "../data/snapshots.js";
import { logRepCommittee } from "../data/store.js";
import { getSignedInName } from "../auth.js";

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);

  container.innerHTML = `
    <div class="topbar"><h1>MATs</h1></div>
    <div class="card"><div id="mat-search"></div></div>
  `;

  const items = [...mats]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      name: `${m.name}${m.isTargetMat ? " ⭐" : ""}`,
      summary: `${formatNumber(m.schoolCount)} schools · ${m.boroughsPresent.length} ${m.boroughsPresent.length === 1 ? "borough" : "boroughs"} · ${formatNumber(m.membersTotal)} members · ${formatPercent(m.densityTotal)} density`,
      href: `#/mats/${encodeURIComponent(m.name)}`,
      featured: m.isTargetMat,
    }));

  renderSearchSelect(container.querySelector("#mat-search"), items, {
    label: "Search MATs",
    placeholder: "Search MATs",
    defaultLabel: "Target MATs",
  });
}

// Rep committee reporter. `repCommitteeExists` used to be a manual MatFacts
// column shown read-only, with no date and no way to change it in the app —
// so it went stale and nobody could tell when it had last been true.
//
// Same shape as the meeting and rep-recruited reporters: a deliberate action
// with a date, appended rather than overwritten. The switch flips optimistically
// so the click feels answered, but nothing is written until Confirm — cancelling
// puts it back.
function repCommitteeControl(mat) {
  const on = mat.repCommitteeExists;
  const since = mat.repCommitteeSince;
  return `
    <span class="level-footer-stat committee-control">
      <span class="level-footer-label">Rep committee</span>
      <button type="button" id="committee-toggle" class="committee-toggle" role="switch"
              aria-checked="${on ? "true" : "false"}"
              aria-label="Rep committee at ${escapeHtml(mat.name)}: currently ${on ? "yes" : "no"}. Activate to change.">
        <span class="committee-track" aria-hidden="true"><span class="committee-thumb"></span></span>
        <span class="committee-state">${on ? "Yes" : "No"}</span>
      </button>
      <span class="committee-since">${
        since
          ? `Committee ${on ? "since" : "ended"} ${escapeHtml(formatDate(since))}`
          : mat.repCommitteeReported ? "" : "Not yet reported in the app"
      }</span>
      <span class="committee-form" id="committee-form" hidden>
        <label for="committee-date">Effective from</label>
        <input type="date" id="committee-date" />
        <button type="button" class="btn btn-primary" id="committee-confirm">Confirm</button>
        <button type="button" class="btn" id="committee-cancel">Cancel</button>
      </span>
    </span>`;
}

function wireRepCommittee(container, mat, redraw) {
  const toggle = container.querySelector("#committee-toggle");
  const form = container.querySelector("#committee-form");
  if (!toggle || !form) return;
  const dateInput = container.querySelector("#committee-date");
  const stateLabel = toggle.querySelector(".committee-state");
  const original = toggle.getAttribute("aria-checked") === "true";

  // The label has to move with aria-checked. Leaving it describing the saved
  // status while the switch reads "on" tells a screen-reader user two
  // contradictory things about the same control.
  function setVisual(on) {
    toggle.setAttribute("aria-checked", on ? "true" : "false");
    stateLabel.textContent = on ? "Yes" : "No";
    toggle.setAttribute("aria-label", on === original
      ? `Rep committee at ${mat.name}: currently ${on ? "yes" : "no"}. Activate to change.`
      : `Rep committee at ${mat.name}: changing to ${on ? "yes" : "no"}, not saved yet. Confirm the effective date to save.`);
  }

  function close() {
    form.hidden = true;
    setVisual(original);
    toggle.focus();
  }

  toggle.addEventListener("click", () => {
    if (!form.hidden) return close();
    setVisual(!original);
    dateInput.value = new Date().toISOString().slice(0, 10);
    form.hidden = false;
    dateInput.focus();
  });

  container.querySelector("#committee-cancel").addEventListener("click", close);

  // Escape cancels, matching the micro-form dialogs elsewhere. Bound to the
  // whole control rather than the form, because focus is just as likely to be
  // back on the switch as inside the form, and Escape should mean the same
  // thing in both places. Capture phase, so a native <input type="date">
  // handling Escape for its own picker can't swallow it first.
  (toggle.closest(".committee-control") || form).addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !form.hidden) { e.preventDefault(); close(); }
  }, true);

  container.querySelector("#committee-confirm").addEventListener("click", async () => {
    const effectiveFrom = dateInput.value;
    if (!effectiveFrom) { dateInput.focus(); return; }
    const loggedBy = await getSignedInName();
    await logRepCommittee({ mat: mat.name, exists: !original, effectiveFrom, loggedBy });
    showToast(
      `Rep committee at ${mat.name} recorded as ${!original ? "yes" : "no"} from ${formatDate(effectiveFrom)}`
    );
    redraw();
  });
}

export async function renderDetail(container, { name }) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const mats = buildMatLevel(schools, state);
  const mat = mats.find((m) => m.name === name);

  if (!mat) {
    container.innerHTML = `<div class="empty-state">MAT "${escapeHtml(name)}" not found.</div>`;
    return;
  }

  const notes = state.fieldNotes
    .filter((n) => n.level === "MAT" && n.subject === name)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const series = snapshotSeries(state.snapshots, mat.schools.map((s) => String(s.urn)));

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/mats">← MATs</a></div>
    <div class="topbar"><h1>${escapeHtml(mat.name)}${mat.isTargetMat ? " ⭐ Target MAT" : ""}</h1></div>

    ${levelHeaderHtml({
      identityParts: [
        `${formatNumber(mat.schoolCount)} schools`,
        mat.phasesPresent.join(", ").toLowerCase(),
        `${formatNumber(mat.headcountTotal)} staff`,
        `${formatNumber(mat.membersTotal)} members`,
      ],
      // Boroughs were a five-item list stretching the whole first row as a
      // "tile". They're navigation, so they're chips that go somewhere.
      chips: mat.boroughsPresent.map((b) => ({
        label: b,
        href: `#/branches/${encodeURIComponent(b)}`,
      })),
      tiles: headlineTiles(mat, series, baselinePoint(series)),
      density: {
        total: mat.densityTotal,
        teachers: mat.densityTeachers,
        leadership: mat.densityLeadership,
        support: mat.densitySupport,
      },
      footerHtml: [
        footerStat("Member:rep ratio", mat.memberRepRatio),
        footerStat("Meetings held", formatNumber(mat.meetingsHeld)),
        repCommitteeControl(mat),
      ].join(""),
    })}

    <div class="section-title">Organising quadrant</div>
    <div class="card"><div id="mat-quadrant"></div></div>

    <div class="section-title">Schools in this trust</div>
    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-small" id="export-mat-schools">Export CSV</button>
      <a class="btn btn-small" href="#/map?trust=${encodeURIComponent(mat.name)}">View on map</a>
    </div>
    <div class="card"><div id="mat-schools-table"></div></div>

    <div class="section-title">Field notes</div>
    <div class="card">
      ${notes.length === 0 ? `<div class="empty-state">No notes for this MAT yet.</div>` : notes.map((n) => `
        <div class="note-card">
          <strong>${escapeHtml(n.title)}</strong>
          <div>${escapeHtml(n.note)}</div>
          <div class="note-meta">${formatDate(n.date)} · ${escapeHtml(n.author)}</div>
        </div>`).join("")}
      <div class="btn-row">
        <a class="btn" href="#/notes/new?level=MAT&subject=${encodeURIComponent(name)}">+ Add note</a>
        ${notes.length ? `<a class="btn" href="#/notes?level=MAT&subject=${encodeURIComponent(name)}">View in notes</a>` : ""}
      </div>
    </div>
  `;

  wireRepCommittee(container, mat, () => renderDetail(container, { name }));

  renderQuadrant(container.querySelector("#mat-quadrant"), mat.schools, {
    title: `${mat.name} organising quadrant`,
  });

  // Hoisted so the export uses exactly the columns on screen; `csv` keeps the
  // raw fraction out of the "41.2%" display string.
  const schoolColumns = [
    { key: "schoolName", label: "School", render: (r) => `<a class="row-link" href="#/schools/${r.urn}">${escapeHtml(r.schoolName)}</a>` },
    { key: "laName", label: "Borough" },
    { key: "membersTotal", label: "Members", num: true, render: (r) => formatNumber(r.membersTotal) },
    { key: "densityTotal", label: "Density", num: true, cellClass: "has-bar",
      render: (r) => barCell(r.densityTotal, formatPercent(r.densityTotal)),
      csv: (r) => (r.densityTotal == null ? "" : r.densityTotal.toFixed(4)) },
    { key: "turnout2026", label: "2026 turnout", num: true, cellClass: "has-bar",
      render: (r) => barCell(r.turnout2026, formatPercent(r.turnout2026)),
      csv: (r) => (r.turnout2026 == null ? "" : r.turnout2026.toFixed(4)) },
    { key: "repCount", label: "Reps", num: true },
  ];

  renderDataTable(
    container.querySelector("#mat-schools-table"),
    schoolColumns,
    mat.schools,
    { defaultSort: "membersTotal", defaultDir: "desc" }
  );

  container.querySelector("#export-mat-schools").addEventListener("click", () => {
    downloadCsv(csvFilename(mat.name, "schools"), schoolColumns, mat.schools);
  });
}
