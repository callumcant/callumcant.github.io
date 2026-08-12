import { isPreviewMode, missingConfigKeys } from "./config.js";
import { registerRoute, initRouter } from "./router.js";
import * as dashboardPage from "./pages/dashboard.js";
import * as branchesPage from "./pages/branches.js";
import * as matsPage from "./pages/mats.js";
import * as schoolsPage from "./pages/schools.js";
import * as disputesPage from "./pages/disputes.js";
import * as notesPage from "./pages/notes.js";
import * as mapPage from "./pages/map.js";
import * as anomaliesPage from "./pages/anomalies.js";
import * as setupPage from "./pages/setup.js";
import * as signinPage from "./pages/signin.js";
import { getAccount } from "./auth.js";
import { escapeHtml, formatNumber } from "./ui.js";
import { renderSearchSelect } from "./ui/search-select.js";

// Grouped rather than flat, because a flat list of nine mixed levels of
// aggregation ("Schools") with types of record ("Field notes") and housekeeping
// ("Anomalies") in one column, and left the reader to work out which was which.
// Headings are plain labels, not collapsible sections — there is no state to
// manage and nothing to get stuck closed.
//
// Map sits under Views because it is a view OF schools, not a separate place.
const NAV_GROUPS = [
  { items: [{ path: "/dashboard", label: "Dashboard" }] },
  {
    heading: "Views",
    items: [
      { path: "/branches", label: "Branches" },
      { path: "/mats", label: "MATs" },
      { path: "/schools", label: "Schools" },
      { path: "/map", label: "Map" },
    ],
  },
  {
    items: [
      { path: "/disputes", label: "Dispute tracker" },
      { path: "/notes", label: "Field notes" },
    ],
  },
  {
    heading: "Admin",
    items: [
      { path: "/anomalies", label: "Anomalies" },
      { path: "/setup", label: "Setup" },
    ],
  },
];

// Setup is a going-live tool, not a daily one. It drops out of the sidebar
// once all three config values are filled in, so the team never sees it — the
// route stays reachable at #/setup for diagnostics.
function navGroups() {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.path !== "/setup" || isPreviewMode()),
  })).filter((group) => group.items.length > 0);
}

function navGroupHtml(group) {
  const links = group.items
    .map((item) => `<a class="nav-link" data-path="${item.path}" href="#${item.path}">${escapeHtml(item.label)}</a>`)
    .join("");
  // aria-label names the group for a screen reader; the visible heading is
  // aria-hidden so the same word isn't announced twice.
  const labelled = group.heading ? ` role="group" aria-label="${escapeHtml(group.heading)}"` : "";
  const heading = group.heading
    ? `<div class="nav-heading" aria-hidden="true">${escapeHtml(group.heading)}</div>`
    : "";
  return `<div class="nav-group"${labelled}>${heading}${links}</div>`;
}

