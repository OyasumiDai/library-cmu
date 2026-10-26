import { categories, markRead, requestBook, searchCatalog, type CatalogQuery } from "../api/catalog";
import { boot } from "../core/boot";
import { actions, busy, debounce, html, icon, maybe, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox, openModal } from "../core/modal";
import { reveal } from "../core/motion";
import { fail, ok } from "../core/toast";
import { plural } from "../core/format";
import { bookCard, cover, empty, loading, mineBadge, pagination, stockBadge, type MyStatus } from "../ui/components";
import type { CatalogBook, StockEvent } from "../types";
import { watchStock } from "../core/stock";
import { myLoans } from "../api/loans";
import { current } from "../core/session";
import { dueLabel } from "../core/format";

const state: CatalogQuery = { query: "", category: "", availability: "all", page: 1, pageSize: 12 };
let shown: CatalogBook[] = [];
const mine = new Map<string, MyStatus>();

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
  mount(results, loading());
  try {
    const page = await searchCatalog(state);
    shown = page.books;
    const pages = Math.max(1, Math.ceil(page.total / state.pageSize));
    qs("#resultCount").textContent = page.total ? `${plural(page.total, "book")} found` : "";
    await loadMine().catch(() => undefined);
    drawCards();
    mount(qs("#pager"), pagination(state.page, pages));
    reveal(results);
  } catch (error) {
    mount(results, html`<div class="alert alert--danger px px--danger">${friendly(error)}</div>`);
  }
}

function showBook(book: CatalogBook): void {
  const facts: [string, string][] = [["Author", book.author], ["Subject", book.category], ["Genre", book.genre], [book.publication_label || "Published", book.published], ["Publisher", book.publisher], ["Language", book.language], ["Shelf", book.shelf]];
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
      if (!(await confirmBox("Request this book?", `"${book.title}" will be reserved for you right away. Staff confirm the pickup and you will get a notification.`, "Yes, request it"))) return;
      await requestBook(book.id);
      ok("Requested! It is now reserved for you. Watch the bell.");
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

async function greet(): Promise<void> {
  const profile = current().profile!;
  const loans = await myLoans(profile.id);
  const out = loans.filter((l) => l.status === "borrowed");
  const waiting = loans.filter((l) => l.status === "requested").length;
  const next = out.filter((l) => l.due_at).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)))[0];
  const welcome = qs("#welcome");
  mount(welcome, html`
    <div><h1>Hi, ${profile.username}</h1><p>${next ? `Next due: ${next.book?.title} (${dueLabel(next.due_at).text.toLowerCase()})` : "What are you in the mood to read?"}</p></div>
    <div class="welcome__facts">
      <div class="welcome__fact"><strong>${out.length}</strong><span>borrowed</span></div>
      <div class="welcome__fact"><strong>${waiting}</strong><span>waiting</span></div>
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

boot(async ({ params }) => {
  sync(params);
  void greet().catch(() => undefined);
  watchStock(applyStock);
  const form = qs<HTMLFormElement>("#filters");
  (qs<HTMLInputElement>("#q")).value = state.query;
  (qs<HTMLSelectElement>("#availability")).value = state.availability;
  (qs<HTMLSelectElement>("#size")).value = String(state.pageSize);

  const select = qs<HTMLSelectElement>("#category");
  for (const c of await categories()) select.append(new Option(`${c.category} (${c.total})`, c.category));
  select.value = state.category;

  const apply = () => {
    state.query = qs<HTMLInputElement>("#q").value.trim();
    state.category = select.value;
    state.availability = qs<HTMLSelectElement>("#availability").value as CatalogQuery["availability"];
    state.pageSize = Number(qs<HTMLSelectElement>("#size").value);
    state.page = 1;
    writeUrl();
    void load();
  };
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", debounce(apply));
  qs("#clearFilters").addEventListener("click", () => {
    form.reset();
    apply();
  });

  const root = qs("[data-page-root]");
  actions(root, {
    "open-book": (el) => {
      const book = shown.find((b) => b.id === el.dataset.id);
      if (book) showBook(book);
    },
    page: (el) => {
      state.page = Number(el.dataset.page);
      writeUrl();
      void load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  await load();
});
