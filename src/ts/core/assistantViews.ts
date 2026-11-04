// Table pop-ups the assistant can open. The AI never sends the data: it only adds a small command to its reply,
// like [[view:overdue]]. This file checks the command is on the allowed list, checks the person's role, then
// loads the table itself with the person's own login (the database decides what they may see).
import { loansByStatus, myLoans } from "../api/loans";
import { emailBorrower } from "../panel/loanActions";
import type { Loan } from "../types";
import { html, Safe } from "./dom";
import { friendly } from "./errors";
import { daysUntil, dueLabel, formatDate, plural } from "./format";
import { openModal } from "./modal";
import { current, isStaff } from "./session";
import { statusBadge } from "../ui/components";

export type ViewName = "my_loans" | "overdue" | "requests" | "on_loan" | "find";
export interface ViewCommand { name: ViewName; query: string }

const STAFF_VIEWS = new Set<ViewName>(["overdue", "requests", "on_loan", "find"]);
const TITLES: Record<ViewName, string> = { my_loans: "My books", overdue: "Overdue books", requests: "Waiting requests", on_loan: "Books on loan", find: "Loans found" };
const COMMAND = /\[\[\s*view\s*:\s*(my_loans|overdue|requests|on_loan|find)(?:\s*:\s*([^\]\n]{0,60}))?\s*\]\]/gi;

// removes the commands from a reply and returns them (at most 2, in order, no repeats)
export function extractViews(text: string): { text: string; views: ViewCommand[] } {
  const views: ViewCommand[] = [];
  const cleaned = text.replace(COMMAND, (_, name: string, query?: string) => {
    const view: ViewCommand = { name: name.toLowerCase() as ViewName, query: (query ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim() };
    if (views.length < 2 && !views.some((v) => v.name === view.name && v.query === view.query)) views.push(view);
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();
  return { text: cleaned, views };
}

// the built-in quick answers (no AI) can still open the same tables
export function guessView(question: string): ViewCommand | null {
  const q = question.toLowerCase();
  if (isStaff()) {
    if (/\b(overdue|late|lagpas)\b/.test(q)) return { name: "overdue", query: "" };
    if (/\b(waiting|pending|requests?)\b/.test(q) && /\b(show|list|see|view|ilan|sino)\b/.test(q)) return { name: "requests", query: "" };
    if (/\b(on loan|borrowed now|who borrowed)\b/.test(q)) return { name: "on_loan", query: "" };
  }
  if (/\b(my|aking)\b.*\b(books?|loans?|borrowed|hiram)\b|\bwhat did i borrow\b/.test(q)) return { name: "my_loans", query: "" };
  return null;
}

export const viewLabel = (view: ViewCommand): string => (view.name === "find" && view.query ? `Loans for "${view.query}"` : TITLES[view.name]);
export const canOpen = (view: ViewCommand): boolean => !STAFF_VIEWS.has(view.name) || isStaff();

const lateDays = (loan: Loan): number => (loan.due_at ? Math.max(0, -daysUntil(loan.due_at)) : 0);

async function load(view: ViewCommand): Promise<Loan[]> {
  if (view.name === "my_loans") {
    const id = current().profile?.id;
    return id ? (await myLoans(id)).filter((l) => l.status === "requested" || l.status === "borrowed").slice(0, 50) : [];
  }
  const rows = await loansByStatus(view.name === "requests" ? ["requested"] : view.name === "find" ? ["requested", "borrowed"] : ["borrowed"], 500);
  if (view.name === "overdue") return rows.filter((l) => l.due_at && new Date(l.due_at).getTime() < Date.now()).sort((a, b) => lateDays(b) - lateDays(a));
  if (view.name === "find" && view.query) {
    const q = view.query.toLowerCase();
    return rows.filter((l) => `${l.profile?.username} ${l.profile?.full_name} ${l.profile?.student_id} ${l.book?.title}`.toLowerCase().includes(q));
  }
  return rows;
}

function table(view: ViewCommand, loans: Loan[]): Safe {
  if (!loans.length) return html`<p class="table__sub">${view.name === "overdue" ? "Nothing is overdue right now." : "Nothing to show here right now."}</p>`;
  const staff = view.name !== "my_loans";
  return html`<div class="table-wrap"><table class="table table--stack">
    <thead><tr>${staff ? html`<th>Student</th>` : ""}<th>Book</th><th>Status</th><th>Due</th>${view.name === "overdue" ? html`<th>Days late</th>` : ""}${staff && view.name !== "requests" ? html`<th></th>` : ""}</tr></thead>
    <tbody>${loans.map((l) => {
      const due = dueLabel(l.due_at);
      return html`<tr>
        ${staff ? html`<td data-label="Student">${l.profile?.username}<br><span class="table__sub">${l.profile?.full_name ?? ""}${l.profile?.student_id ? ` · ${l.profile.student_id}` : ""}</span></td>` : ""}
        <td data-label="Book"><span class="table__title">${l.book?.title}</span><br><span class="table__sub">${l.book?.author}</span></td>
        <td data-label="Status">${statusBadge(l.status)}</td>
        <td data-label="Due">${l.status === "requested" ? html`<span class="table__sub">requested ${formatDate(l.requested_at)}</span>` : html`<span class="badge badge--${due.tone}">${due.text}</span>`}</td>
        ${view.name === "overdue" ? html`<td data-label="Days late">${plural(lateDays(l), "day")}</td>` : ""}
        ${staff && view.name !== "requests" ? html`<td><button class="btn btn--sm btn--quiet" type="button" data-email="${l.id}">Email</button></td>` : ""}
      </tr>`;
    })}</tbody></table></div>`;
}

export async function openView(view: ViewCommand): Promise<void> {
  if (!canOpen(view)) return;
  const modal = openModal(viewLabel(view), html`<p class="table__sub" role="status">Loading...</p>`, { wide: true });
  const body = modal.root.querySelector<HTMLElement>(".modal__body")!;
  try {
    const loans = await load(view);
    body.innerHTML = html`<p class="table__sub">${plural(loans.length, "row")}${loans.length >= 500 ? " (showing the first 500)" : ""}</p>${table(view, loans)}`.value;
    body.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-email]");
      const loan = button ? loans.find((l) => l.id === Number(button.dataset.email)) : undefined;
      if (button && loan) { button.disabled = true; void emailBorrower(loan).finally(() => { button.disabled = false; }); }
    });
  } catch (error) {
    body.innerHTML = html`<p class="alert alert--danger">${friendly(error)}</p>`.value;
  }
}
