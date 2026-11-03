import { allBooks, archiveBook, archiveObsolete, bookCopies, findIsbns, reviewBook, saveBook, setArchiveDetails, setCopies, setIsbn, uploadPicture, type BookInput } from "../api/staff";
import { formatDateTime } from "../core/format";
import { current, isAdmin } from "../core/session";
import { publicSettings } from "../api/content";
import { loansByStatus } from "../api/loans";
import { actions, debounce, formData, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { formatIsbn, isIsbnShape, isValidIsbn, normalizeIsbn } from "../core/isbn";
import { authorsOf, joinAuthors } from "../core/authors";
import { confirmBox, openModal } from "../core/modal";
import { fail, ok } from "../core/toast";
import { cover, empty, field, loading, selectField } from "../ui/components";
import type { Book } from "../types";
import { openedWith, type PanelTab } from "./tab";

const MAX_ROWS = 60;
const THIS_YEAR = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date()));
const DEFAULT_LOCATIONS = ["Archive Room", "Storage Room A", "Storage Room B", "Donated", "Disposed"];

// what an edit changes, field by field: [what, before, after]
const LABELS: [keyof BookInput, string][] = [
  ["isbn", "ISBN"], ["title", "Title"], ["author", "Authors"], ["edition", "Edition / version"], ["category", "Subject"], ["material", "Material"],
  ["genre", "Genre"], ["publisher", "Publisher"], ["published", "First published"], ["language", "Language"], ["shelf", "Shelf"], ["copies", "Copies"],
  ["obsolete_year", "Obsolete year"], ["synopsis", "Summary"], ["cover_url", "Cover picture"],
];
function bookChanges(before: Book, after: BookInput, newCover: boolean): [string, string, string][] {
  const show = (key: keyof BookInput, value: unknown) => {
    if (value === null || value === undefined || value === "") return "(empty)";
    if (key === "isbn") return formatIsbn(String(value));
    if (key === "material") return value === "fiction" ? "Fiction" : "Circulation / Reserve";
    const text = String(value);
    return text.length > 70 ? `${text.slice(0, 70)}...` : text;
  };
  const out: [string, string, string][] = [];
  for (const [key, label] of LABELS) {
    if (!(key in after)) continue;
    const was = key === "author" ? joinAuthors(authorsOf(before)) : (before as unknown as Record<string, unknown>)[key];
    const now = after[key];
    if (String(was ?? "").trim() !== String(now ?? "").trim()) out.push([label, show(key, was), show(key, now)]);
  }
  if (newCover) out.push(["Cover picture", "current picture", "a new uploaded picture"]);
  return out;
}

// the first of the two confirmations: every change, before and after
function reviewChanges(title: string, changes: [string, string, string][]): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const modal = openModal("Review your changes", html`
      <p>You are changing <strong>${title}</strong>:</p>
      <ul class="change-list">${changes.map(([what, was, now]) => html`<li><span class="change-list__what">${what}</span><span class="change-list__was">${was}</span>${icon("chevron-right")}<span class="change-list__now">${now}</span></li>`)}</ul>`, {
      footer: html`<button class="btn btn--quiet" type="button" data-close>Go back</button><button class="btn" type="button" data-next>Continue</button>`,
    });
    modal.root.querySelector("[data-next]")?.addEventListener("click", () => { answered = true; modal.close(); resolve(true); });
    new MutationObserver((_, observer) => {
      if (!modal.root.isConnected) { observer.disconnect(); if (!answered) resolve(false); }
    }).observe(document.body, { childList: true });
  });
}
type Sort = "title" | "category" | "copies" | "newest";
type Quick = "" | "free" | "full" | "nocover" | "noisbn";
// the "/" shortcut of the Books tab currently on screen; replaced each time the tab is drawn again
let slashKey: AbortController | null = null;

