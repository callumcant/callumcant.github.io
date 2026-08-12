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
 * @param {Array} items    [{ name, summary, href, featured }]
 *                         `href` is a full hash target, already encoded.
 *                         `featured` items are the empty-input starting list.
 * @param {Object} options { placeholder, label, defaultLabel, limit }
 */
export function renderSearchSelect(container, items, options = {}) {
  const id = `search-select-${nextId++}`;
  const limit = options.limit ?? MAX_RESULTS;
  const label = options.label || "Search";
  const defaultLabel = options.defaultLabel || "Suggestions";
  const featured = items.filter((i) => i.featured);

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
      <p class="search-select-hint" id="${id}-hint"></p>
      <ul class="search-select-list" id="${id}-list" role="listbox" aria-label="${escapeHtml(label)}"></ul>
      <div class="sr-only" role="status" aria-live="polite" id="${id}-status"></div>
    </div>
  `;

  const input = container.querySelector(`#${id}-input`);
  const list = container.querySelector(`#${id}-list`);
  const hint = container.querySelector(`#${id}-hint`);
  const status = container.querySelector(`#${id}-status`);

  // Substring, not prefix. "Hamlets" should find "Tower Hamlets (&CoL)", and
  // "Romero" should find "Oscar Romero" — people search by the distinctive
  // part of a name, which is rarely the first word.
  function matches() {
    const q = query.trim().toLowerCase();
    if (!q) return featured;
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, limit);
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

    list.innerHTML = results.map((item, index) => `
      <li class="search-result${index === highlighted ? " highlighted" : ""}"
          id="${id}-opt-${index}"
          role="option"
          aria-selected="${index === highlighted ? "true" : "false"}"
          data-index="${index}">
        <span class="search-result-name">${escapeHtml(item.name)}</span>
        <span class="search-result-summary">${escapeHtml(item.summary || "")}</span>
      </li>`).join("");

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
    if (item) window.location.hash = item.href;
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
      query = "";
      input.value = "";
      highlighted = 0;
      draw();
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
}
