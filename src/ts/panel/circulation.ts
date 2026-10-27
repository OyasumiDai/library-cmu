import { loansByStatus } from "../api/loans";
import { movements, type Movement } from "../api/staff";
import { actions, debounce, html, icon, mount } from "../core/dom";
import { daysUntil, downloadCsv, formatDate, formatDateTime, plural } from "../core/format";
import { reveal } from "../core/motion";
import { empty, loading, statusBadge } from "../ui/components";
import type { Loan } from "../types";
import { checkOut, emailBorrower, recordReturn, rejectLoan } from "./loanActions";
import { go, type PanelTab } from "./tab";

type View = "attention" | "requested" | "borrowed" | "history" | "movements";
const VIEWS: { id: View; label: string }[] = [
  { id: "attention", label: "Needs attention" }, { id: "requested", label: "Requests" }, { id: "borrowed", label: "On loan" },
  { id: "history", label: "History" }, { id: "movements", label: "Movements" },
];

// "3 days overdue", "due in 1 day", "due today": loans that need action come first
function dueInfo(loan: Loan): { text: string; rank: number; tone: string } {
  if (loan.status === "requested") return { text: "waiting for staff", rank: 1, tone: "warning" };
  if (loan.status !== "borrowed" || !loan.due_at) return { text: loan.status, rank: 9, tone: "info" };
  const d = daysUntil(loan.due_at);
  if (d < 0) return { text: `${plural(-d, "day")} overdue`, rank: 0, tone: "danger" };
  if (d === 0) return { text: "due today", rank: 1, tone: "warning" };
  if (d <= 2) return { text: `due in ${plural(d, "day")}`, rank: 2, tone: "warning" };
  return { text: `due ${formatDate(loan.due_at)}`, rank: 5, tone: "success" };
}

const MOVEMENT_TYPES = ["", "checkout", "return", "acquisition", "withdrawal"];

