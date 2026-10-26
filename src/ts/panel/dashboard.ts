import { publicSettings, registrationInfo, settingText } from "../api/content";
import { allBooks, people, refreshOverdue, stats } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, debounce, html, icon, mount, raw } from "../core/dom";
import { dueLabel, formatDate, plural, relative } from "../core/format";
import { reveal } from "../core/motion";
import { current, hasPerm } from "../core/session";
import { chartToggle, chartCard, columns, dataTable, percentChange } from "../ui/charts";
import { empty, loading } from "../ui/components";
import type { Book, DashboardStats, Loan, Profile } from "../types";
import { checkOut, emailBorrower, rejectLoan } from "./loanActions";
import { go, type PanelTab } from "./tab";

const VERBS: Record<string, string> = { request: "requested", checkout: "borrowed", return: "returned", decline: "was declined for", cancel: "cancelled a request for" };
const REFRESH_MS = 60_000;

const greeting = (): string => {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date())) % 24;
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

function tile(label: string, value: number, note = "", tone = "", tab = "") {
  return html`<${raw(tab ? "button" : "div")} class="tile" ${tab ? raw(`type="button" data-action="open" data-tab="${tab}"`) : ""}>
    <span class="tile__label">${label}</span><span class="tile__value" data-count="${value}">0</span>${note ? html`<span class="tile__note ${tone}">${note}</span>` : ""}
  </${raw(tab ? "button" : "div")}>`;
}