function shellHtml() {
  return `
    <div class="app-shell">
      <div class="nav-scrim" id="nav-scrim"></div>
      <nav class="sidebar" id="sidebar">
        <div class="brand">NEU London<small>Project Mapping</small></div>
        ${navGroups().map(navGroupHtml).join("")}
        <div class="sidebar-footer">${isPreviewMode() ? "Preview mode — sample data" : ""}</div>
      </nav>
      <main class="main">
        <header class="app-header">
          <button type="button" class="app-header-menu" id="nav-toggle"
                  aria-expanded="false" aria-controls="sidebar">
            <span aria-hidden="true">☰</span> Menu
          </button>
          <div class="app-header-brand">NEU London</div>
          <div class="app-header-search" id="global-search"></div>
        </header>
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

// --- Mobile navigation -----------------------------------------------------
// Below 820px the sidebar used to be a sticky block of nine links above the
// content, so every page opened on the navigation and you scrolled past it to
// reach the data. It's now an overlay: the slim header bar is all that sits
// above the content.
//
// Deliberately not a full focus trap. This is a short list of links with a
// scrim, Escape, and focus moved in and back out again; a trap would be more
// machinery than the interaction earns.
function initMobileNav(app) {
  const shell = app.querySelector(".app-shell");
  const toggle = app.querySelector("#nav-toggle");
  const scrim = app.querySelector("#nav-scrim");
  const sidebar = app.querySelector("#sidebar");

  function setOpen(open) {
    shell.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) sidebar.querySelector(".nav-link")?.focus();
  }

  toggle.addEventListener("click", () => setOpen(!shell.classList.contains("nav-open")));
  scrim.addEventListener("click", () => setOpen(false));
  // Selecting a destination is the end of navigating — the overlay should not
  // still be sitting over the page you just asked for.
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".nav-link")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shell.classList.contains("nav-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  return () => setOpen(false);
}

// --- Universal search ------------------------------------------------------
// One box that reaches any school, branch or MAT. Schools also match on URN and
// postcode, because those are what people have to hand — a URN copied off a
// spreadsheet, a postcode off an email — and neither is part of the name.
//
// The index is built on first use rather than at boot: it needs the whole
// workbook, and making everyone wait for that before the first page paints
// would be a poor trade for a box most visits never touch.
function initGlobalSearch(app) {
  const mount = app.querySelector("#global-search");
  const wrap = mount.closest(".app-header-search");
  let handle = null;
  let building = null;

  function close() {
    wrap.classList.remove("is-open");
  }

  async function buildItems() {
    const [{ loadAll }, rollups] = await Promise.all([
      import("./data/store.js"),
      import("./data/rollups.js"),
    ]);
    const state = await loadAll();
    const schools = rollups.buildSchoolLevel(state);
    return [
      ...schools.map((s) => ({
        group: "Schools",
        name: s.schoolName,
        summary: [s.laName, s.phase, s.postcode].filter(Boolean).join(" · "),
        keywords: `${s.urn} ${s.postcode || ""}`,
        href: `#/schools/${encodeURIComponent(s.urn)}`,
      })),
      ...rollups.buildBranchLevel(schools, state).map((b) => ({
        group: "Branches",
        name: b.name,
        summary: `${formatNumber(b.schoolsCount)} schools · ${formatNumber(b.membersTotal)} members`,
        href: `#/branches/${encodeURIComponent(b.name)}`,
      })),
      ...rollups.buildMatLevel(schools, state).map((m) => ({
        group: "MATs",
        name: m.name,
        summary: `${formatNumber(m.schoolCount)} schools · ${formatNumber(m.membersTotal)} members`,
        href: `#/mats/${encodeURIComponent(m.name)}`,
      })),
    ];
  }

  async function ensureMounted() {
    if (handle || building) return building;
    mount.innerHTML = `<p class="search-select-hint">Loading…</p>`;
    building = buildItems()
      .then((items) => {
        handle = renderSearchSelect(mount, items, {
          label: "Search",
          placeholder: "Search schools, branches and MATs…",
          defaultLabel: "Type a school, branch or MAT name, a URN or a postcode",
          groupOrder: ["Schools", "Branches", "MATs"],
          autofocus: false,
          onEscape: () => {
            close();
            handle.blur();
          },
          // Blur as well as close. Leaving focus in a box that has just been
          // hidden means the next thing typed — including "/" — goes into an
          // input nobody can see.
          onNavigate: () => {
            handle.clear();
            handle.blur();
            close();
          },
        });
      })
      .catch((err) => {
        console.error("[search] could not build the search index", err);
        mount.innerHTML = `<p class="search-select-hint">Search is unavailable — the workbook didn't load.</p>`;
      });
    return building;
  }

  async function open() {
    wrap.classList.add("is-open");
    await ensureMounted();
    handle?.focus();
  }

  wrap.addEventListener("focusin", () => {
    wrap.classList.add("is-open");
    ensureMounted();
  });
  wrap.addEventListener("mousedown", () => {
    wrap.classList.add("is-open");
    ensureMounted();
  });
  // A click anywhere else dismisses it, but only when nothing is typed —
  // closing a box someone has half-filled loses their work.
  document.addEventListener("click", (e) => {
    if (wrap.contains(e.target)) return;
    if (handle?.hasQuery()) return;
    close();
  });

  // "/" is the near-universal shortcut for search. Ignored while typing, or
  // the first slash of any sentence would teleport the cursor.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    e.preventDefault();
    open();
  });
}

// The sign-in library is fetched from a CDN, so a corporate network that
// blocks it (or a CDN outage) would otherwise leave a blank page with no
// explanation — the worst possible failure on go-live day. Say what happened
// and where to look instead.
function renderAuthFailure(app, err) {
  app.innerHTML = `
    <div class="signin-wrap">
      <h1>Couldn't load sign-in</h1>
      <p>The Microsoft sign-in library is fetched from an external site
      (esm.sh), and it didn't load. That's usually a network blocking it, or a
      temporary outage — it isn't a problem with your account or the workbook.</p>
      <p class="muted-cell"><code>${escapeHtml(err?.message || String(err))}</code></p>
      <div class="btn-row">
        <button class="btn btn-primary" id="retry-auth">Try again</button>
        <a class="btn" href="#/setup">Open setup diagnostics</a>
      </div>
    </div>`;
  app.querySelector("#retry-auth")?.addEventListener("click", () => window.location.reload());
}

async function boot() {
  const app = document.getElementById("app");

  if (!isPreviewMode()) {
    let account;
    try {
      account = await getAccount();
    } catch (err) {
      console.error("[auth] could not initialise sign-in", err);
      renderAuthFailure(app, err);
      return;
    }
    if (!account) {
      await signinPage.render(app);
      return;
    }
  }

  app.innerHTML = shellHtml();
  const content = app.querySelector("#content");
  const closeMobileNav = initMobileNav(app);
  initGlobalSearch(app);

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
  registerRoute("/anomalies", anomaliesPage.render);
  registerRoute("/setup", setupPage.render);

  initRouter(content, {
    onNavigate: (path) => {
      updateActiveNav(path);
      closeMobileNav();
    },
  });

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