export const circulation: PanelTab = {
  id: "circulation",
  label: "Circulation",
  icon: "shelf",
  async render(root, query = "") {
    let view: View = "attention";
    let loans: Loan[] = [];
    let moves: Movement[] = [];
    let search = query;
    let type = "";
    let from = "";
    let to = "";

    const matches = (l: Loan) => {
      const q = search.trim().toLowerCase();
      return !q || [l.book?.title, l.book?.author, l.profile?.username, l.profile?.full_name, l.profile?.student_id, String(l.id)].join(" ").toLowerCase().includes(q);
    };

    const loanRows = (rows: Loan[]) => rows.length ? html`<div class="table-wrap"><table class="table">
      <thead><tr><th>Book</th><th>Student</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((l) => { const info = dueInfo(l); return html`<tr>
        <td><span class="table__title">${l.book?.title}</span><br><span class="table__sub">Loan #${l.id} · ${l.book?.author}</span></td>
        <td>${l.profile?.username}<br><span class="table__sub">${l.profile?.full_name}${l.profile?.student_id ? ` · ${l.profile.student_id}` : ""}</span></td>
        <td>${l.status === "requested" || l.status === "borrowed" ? html`<span class="badge badge--${info.tone}">${info.text}</span>` : statusBadge(l.status)}<br><span class="table__sub">${l.returned_at ? `returned ${formatDate(l.returned_at)}` : `requested ${formatDate(l.requested_at)}`}</span></td>
        <td><div class="table__actions">${l.status === "requested"
          ? html`<button class="btn btn--sm" data-action="checkout" data-id="${l.id}">${icon("check")} Check out</button><button class="btn btn--sm btn--danger" data-action="reject" data-id="${l.id}">${icon("cross")} Reject</button>`
          : l.status === "borrowed"
            ? html`<button class="btn btn--sm btn--secondary" data-action="return" data-id="${l.id}">${icon("download")} Record return</button><button class="btn btn--sm btn--quiet" data-action="email" data-id="${l.id}" aria-label="Email the borrower">${icon("mail")} Email</button>`
            : ""}</div></td></tr>`; })}</tbody></table></div>`
      : empty("Nothing here", view === "attention" ? "No loans need attention. Nice." : "No loans match.", "check");

    const moveRows = () => moves.length ? html`<div class="table-wrap">${[...new Set(moves.map((m) => formatDate(m.created_at)))].map((day) => html`
      <h4 class="day-head">${day}</h4><table class="table"><tbody>${moves.filter((m) => formatDate(m.created_at) === day).map((m) => html`<tr>
        <td><span class="badge ${m.action === "checkout" || m.action === "withdrawal" ? "badge--warning" : "badge--success"}">${m.action}</span></td>
        <td><span class="table__title">${m.title}</span><br><span class="table__sub">${m.remarks ?? ""}</span></td><td>× ${m.quantity}</td><td>${m.actor ?? "system"}</td>
        <td>${formatDateTime(m.created_at).split(",").pop()}</td>
        <td>${m.remarks?.startsWith("loan ") ? html`<button class="link-button" data-action="loanLink" data-id="${m.remarks.slice(5)}">${m.remarks}</button>` : ""}</td></tr>`)}</tbody></table>`)}</div>`
      : empty("No movements", "Checkouts, returns and copy changes show up here.", "clock");

    const draw = () => {
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      root.querySelectorAll<HTMLElement>("[data-view]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === view)));
      root.querySelector<HTMLElement>("#moveFilters")!.hidden = view !== "movements";
      root.querySelector<HTMLElement>("#loanSearchBox")!.hidden = view === "movements";
      if (view === "movements") { mount(body, moveRows()); return; }
      let rows = loans.filter(matches);
      if (view === "attention") rows = rows.filter((l) => dueInfo(l).rank <= 2).sort((a, b) => dueInfo(a).rank - dueInfo(b).rank);
      else if (view === "requested") rows = rows.filter((l) => l.status === "requested");
      else if (view === "borrowed") rows = rows.filter((l) => l.status === "borrowed").sort((a, b) => dueInfo(a).rank - dueInfo(b).rank);
      else rows = rows.filter((l) => !["requested", "borrowed"].includes(l.status));
      mount(body, loanRows(rows));
      reveal(body);
    };

    const loadLoans = async () => { loans = await loansByStatus(["requested", "borrowed", "returned", "rejected", "cancelled"], 1500); };
    const loadMoves = async () => { moves = await movements({ type, from, to, limit: 400 }); };
    const reload = async () => { const body = root.querySelector<HTMLElement>("[data-body]")!; mount(body, loading("Loading")); await (view === "movements" ? loadMoves() : loadLoans()); draw(); };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Circulation</h2></div>
      <div class="tabs" role="tablist">${VIEWS.map((v) => html`<button class="tab" role="tab" type="button" data-action="view" data-view="${v.id}">${v.label}</button>`)}</div>
      <div class="field search" id="loanSearchBox"><label class="visually-hidden" for="loanSearch">Search loans</label>${icon("search")}<input class="input" id="loanSearch" type="search" placeholder="Student, student ID, book or loan number" value="${search}"></div>
      <div class="toolbar toolbar--wide px px--soft" id="moveFilters" hidden>
        <div class="field"><label class="field__label" for="mvType">Type</label><select class="select" id="mvType">${MOVEMENT_TYPES.map((t) => html`<option value="${t}">${t || "All types"}</option>`)}</select></div>
        <div class="field"><label class="field__label" for="mvFrom">From</label><input class="input" id="mvFrom" type="date"></div>
        <div class="field"><label class="field__label" for="mvTo">To</label><input class="input" id="mvTo" type="date"></div>
        <button class="btn btn--secondary" type="button" data-action="exportMoves">${icon("download")} CSV</button>
      </div>
      <div class="card px card--flush" data-body></div></div>`);

    root.querySelector("#loanSearch")!.addEventListener("input", debounce((e) => { search = (e.target as HTMLInputElement).value; draw(); }, 200));
    root.querySelector("#moveFilters")!.addEventListener("change", () => {
      type = (root.querySelector("#mvType") as HTMLSelectElement).value;
      from = (root.querySelector("#mvFrom") as HTMLInputElement).value;
      to = (root.querySelector("#mvTo") as HTMLInputElement).value;
      void reload();
    });

    const loanOf = (el: HTMLElement) => loans.find((l) => l.id === Number(el.dataset.id))!;
    const act = async (work: () => Promise<boolean>) => { if (await work()) await reload(); };
    actions(root, {
      view: (el) => { view = el.dataset.view as View; void reload(); },
      checkout: (el) => act(() => checkOut(loanOf(el))),
      reject: (el) => act(() => rejectLoan(loanOf(el))),
      return: (el) => act(() => recordReturn(loanOf(el))),
      email: (el) => emailBorrower(loanOf(el)).then(() => undefined),
      loanLink: (el) => { view = "history"; search = el.dataset.id ?? ""; (root.querySelector("#loanSearch") as HTMLInputElement).value = search; void reload(); },
      exportMoves: () => downloadCsv(`movements-${new Date().toISOString().slice(0, 10)}.csv`, ["Date", "Type", "Book", "Quantity", "By", "Remarks"], moves.map((m) => [formatDateTime(m.created_at), m.action, m.title, m.quantity, m.actor ?? "", m.remarks ?? ""])),
    });
    await reload();
    void go;
  },
};