export const dashboard: PanelTab = {
  id: "dashboard",
  label: "Dashboard",
  icon: "dashboard",
  async render(root) {
    const profile = current().profile!;
    mount(root, loading("Counting the shelves"));
    let timer: ReturnType<typeof setInterval> | undefined;
    let index: { books: Book[]; loans: Loan[]; students: Profile[] } | null = null;

    const draw = async () => {
      const [s, open, settings, registration] = await Promise.all([stats(), loansByStatus(["requested", "borrowed"]), publicSettings(), registrationInfo().catch(() => null)]);
      return paint(s, open, settings, registration?.open ?? true);
    };

    const paint = (s: DashboardStats, open: Loan[], settings: Record<string, unknown>, registrationOpen: boolean) => {
      const waiting = open.filter((l) => l.status === "requested");
      const overdue = open.filter((l) => l.status === "borrowed" && l.due_at && new Date(l.due_at).getTime() < Date.now());
      const change = percentChange(s.requests_now, s.requests_before);
      const series = s.series.map((d) => ({ label: d.day.slice(5), value: Number(d.total) }));
      const status = settingText(settings, "game_status", "maintenance");
      const notice = settingText(settings, "site_notice");
      const scroll = root.querySelector<HTMLInputElement>("#dashQuery")?.value ?? "";
      mount(root, html`
        <div class="panel__tab">
          <div class="panel__heading">
            <div><h2>${greeting()}, ${profile.username}</h2>
              <p class="text-soft">${waiting.length ? `${plural(waiting.length, "request")} waiting` : "No requests waiting"}${overdue.length ? `, ${plural(overdue.length, "loan")} overdue` : ""}. ${s.due_soon ? `${plural(s.due_soon, "loan")} due in the next 2 days.` : "Nothing due soon."}</p></div>
          </div>
          <div class="field search dash-search"><label class="visually-hidden" for="dashQuery">Search books, loans and students</label>${icon("search")}
            <input class="input" id="dashQuery" type="search" placeholder="Search books, loans and students (press / to focus)" autocomplete="off" value="${scroll}">
            <div class="dash-search__results" id="dashResults" hidden></div></div>
          <div class="tile-grid">
            ${tile("Titles", s.titles, `${s.copies} copies`, "", "books")}
            ${tile("Waiting requests", s.requested, "", "", "circulation")}
            ${tile("On loan", s.borrowed, `${s.due_soon} due soon`, "", "circulation")}
            ${tile("Overdue", s.overdue, s.overdue ? "needs follow-up" : "all on time", s.overdue ? "tile__note--down" : "tile__note--up", "circulation")}
          </div>
          ${chartCard("chartRequests", `Loan requests, last 14 days (${change} vs the 14 days before)`, columns(series), dataTable(["Day", "Requests"], series.map((d) => [d.label, d.value])))}
          <div class="grid grid--2">
            <section class="card px" data-reveal><div class="panel__heading"><h3>Waiting requests</h3><button class="btn btn--sm btn--quiet" type="button" data-action="open" data-tab="circulation">See all</button></div>
              ${waiting.length ? html`<ul class="list">${waiting.slice(0, 5).map((l) => html`<li class="list__item"><div class="list__body"><p class="list__title">${l.book?.title}</p><p class="list__meta">${l.profile?.username} · ${relative(l.requested_at)}</p></div>
                <div class="table__actions"><button class="btn btn--sm" type="button" data-action="checkout" data-id="${l.id}">${icon("check")} Check out</button><button class="btn btn--sm btn--danger" type="button" data-action="reject" data-id="${l.id}">${icon("cross")}</button></div></li>`)}</ul>` : empty("No waiting requests", "You are all caught up.", "check")}</section>
            <section class="card px" data-reveal><h3>Overdue loans</h3>
              ${overdue.length ? html`<ul class="list">${overdue.slice(0, 5).map((l) => html`<li class="list__item"><div class="list__body"><p class="list__title">${l.book?.title}</p><p class="list__meta">${l.profile?.username} · <span class="text-danger">${dueLabel(l.due_at).text}</span></p></div>
                <button class="btn btn--sm btn--secondary" type="button" data-action="email" data-id="${l.id}">${icon("mail")} Email</button></li>`)}</ul>` : empty("Nothing overdue", "Every loan is on time.", "check")}
              ${s.full_titles.length ? html`<h4 class="dash-sub">Every copy on loan</h4><ul class="chips">${s.full_titles.map((t) => html`<li class="chip">${t.title}</li>`)}</ul>` : ""}</section>
          </div>
          <div class="grid grid--2">
            <section class="card px" data-reveal><h3>Recent activity</h3>
              ${s.recent.length ? html`<ul class="list">${s.recent.map((a) => html`<li class="list__item"><div class="list__body"><p><strong>${a.username}</strong> ${VERBS[a.type] ?? a.type} ${a.title ?? ""}</p><p class="list__meta">${relative(a.created_at)}</p></div></li>`)}</ul>` : empty("No activity yet", "Requests and returns appear here.", "clock")}</section>
            <section class="card px" data-reveal><h3>Quick actions</h3>
              <div class="cluster"><button class="btn btn--sm" type="button" data-action="open" data-tab="books">${icon("plus")} Add a book</button><button class="btn btn--sm btn--secondary" type="button" data-action="open" data-tab="announcements">${icon("news")} New announcement</button><a class="btn btn--sm btn--accent" href="/pickup">${icon("qr")} Scan pickup</a><button class="btn btn--sm btn--quiet" type="button" data-action="open" data-tab="analytics">${icon("chart")} Analytics</button></div>
              <h4 class="dash-sub">Site status</h4>
              <ul class="status-list"><li><span class="status-dot" data-state="${status}"></span>Game: <strong>${status === "online" ? "live" : status}</strong></li>
                <li><span class="status-dot" data-state="${registrationOpen ? "online" : "maintenance"}"></span>Registration: <strong>${registrationOpen ? "open" : "closed"}</strong></li>
                <li><span class="status-dot" data-state="${notice ? "online" : "offline"}"></span>Site notice: <strong>${notice ? "showing" : "none"}</strong></li></ul>
              <p class="field__hint">Updated ${formatDate(new Date().toISOString())}. This page refreshes itself every minute.</p></section>
          </div>
        </div>`);
      reveal(root);
      wireSearch();
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => { el.textContent = el.dataset.count ?? "0"; });
      lookup.open = open;
    };
    const lookup: { open: Loan[] } = { open: [] };

    // ---- quick search over books, loans and students (loaded the first time the box is used)
    const loadIndex = async () => {
      if (index) return index;
      const [books, loans, students] = await Promise.all([allBooks(), loansByStatus(["requested", "borrowed", "returned", "rejected", "cancelled"], 1000), hasPerm("students") ? people() : Promise.resolve([] as Profile[])]);
      index = { books, loans, students };
      return index;
    };
    function wireSearch() {
      const input = root.querySelector<HTMLInputElement>("#dashQuery");
      const box = root.querySelector<HTMLElement>("#dashResults");
      if (!input || !box) return;
      const run = debounce(async () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) { box.hidden = true; return; }
        const data = await loadIndex();
        const hit = (...parts: (string | null | undefined)[]) => parts.join(" ").toLowerCase().includes(q);
        const books = data.books.filter((b) => hit(b.title, b.author, b.id)).slice(0, 4);
        const loans = data.loans.filter((l) => hit(l.book?.title, l.profile?.username, l.profile?.full_name, l.profile?.student_id, String(l.id))).slice(0, 4);
        const students = data.students.filter((p) => hit(p.username, p.full_name, p.email, p.student_id)).slice(0, 4);
        box.hidden = false;
        mount(box, books.length + loans.length + students.length === 0
          ? html`<p class="dash-search__empty">Nothing found for "${q}".</p>`
          : html`${books.map((b) => html`<button class="dash-search__row" type="button" data-action="jump" data-tab="books" data-q="${b.title}">${icon("book")} <span><strong>${b.title}</strong> <small>${b.author}</small></span><em>Book</em></button>`)}
            ${loans.map((l) => html`<button class="dash-search__row" type="button" data-action="jump" data-tab="circulation" data-q="${l.profile?.username ?? ""}">${icon("shelf")} <span><strong>${l.book?.title}</strong> <small>${l.profile?.username} · ${l.status}</small></span><em>Loan</em></button>`)}
            ${students.map((p) => html`<button class="dash-search__row" type="button" data-action="jump" data-tab="students" data-q="${p.username}">${icon("user")} <span><strong>${p.username}</strong> <small>${p.full_name}</small></span><em>Student</em></button>`)}`);
      }, 200);
      input.addEventListener("input", run);
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !(event.target as HTMLElement).matches("input, textarea, select")) { event.preventDefault(); root.querySelector<HTMLInputElement>("#dashQuery")?.focus(); }
    });

    const refresh = async () => { try { await draw(); } catch { /* keep what is on screen */ } };
    const act = async (work: () => Promise<boolean>) => { if (await work()) await refresh(); };
    const loanOf = (el: HTMLElement) => lookup.open.find((l) => l.id === Number(el.dataset.id))!;
    actions(root, {
      open: (el) => go(el.dataset.tab ?? "dashboard"),
      jump: (el) => go(el.dataset.tab ?? "dashboard", el.dataset.q),
      checkout: (el) => act(() => checkOut(loanOf(el), true)),
      reject: (el) => act(() => rejectLoan(loanOf(el))),
      email: (el) => act(() => emailBorrower(loanOf(el))),
    });
    chartToggle(root);

    void refreshOverdue().catch(() => undefined);
    await draw();
    timer = setInterval(() => { if (!root.isConnected) clearInterval(timer); else void refresh(); }, REFRESH_MS);
  },
};