export const books: PanelTab = {
  id: "books",
  label: "Books",
  icon: "book",
  async render(root, query = "") {
    let all: Book[] = [];
    let onLoan = new Map<string, number>();
    let term = query;
    let category = "";
    let sort: Sort = "title";
    let viewMode: "table" | "covers" = "table";
    let show: "active" | "archived" | "all" | "review" = "active";
    // the tiles double as quick filters: free copies, fully borrowed, missing cover, missing ISBN
    let quick: Quick = "";
    let desc = false;
    let limit = MAX_ROWS;
    // a book a staff member added waits for an admin (tools/book-approval.sql); it is kept out of the catalog until approved
    const waiting = (b: Book) => b.approval_status === "pending" || b.approval_status === "revision";
    const shelved = (b: Book) => !!b.archived && !waiting(b);
    const submitterName = (b: Book) => b.submitter ? (b.submitter.full_name || b.submitter.username) : "a staff member";
    let locations: string[] = DEFAULT_LOCATIONS;
    // a newer column (edition, obsolete year...) is there once its SQL is run; with no books yet, assume it is (saveBook drops it if not)
    const hasColumn = (column: string) => !all.length || column in all[0];

    const inUse = (b: Book) => onLoan.get(b.id) ?? 0;
    const bar = (b: Book) => html`<span class="copies" title="${b.copies - inUse(b)} on the shelf, ${inUse(b)} on loan"><span class="copies__bar"><i style="--w:${b.copies ? Math.round((inUse(b) / b.copies) * 100) : 0}%"></i></span><small>${b.copies - inUse(b)} / ${b.copies}</small></span>`;

    const archiveBadge = (b: Book) => b.approval_status === "pending" ? html`<span class="badge badge--warning">${icon("clock")} waiting for approval</span>`
      : b.approval_status === "revision" ? html`<span class="badge badge--danger">${icon("edit")} needs revision</span>`
      : !b.archived ? ""
      : b.archive_location ? html`<span class="badge">${icon("archive")} ${b.archive_location}${b.archive_reason === "obsolete" ? " · obsolete" : ""}</span>`
      : hasColumn("archive_location") ? html`<span class="badge badge--warning">archived · no location</span>` : html`<span class="badge">archived</span>`;

    // "obsolete 2031", in red when that is this year or next (it will be archived soon)
    const obsoleteNote = (b: Book) => !b.obsolete_year ? ""
      : !b.archived && b.obsolete_year <= THIS_YEAR + 1 ? html` · <span class="text-danger">obsolete ${b.obsolete_year}</span>` : ` · obsolete ${b.obsolete_year}`;

    const free = (b: Book) => Math.max(b.copies - inUse(b), 0);
    const quickTest: Record<Exclude<Quick, "">, (b: Book) => boolean> = {
      free: (b) => free(b) > 0, full: (b) => b.copies > 0 && inUse(b) >= b.copies, nocover: (b) => !b.cover_url, noisbn: (b) => !b.isbn,
    };
    const QUICK_LABEL = { free: "Copies on the shelf", full: "Fully borrowed", nocover: "Missing cover", noisbn: "Missing ISBN" };
    const SHOW_LABEL = { active: "Active", review: "Waiting for approval", archived: "Archive", all: "All books" };
    const setShow = (value: typeof show) => {
      show = value;
      limit = MAX_ROWS;
      root.querySelectorAll<HTMLElement>("[data-show]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.show === value)));
    };
    // a column header sorts by it; pressing the same one again flips the order
    const sortHead = (key: Sort, label: string) => html`<th aria-sort="${sort === key ? (desc ? "descending" : "ascending") : "none"}"><button class="th-sort" type="button" data-action="sort" data-sort="${key}">${label}<span class="th-sort__arrow" aria-hidden="true">${sort === key ? (desc ? "▼" : "▲") : "↕"}</span></button></th>`;

    const draw = () => {
      const active = all.filter((b) => !b.archived);
      // archived books nobody has given a place yet (usually ones that just reached their obsolete year)
      const homeless = hasColumn("archive_location") ? all.filter((b) => shelved(b) && !b.archive_location) : [];
      // approvals: admins see what waits for them; staff see their own books that came back with a note
      const pendingCount = all.filter((b) => b.approval_status === "pending").length;
      const mineBack = all.filter((b) => b.approval_status === "revision" && b.submitted_by === current().profile?.id);
      mount(root.querySelector<HTMLElement>("#approvalNotice")!, isAdmin() && pendingCount
        ? html`<div class="alert alert--info px px--info" role="status">${icon("clock")}<span class="grow"><strong>${pendingCount === 1 ? "1 book is" : `${pendingCount} books are`} waiting for your approval.</strong> Staff added ${pendingCount === 1 ? "it" : "them"}; ${pendingCount === 1 ? "it stays" : "they stay"} out of the catalog until you decide.</span><button class="btn btn--sm" type="button" data-action="show-review">Review now</button></div>`
        : mineBack.length
          ? html`<div class="alert alert--danger px px--danger" role="status">${icon("edit")}<span class="grow"><strong>${mineBack.length === 1 ? "1 of your books needs" : `${mineBack.length} of your books need`} changes</strong> before an admin can approve ${mineBack.length === 1 ? "it" : "them"}. Open it, read the note, fix it and save to send it back.</span><button class="btn btn--sm" type="button" data-action="show-review">See ${mineBack.length === 1 ? "it" : "them"}</button></div>`
          : "");
      mount(root.querySelector<HTMLElement>("#archiveNotice")!, homeless.length ? html`<div class="alert alert--warning px px--warning" role="status">${icon("archive")}<span class="grow"><strong>${homeless.length === 1 ? "1 archived book has" : `${homeless.length} archived books have`} no location yet.</strong> Choose where ${homeless.length === 1 ? "it is" : "each one is"} kept.</span><button class="btn btn--sm" type="button" data-action="locate">Choose locations</button></div>` : "");
      const counts = { active: active.length, archived: all.filter(shelved).length, all: all.length, review: all.filter(waiting).length };
      root.querySelectorAll<HTMLElement>("[data-show-count]").forEach((c) => { c.textContent = String(counts[c.dataset.showCount as keyof typeof counts]); });
      const totalCopies = active.reduce((sum, b) => sum + b.copies, 0);
      const onShelf = active.reduce((sum, b) => sum + free(b), 0);
      const fullCount = active.filter(quickTest.full).length;
      const noCover = active.filter(quickTest.nocover).length;
      const noIsbn = active.filter(quickTest.noisbn).length;
      const tile = (key: Quick, label: string, value: number, iconName: string, note: string, tone = "") => html`
        <button class="tile book-tile" type="button" data-action="quick" data-quick="${key}" data-tone="${tone}" aria-pressed="${String(quick === key)}">
          <span class="book-tile__icon">${icon(iconName)}</span><span class="tile__label">${label}</span><span class="tile__value">${value}</span><span class="tile__note">${note}</span></button>`;
      mount(root.querySelector<HTMLElement>("#bookTiles")!, html`
        ${tile("", "Titles", active.length, "book", `${totalCopies} copies in all`)}
        ${tile("free", "On the shelf", onShelf, "shelf", totalCopies ? `${Math.round((onShelf / totalCopies) * 100)}% of copies free` : "No copies yet", "success")}
        ${tile("full", "Fully borrowed", fullCount, "clock", fullCount ? "Every copy is out" : "None right now", fullCount ? "warning" : "")}
        ${tile("nocover", "Missing cover", noCover, "image", noCover ? "Add a picture" : "All have covers", noCover ? "warning" : "success")}
        ${tile("noisbn", "Missing ISBN", noIsbn, "tag", noIsbn ? "Find them online" : "All have ISBNs", noIsbn ? "danger" : "success")}`);
      const needle = term.toLowerCase();
      // an ISBN matches with or without its dashes
      const isbnNeedle = normalizeIsbn(term);
      const matches = (b: Book) => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(needle) || (!!isbnNeedle && !!b.isbn?.includes(isbnNeedle));
      let rows = all.filter((b) => (!needle || matches(b)) && (!category || b.category === category) && (!quick || quickTest[quick](b)) && (show === "all" || (show === "review" ? waiting(b) : show === "archived" ? shelved(b) : !b.archived)));
      rows = [...rows].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "category" ? a.category.localeCompare(b.category) || a.title.localeCompare(b.title) : sort === "copies" ? b.copies - a.copies : String((b as Book & { created_at?: string }).created_at ?? "").localeCompare(String((a as Book & { created_at?: string }).created_at ?? "")));
      if (desc) rows.reverse();
      const filters = [quick && QUICK_LABEL[quick], category, term && `“${term}”`].filter(Boolean) as string[];
      mount(root.querySelector<HTMLElement>("#bookCount")!, html`<strong>${rows.length === 1 ? "1 book" : `${rows.length} books`}</strong> in ${SHOW_LABEL[show]}${filters.map((x) => html`<span class="result-count__tag">${x}</span>`)}${filters.length ? html`<button class="link-button" type="button" data-action="clear-filters">Clear filters</button>` : ""}`);
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      if (!rows.length) { mount(body, show === "archived" ? empty("Nothing in the archive", "Archived books and books past their obsolete year show up here.", "archive") : empty("No books", "Add the first one or change the search.", "book")); return; }
      const shown = rows.slice(0, limit);
      mount(body, html`${viewMode === "table"
        ? html`<div class="table-wrap"><table class="table table--stack book-table"><thead><tr>${sortHead("title", "Book")}${sortHead("category", "Subject")}${sortHead("copies", "Copies")}<th><span class="visually-hidden">Actions</span></th></tr></thead><tbody>
          ${shown.map((b) => html`<tr class="book-row" data-action="edit" data-id="${b.id}" title="Click to edit">
            <td><div class="book-cell">${cover(b)}<div class="book-cell__text"><span class="table__title">${b.title}</span> ${archiveBadge(b)}<br><span class="table__sub">${b.isbn ? `ISBN ${formatIsbn(b.isbn)}` : html`<span class="badge badge--warning">No ISBN</span>`} · ${b.author}${b.edition ? ` · ${b.edition}` : ""}${obsoleteNote(b)}</span></div></div></td>
            <td data-label="Subject"><span class="badge">${b.category || "None"}</span></td><td data-label="Copies">${bar(b)}</td>
            <td><div class="table__actions">
              <button class="btn btn--sm btn--quiet" data-action="edit" data-id="${b.id}">${icon("edit")} Edit</button>
              ${waiting(b)
                ? (isAdmin() && b.approval_status === "pending" ? html`<button class="btn btn--sm" data-action="review" data-id="${b.id}">${icon("check")} Review</button>` : "")
                : html`<button class="btn btn--sm btn--quiet" data-action="archive" data-id="${b.id}">${icon("archive")} ${b.archived ? "Restore" : "Archive"}</button>`}</div>
              ${waiting(b) ? html`<span class="table__sub">added by ${submitterName(b)}${b.review_note && b.approval_status === "revision" ? html` · <em>"${b.review_note}"</em>` : ""}</span>` : ""}</td></tr>`)}</tbody></table></div>`
        : html`<div class="cover-grid">${shown.map((b) => html`<article class="cover-tile">
            <div class="cover-tile__art">${cover(b)}${archiveBadge(b)}
              <div class="cover-tile__actions"><button class="btn btn--sm" type="button" data-action="edit" data-id="${b.id}">${icon("edit")} Edit</button>${waiting(b) ? "" : html`<button class="btn btn--sm btn--quiet" type="button" data-action="archive" data-id="${b.id}" title="${b.archived ? "Restore" : "Archive"}">${icon("archive")}<span class="visually-hidden">${b.archived ? "Restore" : "Archive"}</span></button>`}</div></div>
            <strong>${b.title}</strong><small>${b.author}</small>${bar(b)}</article>`)}</div>`}
        ${rows.length > limit ? html`<div class="book-more"><span>Showing ${shown.length} of ${rows.length}</span><button class="btn btn--quiet btn--sm" type="button" data-action="more">${icon("chevron-down")} Show ${Math.min(MAX_ROWS, rows.length - limit)} more</button></div>` : ""}`);
    };

    const reload = async () => {
      const [list, loans] = await Promise.all([allBooks(), loansByStatus(["borrowed"], 5000)]);
      all = list;
      onLoan = new Map();
      for (const l of loans) onLoan.set(l.book_id, (onLoan.get(l.book_id) ?? 0) + 1);
      const cats = [...new Set(all.map((b) => b.category).filter(Boolean))].sort();
      const select = root.querySelector<HTMLSelectElement>("#bookCategory")!;
      select.replaceChildren(new Option("All subjects", ""), ...cats.map((c) => new Option(c, c)));
      select.value = category;
      draw();
    };
    const attempt = async (work: () => Promise<void>, done: string) => {
      try { await work(); ok(done); await reload(); } catch (error) { fail(friendly(error)); }
    };

    // ---- add / edit: suggestions from what already exists, a duplicate warning, a copies counter that cannot go below what is on loan
    const editor = (book: Book | null) => {
      const unique = (pick: (b: Book) => string) => [...new Set(all.map(pick).filter(Boolean))].sort();
      const modal = openModal(book ? (book.approval_status === "revision" ? "Fix and resubmit" : "Edit book") : "Add a book", html`<form class="form" id="bookForm" novalidate>
        ${book?.approval_status === "revision" && book.review_note ? html`<div class="alert alert--danger px px--danger">${icon("edit")}<span><strong>The admin asked for changes:</strong> "${book.review_note}". Saving sends the book back for approval.</span></div>` : ""}
        ${!book && !isAdmin() && hasColumn("approval_status") ? html`<div class="alert alert--info px px--info">${icon("info")}<span>An admin checks every new book before it goes in the catalog. You will get a notification when it is approved or needs changes.</span></div>` : ""}
        ${field("isbn", "ISBN", { value: book?.isbn ?? "", required: !book || !!book.isbn, hint: "The 10 or 13 digit number on the back cover or copyright page. Digits only (an ISBN-10 may end in X).", placeholder: "9780306406157", attrs: 'inputmode="numeric" autocomplete="off" spellcheck="false"' })}
        ${field("title", "Title", { value: book?.title ?? "", required: true })}
        <div class="alert alert--warning px px--warning" id="dupWarning" hidden>${icon("info")}<span>A book with this title, author and edition already exists.</span></div>
        <div class="field" data-field="authors"><span class="field__label">Authors *</span>
          <div class="author-list" id="authorList"></div>
          <datalist id="authorNames">${[...new Set(all.flatMap(authorsOf))].sort().map((v) => html`<option value="${v}"></option>`)}</datalist>
          <button class="btn btn--sm btn--secondary" type="button" id="addAuthor">${icon("plus")} Add another author</button>
          <span class="field__hint">One name per box, in the order printed on the book. Editors and translators can go here too, e.g. "Edward FitzGerald (translator)".</span></div>
        <div class="form__row">
          ${field("edition", "Edition / version", { value: book?.edition ?? "", placeholder: "e.g. 2nd edition, Revised 2015, Anvil Classics", attrs: 'maxlength="80"', hint: "Leave empty if there is only one edition." })}
          <div class="field" data-field="category"><label class="field__label" for="f-category">Subject</label><input class="input" id="f-category" name="category" list="categoryList" value="${book?.category ?? ""}"><datalist id="categoryList">${unique((b) => b.category).map((v) => html`<option value="${v}"></option>`)}</datalist></div>
        </div>
        ${hasColumn("obsolete_year") ? field("obsolete_year", "Obsolete year", { value: String(book?.obsolete_year ?? THIS_YEAR + 5), required: true, placeholder: String(THIS_YEAR + 5), attrs: 'inputmode="numeric" autocomplete="off" data-year', hint: `From 1 January of that year the book is archived by itself and you choose where it is kept. Usually 5 years: ${THIS_YEAR + 5}.` }) : ""}
        ${selectField("material", "Material (sets the loan period and overdue fine)", [{ value: "fiction", label: "Fiction" }, { value: "circulation", label: "Circulation / Reserve" }], book?.material ?? "circulation", true, "")}
        <div class="form__row">${field("genre", "Genre", { value: book?.genre ?? "" })}${field("publisher", "Publisher", { value: book?.publisher ?? "" })}</div>
        <div class="form__row">${field("published", "First published", { value: book?.published ?? "", placeholder: "e.g. 1998", hint: book?.published && !/^\d{4}$/.test(book.published) ? "A 4-digit year. The current text stays if you leave it as it is." : "The year, 4 digits.", attrs: 'inputmode="numeric" autocomplete="off" data-year' })}${field("language", "Language", { value: book?.language ?? "English" })}</div>
        <div class="form__row">
          <div class="field" data-field="shelf"><label class="field__label" for="f-shelf">Shelf</label><input class="input" id="f-shelf" name="shelf" list="shelfList" value="${book?.shelf ?? "Main Library"}"><datalist id="shelfList">${unique((b) => b.shelf).map((v) => html`<option value="${v}"></option>`)}</datalist></div>
          <div class="field" data-field="copies"><label class="field__label" for="f-copies">Copies</label>
            <div class="stepper"><button class="btn btn--sm btn--quiet" type="button" data-step="-1" aria-label="One fewer">-</button><input class="input" id="f-copies" name="copies" type="number" min="${book ? inUse(book) : 0}" value="${book?.copies ?? 3}"><button class="btn btn--sm btn--quiet" type="button" data-step="1" aria-label="One more">+</button></div>
            <span class="field__hint">${book ? `${inUse(book)} on loan right now, so it cannot go below that.` : ""}</span></div>
        </div>
        ${book ? html`<div class="field"><span class="field__label">Copy codes</span><div class="cluster" id="copyCodes"><span class="table__sub">Loading...</span></div><span class="field__hint">Each copy's own code. Write it inside the book or on its barcode label.</span></div>` : ""}
        <div class="field" id="reasonField" hidden><label class="field__label" for="f-reason">Why are the copies changing?</label><input class="input" id="f-reason" name="reason" placeholder="For example: 2 new copies donated"></div>
        <div class="field"><label class="field__label" for="f-synopsis">Summary</label><textarea class="textarea" id="f-synopsis" name="synopsis">${book?.synopsis ?? ""}</textarea></div>
        <div class="field"><span class="field__label">Cover picture</span>
          <label class="file-drop" id="coverDrop" for="coverFile">${icon("image", "icon--lg")}<span id="coverName">Drag a picture here or click to choose (JPG, PNG or WEBP)</span></label>
          <input class="visually-hidden" type="file" id="coverFile" accept="image/png,image/jpeg,image/webp">
          <input class="input" id="f-cover" name="cover_url" value="${book?.cover_url ?? ""}" placeholder="...or paste a picture link"></div>
      </form>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button>${book ? "" : html`<button class="btn btn--secondary" type="button" data-save="again">Save and add another</button>`}<button class="btn" type="button" data-save="close">Save</button>`,
      });
      const formEl = modal.root.querySelector<HTMLFormElement>("#bookForm")!;
      const $ = <T extends HTMLElement>(sel: string) => formEl.querySelector<T>(sel)!;
      const copies = $<HTMLInputElement>("#f-copies");
      const isbnBox = $<HTMLInputElement>("#f-isbn");
      const isbnHint = isbnBox.closest(".field")!.querySelector<HTMLElement>(".field__hint")!;
      const isbnText = isbnHint.textContent ?? "";
      isbnBox.addEventListener("input", () => {
        isbnBox.value = isbnBox.value.toUpperCase().replace(/[^0-9X]/g, "").replace(/X(?=.)/g, "").slice(0, 13);
        const v = isbnBox.value;
        isbnHint.textContent = !v ? isbnText : v.length !== 10 && v.length !== 13 ? `${v.length} digits so far: an ISBN has 10 or 13.` : isValidIsbn(v) ? "Looks right." : "Saved as typed. Its last digit does not match the usual check, so double-check the number on the book.";
        isbnHint.classList.toggle("field__hint--warn", !!v && (v.length === 10 || v.length === 13) && !isValidIsbn(v));
      });
      formEl.querySelectorAll<HTMLInputElement>("[data-year]").forEach((box) => box.addEventListener("input", () => {
        // a legacy text like "1875-1877" stays untouched until someone types in the box
        box.value = box.value.replace(/\D/g, "").slice(0, 4);
      }));
      const codes = formEl.querySelector<HTMLElement>("#copyCodes");
      if (book && codes) void bookCopies(book.id)
        .then((list) => mount(codes, list.length ? html`${list.map((c) => html`<span class="badge">${c.code}</span>`)}` : html`<span class="table__sub">No copies yet.</span>`))
        .catch(() => mount(codes, html`<span class="table__sub">Run tools/add-isbn.sql to give copies their codes.</span>`));
      // the authors: one box each, added and removed freely, at least one
      const authorBox = $("#authorList");
      const drawAuthors = (names: string[]) => {
        mount(authorBox, html`${(names.length ? names : [""]).map((name, i) => html`<div class="author-row">
          <span class="author-row__n">${i + 1}</span>
          <input class="input" name="author_${i}" list="authorNames" value="${name}" aria-label="Author ${i + 1}" maxlength="120" autocomplete="off">
          <button class="btn btn--sm btn--quiet" type="button" data-drop-author="${i}" aria-label="Remove author ${i + 1}" ${names.length > 1 ? "" : raw("disabled")}>${icon("cross")}</button></div>`)}`);
      };
      const typedAuthors = () => [...authorBox.querySelectorAll<HTMLInputElement>("input")].map((input) => input.value);
      const cleanAuthors = () => [...new Set(typedAuthors().map((name) => name.trim().replace(/\s+/g, " ")).filter(Boolean))];
      drawAuthors(book ? authorsOf(book) : [""]);
      $("#addAuthor").addEventListener("click", () => {
        if (typedAuthors().length >= 10) return fail("Up to 10 authors.");
        drawAuthors([...typedAuthors(), ""]);
        [...authorBox.querySelectorAll<HTMLInputElement>("input")].pop()?.focus();
      });
      authorBox.addEventListener("click", (event) => {
        const drop = (event.target as Element).closest<HTMLElement>("[data-drop-author]");
        if (!drop) return;
        const names = typedAuthors();
        names.splice(Number(drop.dataset.dropAuthor), 1);
        drawAuthors(names);
        dup();
      });

      const dup = () => {
        const t = ($<HTMLInputElement>("[name=title]").value).trim().toLowerCase();
        const a = joinAuthors(cleanAuthors()).toLowerCase();
        const e = $<HTMLInputElement>("[name=edition]").value.trim().toLowerCase();
        $("#dupWarning").hidden = !(t && all.some((b) => b.id !== book?.id && b.title.toLowerCase() === t && joinAuthors(authorsOf(b)).toLowerCase() === a && (b.edition ?? "").trim().toLowerCase() === e));
      };
      formEl.addEventListener("input", dup);
      const reason = () => { $("#reasonField").hidden = !book || Number(copies.value) === book.copies; };
      copies.addEventListener("input", reason);
      formEl.querySelectorAll<HTMLElement>("[data-step]").forEach((b) => b.addEventListener("click", () => {
        copies.value = String(Math.max(Number(copies.min) || 0, (Number(copies.value) || 0) + Number(b.dataset.step)));
        reason();
      }));
      const fileInput = $<HTMLInputElement>("#coverFile");
      const drop = $("#coverDrop");
      const pick = (file: File | undefined) => {
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return fail("Please choose a JPG, PNG or WEBP picture.");
        const transfer = new DataTransfer(); transfer.items.add(file); fileInput.files = transfer.files;
        $("#coverName").textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      };
      fileInput.addEventListener("change", () => pick(fileInput.files?.[0]));
      for (const ev of ["dragenter", "dragover"]) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); });
      for (const ev of ["dragleave", "drop"]) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); });
      drop.addEventListener("drop", (e) => pick((e as DragEvent).dataTransfer?.files?.[0]));

      modal.root.querySelectorAll<HTMLElement>("[data-save]").forEach((button) => button.addEventListener("click", async () => {
        const d = formData(formEl);
        const isbn = normalizeIsbn(d.isbn ?? "");
        // a book already on the shelf may predate ISBNs (before 1970); new books always need one
        if (!isbn && (!book || book.isbn)) return fail("Enter the book's ISBN.");
        if (isbn && !isIsbnShape(isbn)) return fail(`An ISBN has 10 or 13 digits; this one has ${isbn.length}.`);
        const published = (d.published ?? "").trim();
        // a new value must be a year; an older book's text (like "1875-1877") may stay as it is
        if (published && published !== (book?.published ?? "") && !/^\d{4}$/.test(published)) return fail("Write the first published year as 4 digits, for example 1998.");
        if (/^\d{4}$/.test(published) && Number(published) > THIS_YEAR) return fail(`The first published year cannot be after ${THIS_YEAR}.`);
        if (isbn && all.some((b) => b.id !== book?.id && b.isbn === isbn)) return fail("Another book already has that ISBN.");
        if (!d.title) return fail("A book needs a title.");
        const authors = cleanAuthors();
        if (!authors.length) return fail("Add at least one author.");
        const edition = (d.edition ?? "").trim().replace(/\s+/g, " ");
        const obsolete = Number(d.obsolete_year);
        if (d.obsolete_year !== undefined) {
          if (!/^\d{4}$/.test(d.obsolete_year) || obsolete < 1900 || obsolete > 2200) return fail(`Enter the obsolete year as a 4-digit year, for example ${THIS_YEAR + 5}.`);
          if (!book && obsolete < THIS_YEAR) return fail(`A new book's obsolete year cannot be in the past (it is ${THIS_YEAR} now).`);
          if (book && !book.archived && obsolete <= THIS_YEAR && !(await confirmBox("Archive this book now?", `An obsolete year of ${obsolete} means "${book.title}" is obsolete already. It will be moved to the archive and you will choose where it is kept.`, "Yes, that is right"))) return;
        }
        // the hidden id that loans and history point to: kept as it is for existing books, made from the ISBN for new ones
        const id = book?.id ?? `isbn-${isbn}`;
        if (!book && all.some((b) => b.id === id)) return fail("Another book already has that ISBN.");
        const wanted = Number(d.copies) || 0;
        if (book && wanted < inUse(book)) return fail(`Copies cannot be lower than the ${inUse(book)} on loan.`);
        if (book && wanted !== book.copies && !d.reason) return fail("Please say why the copies are changing.");
        const file = fileInput.files?.[0];
        // only send the newer columns once their SQL has been run (the loaded books then have them)
        const has = hasColumn;
        const draft: BookInput = {
          id, isbn: isbn || null, title: d.title, author: joinAuthors(authors), category: d.category ?? "", genre: d.genre ?? "", published: d.published ?? "",
          publication_label: book?.publication_label ?? "FIRST PUBLISHED", publisher: d.publisher ?? "", language: d.language || "English",
          synopsis: d.synopsis ?? "", copies: wanted, shelf: d.shelf || "Main Library", cover_url: d.cover_url || null,
          ...(has("material") ? { material: d.material === "fiction" ? "fiction" as const : "circulation" as const } : {}),
          ...(has("authors") ? { authors } : {}),
          ...(has("edition") ? { edition: edition || null } : {}),
          ...(has("obsolete_year") && d.obsolete_year !== undefined ? { obsolete_year: obsolete } : {}),
        };
        // editing: show exactly what changes, then ask once more before it goes live for everyone
        if (book) {
          const changes = bookChanges(book, draft, !!file);
          if (!changes.length) { ok("Nothing changed."); modal.close(); return; }
          if (!(await reviewChanges(book.title, changes))) return;
          if (!(await confirmBox("Are you sure?", `The changes to "${book.title}" show in the catalog, on tickets and in the game for everyone right away.`, "Yes, save the changes"))) return;
        }
        try {
          const cover_url = file ? await uploadPicture("covers", file) : draft.cover_url;
          const input: BookInput = { ...draft, cover_url };
          if (book && wanted !== book.copies) {
            await saveBook({ ...input, copies: book.copies }, false);
            await setCopies(book.id, wanted, d.reason);
          } else await saveBook(input, !book);
          ok(!book && !isAdmin() && hasColumn("approval_status") ? "Sent to an admin for approval. It goes in the catalog once approved."
            : book?.approval_status === "revision" && !isAdmin() ? "Resubmitted. An admin will check it again." : "Saved.");
          modal.close();
          await reload();
          await sweepObsolete();
          if (button.dataset.save === "again") editor(null);
        } catch (error) { fail(friendly(error)); }
      }));
    };

    // ---- approval: the admin sees everything about the book, then approves it or sends it back with a note
    const review = (b: Book) => {
      const facts: [string, string][] = [["ISBN", b.isbn ? formatIsbn(b.isbn) : "(none)"], ["Authors", b.author], ["Edition", b.edition ?? ""], ["Subject", b.category], ["Material", b.material === "fiction" ? "Fiction" : b.material ? "Circulation / Reserve" : ""],
        ["Genre", b.genre], ["Publisher", b.publisher], ["First published", b.published], ["Language", b.language], ["Shelf", b.shelf], ["Copies", String(b.copies)], ["Obsolete year", b.obsolete_year ? String(b.obsolete_year) : ""],
        ["Added by", submitterName(b)], ["Added on", b.created_at ? formatDateTime(b.created_at) : ""]];
      const modal = openModal("Review this book", html`
        <div class="book-detail">${cover(b)}<div>
          <h3 class="review__title">${b.title}</h3>
          <dl class="book-detail__facts">${facts.filter(([, v]) => v).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
          ${b.synopsis ? html`<p class="text-soft">${b.synopsis}</p>` : ""}</div></div>
        <div class="field"><label class="field__label" for="reviewNote">Note to ${submitterName(b)}</label>
          <textarea class="textarea" id="reviewNote" rows="3" maxlength="500" placeholder="Needed when you ask for a revision, e.g. 'The ISBN is for another edition; please check the back cover.'"></textarea></div>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Later</button><button class="btn btn--secondary" type="button" data-decide="revise">${icon("edit")} Ask for revision</button><button class="btn" type="button" data-decide="approve">${icon("check")} Approve</button>`,
      });
      modal.root.querySelectorAll<HTMLButtonElement>("[data-decide]").forEach((button) => button.addEventListener("click", async () => {
        const decision = button.dataset.decide as "approve" | "revise";
        const note = modal.root.querySelector<HTMLTextAreaElement>("#reviewNote")!.value.trim();
        if (decision === "revise" && !note) { fail("Write what needs to change, so the staff member knows what to fix."); modal.root.querySelector<HTMLTextAreaElement>("#reviewNote")!.focus(); return; }
        if (decision === "approve" && !(await confirmBox("Approve this book?", `"${b.title}" goes into the catalog for students right away.`, "Approve"))) return;
        button.disabled = true;
        try {
          await reviewBook(b.id, decision, note);
          ok(decision === "approve" ? `Approved. "${b.title}" is in the catalog now.` : `Sent back to ${submitterName(b)} with your note.`);
          modal.close();
          await reload();
          if (!all.some(waiting)) { show = "active"; const select = root.querySelector<HTMLSelectElement>("#bookShow"); if (select) select.value = "active"; draw(); }
        } catch (error) { fail(friendly(error)); button.disabled = false; }
      }));
    };

    // ---- the archive: every archived book gets a place (the list in Settings, or any place typed in)
    const placeOptions = () => html`<datalist id="archivePlaces">${[...new Set([...locations, ...all.map((b) => b.archive_location ?? "").filter(Boolean)])].sort().map((p) => html`<option value="${p}"></option>`)}</datalist>`;

    const archive = (b: Book) => new Promise<void>((resolve) => {
      const ask = hasColumn("archive_location");
      let done = false;
      const modal = openModal("Archive this book", html`
        <p>"<strong>${b.title}</strong>" leaves the catalog. Its loan history is kept and you can restore it any time.${inUse(b) ? ` ${inUse(b)} copies are still out on loan; they can still be returned.` : ""}</p>
        ${ask ? html`<div class="field"><label class="field__label" for="archivePlace">Where is it kept? *</label><input class="input" id="archivePlace" list="archivePlaces" placeholder="Archive Room" maxlength="80" autocomplete="off">${placeOptions()}
          <span class="field__hint">Pick a place or type a new one.</span></div>` : html`<p class="field__hint">Run tools/book-obsolete-archive.sql to record where archived books are kept.</p>`}`, {
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-go>${icon("archive")} Archive</button>`,
      });
      modal.root.querySelector<HTMLInputElement>("#archivePlace")?.focus();
      new MutationObserver((_, o) => { if (!modal.root.isConnected) { o.disconnect(); if (!done) resolve(); } }).observe(document.body, { childList: true });
      modal.root.querySelector("[data-go]")!.addEventListener("click", async () => {
        const place = modal.root.querySelector<HTMLInputElement>("#archivePlace")?.value.trim() ?? "";
        if (ask && !place) return fail("Choose where the book is kept.");
        done = true;
        modal.close();
        await attempt(async () => {
          await archiveBook(b.id, true);
          if (ask) await setArchiveDetails(b.id, { archive_location: place, archive_reason: "manual", archived_at: new Date().toISOString() });
        }, ask ? `Archived to ${place}. Its history is kept.` : "Archived. Its history is kept.");
        resolve();
      });
    });

    const restore = async (b: Book) => {
      // a book past its obsolete year would go straight back to the archive: it needs a new year first
      let year = b.obsolete_year ?? null;
      if (hasColumn("obsolete_year") && year && year <= THIS_YEAR) {
        const was = year;
        const answer = await new Promise<number | null>((resolve) => {
          let done = false;
          const modal = openModal("Restore this book", html`<p>"<strong>${b.title}</strong>" was obsolete in ${was}. Give it a new obsolete year so it stays in the catalog.</p>
            ${field("newObsolete", "New obsolete year", { type: "number", value: String(THIS_YEAR + 5), attrs: `min="${THIS_YEAR + 1}" max="2200"` })}`, {
            footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-go>Restore</button>`,
          });
          modal.root.querySelector("[data-go]")!.addEventListener("click", () => {
            const value = Number(modal.root.querySelector<HTMLInputElement>("#f-newObsolete")!.value);
            if (!Number.isInteger(value) || value <= THIS_YEAR || value > 2200) { fail(`Use a year after ${THIS_YEAR}.`); return; }
            done = true; modal.close(); resolve(value);
          });
          new MutationObserver((_, o) => { if (!modal.root.isConnected) { o.disconnect(); if (!done) resolve(null); } }).observe(document.body, { childList: true });
        });
        if (answer === null) return;
        year = answer;
      } else if (!(await confirmBox("Restore this book?", `"${b.title}" goes back into the catalog${b.archive_location ? ` from ${b.archive_location}` : ""}.`, "Restore"))) return;
      await attempt(async () => {
        await archiveBook(b.id, false);
        if (hasColumn("archive_location")) await setArchiveDetails(b.id, { archive_location: null, archive_reason: null, archived_at: null, ...(year !== b.obsolete_year ? { obsolete_year: year } : {}) });
      }, "Restored to the catalog.");
    };

    // several archived books at once (those that reached their obsolete year): one place each
    const chooseLocations = (books: Book[]) => {
      if (!books.length) return;
      const modal = openModal(books.length === 1 ? "Where is this book kept?" : `Where are these ${books.length} books kept?`, html`
        <p class="text-soft">These books are in the archive without a place. Choose a place for each, or one place for all.</p>
        <div class="field"><label class="field__label" for="placeAll">Same place for all</label><div class="input-group"><input class="input" id="placeAll" list="archivePlaces" placeholder="Archive Room" maxlength="80" autocomplete="off"><button class="btn btn--secondary" type="button" data-fill>Use for all</button></div></div>
        <ul class="list place-list">${books.map((b) => html`<li class="list__item"><div class="list__body"><p class="list__title">${b.title}</p><p class="list__meta">${b.author}${b.obsolete_year ? ` · obsolete ${b.obsolete_year}` : ""}</p></div>
          <input class="input" list="archivePlaces" data-place="${b.id}" placeholder="Where is it kept?" maxlength="80" autocomplete="off" aria-label="Where ${b.title} is kept"></li>`)}</ul>
        ${placeOptions()}`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Later</button><button class="btn" type="button" data-go>${icon("check")} Save locations</button>`,
      });
      modal.root.querySelector("[data-fill]")!.addEventListener("click", () => {
        const place = modal.root.querySelector<HTMLInputElement>("#placeAll")!.value.trim();
        if (!place) return fail("Type or pick the place first.");
        modal.root.querySelectorAll<HTMLInputElement>("[data-place]").forEach((input) => { if (!input.value.trim()) input.value = place; });
      });
      modal.root.querySelector("[data-go]")!.addEventListener("click", async () => {
        const chosen = [...modal.root.querySelectorAll<HTMLInputElement>("[data-place]")].map((input) => [input.dataset.place!, input.value.trim()] as const).filter(([, place]) => place);
        if (!chosen.length) return fail("Choose a place for at least one book.");
        try {
          for (const [id, place] of chosen) await setArchiveDetails(id, { archive_location: place });
          ok(chosen.length === books.length ? "Locations saved." : `Saved ${chosen.length}. The others still need a place.`);
          modal.close();
          await reload();
        } catch (error) { fail(friendly(error)); }
      });
    };

    // books whose obsolete year has come go to the archive (the database does it daily too); then ask where they are kept
    const sweepObsolete = async () => {
      const moved = await archiveObsolete();
      if (!moved.length) return;
      await reload();
      setShow("archived");
      draw();
      ok(moved.length === 1 ? `"${moved[0].title}" reached its obsolete year and was moved to the archive.` : `${moved.length} books reached their obsolete year and were moved to the archive.`);
      chooseLocations(all.filter((b) => moved.some((m) => m.id === b.id)));
    };

    // ---- books without an ISBN: look each up in Open Library, staff check the suggestions, then save them in one go
    const finder = async () => {
      const missing = all.filter((b) => !b.isbn);
      if (!missing.length) return ok("Every book already has an ISBN.");
      const modal = openModal("Find missing ISBNs", html`<p>Suggestions come from Open Library by title and author. Check each one against the book in your hands (back cover or copyright page) before saving. Leave a row on "Skip" or type the right number yourself.</p>
        <p class="result-count" id="isbnProgress">Looking up 0 of ${missing.length}...</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Book</th><th>ISBN</th></tr></thead><tbody>
        ${missing.map((b) => html`<tr data-row="${b.id}"><td><span class="table__title">${b.title}</span><br><span class="table__sub">${b.author}</span></td>
          <td><select class="select" data-pick="${b.id}"><option value="">Looking up...</option></select>
          <input class="input" data-own="${b.id}" placeholder="or type it" maxlength="17" autocomplete="off"></td></tr>`)}
        </tbody></table></div>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save-isbns>Save checked ISBNs</button>`,
      });
      const progress = modal.root.querySelector<HTMLElement>("#isbnProgress")!;
      let done = 0;
      const queue = [...missing];
      const worker = async () => {
        for (let b = queue.shift(); b; b = queue.shift()) {
          const select = modal.root.querySelector<HTMLSelectElement>(`[data-pick="${b.id}"]`)!;
          const taken = new Set(all.map((x) => x.isbn).filter(Boolean));
          const found = await findIsbns(b.title, b.author).catch(() => [] as string[]);
          const free = found.filter((i) => !taken.has(i));
          select.replaceChildren(new Option(free.length ? "Skip" : "Nothing found, skip", ""), ...free.map((i) => new Option(formatIsbn(i), i)));
          if (free.length) select.value = free[0];
          progress.textContent = ++done === missing.length ? `Done. ${missing.length} looked up.` : `Looking up ${done} of ${missing.length}...`;
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      modal.root.querySelector<HTMLElement>("[data-save-isbns]")!.addEventListener("click", async () => {
        const chosen = new Map<string, string>();
        for (const b of missing) {
          const own = normalizeIsbn(modal.root.querySelector<HTMLInputElement>(`[data-own="${b.id}"]`)!.value);
          const isbn = own || modal.root.querySelector<HTMLSelectElement>(`[data-pick="${b.id}"]`)!.value;
          if (!isbn) continue;
          if (!isIsbnShape(isbn)) return fail(`The ISBN typed for "${b.title}" needs 10 or 13 digits.`);
          chosen.set(b.id, isbn);
        }
        const values = [...chosen.values()];
        const clash = values.find((i, n) => values.indexOf(i) !== n || all.some((x) => x.isbn === i));
        if (clash) return fail(`${formatIsbn(clash)} is picked for more than one book.`);
        if (!chosen.size) return fail("Nothing to save. Pick or type at least one ISBN.");
        let saved = 0;
        try {
          for (const [id, isbn] of chosen) { await setIsbn(id, isbn); saved++; }
          ok(`Saved ${saved} ISBN${saved === 1 ? "" : "s"}. Their copies now have their own codes.`);
          modal.close();
        } catch (error) { fail(`${saved} saved, then: ${friendly(error)}`); }
        await reload();
      });
    };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Books</h2><div class="cluster"><button class="btn btn--secondary" data-action="find-isbns">${icon("search")} Find missing ISBNs</button><button class="btn" data-action="add">${icon("plus")} Add a book</button></div></div>
      <div id="approvalNotice"></div>
      <div id="archiveNotice"></div>
      <div class="tile-grid book-tiles" id="bookTiles"></div>
      <div class="book-bar card px">
        <div class="book-show" role="tablist" aria-label="Show">${(["active", "review", "archived", "all"] as const).map((v) => html`<button class="book-show__tab" type="button" role="tab" data-action="show" data-show="${v}" aria-selected="${String(v === show)}">${SHOW_LABEL[v]}<span class="tab__count" data-show-count="${v}">0</span></button>`)}</div>
        <div class="book-bar__row">
          <div class="field search book-bar__search"><label class="visually-hidden" for="bookSearch">Search books</label>${icon("search")}<input class="input" id="bookSearch" type="search" placeholder="Title, author, ISBN or subject" value="${term}" autocomplete="off"><kbd class="finder__key" aria-hidden="true">/</kbd></div>
          <div class="field"><label class="visually-hidden" for="bookCategory">Subject</label><select class="select" id="bookCategory"></select></div>
          <div class="field"><label class="visually-hidden" for="bookSort">Sort by</label><select class="select" id="bookSort"><option value="title">Sort: Title</option><option value="category">Sort: Subject</option><option value="copies">Sort: Copies</option><option value="newest">Sort: Newest</option></select></div>
          <div class="view-toggle" role="group" aria-label="View as"><button class="view-toggle__btn" type="button" data-action="mode" data-mode="table" aria-pressed="true" title="Table">${icon("menu")}<span class="visually-hidden">Table</span></button><button class="view-toggle__btn" type="button" data-action="mode" data-mode="covers" aria-pressed="false" title="Covers">${icon("dashboard")}<span class="visually-hidden">Covers</span></button></div>
        </div>
      </div>
      <p class="result-count book-count" id="bookCount" aria-live="polite"></p>
      <div class="card px card--flush" data-body>${loading("Loading books")}</div></div>`);
    const search = root.querySelector<HTMLInputElement>("#bookSearch")!;
    search.addEventListener("input", debounce(() => { term = search.value.trim(); limit = MAX_ROWS; draw(); }, 200));
    search.addEventListener("keydown", (e) => { if (e.key === "Escape" && search.value) { search.value = ""; term = ""; draw(); } });
    root.querySelector("#bookCategory")!.addEventListener("change", (e) => { category = (e.target as HTMLSelectElement).value; limit = MAX_ROWS; draw(); });
    root.querySelector("#bookSort")!.addEventListener("change", (e) => { sort = (e.target as HTMLSelectElement).value as Sort; desc = false; draw(); });
    // "/" jumps to the search box while this tab is open
    slashKey?.abort();
    slashKey = new AbortController();
    document.addEventListener("keydown", (e) => {
      if (!search.isConnected) return slashKey?.abort();
      const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing && !document.body.classList.contains("has-modal")) { e.preventDefault(); search.focus(); search.select(); }
    }, { signal: slashKey.signal });
    actions(root, {
      add: () => editor(null),
      "find-isbns": () => finder(),
      edit: (el) => editor(all.find((b) => b.id === el.dataset.id) ?? null),
      show: (el) => { setShow(el.dataset.show as typeof show); draw(); },
      quick: (el) => { const key = el.dataset.quick as Quick; quick = quick === key ? "" : key; if (quick && show !== "active") setShow("active"); limit = MAX_ROWS; draw(); },
      sort: (el) => {
        const key = el.dataset.sort as Sort;
        desc = sort === key ? !desc : false;
        sort = key;
        root.querySelector<HTMLSelectElement>("#bookSort")!.value = key;
        draw();
      },
      more: () => { limit += MAX_ROWS; draw(); },
      "clear-filters": () => {
        quick = ""; category = ""; term = ""; limit = MAX_ROWS;
        search.value = "";
        root.querySelector<HTMLSelectElement>("#bookCategory")!.value = "";
        draw();
      },
      mode: (el) => { viewMode = el.dataset.mode as typeof viewMode; root.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      archive: (el) => { const b = all.find((x) => x.id === el.dataset.id)!; return b.archived ? restore(b) : archive(b); },
      "show-review": () => { setShow("review"); draw(); },
      review: (el) => review(all.find((x) => x.id === el.dataset.id)!),
      locate: () => chooseLocations(all.filter((b) => b.archived && !b.archive_location)),
    });
    void raw;
    void publicSettings().then((s) => { if (Array.isArray(s.archive_locations)) locations = (s.archive_locations as unknown[]).filter((x): x is string => typeof x === "string"); }).catch(() => undefined);
    await reload();
    // opened from an approval notification: show the review list and open that book (review for an admin, the fix form for its author)
    // read once: switching to Books again from the sidebar should not reopen it
    const asked = new URLSearchParams(openedWith); openedWith.delete("open"); openedWith.delete("show");
    if (asked.get("show") === "review") { setShow("review"); draw(); }
    if (asked.get("open") === "1" && term) {
      const book = all.find((b) => b.title.toLowerCase() === term.toLowerCase() && waiting(b)) ?? all.find((b) => b.title.toLowerCase() === term.toLowerCase());
      if (!book) ok(`"${term}" is no longer waiting. It may have been approved or removed.`);
      else if (book.approval_status === "pending" && isAdmin()) review(book);
      else if (book.approval_status === "revision" || book.approval_status === "pending") editor(book);
    }
    await sweepObsolete();
  },
};
