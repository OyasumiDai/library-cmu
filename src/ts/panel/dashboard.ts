import { publicSettings, registrationInfo, settingText } from "../api/content";
import { allBooks, loanEmails, people, refreshOverdue, stats, type LoanEmail } from "../api/staff";
import { expireUnclaimed, loanFines, loansByStatus, type LoanFine } from "../api/loans";
import { actions, debounce, html, icon, mount } from "../core/dom";
import { dueLabel, formatDateTime, peso, plural, relative } from "../core/format";
import { reveal } from "../core/motion";
import { current, hasPerm } from "../core/session";
import { chartToggle, chartCard, columns, dataTable, kpi, percentChange, ranking } from "../ui/charts";
import { empty, loading } from "../ui/components";
import type { Book, DashboardStats, Loan, Profile } from "../types";
import { checkOut, emailBorrower, rejectLoan } from "./loanActions";
import { go, type PanelTab } from "./tab";

const VERBS: Record<string, string> = { request: "requested", checkout: "borrowed", return: "returned", decline: "was declined for", cancel: "cancelled a request for" };
const ACTIVITY_ICONS: Record<string, string> = { request: "bell", checkout: "shelf", return: "check", decline: "cross", cancel: "cross" };
const REFRESH_MS = 60_000;

const greeting = (): string => {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date())) % 24;
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};
const today = (): string => new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date());

