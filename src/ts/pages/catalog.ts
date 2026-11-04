import { categories, markRead, requestBook, searchCatalog, type CatalogQuery } from "../api/catalog";
import { boot } from "../core/boot";
import { actions, busy, debounce, html, icon, maybe, mount, qs, qsa } from "../core/dom";
import { friendly } from "../core/errors";
import { formatIsbn } from "../core/isbn";
import { confirmBox, openModal } from "../core/modal";
import { reveal } from "../core/motion";
import { fail, ok } from "../core/toast";
import { plural } from "../core/format";
import { bookCard, cover, empty, mineBadge, pagination, stockBadge, type MyStatus } from "../ui/components";
import type { CatalogBook, StockEvent } from "../types";
import { watchStock } from "../core/stock";
import { myLoans } from "../api/loans";
import { current } from "../core/session";
import { dueLabel } from "../core/format";
import { publicSettings, settingNumber } from "../api/content";

const state: CatalogQuery = { query: "", category: "", availability: "all", page: 1, pageSize: 12 };
let shown: CatalogBook[] = [];
const mine = new Map<string, MyStatus>();
const VIEW_KEY = "catalog-view";

// grey stand-ins shaped like book cards while a page of books loads
const placeholders = (count: number) => html`${Array.from({ length: count }, () => html`<div class="book-card card px book-card--ghost" aria-hidden="true"><span class="skeleton skeleton--cover"></span><span class="skeleton"></span><span class="skeleton skeleton--short"></span></div>`)}`;

