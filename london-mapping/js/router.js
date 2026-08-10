// Minimal hash router. Routes are registered as {pattern, render}, where
// pattern segments prefixed ":" become params. No history-API routing —
// hash routing means the whole site works as static files on GitHub Pages
// with no server-side rewrite rules needed.
const routes = [];
let contentEl = null;
let onNavigate = null;

export function registerRoute(pattern, render) {
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) {
            paramNames.push(seg.slice(1));
            return "([^/]+)";
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "$"
  );
  routes.push({ regex, paramNames, render });
}

export function initRouter(container, { onNavigate: navCb } = {}) {
  contentEl = container;
  onNavigate = navCb;
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

async function handleRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/dashboard";
  const [path, queryString] = hash.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryString || ""));

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = { query };
      route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      if (onNavigate) onNavigate(path);
      contentEl.innerHTML = `<div class="empty-state">Loading…</div>`;
      try {
        await route.render(contentEl, params);
      } catch (err) {
        console.error(err);
        contentEl.innerHTML = `<div class="card"><h2>Something went wrong</h2><p>${err.message}</p></div>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  contentEl.innerHTML = `<div class="empty-state">Page not found.</div>`;
}
