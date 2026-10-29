import { allBooks, archiveBook, archiveObsolete, bookCopies, findIsbns, saveBook, setArchiveDetails, setCopies, setIsbn, uploadPicture, type BookInput } from "../api/staff";
import { publicSettings } from "../api/content";
import { loansByStatus } from "../api/loans";
import { actions, debounce, formData, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { formatIsbn, isValidIsbn, normalizeIsbn } from "../core/isbn";
import { authorsOf, joinAuthors } from "../core/authors";
import { confirmBox, openModal } from "../core/modal";
import { fail, ok } from "../core/toast";
import { cover, empty, field, loading, selectField } from "../ui/components";
import type { Book } from "../types";
import type { PanelTab } from "./tab";

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
    let show: "active" | "archived" | "all" = "active";
    let locations: string[] = DEFAULT_LOCATIONS;
    const hasColumn = (column: string) => column in (all[0] ?? {});

    const inUse = (b: Book) => onLoan.get(b.id) ?? 0;
    const bar = (b: Book) => html`<span class="copies" title="${b.copies - inUse(b)} on the shelf, ${inUse(b)} on loan"><span class="copies__bar"><i style="--w:${b.copies ? Math.round((inUse(b) / b.copies) * 100) : 0}%"></i></span><small>${b.copies - inUse(b)} / ${b.copies}</small></span>`;

    const archiveBadge = (b: Book) => !b.archived ? ""
      : b.archive_location ? html`<span class="badge">${icon("archive")} ${b.archive_location}${b.archive_reason === "obsolete" ? " · obsolete" : ""}</span>`
      : hasColumn("archive_location") ? html`<span class="badge badge--warning">archived · no location</span>` : html`<span class="badge">archived</span>`;

    // "obsolete 2031", in red when that is this year or next (it will be archived soon)
    const obsoleteNote = (b: Book) => !b.obsolete_year ? ""
      : !b.archived && b.obsolete_year <= THIS_YEAR + 1 ? html` · <span class="text-danger">obsolete ${b.obsolete_year}</span>` : ` · obsolete ${b.obsolete_year}`;

    const draw = () => {
      const active = all.filter((b) => !b.archived);
      // archived books nobody has given a place yet (usually ones that just reached their obsolete year)
      const homeless = hasColumn("archive_location") ? all.filter((b) => b.archived && !b.archive_location) : [];
      mount(root.querySelector<HTMLElement>("#archiveNotice")!, homeless.length ? html`<div class="alert alert--warning px px--warning" role="status">${icon("archive")}<span class="grow"><strong>${homeless.length === 1 ? "1 archived book has" : `${homeless.length} archived books have`} no location yet.</strong> Choose where ${homeless.length === 1 ? "it is" : "each one is"} kept.</span><button class="btn btn--sm" type="button" data-action="locate">Choose locations</button></div>` : "");
      const counts = { active: active.length, archived: all.length - active.length, all: all.length };
      root.querySelectorAll<HTMLOptionElement>("#bookShow option").forEach((o) => { o.textContent = `${o.dataset.label} (${counts[o.value as keyof typeof counts]})`; });
      const tiles = root.querySelector<HTMLElement>("#bookTiles")!;
      mount(tiles, html`
        <div class="tile"><span class="tile__label">Titles</span><span class="tile__value">${active.length}</span></div>
        <div class="tile"><span class="tile__label">On the shelf</span><span class="tile__value">${active.reduce((s, b) => s + Math.max(b.copies - inUse(b), 0), 0)}</span></div>
        <div class="tile"><span class="tile__label">Fully borrowed</span><span class="tile__value">${active.filter((b) => b.copies > 0 && inUse(b) >= b.copies).length}</span></div>
        <div class="tile"><span class="tile__label">Missing cover</span><span class="tile__value">${active.filter((b) => !b.cover_url).length}</span></div>
        <div class="tile"><span class="tile__label">Missing ISBN</span><span class="tile__value">${active.filter((b) => !b.isbn).length}</span></div>`);
      const needle = term.toLowerCase();
      // an ISBN matches with or without its dashes
      const isbnNeedle = normalizeIsbn(term);
      const matches = (b: Book) => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(needle) || (!!isbnNeedle && !!b.isbn?.includes(isbnNeedle));
      let rows = all.filter((b) => (!needle || matches(b)) && (!category || b.category === category) && (show === "all" || (show === "archived") === !!b.archived));
      rows = [...rows].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "category" ? a.category.localeCompare(b.category) || a.title.localeCompare(b.title) : sort === "copies" ? b.copies - a.copies : String((b as Book & { created_at?: string }).created_at ?? "").localeCompare(String((a as Book & { created_at?: string }).created_at ?? "")));
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      if (!rows.length) { mount(body, show === "archived" ? empty("Nothing in the archive", "Archived books and books past their obsolete year show up here.", "archive") : empty("No books", "Add the first one or change the search.", "book")); return; }
      const shown = rows.slice(0, MAX_ROWS);
      mount(body, viewMode === "table"
        ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Book</th><th>Subject</th><th>Copies</th><th></th></tr></thead><tbody>
          ${shown.map((b) => html`<tr>
            <td><span class="table__title">${b.title}</span> ${archiveBadge(b)}<br><span class="table__sub">${b.isbn ? `ISBN ${formatIsbn(b.isbn)}` : html`<span class="badge badge--warning">No ISBN</span>`} · ${b.author}${b.edition ? ` · ${b.edition}` : ""}${obsoleteNote(b)}</span></td>
            <td>${b.category}</td><td>${bar(b)}</td>
            <td><div class="table__actions">
              <button class="btn btn--sm btn--quiet" data-action="edit" data-id="${b.id}">${icon("edit")} Edit</button>
              <button class="btn btn--sm btn--quiet" data-action="archive" data-id="${b.id}">${icon("archive")} ${b.archived ? "Restore" : "Archive"}</button></div></td></tr>`)}</tbody></table></div>`
        : html`<div class="cover-grid">${shown.map((b) => html`<article class="cover-tile">${cover(b)}<strong>${b.title}</strong><small>${b.author}</small>${bar(b)}
            <div class="cluster"><button class="btn btn--sm btn--quiet" data-action="edit" data-id="${b.id}">${icon("edit")}</button><button class="btn btn--sm btn--quiet" data-action="archive" data-id="${b.id}">${icon("archive")}</button></div></article>`)}</div>`);
      if (rows.length > MAX_ROWS) body.append(Object.assign(document.createElement("p"), { className: "result-count", textContent: `Showing ${MAX_ROWS} of ${rows.length}. Search to narrow it down.` }));
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
      const modal = openModal(book ? "Edit book" : "Add a book", html`<form class="form" id="bookForm" novalidate>
        ${field("isbn", "ISBN", { value: formatIsbn(book?.isbn), required: !book || !!book.isbn, hint: "The 10 or 13 digit number on the back cover or copyright page. Dashes are fine.", placeholder: "978-0306406157", attrs: 'maxlength="17" autocomplete="off"' })}
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
        ${"obsolete_year" in (all[0] ?? {}) ? field("obsolete_year", "Obsolete year", { type: "number", value: String(book?.obsolete_year ?? THIS_YEAR + 5), required: true, attrs: `min="${book ? 1900 : THIS_YEAR}" max="2200" step="1"`, hint: `From 1 January of that year the book is archived by itself and you choose where it is kept. Usually 5 years: ${THIS_YEAR + 5}.` }) : ""}
        ${selectField("material", "Material (sets the loan period and overdue fine)", [{ value: "fiction", label: "Fiction" }, { value: "circulation", label: "Circulation / Reserve" }], book?.material ?? "circulation", true, "")}
        <div class="form__row">${field("genre", "Genre", { value: book?.genre ?? "" })}${field("publisher", "Publisher", { value: book?.publisher ?? "" })}</div>
        <div class="form__row">${field("published", "First published", { value: book?.published ?? "" })}${field("language", "Language", { value: book?.language ?? "English" })}</div>
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
        if (isbn && !isValidIsbn(isbn)) return fail("That ISBN is not valid. Check the 10 or 13 digits (an ISBN-10 may end in X).");
        if (isbn && all.some((b) => b.id !== book?.id && b.isbn === isbn)) return fail("Another book already has that ISBN.");
        if (!d.title) return fail("A book needs a title.");
        const authors = cleanAuthors();
        if (!authors.length) return fail("Add at least one author.");
        const edition = (d.edition ?? "").trim().replace(/\s+/g, " ");
        const obsolete = Number(d.obsolete_year);
        if (d.obsolete_year !== undefined) {
          if (!Number.isInteger(obsolete) || obsolete < 1900 || obsolete > 2200) return fail(`Enter the obsolete year as a 4-digit year, for example ${THIS_YEAR + 5}.`);
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
        const has = (column: string) => column in (all[0] ?? {});
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
          ok("Saved.");
          modal.close();
          await reload();
          await sweepObsolete();
          if (button.dataset.save === "again") editor(null);
        } catch (error) { fail(friendly(error)); }
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
      show = "archived";
      const select = root.querySelector<HTMLSelectElement>("#bookShow");
      if (select) select.value = "archived";
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
          if (!isValidIsbn(isbn)) return fail(`The ISBN typed for "${b.title}" is not valid.`);
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
      <div id="archiveNotice"></div>
      <div class="tile-grid" id="bookTiles"></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="bookSearch">Search books</label>${icon("search")}<input class="input" id="bookSearch" type="search" placeholder="Title, author, ISBN or subject" value="${term}"></div>
        <div class="field"><label class="field__label" for="bookShow">Show</label><select class="select" id="bookShow"><option value="active" data-label="Active books">Active books</option><option value="archived" data-label="Archive">Archive</option><option value="all" data-label="All books">All books</option></select></div>
        <div class="field"><label class="field__label" for="bookCategory">Subject</label><select class="select" id="bookCategory"></select></div>
        <div class="field"><label class="field__label" for="bookSort">Sort by</label><select class="select" id="bookSort"><option value="title">Title</option><option value="category">Subject</option><option value="copies">Most copies</option><option value="newest">Newest</option></select></div>
        <div class="seg" role="group" aria-label="View as"><button class="seg__btn" type="button" data-action="mode" data-mode="table" aria-pressed="true">Table</button><button class="seg__btn" type="button" data-action="mode" data-mode="covers" aria-pressed="false">Covers</button></div>
      </div>
      <div class="card px card--flush" data-body>${loading("Loading books")}</div></div>`);
    root.querySelector("#bookSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    root.querySelector("#bookShow")!.addEventListener("change", (e) => { show = (e.target as HTMLSelectElement).value as typeof show; draw(); });
    root.querySelector("#bookCategory")!.addEventListener("change", (e) => { category = (e.target as HTMLSelectElement).value; draw(); });
    root.querySelector("#bookSort")!.addEventListener("change", (e) => { sort = (e.target as HTMLSelectElement).value as Sort; draw(); });
    actions(root, {
      add: () => editor(null),
      "find-isbns": () => finder(),
      edit: (el) => editor(all.find((b) => b.id === el.dataset.id) ?? null),
      mode: (el) => { viewMode = el.dataset.mode as typeof viewMode; root.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      archive: (el) => { const b = all.find((x) => x.id === el.dataset.id)!; return b.archived ? restore(b) : archive(b); },
      locate: () => chooseLocations(all.filter((b) => b.archived && !b.archive_location)),
    });
    void raw;
    void publicSettings().then((s) => { if (Array.isArray(s.archive_locations)) locations = (s.archive_locations as unknown[]).filter((x): x is string => typeof x === "string"); }).catch(() => undefined);
    await reload();
    await sweepObsolete();
  },
};