// grid of covers or a compact list; remembered on this device
function setView(view: string): void {
  qs("#results").classList.toggle("shelf-grid--list", view === "list");
  qsa<HTMLButtonElement>("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode: the choice just isn't remembered */ }
}

// "29 books · Science · Free now", plus what was searched
function describe(total: number): void {
  const bits = [state.category, state.availability === "available" ? "Free now" : state.availability === "unavailable" ? "All out" : ""].filter(Boolean);
  mount(qs("#resultCount"), total
    ? html`<strong>${plural(total, "book")}</strong>${state.query ? html` for “${state.query}”` : ""}${bits.map((b) => html`<span class="result-count__tag">${b}</span>`)}`
    : "");
}

// which books are yours (requested or borrowed), so the cards can say so
async function loadMine(): Promise<void> {
  const loans = await myLoans(current().profile!.id);
  mine.clear();
  for (const loan of loans) if (loan.status === "requested" || loan.status === "borrowed") mine.set(loan.book_id, loan.status);
}

function drawCards(): void {
  const results = qs("#results");
  mount(results, shown.length ? html`${shown.map((b) => bookCard(b, mine.get(b.id)))}` : empty("Nothing matched", "Try fewer words or another subject."));
}

// somebody reserved, borrowed or returned a book (on the site or in the game): update the card at once
function applyStock(event: StockEvent): void {
  const book = shown.find((b) => b.id === event.book_id);
  if (!book) return;
  Object.assign(book, { copies: event.copies, borrowed: event.borrowed, reserved: event.reserved, available: event.available });
  void loadMine().catch(() => undefined).finally(drawCards);
}

function sync(params: URLSearchParams): void {
  state.query = params.get("q") ?? "";
  state.category = params.get("category") ?? "";
  state.availability = (params.get("availability") as CatalogQuery["availability"]) ?? "all";
  state.page = Math.max(1, Number(params.get("page")) || 1);
  state.pageSize = Number(params.get("size")) || 12;
}

function writeUrl(): void {
  const p = new URLSearchParams();
  if (state.query) p.set("q", state.query);
  if (state.category) p.set("category", state.category);
  if (state.availability !== "all") p.set("availability", state.availability);
  if (state.page > 1) p.set("page", String(state.page));
  if (state.pageSize !== 12) p.set("size", String(state.pageSize));
  history.replaceState(null, "", p.size ? `?${p}` : location.pathname);
}

async function load(): Promise<void> {
  const results = qs("#results");
  results.setAttribute("aria-busy", "true");
  mount(results, placeholders(Math.min(state.pageSize, 8)));
  try {
    const page = await searchCatalog(state);
    shown = page.books;
    const pages = Math.max(1, Math.ceil(page.total / state.pageSize));
    describe(page.total);
    await loadMine().catch(() => undefined);
    drawCards();
    mount(qs("#pager"), pagination(state.page, pages));
    reveal(results);
    results.removeAttribute("aria-busy");
  } catch (error) {
    results.removeAttribute("aria-busy");
    mount(results, html`<div class="alert alert--danger px px--danger">${friendly(error)}</div>`);
  }
}

function showBook(book: CatalogBook): void {
  const facts: [string, string][] = [[book.authors && book.authors.length > 1 ? "Authors" : "Author", book.author], ["Edition", book.edition ?? ""], ["Subject", book.category], ["Genre", book.genre], [book.publication_label || "Published", book.published], ["Publisher", book.publisher], ["Language", book.language], ["Shelf", book.shelf], ["ISBN", formatIsbn(book.isbn)], ["Loan period", book.material === "fiction" ? "5 days (Fiction)" : book.material === "circulation" ? "3 days (Circulation / Reserve)" : ""]];
  const modal = openModal(book.title, html`
    <div class="book-detail">
      ${cover(book)}
      <div>
        ${mineBadge(mine.get(book.id))}${stockBadge(book)}
        <dl class="book-detail__facts">${facts.filter(([, v]) => v).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
        <p>${book.synopsis || "No summary yet."}</p>
      </div>
    </div>`, {
    wide: true,
    footer: html`
      <button class="btn btn--quiet px" type="button" data-close>Close</button>
      <button class="btn btn--secondary px" type="button" data-read>${icon("check")} I read this</button>
      <button class="btn px" type="button" data-request ${book.available > 0 && !mine.has(book.id) ? "" : html`disabled`}>${icon("shelf")} ${mine.has(book.id) ? "Already yours" : book.available > 0 ? "Request to borrow" : "Not available"}</button>`,
  });
  maybe<HTMLButtonElement>("[data-request]", modal.root)?.addEventListener("click", (e) => busy(e.currentTarget as HTMLElement, async () => {
    try {
      if (!(await confirmBox("Request this book?", `"${book.title}" will be reserved for you. You get a ticket with a QR code here under My books and in your email. Walk in to the library within 2 days and show it at the desk, or the request is cancelled.`, "Yes, request it"))) return;
      await requestBook(book.id);
      ok("Reserved! Your ticket is under My books and in your email. Pick it up within 2 days.");
      modal.close();
    } catch (error) {
      fail(friendly(error));
    }
  }));
  maybe("[data-read]", modal.root)?.addEventListener("click", (e) => busy(e.currentTarget as HTMLElement, async () => {
    try {
      await markRead(book.id);
      ok("Added to your reading history.");
    } catch (error) {
      fail(friendly(error));
    }
  }));
}

// the banner: a greeting for the time of day, the next book due, and how many of your borrowing slots are used
async function greet(): Promise<void> {
  const profile = current().profile!;
  const [loans, settings] = await Promise.all([myLoans(profile.id), publicSettings().catch(() => null)]);
  const out = loans.filter((l) => l.status === "borrowed");
  const waiting = loans.filter((l) => l.status === "requested").length;
  const max = settings ? settingNumber(settings, "max_loans", 3) : 3;
  const left = Math.max(0, max - out.length - waiting);
  const next = out.filter((l) => l.due_at).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)))[0];
  const due = next ? dueLabel(next.due_at) : null;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const welcome = qs("#welcome");
  mount(welcome, html`
    <div class="welcome__text">
      <span class="welcome__kicker">${hello}</span>
      <h1>${profile.username}</h1>
      ${next && due
        ? html`<a class="welcome__due" data-tone="${due.tone}" href="/borrowing">${icon("clock")}<span><strong>${next.book?.title ?? "A book"}</strong> · ${due.text.toLowerCase()}</span>${icon("chevron-right")}</a>`
        : html`<p>What are you in the mood to read today?</p>`}
    </div>
    <div class="welcome__facts">
      <a class="welcome__fact" href="/borrowing" data-reveal><strong data-count="${out.length}">${out.length}</strong><span>borrowed</span></a>
      <a class="welcome__fact" href="/borrowing" data-reveal><strong data-count="${waiting}">${waiting}</strong><span>waiting</span></a>
      <div class="welcome__ring" data-reveal style="--value:${Math.round(((max - left) / Math.max(max, 1)) * 100)}" title="${plural(max - left, "slot")} of ${max} in use">
        <strong>${left}</strong><span>${left === 1 ? "slot" : "slots"} left</span>
      </div>
    </div>`);
  welcome.hidden = false;
  const missing = [!profile.course && "course", !profile.year_level && "year level"].filter(Boolean) as string[];
  if (missing.length) {
    const note = document.createElement("div");
    note.className = "alert alert--warning px px--warning complete-banner";
    note.innerHTML = html`<span>Please add your <strong>${missing.join(" and ")}</strong> so the library knows you better.</span> <a class="btn btn--sm" href="/profile">Complete my profile</a>`.value;
    welcome.after(note);
  }
}

