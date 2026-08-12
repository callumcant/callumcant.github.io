// Data-quality queue. Roughly 5–10% of schools don't match cleanly across
// GIAS, Stratum and the Pay Dashboard, and those mismatches are silent: a
// school with no Stratum row simply has no density, and a workplace code with
// no URN is membership nobody sees.
//
// Resolving something here writes a Reconciliations row, so the decision
// survives every future data refresh rather than being redone each time.
import { loadAll, getState, addReconciliation } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { detectAnomalies, ANOMALY_TYPES } from "../data/reconcile.js";
import { escapeHtml, formatNumber, showToast, openMicroForm, formatDate, downloadCsv, csvFilename } from "../ui.js";
import { getSignedInName } from "../auth.js";

const ACTION_LABELS = {
  link: "Link to a school",
  successor: "Point at successor school",
  accept: "Accept and stop flagging",
  exclude: "Exclude from all figures",
};

const ACTION_EXPLAIN = {
  link: "Record which school this workplace code belongs to. Its membership then counts everywhere.",
  successor: "The school closed or converted — move its members to the school that replaced it.",
  accept: "Genuinely anomalous and understood. Keeps the data as-is but stops it appearing here.",
  exclude: "Leave this out of every rollup. Use for duplicates and records that shouldn't count.",
};

export async function render(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const { all, byType } = detectAnomalies(state);
  const decided = (state.reconciliations || []).length;

  container.innerHTML = `
    <div class="topbar">
      <h1>Anomalies</h1>
      <div class="as-of">${all.length} outstanding · ${decided} previously resolved</div>
    </div>
    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-small" id="export-anomalies"${all.length ? "" : " disabled"}>Export anomalies</button>
      <button class="btn btn-small" id="export-decisions"${decided ? "" : " disabled"}>Export decisions</button>
    </div>

    <div class="card">
      <p style="margin-top:0;">Schools and workplace codes that don't line up across the data
      sources. Each decision you record here is stored in the workbook, so it applies to every
      future data refresh rather than needing to be redone.</p>
      <p style="margin-bottom:0;" class="muted-cell">Resolved items stay in the
      <code>Reconciliations</code> table for audit; they just stop appearing on this page.</p>
    </div>

    ${all.length === 0
      ? `<div class="card"><div class="empty-state">Nothing outstanding — every source lines up.</div></div>`
      : [...byType.entries()].map(([type, items]) => renderGroup(type, items)).join("")}
  `;

  // Exports EVERY anomaly, not the 50 per group the page draws. That cap is a
  // rendering limit, not a filter — anything past it is currently unreachable
  // in the UI, which is an argument for the export rather than against it.
  container.querySelector("#export-anomalies").addEventListener("click", () => {
    const columns = [
      { key: "type", label: "Anomaly type", csv: (a) => ANOMALY_TYPES[a.type]?.label || a.type },
      { key: "key", label: "Key (URN or workplace code)" },
      { key: "label", label: "Subject" },
      { key: "detail", label: "Detail" },
    ];
    downloadCsv(csvFilename("anomalies"), columns, all);
  });

  // The append-only audit trail. It has no page of its own — once a decision is
  // made the item leaves this list — so this is the only way to read it back.
  container.querySelector("#export-decisions").addEventListener("click", () => {
    const columns = [
      { key: "decidedDate", label: "Decided date" },
      { key: "anomalyType", label: "Anomaly type" },
      { key: "key", label: "Key (URN or workplace code)" },
      { key: "action", label: "Action" },
      { key: "targetKey", label: "Target key" },
      { key: "note", label: "Note" },
      { key: "decidedBy", label: "Decided by" },
    ];
    downloadCsv(csvFilename("reconciliation-decisions"), columns, state.reconciliations || []);
  });

  container.querySelectorAll("[data-resolve]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { resolve: action, type, key, label } = btn.dataset;
      openResolveForm({ action, type, key, label, schools, container });
    });
  });
}

function renderGroup(type, items) {
  const meta = ANOMALY_TYPES[type] || { label: type, explain: "", actions: ["accept"] };
  return `
    <div class="section-title">${escapeHtml(meta.label)} (${items.length})</div>
    <div class="card">
      <p style="margin-top:0;" class="muted-cell">${escapeHtml(meta.explain)}</p>
      <dl class="stat-list">
        ${items.slice(0, 50).map((a) => `
          <div class="stat-row anomaly-row">
            <dt>
              <strong>${escapeHtml(a.label)}</strong>
              <div class="muted-cell">${escapeHtml(a.detail)}</div>
            </dt>
            <dd>
              <div class="btn-row" style="margin-top:0; flex-wrap:wrap;">
                ${meta.actions.map((action) => `
                  <button class="btn btn-small" data-resolve="${action}"
                    data-type="${escapeHtml(type)}" data-key="${escapeHtml(a.key)}"
                    data-label="${escapeHtml(a.label)}">${escapeHtml(ACTION_LABELS[action])}</button>`).join("")}
              </div>
            </dd>
          </div>`).join("")}
      </dl>
      ${items.length > 50 ? `<p class="muted-cell">…and ${items.length - 50} more of this type.</p>` : ""}
    </div>`;
}

function openResolveForm({ action, type, key, label, schools, container }) {
  const needsTarget = action === "link" || action === "successor";

  openMicroForm({
    title: `${ACTION_LABELS[action]} — ${label}`,
    submitLabel: "Record decision",
    fields: [
      ...(needsTarget
        ? [{
            name: "targetKey",
            label: action === "link" ? "URN of the school this belongs to" : "URN of the successor school",
            type: "text",
            required: true,
            placeholder: "e.g. 100097",
          }]
        : []),
      { name: "note", label: "Why (optional but worth recording)", type: "text" },
    ],
    onSubmit: async ({ targetKey, note }) => {
      if (needsTarget) {
        const match = schools.find((s) => String(s.urn) === String(targetKey).trim());
        if (!match) {
          // Better to refuse than to write a decision pointing at nothing —
          // a bad link is harder to spot later than an unresolved anomaly.
          showToast(`No school with URN ${targetKey} — decision not saved.`);
          return;
        }
      }
      await addReconciliation({
        anomalyType: type,
        key,
        action,
        targetKey: needsTarget ? String(targetKey).trim() : "",
        note: (note || "").trim(),
        decidedBy: await getSignedInName(),
        decidedDate: new Date().toISOString().slice(0, 10),
      });
      showToast(`Recorded: ${ACTION_LABELS[action].toLowerCase()} for ${label}`);
      render(container);
    },
  });

  // Surface what the action means, since the labels are necessarily terse.
  const dialog = document.querySelector("dialog.micro-form");
  const fields = dialog?.querySelector(".micro-form-fields");
  if (fields) {
    const hint = document.createElement("p");
    hint.className = "muted-cell";
    hint.style.margin = "0";
    hint.textContent = ACTION_EXPLAIN[action] || "";
    fields.prepend(hint);
  }
}
