import {
  categories,
  markRead,
  requestBook,
  searchCatalog
} from "./chunks/chunk-BJZOPE75.js";
import {
  myLoans
} from "./chunks/chunk-OAO6RVBP.js";
import {
  bookCard,
  cover,
  empty,
  loading,
  mineBadge,
  pagination,
  stockBadge
} from "./chunks/chunk-YFDTB4J4.js";
import {
  actions,
  boot,
  busy,
  confirmBox,
  current,
  db,
  debounce,
  dueLabel,
  fail,
  friendly,
  html,
  icon,
  isConfigured,
  maybe,
  mount,
  ok,
  openModal,
  plural,
  qs,
  reveal
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/core/stock.ts
function watchStock(onChange) {
  if (!isConfigured()) return () => void 0;
  const client = db();
  const channel = client.channel("library-stock").on("broadcast", { event: "stock" }, (message) => onChange(message.payload)).subscribe();
  return () => void client.removeChannel(channel);
}

// src/ts/pages/catalog.ts
var state = { query: "", category: "", availability: "all", page: 1, pageSize: 12 };
var shown = [];
var mine = /* @__PURE__ */ new Map();
async function loadMine() {
  const loans = await myLoans(current().profile.id);
  mine.clear();
  for (const loan of loans) if (loan.status === "requested" || loan.status === "borrowed") mine.set(loan.book_id, loan.status);
}
function drawCards() {
  const results = qs("#results");
  mount(results, shown.length ? html`${shown.map((b) => bookCard(b, mine.get(b.id)))}` : empty("Nothing matched", "Try fewer words or another subject."));
}
function applyStock(event) {
  const book = shown.find((b) => b.id === event.book_id);
  if (!book) return;
  Object.assign(book, { copies: event.copies, borrowed: event.borrowed, reserved: event.reserved, available: event.available });
  void loadMine().catch(() => void 0).finally(drawCards);
}
function sync(params) {
  state.query = params.get("q") ?? "";
  state.category = params.get("category") ?? "";
  state.availability = params.get("availability") ?? "all";
  state.page = Math.max(1, Number(params.get("page")) || 1);
  state.pageSize = Number(params.get("size")) || 12;
}
function writeUrl() {
  const p = new URLSearchParams();
  if (state.query) p.set("q", state.query);
  if (state.category) p.set("category", state.category);
  if (state.availability !== "all") p.set("availability", state.availability);
  if (state.page > 1) p.set("page", String(state.page));
  if (state.pageSize !== 12) p.set("size", String(state.pageSize));
  history.replaceState(null, "", p.size ? `?${p}` : location.pathname);
}
async function load() {
  const results = qs("#results");
  mount(results, loading());
  try {
    const page = await searchCatalog(state);
    shown = page.books;
    const pages = Math.max(1, Math.ceil(page.total / state.pageSize));
    qs("#resultCount").textContent = page.total ? `${plural(page.total, "book")} found` : "";
    await loadMine().catch(() => void 0);
    drawCards();
    mount(qs("#pager"), pagination(state.page, pages));
    reveal(results);
  } catch (error) {
    mount(results, html`<div class="alert alert--danger px px--danger">${friendly(error)}</div>`);
  }
}
function showBook(book) {
  const facts = [["Author", book.author], ["Subject", book.category], ["Genre", book.genre], [book.publication_label || "Published", book.published], ["Publisher", book.publisher], ["Language", book.language], ["Shelf", book.shelf]];
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
      <button class="btn px" type="button" data-request ${book.available > 0 && !mine.has(book.id) ? "" : html`disabled`}>${icon("shelf")} ${mine.has(book.id) ? "Already yours" : book.available > 0 ? "Request to borrow" : "Not available"}</button>`
  });
  maybe("[data-request]", modal.root)?.addEventListener("click", (e) => busy(e.currentTarget, async () => {
    try {
      if (!await confirmBox("Request this book?", `"${book.title}" will be reserved for you right away. Staff confirm the pickup and you will get a notification.`, "Yes, request it")) return;
      await requestBook(book.id);
      ok("Requested! It is now reserved for you. Watch the bell.");
      modal.close();
    } catch (error) {
      fail(friendly(error));
    }
  }));
  maybe("[data-read]", modal.root)?.addEventListener("click", (e) => busy(e.currentTarget, async () => {
    try {
      await markRead(book.id);
      ok("Added to your reading history.");
    } catch (error) {
      fail(friendly(error));
    }
  }));
}
async function greet() {
  const profile = current().profile;
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
  const missing = [!profile.course && "course", !profile.year_level && "year level"].filter(Boolean);
  if (missing.length) {
    const note = document.createElement("div");
    note.className = "alert alert--warning px px--warning complete-banner";
    note.innerHTML = html`<span>Please add your <strong>${missing.join(" and ")}</strong> so the library knows you better.</span> <a class="btn btn--sm" href="/profile">Complete my profile</a>`.value;
    welcome.after(note);
  }
}
boot(async ({ params }) => {
  sync(params);
  void greet().catch(() => void 0);
  watchStock(applyStock);
  const form = qs("#filters");
  qs("#q").value = state.query;
  qs("#availability").value = state.availability;
  qs("#size").value = String(state.pageSize);
  const select = qs("#category");
  for (const c of await categories()) select.append(new Option(`${c.category} (${c.total})`, c.category));
  select.value = state.category;
  const apply = () => {
    state.query = qs("#q").value.trim();
    state.category = select.value;
    state.availability = qs("#availability").value;
    state.pageSize = Number(qs("#size").value);
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
    }
  });
  await load();
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL2NvcmUvc3RvY2sudHMiLCAiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL2NhdGFsb2cudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIExpdmUgc3RvY2suIFRoZSBkYXRhYmFzZSB0ZWxscyBldmVyeW9uZSB3YXRjaGluZyB0aGUgcHVibGljIFwibGlicmFyeS1zdG9ja1wiIGNoYW5uZWwgd2hlbmV2ZXIgYSBib29rIGlzXHJcbi8vIHJlc2VydmVkLCBib3Jyb3dlZCwgcmV0dXJuZWQgb3IgaXRzIGNvcGllcyBjaGFuZ2UsIHNvIHRoZSB3ZWJzaXRlIGFuZCB0aGUgZ2FtZSBhbHdheXMgYWdyZWUuXHJcbmltcG9ydCB0eXBlIHsgU3RvY2tFdmVudCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBkYiwgaXNDb25maWd1cmVkIH0gZnJvbSBcIi4vc3VwYWJhc2VcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3YXRjaFN0b2NrKG9uQ2hhbmdlOiAoZXZlbnQ6IFN0b2NrRXZlbnQpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcclxuICBpZiAoIWlzQ29uZmlndXJlZCgpKSByZXR1cm4gKCkgPT4gdW5kZWZpbmVkO1xyXG4gIGNvbnN0IGNsaWVudCA9IGRiKCk7XHJcbiAgY29uc3QgY2hhbm5lbCA9IGNsaWVudFxyXG4gICAgLmNoYW5uZWwoXCJsaWJyYXJ5LXN0b2NrXCIpXHJcbiAgICAub24oXCJicm9hZGNhc3RcIiwgeyBldmVudDogXCJzdG9ja1wiIH0sIChtZXNzYWdlKSA9PiBvbkNoYW5nZShtZXNzYWdlLnBheWxvYWQgYXMgU3RvY2tFdmVudCkpXHJcbiAgICAuc3Vic2NyaWJlKCk7XHJcbiAgcmV0dXJuICgpID0+IHZvaWQgY2xpZW50LnJlbW92ZUNoYW5uZWwoY2hhbm5lbCk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNhdGVnb3JpZXMsIG1hcmtSZWFkLCByZXF1ZXN0Qm9vaywgc2VhcmNoQ2F0YWxvZywgdHlwZSBDYXRhbG9nUXVlcnkgfSBmcm9tIFwiLi4vYXBpL2NhdGFsb2dcIjtcclxuaW1wb3J0IHsgYm9vdCB9IGZyb20gXCIuLi9jb3JlL2Jvb3RcIjtcclxuaW1wb3J0IHsgYWN0aW9ucywgYnVzeSwgZGVib3VuY2UsIGh0bWwsIGljb24sIG1heWJlLCBtb3VudCwgcXMgfSBmcm9tIFwiLi4vY29yZS9kb21cIjtcclxuaW1wb3J0IHsgZnJpZW5kbHkgfSBmcm9tIFwiLi4vY29yZS9lcnJvcnNcIjtcclxuaW1wb3J0IHsgY29uZmlybUJveCwgb3Blbk1vZGFsIH0gZnJvbSBcIi4uL2NvcmUvbW9kYWxcIjtcclxuaW1wb3J0IHsgcmV2ZWFsIH0gZnJvbSBcIi4uL2NvcmUvbW90aW9uXCI7XHJcbmltcG9ydCB7IGZhaWwsIG9rIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcclxuaW1wb3J0IHsgcGx1cmFsIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XHJcbmltcG9ydCB7IGJvb2tDYXJkLCBjb3ZlciwgZW1wdHksIGxvYWRpbmcsIG1pbmVCYWRnZSwgcGFnaW5hdGlvbiwgc3RvY2tCYWRnZSwgdHlwZSBNeVN0YXR1cyB9IGZyb20gXCIuLi91aS9jb21wb25lbnRzXCI7XHJcbmltcG9ydCB0eXBlIHsgQ2F0YWxvZ0Jvb2ssIFN0b2NrRXZlbnQgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgd2F0Y2hTdG9jayB9IGZyb20gXCIuLi9jb3JlL3N0b2NrXCI7XHJcbmltcG9ydCB7IG15TG9hbnMgfSBmcm9tIFwiLi4vYXBpL2xvYW5zXCI7XHJcbmltcG9ydCB7IGN1cnJlbnQgfSBmcm9tIFwiLi4vY29yZS9zZXNzaW9uXCI7XHJcbmltcG9ydCB7IGR1ZUxhYmVsIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XHJcblxyXG5jb25zdCBzdGF0ZTogQ2F0YWxvZ1F1ZXJ5ID0geyBxdWVyeTogXCJcIiwgY2F0ZWdvcnk6IFwiXCIsIGF2YWlsYWJpbGl0eTogXCJhbGxcIiwgcGFnZTogMSwgcGFnZVNpemU6IDEyIH07XHJcbmxldCBzaG93bjogQ2F0YWxvZ0Jvb2tbXSA9IFtdO1xyXG5jb25zdCBtaW5lID0gbmV3IE1hcDxzdHJpbmcsIE15U3RhdHVzPigpO1xyXG5cclxuLy8gd2hpY2ggYm9va3MgYXJlIHlvdXJzIChyZXF1ZXN0ZWQgb3IgYm9ycm93ZWQpLCBzbyB0aGUgY2FyZHMgY2FuIHNheSBzb1xyXG5hc3luYyBmdW5jdGlvbiBsb2FkTWluZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBsb2FucyA9IGF3YWl0IG15TG9hbnMoY3VycmVudCgpLnByb2ZpbGUhLmlkKTtcclxuICBtaW5lLmNsZWFyKCk7XHJcbiAgZm9yIChjb25zdCBsb2FuIG9mIGxvYW5zKSBpZiAobG9hbi5zdGF0dXMgPT09IFwicmVxdWVzdGVkXCIgfHwgbG9hbi5zdGF0dXMgPT09IFwiYm9ycm93ZWRcIikgbWluZS5zZXQobG9hbi5ib29rX2lkLCBsb2FuLnN0YXR1cyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdDYXJkcygpOiB2b2lkIHtcclxuICBjb25zdCByZXN1bHRzID0gcXMoXCIjcmVzdWx0c1wiKTtcclxuICBtb3VudChyZXN1bHRzLCBzaG93bi5sZW5ndGggPyBodG1sYCR7c2hvd24ubWFwKChiKSA9PiBib29rQ2FyZChiLCBtaW5lLmdldChiLmlkKSkpfWAgOiBlbXB0eShcIk5vdGhpbmcgbWF0Y2hlZFwiLCBcIlRyeSBmZXdlciB3b3JkcyBvciBhbm90aGVyIHN1YmplY3QuXCIpKTtcclxufVxyXG5cclxuLy8gc29tZWJvZHkgcmVzZXJ2ZWQsIGJvcnJvd2VkIG9yIHJldHVybmVkIGEgYm9vayAob24gdGhlIHNpdGUgb3IgaW4gdGhlIGdhbWUpOiB1cGRhdGUgdGhlIGNhcmQgYXQgb25jZVxyXG5mdW5jdGlvbiBhcHBseVN0b2NrKGV2ZW50OiBTdG9ja0V2ZW50KTogdm9pZCB7XHJcbiAgY29uc3QgYm9vayA9IHNob3duLmZpbmQoKGIpID0+IGIuaWQgPT09IGV2ZW50LmJvb2tfaWQpO1xyXG4gIGlmICghYm9vaykgcmV0dXJuO1xyXG4gIE9iamVjdC5hc3NpZ24oYm9vaywgeyBjb3BpZXM6IGV2ZW50LmNvcGllcywgYm9ycm93ZWQ6IGV2ZW50LmJvcnJvd2VkLCByZXNlcnZlZDogZXZlbnQucmVzZXJ2ZWQsIGF2YWlsYWJsZTogZXZlbnQuYXZhaWxhYmxlIH0pO1xyXG4gIHZvaWQgbG9hZE1pbmUoKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpLmZpbmFsbHkoZHJhd0NhcmRzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3luYyhwYXJhbXM6IFVSTFNlYXJjaFBhcmFtcyk6IHZvaWQge1xyXG4gIHN0YXRlLnF1ZXJ5ID0gcGFyYW1zLmdldChcInFcIikgPz8gXCJcIjtcclxuICBzdGF0ZS5jYXRlZ29yeSA9IHBhcmFtcy5nZXQoXCJjYXRlZ29yeVwiKSA/PyBcIlwiO1xyXG4gIHN0YXRlLmF2YWlsYWJpbGl0eSA9IChwYXJhbXMuZ2V0KFwiYXZhaWxhYmlsaXR5XCIpIGFzIENhdGFsb2dRdWVyeVtcImF2YWlsYWJpbGl0eVwiXSkgPz8gXCJhbGxcIjtcclxuICBzdGF0ZS5wYWdlID0gTWF0aC5tYXgoMSwgTnVtYmVyKHBhcmFtcy5nZXQoXCJwYWdlXCIpKSB8fCAxKTtcclxuICBzdGF0ZS5wYWdlU2l6ZSA9IE51bWJlcihwYXJhbXMuZ2V0KFwic2l6ZVwiKSkgfHwgMTI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlVXJsKCk6IHZvaWQge1xyXG4gIGNvbnN0IHAgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XHJcbiAgaWYgKHN0YXRlLnF1ZXJ5KSBwLnNldChcInFcIiwgc3RhdGUucXVlcnkpO1xyXG4gIGlmIChzdGF0ZS5jYXRlZ29yeSkgcC5zZXQoXCJjYXRlZ29yeVwiLCBzdGF0ZS5jYXRlZ29yeSk7XHJcbiAgaWYgKHN0YXRlLmF2YWlsYWJpbGl0eSAhPT0gXCJhbGxcIikgcC5zZXQoXCJhdmFpbGFiaWxpdHlcIiwgc3RhdGUuYXZhaWxhYmlsaXR5KTtcclxuICBpZiAoc3RhdGUucGFnZSA+IDEpIHAuc2V0KFwicGFnZVwiLCBTdHJpbmcoc3RhdGUucGFnZSkpO1xyXG4gIGlmIChzdGF0ZS5wYWdlU2l6ZSAhPT0gMTIpIHAuc2V0KFwic2l6ZVwiLCBTdHJpbmcoc3RhdGUucGFnZVNpemUpKTtcclxuICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBcIlwiLCBwLnNpemUgPyBgPyR7cH1gIDogbG9jYXRpb24ucGF0aG5hbWUpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHJlc3VsdHMgPSBxcyhcIiNyZXN1bHRzXCIpO1xyXG4gIG1vdW50KHJlc3VsdHMsIGxvYWRpbmcoKSk7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBhZ2UgPSBhd2FpdCBzZWFyY2hDYXRhbG9nKHN0YXRlKTtcclxuICAgIHNob3duID0gcGFnZS5ib29rcztcclxuICAgIGNvbnN0IHBhZ2VzID0gTWF0aC5tYXgoMSwgTWF0aC5jZWlsKHBhZ2UudG90YWwgLyBzdGF0ZS5wYWdlU2l6ZSkpO1xyXG4gICAgcXMoXCIjcmVzdWx0Q291bnRcIikudGV4dENvbnRlbnQgPSBwYWdlLnRvdGFsID8gYCR7cGx1cmFsKHBhZ2UudG90YWwsIFwiYm9va1wiKX0gZm91bmRgIDogXCJcIjtcclxuICAgIGF3YWl0IGxvYWRNaW5lKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcclxuICAgIGRyYXdDYXJkcygpO1xyXG4gICAgbW91bnQocXMoXCIjcGFnZXJcIiksIHBhZ2luYXRpb24oc3RhdGUucGFnZSwgcGFnZXMpKTtcclxuICAgIHJldmVhbChyZXN1bHRzKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbW91bnQocmVzdWx0cywgaHRtbGA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtLWRhbmdlciBweCBweC0tZGFuZ2VyXCI+JHtmcmllbmRseShlcnJvcil9PC9kaXY+YCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93Qm9vayhib29rOiBDYXRhbG9nQm9vayk6IHZvaWQge1xyXG4gIGNvbnN0IGZhY3RzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbW1wiQXV0aG9yXCIsIGJvb2suYXV0aG9yXSwgW1wiU3ViamVjdFwiLCBib29rLmNhdGVnb3J5XSwgW1wiR2VucmVcIiwgYm9vay5nZW5yZV0sIFtib29rLnB1YmxpY2F0aW9uX2xhYmVsIHx8IFwiUHVibGlzaGVkXCIsIGJvb2sucHVibGlzaGVkXSwgW1wiUHVibGlzaGVyXCIsIGJvb2sucHVibGlzaGVyXSwgW1wiTGFuZ3VhZ2VcIiwgYm9vay5sYW5ndWFnZV0sIFtcIlNoZWxmXCIsIGJvb2suc2hlbGZdXTtcclxuICBjb25zdCBtb2RhbCA9IG9wZW5Nb2RhbChib29rLnRpdGxlLCBodG1sYFxyXG4gICAgPGRpdiBjbGFzcz1cImJvb2stZGV0YWlsXCI+XHJcbiAgICAgICR7Y292ZXIoYm9vayl9XHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgJHttaW5lQmFkZ2UobWluZS5nZXQoYm9vay5pZCkpfSR7c3RvY2tCYWRnZShib29rKX1cclxuICAgICAgICA8ZGwgY2xhc3M9XCJib29rLWRldGFpbF9fZmFjdHNcIj4ke2ZhY3RzLmZpbHRlcigoWywgdl0pID0+IHYpLm1hcCgoW2ssIHZdKSA9PiBodG1sYDxkdD4ke2t9PC9kdD48ZGQ+JHt2fTwvZGQ+YCl9PC9kbD5cclxuICAgICAgICA8cD4ke2Jvb2suc3lub3BzaXMgfHwgXCJObyBzdW1tYXJ5IHlldC5cIn08L3A+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+YCwge1xyXG4gICAgd2lkZTogdHJ1ZSxcclxuICAgIGZvb3RlcjogaHRtbGBcclxuICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXF1aWV0IHB4XCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtY2xvc2U+Q2xvc2U8L2J1dHRvbj5cclxuICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXNlY29uZGFyeSBweFwiIHR5cGU9XCJidXR0b25cIiBkYXRhLXJlYWQ+JHtpY29uKFwiY2hlY2tcIil9IEkgcmVhZCB0aGlzPC9idXR0b24+XHJcbiAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gcHhcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1yZXF1ZXN0ICR7Ym9vay5hdmFpbGFibGUgPiAwICYmICFtaW5lLmhhcyhib29rLmlkKSA/IFwiXCIgOiBodG1sYGRpc2FibGVkYH0+JHtpY29uKFwic2hlbGZcIil9ICR7bWluZS5oYXMoYm9vay5pZCkgPyBcIkFscmVhZHkgeW91cnNcIiA6IGJvb2suYXZhaWxhYmxlID4gMCA/IFwiUmVxdWVzdCB0byBib3Jyb3dcIiA6IFwiTm90IGF2YWlsYWJsZVwifTwvYnV0dG9uPmAsXHJcbiAgfSk7XHJcbiAgbWF5YmU8SFRNTEJ1dHRvbkVsZW1lbnQ+KFwiW2RhdGEtcmVxdWVzdF1cIiwgbW9kYWwucm9vdCk/LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4gYnVzeShlLmN1cnJlbnRUYXJnZXQgYXMgSFRNTEVsZW1lbnQsIGFzeW5jICgpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGlmICghKGF3YWl0IGNvbmZpcm1Cb3goXCJSZXF1ZXN0IHRoaXMgYm9vaz9cIiwgYFwiJHtib29rLnRpdGxlfVwiIHdpbGwgYmUgcmVzZXJ2ZWQgZm9yIHlvdSByaWdodCBhd2F5LiBTdGFmZiBjb25maXJtIHRoZSBwaWNrdXAgYW5kIHlvdSB3aWxsIGdldCBhIG5vdGlmaWNhdGlvbi5gLCBcIlllcywgcmVxdWVzdCBpdFwiKSkpIHJldHVybjtcclxuICAgICAgYXdhaXQgcmVxdWVzdEJvb2soYm9vay5pZCk7XHJcbiAgICAgIG9rKFwiUmVxdWVzdGVkISBJdCBpcyBub3cgcmVzZXJ2ZWQgZm9yIHlvdS4gV2F0Y2ggdGhlIGJlbGwuXCIpO1xyXG4gICAgICBtb2RhbC5jbG9zZSgpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgZmFpbChmcmllbmRseShlcnJvcikpO1xyXG4gICAgfVxyXG4gIH0pKTtcclxuICBtYXliZShcIltkYXRhLXJlYWRdXCIsIG1vZGFsLnJvb3QpPy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IGJ1c3koZS5jdXJyZW50VGFyZ2V0IGFzIEhUTUxFbGVtZW50LCBhc3luYyAoKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBtYXJrUmVhZChib29rLmlkKTtcclxuICAgICAgb2soXCJBZGRlZCB0byB5b3VyIHJlYWRpbmcgaGlzdG9yeS5cIik7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBmYWlsKGZyaWVuZGx5KGVycm9yKSk7XHJcbiAgICB9XHJcbiAgfSkpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBncmVldCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBwcm9maWxlID0gY3VycmVudCgpLnByb2ZpbGUhO1xyXG4gIGNvbnN0IGxvYW5zID0gYXdhaXQgbXlMb2Fucyhwcm9maWxlLmlkKTtcclxuICBjb25zdCBvdXQgPSBsb2Fucy5maWx0ZXIoKGwpID0+IGwuc3RhdHVzID09PSBcImJvcnJvd2VkXCIpO1xyXG4gIGNvbnN0IHdhaXRpbmcgPSBsb2Fucy5maWx0ZXIoKGwpID0+IGwuc3RhdHVzID09PSBcInJlcXVlc3RlZFwiKS5sZW5ndGg7XHJcbiAgY29uc3QgbmV4dCA9IG91dC5maWx0ZXIoKGwpID0+IGwuZHVlX2F0KS5zb3J0KChhLCBiKSA9PiBTdHJpbmcoYS5kdWVfYXQpLmxvY2FsZUNvbXBhcmUoU3RyaW5nKGIuZHVlX2F0KSkpWzBdO1xyXG4gIGNvbnN0IHdlbGNvbWUgPSBxcyhcIiN3ZWxjb21lXCIpO1xyXG4gIG1vdW50KHdlbGNvbWUsIGh0bWxgXHJcbiAgICA8ZGl2PjxoMT5IaSwgJHtwcm9maWxlLnVzZXJuYW1lfTwvaDE+PHA+JHtuZXh0ID8gYE5leHQgZHVlOiAke25leHQuYm9vaz8udGl0bGV9ICgke2R1ZUxhYmVsKG5leHQuZHVlX2F0KS50ZXh0LnRvTG93ZXJDYXNlKCl9KWAgOiBcIldoYXQgYXJlIHlvdSBpbiB0aGUgbW9vZCB0byByZWFkP1wifTwvcD48L2Rpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJ3ZWxjb21lX19mYWN0c1wiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwid2VsY29tZV9fZmFjdFwiPjxzdHJvbmc+JHtvdXQubGVuZ3RofTwvc3Ryb25nPjxzcGFuPmJvcnJvd2VkPC9zcGFuPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwid2VsY29tZV9fZmFjdFwiPjxzdHJvbmc+JHt3YWl0aW5nfTwvc3Ryb25nPjxzcGFuPndhaXRpbmc8L3NwYW4+PC9kaXY+XHJcbiAgICA8L2Rpdj5gKTtcclxuICB3ZWxjb21lLmhpZGRlbiA9IGZhbHNlO1xyXG4gIGNvbnN0IG1pc3NpbmcgPSBbIXByb2ZpbGUuY291cnNlICYmIFwiY291cnNlXCIsICFwcm9maWxlLnllYXJfbGV2ZWwgJiYgXCJ5ZWFyIGxldmVsXCJdLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcclxuICBpZiAobWlzc2luZy5sZW5ndGgpIHtcclxuICAgIGNvbnN0IG5vdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgbm90ZS5jbGFzc05hbWUgPSBcImFsZXJ0IGFsZXJ0LS13YXJuaW5nIHB4IHB4LS13YXJuaW5nIGNvbXBsZXRlLWJhbm5lclwiO1xyXG4gICAgbm90ZS5pbm5lckhUTUwgPSBodG1sYDxzcGFuPlBsZWFzZSBhZGQgeW91ciA8c3Ryb25nPiR7bWlzc2luZy5qb2luKFwiIGFuZCBcIil9PC9zdHJvbmc+IHNvIHRoZSBsaWJyYXJ5IGtub3dzIHlvdSBiZXR0ZXIuPC9zcGFuPiA8YSBjbGFzcz1cImJ0biBidG4tLXNtXCIgaHJlZj1cIi9wcm9maWxlXCI+Q29tcGxldGUgbXkgcHJvZmlsZTwvYT5gLnZhbHVlO1xyXG4gICAgd2VsY29tZS5hZnRlcihub3RlKTtcclxuICB9XHJcbn1cclxuXHJcbmJvb3QoYXN5bmMgKHsgcGFyYW1zIH0pID0+IHtcclxuICBzeW5jKHBhcmFtcyk7XHJcbiAgdm9pZCBncmVldCgpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XHJcbiAgd2F0Y2hTdG9jayhhcHBseVN0b2NrKTtcclxuICBjb25zdCBmb3JtID0gcXM8SFRNTEZvcm1FbGVtZW50PihcIiNmaWx0ZXJzXCIpO1xyXG4gIChxczxIVE1MSW5wdXRFbGVtZW50PihcIiNxXCIpKS52YWx1ZSA9IHN0YXRlLnF1ZXJ5O1xyXG4gIChxczxIVE1MU2VsZWN0RWxlbWVudD4oXCIjYXZhaWxhYmlsaXR5XCIpKS52YWx1ZSA9IHN0YXRlLmF2YWlsYWJpbGl0eTtcclxuICAocXM8SFRNTFNlbGVjdEVsZW1lbnQ+KFwiI3NpemVcIikpLnZhbHVlID0gU3RyaW5nKHN0YXRlLnBhZ2VTaXplKTtcclxuXHJcbiAgY29uc3Qgc2VsZWN0ID0gcXM8SFRNTFNlbGVjdEVsZW1lbnQ+KFwiI2NhdGVnb3J5XCIpO1xyXG4gIGZvciAoY29uc3QgYyBvZiBhd2FpdCBjYXRlZ29yaWVzKCkpIHNlbGVjdC5hcHBlbmQobmV3IE9wdGlvbihgJHtjLmNhdGVnb3J5fSAoJHtjLnRvdGFsfSlgLCBjLmNhdGVnb3J5KSk7XHJcbiAgc2VsZWN0LnZhbHVlID0gc3RhdGUuY2F0ZWdvcnk7XHJcblxyXG4gIGNvbnN0IGFwcGx5ID0gKCkgPT4ge1xyXG4gICAgc3RhdGUucXVlcnkgPSBxczxIVE1MSW5wdXRFbGVtZW50PihcIiNxXCIpLnZhbHVlLnRyaW0oKTtcclxuICAgIHN0YXRlLmNhdGVnb3J5ID0gc2VsZWN0LnZhbHVlO1xyXG4gICAgc3RhdGUuYXZhaWxhYmlsaXR5ID0gcXM8SFRNTFNlbGVjdEVsZW1lbnQ+KFwiI2F2YWlsYWJpbGl0eVwiKS52YWx1ZSBhcyBDYXRhbG9nUXVlcnlbXCJhdmFpbGFiaWxpdHlcIl07XHJcbiAgICBzdGF0ZS5wYWdlU2l6ZSA9IE51bWJlcihxczxIVE1MU2VsZWN0RWxlbWVudD4oXCIjc2l6ZVwiKS52YWx1ZSk7XHJcbiAgICBzdGF0ZS5wYWdlID0gMTtcclxuICAgIHdyaXRlVXJsKCk7XHJcbiAgICB2b2lkIGxvYWQoKTtcclxuICB9O1xyXG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCAoZSkgPT4gZS5wcmV2ZW50RGVmYXVsdCgpKTtcclxuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCBkZWJvdW5jZShhcHBseSkpO1xyXG4gIHFzKFwiI2NsZWFyRmlsdGVyc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgZm9ybS5yZXNldCgpO1xyXG4gICAgYXBwbHkoKTtcclxuICB9KTtcclxuXHJcbiAgY29uc3Qgcm9vdCA9IHFzKFwiW2RhdGEtcGFnZS1yb290XVwiKTtcclxuICBhY3Rpb25zKHJvb3QsIHtcclxuICAgIFwib3Blbi1ib29rXCI6IChlbCkgPT4ge1xyXG4gICAgICBjb25zdCBib29rID0gc2hvd24uZmluZCgoYikgPT4gYi5pZCA9PT0gZWwuZGF0YXNldC5pZCk7XHJcbiAgICAgIGlmIChib29rKSBzaG93Qm9vayhib29rKTtcclxuICAgIH0sXHJcbiAgICBwYWdlOiAoZWwpID0+IHtcclxuICAgICAgc3RhdGUucGFnZSA9IE51bWJlcihlbC5kYXRhc2V0LnBhZ2UpO1xyXG4gICAgICB3cml0ZVVybCgpO1xyXG4gICAgICB2b2lkIGxvYWQoKTtcclxuICAgICAgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvcjogXCJzbW9vdGhcIiB9KTtcclxuICAgIH0sXHJcbiAgfSk7XHJcbiAgYXdhaXQgbG9hZCgpO1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS08sU0FBUyxXQUFXLFVBQW1EO0FBQzVFLE1BQUksQ0FBQyxhQUFhLEVBQUcsUUFBTyxNQUFNO0FBQ2xDLFFBQU0sU0FBUyxHQUFHO0FBQ2xCLFFBQU0sVUFBVSxPQUNiLFFBQVEsZUFBZSxFQUN2QixHQUFHLGFBQWEsRUFBRSxPQUFPLFFBQVEsR0FBRyxDQUFDLFlB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
