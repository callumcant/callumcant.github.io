// Connection diagnostics. Exists so "it isn't working" becomes a specific,
// actionable sentence — which table is missing, which value is unfilled —
// rather than a support conversation.
import { CONFIG, isPreviewMode, missingConfigKeys, isPlaceholder } from "../config.js";
import { escapeHtml } from "../ui.js";

const CONFIG_LABELS = {
  clientId: "Application (client) ID — from your IT admin",
  tenantId: "Directory (tenant) ID — from your IT admin",
  workbookUrl: "Workbook URL — copy from the address bar with the file open in SharePoint",
};

function statusPill(ok, text) {
  return `<span class="pill ${ok ? "rag-green" : "rag-red"}">${escapeHtml(text)}</span>`;
}

export async function render(container) {
  const missing = missingConfigKeys();
  const preview = isPreviewMode();

  container.innerHTML = `
    <div class="topbar">
      <h1>Setup &amp; connection</h1>
      <div class="as-of">${preview ? "Preview mode — sample data" : "Connected mode"}</div>
    </div>

    <div class="section-title">Step 1 — configuration</div>
    <div class="card">
      <dl class="stat-list">
        ${Object.keys(CONFIG_LABELS)
          .map((key) => {
            const filled = !isPlaceholder(CONFIG[key]);
            const shown = filled
              ? (key === "workbookUrl" ? CONFIG[key] : `${String(CONFIG[key]).slice(0, 8)}…`)
              : "Not filled in";
            return `<div class="stat-row">
              <dt>${escapeHtml(CONFIG_LABELS[key])}</dt>
              <dd>${statusPill(filled, filled ? "Set" : "Missing")} <span class="muted-cell">${escapeHtml(shown)}</span></dd>
            </div>`;
          })
          .join("")}
      </dl>
      ${
        missing.length
          ? `<p style="margin-bottom:0;">Edit <code>london-mapping/js/config.js</code> — you can do this on
             github.com: open the file, click the pencil icon, fill in the ${missing.length}
             remaining value${missing.length === 1 ? "" : "s"}, and commit. The site rebuilds
             itself within a minute. There is no flag to flip afterwards.</p>`
          : `<p style="margin-bottom:0;">All three values are set.</p>`
      }
    </div>

    <div class="section-title">Step 2 — workbook</div>
    <div class="card" id="workbook-card">
      ${
        preview
          ? `<div class="empty-state">Not checked yet — the app is running on sample data until step 1 is complete.</div>`
          : `<div class="empty-state">Checking the workbook…</div>`
      }
    </div>

    <div class="section-title">What to send IT</div>
    <div class="card">
      <p style="margin-top:0;">They need to register this site as an app in Entra ID. The full
      instructions are in <code>london-mapping/SETUP.md</code> in the repository — the section
      headed “What IT needs to do” can be forwarded as-is.</p>
      <p style="margin-bottom:0;">In short: a single-tenant single-page-application registration,
      redirect URI <code>${escapeHtml(CONFIG.redirectUri)}</code>, with delegated Microsoft Graph
      permissions <code>Files.ReadWrite.All</code> and <code>User.Read</code>, admin-consented.</p>
    </div>
  `;

  if (preview) return;

  // Only reached once configured: check the workbook actually looks right.
  const card = container.querySelector("#workbook-card");
  try {
    const graph = await import("../data/graph-client.js");
    const health = await graph.checkWorkbookHealth();
    const bad = health.results.filter((r) => !r.ok);
    card.innerHTML = `
      <p style="margin-top:0;">Connected to <strong>${escapeHtml(health.workbookName)}</strong>.
      ${bad.length === 0
        ? "Every table the app needs is present and the right shape."
        : `${bad.length} table${bad.length === 1 ? "" : "s"} need${bad.length === 1 ? "s" : ""} attention.`}</p>
      <dl class="stat-list">
        ${health.results
          .map(
            (r) => `<div class="stat-row">
              <dt>${escapeHtml(r.table)}</dt>
              <dd>${statusPill(r.ok, r.ok ? "OK" : "Fix")} <span class="muted-cell">${escapeHtml(r.detail)}</span></dd>
            </div>`
          )
          .join("")}
      </dl>
      ${
        health.extras.length
          ? `<p class="muted-cell">Also present, and ignored by the app: ${escapeHtml(health.extras.join(", "))}.</p>`
          : ""
      }`;
  } catch (err) {
    card.innerHTML = `
      <p style="margin-top:0;">${statusPill(false, "Could not read the workbook")}</p>
      <p><code>${escapeHtml(err.message)}</code></p>
      <p style="margin-bottom:0;">Common causes: the workbook URL doesn't point at the file;
      you don't have edit access to it; or IT hasn't granted admin consent yet. If the error
      mentions <code>403</code>, see the permissions note in SETUP.md — some tenants also need
      <code>Sites.ReadWrite.All</code>.</p>`;
  }
}
