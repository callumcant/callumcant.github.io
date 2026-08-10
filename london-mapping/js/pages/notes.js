import { loadAll, getState, addFieldNote } from "../data/store.js";
import { buildSchoolLevel } from "../data/rollups.js";
import { FIELD_NOTE_LEVELS } from "../config.js";
import { renderDataTable, formatDate, escapeHtml } from "../ui.js";
import { navigate } from "../router.js";

function subjectLabel(note, schoolsByUrn) {
  if (note.level === "School") {
    const school = schoolsByUrn.get(String(note.subject));
    return school ? school.schoolName : `URN ${note.subject}`;
  }
  return note.subject;
}

function subjectLink(note, schoolsByUrn) {
  if (note.level === "School") return `#/schools/${encodeURIComponent(note.subject)}`;
  if (note.level === "Branch") return `#/branches/${encodeURIComponent(note.subject)}`;
  if (note.level === "MAT") return `#/mats/${encodeURIComponent(note.subject)}`;
  return "#";
}

export async function renderList(container) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const schoolsByUrn = new Map(schools.map((s) => [String(s.urn), s]));
  const notes = [...state.fieldNotes].sort((a, b) => (a.date < b.date ? 1 : -1));

  container.innerHTML = `
    <div class="topbar">
      <h1>Field notes</h1>
      <a class="btn btn-primary" href="#/notes/new">+ Add note</a>
    </div>
    <div class="filter-bar">
      <input type="search" id="note-search" placeholder="Search notes" />
      <select id="note-level-filter">
        <option value="">All levels</option>
        ${FIELD_NOTE_LEVELS.map((l) => `<option value="${l}">${l}</option>`).join("")}
      </select>
    </div>
    <div class="card"><div id="notes-table"></div></div>
  `;

  const searchEl = container.querySelector("#note-search");
  const levelEl = container.querySelector("#note-level-filter");
  const tableEl = container.querySelector("#notes-table");

  const columns = [
    { key: "date", label: "Date", render: (r) => formatDate(r.date) },
    { key: "level", label: "Level" },
    { key: "subject", label: "Subject", render: (r) => `<a class="row-link" href="${subjectLink(r, schoolsByUrn)}">${escapeHtml(subjectLabel(r, schoolsByUrn))}</a>` },
    { key: "title", label: "Title" },
    { key: "note", label: "Note", wrap: true, render: (r) => escapeHtml(r.note.length > 140 ? r.note.slice(0, 140) + "…" : r.note) },
    { key: "author", label: "Author" },
  ];

  function applyFilters() {
    const q = searchEl.value.trim().toLowerCase();
    const filtered = notes.filter((n) => {
      if (levelEl.value && n.level !== levelEl.value) return false;
      if (q && !`${n.title} ${n.note} ${subjectLabel(n, schoolsByUrn)}`.toLowerCase().includes(q)) return false;
      return true;
    });
    renderDataTable(tableEl, columns, filtered, { defaultSort: "date", defaultDir: "desc" });
  }

  [searchEl, levelEl].forEach((el) => el.addEventListener("input", applyFilters));
  applyFilters();
}

export async function renderForm(container, { query }) {
  const state = await loadAll();
  const schools = buildSchoolLevel(state);
  const prefillLevel = query?.level && FIELD_NOTE_LEVELS.includes(query.level) ? query.level : "School";
  const prefillSubject = query?.subject || "";
  const branches = [...new Set(schools.map((s) => s.laName))].sort();
  const mats = [...new Set(schools.map((s) => s.trust).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="breadcrumb"><a href="#/notes">← Field notes</a></div>
    <div class="topbar"><h1>Add field note</h1></div>
    <form class="card" id="note-form">
      <div class="form-grid">
        <div class="field">
          <label>Level *</label>
          <select name="level" id="note-level">
            ${FIELD_NOTE_LEVELS.map((l) => `<option value="${l}" ${l === prefillLevel ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Subject *</label>
          <div id="subject-field"></div>
        </div>
        <div class="field">
          <label>Date *</label>
          <input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div class="field">
          <label>Author *</label>
          <input name="author" required placeholder="Your name" />
        </div>
        <div class="field span-2">
          <label>Title *</label>
          <input name="title" required />
        </div>
        <div class="field span-2">
          <label>Note</label>
          <textarea name="note" placeholder="Can include document links"></textarea>
        </div>
      </div>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary">Save note</button>
        <a class="btn" href="#/notes">Cancel</a>
      </div>
    </form>
  `;

  const subjectFieldEl = container.querySelector("#subject-field");
  const levelSelect = container.querySelector("#note-level");

  function renderSubjectField(level) {
    if (level === "School") {
      subjectFieldEl.innerHTML = `
        <input list="school-options" name="subject" required placeholder="Search school…" value="${escapeHtml(prefillSubject)}" />
        <datalist id="school-options">
          ${schools.map((s) => `<option value="${s.urn}" label="${escapeHtml(s.schoolName)}">${escapeHtml(s.schoolName)} (URN ${s.urn})</option>`).join("")}
        </datalist>
        <div class="hint">Enter the school's URN — start typing the name to find it.</div>`;
    } else if (level === "Branch") {
      subjectFieldEl.innerHTML = `
        <select name="subject" required>
          <option value="">Select…</option>
          ${branches.map((b) => `<option value="${escapeHtml(b)}" ${b === prefillSubject ? "selected" : ""}>${escapeHtml(b)}</option>`).join("")}
        </select>`;
    } else {
      subjectFieldEl.innerHTML = `
        <select name="subject" required>
          <option value="">Select…</option>
          ${mats.map((m) => `<option value="${escapeHtml(m)}" ${m === prefillSubject ? "selected" : ""}>${escapeHtml(m)}</option>`).join("")}
        </select>`;
    }
  }
  renderSubjectField(prefillLevel);
  levelSelect.addEventListener("change", () => renderSubjectField(levelSelect.value));

  container.querySelector("#note-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addFieldNote({
      date: fd.get("date"),
      level: fd.get("level"),
      subject: fd.get("subject").trim(),
      title: fd.get("title").trim(),
      note: fd.get("note").trim(),
      author: fd.get("author").trim(),
    });
    navigate("/notes");
  });
}