// subject chips: "All" plus every subject with its count; the pressed one is the filter
function drawSubjects(list: { category: string; total: number }[]): void {
  const chip = (value: string, label: string, total?: number) => html`<button class="chip" type="button" data-action="subject" data-subject="${value}" aria-pressed="${String(state.category === value)}">${label}${total === undefined ? "" : html`<span class="chip__count">${total}</span>`}</button>`;
  mount(qs("#subjects"), html`${chip("", "All")}${list.map((c) => chip(c.category, c.category, c.total))}`);
}

boot(async ({ params }) => {
  sync(params);
  void greet().catch(() => undefined);
  watchStock(applyStock);
  const form = qs<HTMLFormElement>("#filters");
  const search = qs<HTMLInputElement>("#q");
  const size = qs<HTMLSelectElement>("#size");
  const radios = form.elements.namedItem("availability") as RadioNodeList;
  search.value = state.query;
  radios.value = state.availability;
  size.value = String(state.pageSize);
  let saved = "grid";
  try { saved = localStorage.getItem(VIEW_KEY) ?? "grid"; } catch { /* storage blocked */ }
  setView(saved);

  const subjects = await categories().catch(() => []);
  drawSubjects(subjects);

  const apply = () => {
    state.query = search.value.trim();
    state.availability = radios.value as CatalogQuery["availability"];
    state.pageSize = Number(size.value);
    state.page = 1;
    qsa<HTMLElement>("[data-subject]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.subject === state.category)));
    writeUrl();
    void load();
  };
  form.addEventListener("submit", (e) => e.preventDefault());
  search.addEventListener("input", debounce(apply));
  radios.forEach((r) => r.addEventListener("change", apply));
  size.addEventListener("change", apply);
  qs("#clearFilters").addEventListener("click", () => {
    form.reset();
    state.category = "";
    apply();
  });
  // "/" jumps to the search box from anywhere on the page; Escape clears it
  document.addEventListener("keydown", (e) => {
    const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !document.body.classList.contains("has-modal")) {
      e.preventDefault();
      search.focus();
      search.select();
    }
  });
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && search.value) {
      search.value = "";
      apply();
    }
  });

  const root = qs("[data-page-root]");
  actions(root, {
    "open-book": (el) => {
      const book = shown.find((b) => b.id === el.dataset.id);
      if (book) showBook(book);
    },
    subject: (el) => {
      state.category = el.dataset.subject ?? "";
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      apply();
    },
    page: (el) => {
      state.page = Number(el.dataset.page);
      writeUrl();
      void load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  qsa<HTMLButtonElement>("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view ?? "grid")));
  await load();
});
