// Search-first list: a text box that jumps straight to one thing.
//
// Replaces the sortable table on the Branch and MAT list pages. Nobody scans
// 32 boroughs looking for a pattern — they already know which branch they
// want, and a table makes them hunt for it. The pattern-finding views are the
// dashboard, the map and the quadrant; this is navigation.
//
// Deliberately NOT used on the Schools page: that table answers the question
// the app exists to answer ("which schools have members and no rep"), carries
// the column controls and CSV export, and is the accessible route to
// everything on the map and the quadrant.
//
// Implements the ARIA combobox-with-listbox pattern so the highlighted option
// and the number of matches are announced, rather than being a visual-only
// affordance.
import { escapeHtml } from "../ui.js";

const MAX_RESULTS = 8;

let nextId = 0;

/**
 * @param {Element} container
 * @param {Array} items    [{ name, summary, href, featured, group, keywords }]
 *                         `href` is a full hash target, already encoded.
 *                         `featured` items are the empty-input starting list.
 *                         `group` (optional) buckets results under a heading;
 *                         when any item has one, `limit` applies PER group.
 *                         `keywords` (optional) is extra matchable text that
 *                         isn't shown — a school's URN and postcode.
 * @param {Object} options { placeholder, label, defaultLabel, limit, autofocus,
 *                           groupOrder, onEscape, onNavigate }
 * @returns {{ focus, clear, hasQuery }}
 */
