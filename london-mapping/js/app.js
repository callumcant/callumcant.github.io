import { isPreviewMode, missingConfigKeys } from "./config.js";
import { registerRoute, initRouter } from "./router.js";
import * as dashboardPage from "./pages/dashboard.js";
import * as branchesPage from "./pages/branches.js";
import * as matsPage from "./pages/mats.js";
import * as schoolsPage from "./pages/schools.js";
import * as disputesPage from "./pages/disputes.js";
import * as notesPage from "./pages/notes.js";
import * as mapPage from "./pages/map.js";
import * as setupPage from "./pages/setup.js";
import * as signinPage from "./pages/signin.js";
import { getAccount } from "./auth.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/branches", label: "Branches" },
  { path: "/mats", label: "MATs" },
  { path: "/schools", label: "Schools" },
  { path: "/map", label: "Map" },
  { path: "/disputes", label: "Dispute tracker" },
  { path: "/notes", label: "Field notes" },
  { path: "/setup", label: "Setup" },
];

function shellHtml() {
  return `
    <div class="app-shell">
      <nav class="sidebar">
        <div class="brand">NEU London<small>Project Mapping</small></div>
        ${NAV_ITEMS.map((item) => `<a class="nav-link" data-path="${item.path}" href="#${item.path}">${item.label}</a>`).join("")}
        <div class="sidebar-footer">${isPreviewMode() ? "Preview mode — sample data" : ""}</div>
      </nav>
      <main class="main">
        ${isPreviewMode() ? `<div class="mock-banner">You're viewing sample data, not the real workbook. Still to fill in: ${missingConfigKeys().join(", ")} — <a href="#/setup">open setup</a>.</div>` : ""}
        <div id="content"></div>
      </main>
    </div>
  `;
}

function updateActiveNav(path) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const linkPath = link.dataset.path;
    link.classList.toggle("active", path === linkPath || path.startsWith(`${linkPath}/`));
  });
}

async function boot() {
  const app = document.getElementById("app");

  if (!isPreviewMode()) {
    const account = await getAccount();
    if (!account) {
      await signinPage.render(app);
      return;
    }
  }

  app.innerHTML = shellHtml();
  const content = app.querySelector("#content");

  registerRoute("/dashboard", dashboardPage.render);
  registerRoute("/branches", branchesPage.renderList);
  registerRoute("/branches/:name", branchesPage.renderDetail);
  registerRoute("/mats", matsPage.renderList);
  registerRoute("/mats/:name", matsPage.renderDetail);
  registerRoute("/schools", schoolsPage.renderList);
  registerRoute("/schools/:urn", schoolsPage.renderDetail);
  registerRoute("/disputes", disputesPage.renderList);
  registerRoute("/disputes/new", disputesPage.renderForm);
  registerRoute("/disputes/:id", disputesPage.renderForm);
  registerRoute("/notes", notesPage.renderList);
  registerRoute("/notes/new", notesPage.renderForm);
  registerRoute("/map", mapPage.render);
  registerRoute("/setup", setupPage.render);

  initRouter(content, { onNavigate: updateActiveNav });

  // Weekly snapshot capture, after first paint so it never delays rendering.
  // Failures are logged inside maybeCaptureSnapshot and deliberately not
  // surfaced — bookkeeping must not interrupt someone mid-task.
  requestIdleCallbackShim(() => {
    import("./data/snapshots.js").then((m) => m.maybeCaptureSnapshot());
  });
}

// requestIdleCallback isn't available in Safari; fall back to a timeout so the
// capture still happens off the critical path.
function requestIdleCallbackShim(fn) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(fn, { timeout: 5000 });
  } else {
    setTimeout(fn, 1200);
  }
}

boot();