export const dashboard: PanelTab = {
  id: "dashboard",
  label: "Dashboard",
  icon: "dashboard",
  async render(root) {
    const profile = current().profile!;
    mount(root, loading("Counting the shelves"));
    let timer: ReturnType<typeof setInterval> | undefined;
    let index: { books: Book[]; loans: Loan[]; students: Profile[] } | null = null;
    let emailed = new Map<number, LoanEmail[]>(); // reminders already sent per loan

    const draw = async () => {
      await expireUnclaimed().catch(() => 0); // requests past the 2-day pickup window are cancelled and emailed
      const [s, open, settings, registration] = await Promise.all([stats(), loansByStatus(["requested", "borrowed"]), publicSettings(), registrationInfo().catch(() => null)]);
      const fines = await loanFines(open.filter((l) => l.status === "borrowed").map((l) => l.id)).catch(() => new Map<number, LoanFine>());
      emailed = await loanEmails(open.filter((l) => l.status === "borrowed").map((l) => l.id)).catch(() => new Map());
      return paint(s, open, settings, registration?.open ?? true, fines);
    };

    const paint = (s: DashboardStats, open: Loan[], settings: Record<string, unknown>, registrationOpen: boolean, fines: Map<number, LoanFine>) => {
      const owed = [...fines.values()].reduce((sum, f) => sum + f.amount, 0);
      const waiting = open.filter((l) => l.status === "requested");
      const overdue = open.filter((l) => l.status === "borrowed" && l.due_at && new Date(l.due_at).getTime() < Date.now());
      const change = percentChange(s.requests_now, s.requests_before);
      const series = s.series.map((d) => ({ label: d.day.slice(5), value: Number(d.total) }));
      const status = settingText(settings, "game_status", "maintenance");
      const notice = settingText(settings, "site_notice");
      const typed = root.querySelector<HTMLInputElement>("#dashQuery")?.value ?? "";
      const popular = s.popular.slice(0, 5).map((p) => ({ label: p.title, value: Number(p.total) }));
      const summary = [
        waiting.length ? `${plural(waiting.length, "request")} waiting` : "No requests waiting",
        overdue.length ? `${plural(overdue.length, "loan")} overdue` : "nothing overdue",
        s.due_soon ? `${plural(s.due_soon, "loan")} due in the next 2 days` : "nothing due soon",
      ].join(" · ");

      mount(root, html`
        <div class="panel__tab dash">
          <header class="dash-hero card px">
            <div class="dash-hero__text">
              <span class="eyebrow">${today()}</span>
              <h2>${greeting()}, ${profile.full_name?.split(" ")[0] || profile.username}</h2>
              <p class="text-soft">${summary}.</p>
            </div>
            <div class="dash-hero__actions">
              <a class="btn btn--accent" href="/pickup">${icon("qr")} Scan pickup</a>
              <button class="btn btn--secondary" type="button" data-action="open" data-tab="books">${icon("plus")} Add a book</button>
              <button class="btn btn--quiet" type="button" data-action="open" data-tab="announcements">${icon("news")} Announce</button>
            </div>
            <div class="field search dash-search"><label class="visually-hidden" for="dashQuery">Search books, loans and students</label>${icon("search")}
              <input class="input" id="dashQuery" type="search" placeholder="Search books, loans and students (press / to focus)" autocomplete="off" value="${typed}">
              <div class="dash-search__results" id="dashResults" hidden></div></div>
          </header>

          <div class="kpi-grid">
            ${kpi({ label: "Requests", value: s.requested, icon: "bell", tone: 2, tab: "circulation", note: waiting.length ? "waiting to check out" : "all caught up", trend: waiting.length ? "" : "up" })}
            ${kpi({ label: "On loan", value: s.borrowed, icon: "shelf", tone: 1, tab: "circulation", note: `${s.due_soon} due soon` })}
            ${kpi({ label: "Overdue", value: s.overdue, icon: "clock", tone: 4, tab: "circulation", note: s.overdue ? (owed ? `${peso(owed)} in fines` : "needs follow-up") : "all on time", trend: s.overdue ? "down" : "up" })}
            ${kpi({ label: "Titles", value: s.titles, icon: "book", tone: 3, tab: "books", note: `${s.copies} copies` })}
            ${kpi({ label: "Students", value: s.students, icon: "users", tone: 5, tab: hasPerm("students") ? "students" : undefined, note: s.new_students ? `+${s.new_students} new this month` : "no new sign-ups", trend: s.new_students ? "up" : "" })}
          </div>

          <div class="dash-grid">
            <div class="dash-grid__main">
              ${chartCard("chartRequests", `Loan requests, last 14 days`, columns(series), dataTable(["Day", "Requests"], series.map((d) => [d.label, d.value])),
                html`<span class="chip ${change.startsWith("-") ? "chip--down" : "chip--up"}">${change} vs the 14 days before</span>`)}
              <section class="card px" data-reveal>
                <div class="card__head"><h3>${icon("bell")} Waiting requests</h3><button class="btn btn--sm btn--quiet" type="button" data-action="open" data-tab="circulation">See all</button></div>
                ${waiting.length ? html`<ul class="list">${waiting.slice(0, 6).map((l) => html`<li class="list__item dash-row">
                  <div class="list__body"><p class="list__title">${l.book?.title}</p><p class="list__meta">${l.profile?.full_name || l.profile?.username} · ${relative(l.requested_at)}</p></div>
                  <div class="table__actions"><button class="btn btn--sm" type="button" data-action="checkout" data-id="${l.id}">${icon("check")} Check out</button><button class="btn btn--sm btn--danger" type="button" data-action="reject" data-id="${l.id}" aria-label="Decline">${icon("cross")}</button></div></li>`)}</ul>`
                  : empty("No waiting requests", "You are all caught up.", "check")}
              </section>
              <section class="card px" data-reveal>
                <h3>${icon("refresh")} Recent activity</h3>
                ${s.recent.length ? html`<ul class="feed">${s.recent.slice(0, 6).map((a) => html`<li class="feed__item"><span class="feed__dot" data-kind="${a.type}">${icon(ACTIVITY_ICONS[a.type] ?? "info")}</span>
                  <div class="feed__text"><p><strong>${a.username}</strong> ${VERBS[a.type] ?? a.type} <em>${a.title ?? ""}</em></p><p class="list__meta">${relative(a.created_at)}</p></div></li>`)}</ul>`
                  : empty("No activity yet", "Requests and returns appear here.", "clock")}
              </section>
            </div>

            <aside class="dash-grid__side">
              <section class="card px" data-reveal>
                <div class="card__head"><h3>${icon("clock")} Overdue</h3>${overdue.length ? html`<span class="chip chip--down">${overdue.length}</span>` : ""}</div>
                ${overdue.length ? html`<ul class="list">${overdue.slice(0, 5).map((l) => html`<li class="list__item dash-row"><div class="list__body"><p class="list__title">${l.book?.title}</p><p class="list__meta">${l.profile?.username} · <span class="text-danger">${dueLabel(l.due_at).text}${fines.get(l.id)?.amount ? ` · fine ${peso(fines.get(l.id)!.amount)}` : ""}</span>${emailed.get(l.id)?.length ? html` · <span class="emailed-dot" title="Last emailed ${formatDateTime(emailed.get(l.id)![0].sent_at)}">${icon("mail")} emailed${emailed.get(l.id)!.length > 1 ? ` ${emailed.get(l.id)!.length}x` : ""}</span>` : ""}</p></div>
                  <button class="btn btn--sm btn--secondary" type="button" data-action="email" data-id="${l.id}" aria-label="Email the borrower">${icon("mail")}</button></li>`)}</ul>`
                  : empty("Nothing overdue", "Every loan is on time.", "check")}
                ${s.full_titles.length ? html`<h4 class="dash-sub">Every copy on loan</h4><ul class="chips">${s.full_titles.map((t) => html`<li class="chip">${t.title}</li>`)}</ul>` : ""}
              </section>
              <section class="card px" data-reveal>
                <div class="card__head"><h3>${icon("star")} Most borrowed</h3><button class="btn btn--sm btn--quiet" type="button" data-action="open" data-tab="analytics">More</button></div>
                ${ranking(popular)}
              </section>
              <section class="card px" data-reveal>
                <h3>${icon("settings")} Site status</h3>
                <ul class="status-list status-list--dash"><li><span class="status-dot" data-state="${status}"></span><span>Game</span><strong>${status === "online" ? "live" : status}</strong></li>
                  <li><span class="status-dot" data-state="${registrationOpen ? "online" : "maintenance"}"></span><span>Registration</span><strong>${registrationOpen ? "open" : "closed"}</strong></li>
                  <li><span class="status-dot" data-state="${notice ? "online" : "offline"}"></span><span>Site notice</span><strong>${notice ? "showing" : "none"}</strong></li></ul>
                <p class="field__hint">Updated ${formatDateTime(new Date().toISOString())}. Refreshes every minute.</p>
              </section>
            </aside>
          </div>
        </div>`);
      reveal(root);
      wireSearch();
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
        const books = data.books.filter((b) => hit(b.title, b.author, b.isbn, b.id)).slice(0, 4);
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
    const onSlash = (event: KeyboardEvent) => {
      if (!root.isConnected) { document.removeEventListener("keydown", onSlash); return; } // another tab is open now: leave "/" alone
      if (event.key === "/" && !(event.target as HTMLElement).matches("input, textarea, select")) { event.preventDefault(); root.querySelector<HTMLInputElement>("#dashQuery")?.focus(); }
    };
    document.addEventListener("keydown", onSlash);

    const refresh = async () => { try { await draw(); } catch { /* keep what is on screen */ } };
    const act = async (work: () => Promise<boolean>) => { if (await work()) await refresh(); };
    const loanOf = (el: HTMLElement) => lookup.open.find((l) => l.id === Number(el.dataset.id))!;
    actions(root, {
      open: (el) => go(el.dataset.tab ?? "dashboard"),
      jump: (el) => go(el.dataset.tab ?? "dashboard", el.dataset.q),
      checkout: (el) => act(() => checkOut(loanOf(el), true)),
      reject: (el) => act(() => rejectLoan(loanOf(el))),
      email: (el) => act(() => emailBorrower(loanOf(el), emailed.get(Number(el.dataset.id)) ?? [])),
    });
    chartToggle(root);

    void refreshOverdue().catch(() => undefined);
    await draw();
    timer = setInterval(() => { if (!root.isConnected) clearInterval(timer); else void refresh(); }, REFRESH_MS);
  },
};