export function renderSearchSelect(container, items, options = {}) {
  const id = `search-select-${nextId++}`;
  const limit = options.limit ?? MAX_RESULTS;
  const label = options.label || "Search";
  const defaultLabel = options.defaultLabel || "Suggestions";
  const featured = items.filter((i) => i.featured);
  const grouped = items.some((i) => i.group);
  const groupOrder = options.groupOrder || [];

  let query = "";
  let highlighted = 0;

  container.innerHTML = `
    <div class="search-select">
      <label class="search-select-label" for="${id}-input">${escapeHtml(label)}</label>
      <input
        id="${id}-input"
        class="search-select-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-expanded="true"
        aria-controls="${id}-list"
        aria-autocomplete="list"
        placeholder="${escapeHtml(options.placeholder || "Search")}" />
      <div class="search-select-panel">
        <p class="search-select-hint" id="${id}-hint"></p>
        <ul class="search-select-list" id="${id}-list" role="listbox" aria-label="${escapeHtml(label)}"></ul>
      </div>
      <div class="sr-only" role="status" aria-live="polite" id="${id}-status"></div>
    </div>
  `;

  const input = container.querySelector(`#${id}-input`);
  const list = container.querySelector(`#${id}-list`);
  const hint = container.querySelector(`#${id}-hint`);
  const status = container.querySelector(`#${id}-status`);

  // Substring, not prefix. "Hamlets" should find "Tower Hamlets (&CoL)", and
  // "Romero" should find "Oscar Romero" — people search by the distinctive
  // part of a name, which is rarely the first word. `keywords` widens this to
  // things nobody would call a name but everybody searches by: a URN typed off
  // a spreadsheet, a postcode read off an email.
  function hits(item, q) {
    if (item.name.toLowerCase().includes(q)) return true;
    return item.keywords ? item.keywords.toLowerCase().includes(q) : false;
  }

  // Returns a flat array in display order. Keyboard navigation indexes into
  // this, so group headings must never take a slot in it — they're inserted at
  // render time only.
  function matches() {
    const q = query.trim().toLowerCase();
    if (!q) return featured;
    const found = items.filter((i) => hits(i, q));
    if (!grouped) return found.slice(0, limit);

    // Capped per group rather than overall, so a common word like "park"
    // matching forty schools can't crowd the one branch out of the list.
    const byGroup = new Map();
    for (const item of found) {
      const g = item.group || "";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(item);
    }
    const order = [...groupOrder.filter((g) => byGroup.has(g)), ...[...byGroup.keys()].filter((g) => !groupOrder.includes(g))];
    return order.flatMap((g) => byGroup.get(g).slice(0, limit));
  }

  function draw() {
    const results = matches();
    const showingFeatured = !query.trim();

    if (results.length === 0) {
      // A term the user typed, echoed back — an empty box leaves them
      // wondering whether it searched at all.
      list.innerHTML = "";
      hint.textContent = `No match for "${query.trim()}".`;
      input.removeAttribute("aria-activedescendant");
      status.textContent = `No results for ${query.trim()}`;
      return;
    }

    highlighted = Math.min(highlighted, results.length - 1);

    hint.textContent = showingFeatured
      ? defaultLabel
      : `${results.length} ${results.length === 1 ? "match" : "matches"}`;

    // Headings are role="presentation" so they occupy no position in the
    // listbox — a screen reader counts 12 options, not 12 options and 3
    // headings, and the arrow keys agree with that count.
    let lastGroup = null;
    list.innerHTML = results.map((item, index) => {
      let heading = "";
      if (grouped && item.group && item.group !== lastGroup) {
        lastGroup = item.group;
        heading = `<li class="search-group" role="presentation">${escapeHtml(item.group)}</li>`;
      }
      return `${heading}
      <li class="search-result${index === highlighted ? " highlighted" : ""}"
          id="${id}-opt-${index}"
          role="option"
          aria-selected="${index === highlighted ? "true" : "false"}"
          data-index="${index}">
        <span class="search-result-name">${escapeHtml(item.name)}</span>
        <span class="search-result-summary">${escapeHtml(item.summary || "")}</span>
      </li>`;
    }).join("");

    input.setAttribute("aria-activedescendant", `${id}-opt-${highlighted}`);
    // defaultLabel is used as written — lowercasing it turned "Target MATs"
    // into "target mats", which a screen reader reads as a word.
    status.textContent = showingFeatured
      ? `${defaultLabel}, ${results.length} shown`
      : `${results.length} ${results.length === 1 ? "match" : "matches"}, ${results[highlighted].name} highlighted`;
  }

  function go(index) {
    const results = matches();
    const item = results[index];
    if (!item) return;
    window.location.hash = item.href;
    if (options.onNavigate) options.onNavigate(item);
  }

  function clear() {
    query = "";
    input.value = "";
    highlighted = 0;
    draw();
  }

  input.addEventListener("input", () => {
    query = input.value;
    highlighted = 0;
    draw();
  });

  input.addEventListener("keydown", (e) => {
    const results = matches();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!results.length) return;
      // Wraps, so holding one arrow key reaches everything without having to
      // know which end of the list you're at.
      highlighted = (highlighted + 1) % results.length;
      draw();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      highlighted = (highlighted - 1 + results.length) % results.length;
      draw();
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(highlighted);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // First Escape clears a typed query; a second one (box already empty)
      // means "I'm done here" — which for the header search closes the popover.
      const wasEmpty = !query.trim();
      clear();
      if (wasEmpty && options.onEscape) options.onEscape();
    } else if (e.key === "Home" && results.length) {
      e.preventDefault();
      highlighted = 0;
      draw();
    } else if (e.key === "End" && results.length) {
      e.preventDefault();
      highlighted = results.length - 1;
      draw();
    }
  });

  // mousedown rather than click: the input keeps focus, so a mis-click doesn't
  // dump the user out of the search box.
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest(".search-result");
    if (!li) return;
    e.preventDefault();
    go(Number(li.dataset.index));
  });

  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".search-result");
    if (!li || Number(li.dataset.index) === highlighted) return;
    highlighted = Number(li.dataset.index);
    draw();
  });

  draw();
  if (options.autofocus !== false) input.focus();

  return {
    focus: () => input.focus(),
    blur: () => input.blur(),
    clear,
    hasQuery: () => Boolean(query.trim()),
  };
}
