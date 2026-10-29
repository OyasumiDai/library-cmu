import { allBooks, archiveBook, bookCopies, findIsbns, saveBook, setCopies, setIsbn, uploadPicture, type BookInput } from "../api/staff";
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

// what an edit changes, field by field: [what, before, after]
const LABELS: [keyof BookInput, string][] = [
  ["isbn", "ISBN"], ["title", "Title"], ["author", "Authors"], ["edition", "Edition / version"], ["category", "Subject"], ["material", "Material"],
  ["genre", "Genre"], ["publisher", "Publisher"], ["published", "First published"], ["language", "Language"], ["shelf", "Shelf"], ["copies", "Copies"],
  ["synopsis", "Summary"], ["cover_url", "Cover picture"],
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

    const inUse = (b: Book) => onLoan.get(b.id) ?? 0;
    const bar = (b: Book) => html`<span class="copies" title="${b.copies - inUse(b)} on the shelf, ${inUse(b)} on loan"><span class="copies__bar"><i style="--w:${b.copies ? Math.round((inUse(b) / b.copies) * 100) : 0}%"></i></span><small>${b.copies - inUse(b)} / ${b.copies}</small></span>`;

    const draw = () => {
      const active = all.filter((b) => !b.archived);
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
      let rows = all.filter((b) => (!needle || matches(b)) && (!category || b.category === category));
      rows = [...rows].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "category" ? a.category.localeCompare(b.category) || a.title.localeCompare(b.title) : sort === "copies" ? b.copies - a.copies : String((b as Book & { created_at?: string }).created_at ?? "").localeCompare(String((a as Book & { created_at?: string }).created_at ?? "")));
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      if (!rows.length) { mount(body, empty("No books", "Add the first one or change the search.", "book")); return; }
      const shown = rows.slice(0, MAX_ROWS);
      mount(body, viewMode === "table"
        ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Book</th><th>Subject</th><th>Copies</th><th></th></tr></thead><tbody>
          ${shown.map((b) => html`<tr>
            <td><span class="table__title">${b.title}</span> ${b.archived ? html`<span class="badge">archived</span>` : ""}<br><span class="table__sub">${b.isbn ? `ISBN ${formatIsbn(b.isbn)}` : html`<span class="badge badge--warning">No ISBN</span>`} · ${b.author}${b.edition ? ` · ${b.edition}` : ""}</span></td>
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
          if (button.dataset.save === "again") editor(null);
        } catch (error) { fail(friendly(error)); }
      }));
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
      <div class="tile-grid" id="bookTiles"></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="bookSearch">Search books</label>${icon("search")}<input class="input" id="bookSearch" type="search" placeholder="Title, author, ISBN or subject" value="${term}"></div>
        <div class="field"><label class="field__label" for="bookCategory">Subject</label><select class="select" id="bookCategory"></select></div>
        <div class="field"><label class="field__label" for="bookSort">Sort by</label><select class="select" id="bookSort"><option value="title">Title</option><option value="category">Subject</option><option value="copies">Most copies</option><option value="newest">Newest</option></select></div>
        <div class="seg" role="group" aria-label="View as"><button class="seg__btn" type="button" data-action="mode" data-mode="table" aria-pressed="true">Table</button><button class="seg__btn" type="button" data-action="mode" data-mode="covers" aria-pressed="false">Covers</button></div>
      </div>
      <div class="card px card--flush" data-body>${loading("Loading books")}</div></div>`);
    root.querySelector("#bookSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    root.querySelector("#bookCategory")!.addEventListener("change", (e) => { category = (e.target as HTMLSelectElement).value; draw(); });
    root.querySelector("#bookSort")!.addEventListener("change", (e) => { sort = (e.target as HTMLSelectElement).value as Sort; draw(); });
    actions(root, {
      add: () => editor(null),
      "find-isbns": () => finder(),
      edit: (el) => editor(all.find((b) => b.id === el.dataset.id) ?? null),
      mode: (el) => { viewMode = el.dataset.mode as typeof viewMode; root.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      archive: (el) => { const b = all.find((x) => x.id === el.dataset.id)!; return attempt(() => archiveBook(b.id, !b.archived), b.archived ? "Restored." : "Archived. Its history is kept."); },
    });
    void raw;
    await reload();
  },
};
