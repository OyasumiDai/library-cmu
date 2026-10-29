import { cancelRequest, expireUnclaimed, loanFines, myLoans, type LoanFine } from "../api/loans";
import { publicSettings, settingNumber } from "../api/content";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox } from "../core/modal";
import { reveal } from "../core/motion";
import { dueLabel, formatDate, formatDateTime, peso, plural } from "../core/format";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { cover, empty, loading, statusBadge } from "../ui/components";
import type { Loan } from "../types";
import QRCode from "qrcode";
import { openModal } from "../core/modal";

const TABS = [
  { id: "active", label: "Now", statuses: ["requested", "borrowed"] },
  { id: "history", label: "History", statuses: ["returned", "rejected", "cancelled"] },
] as const;

let loans: Loan[] = [];
let fines = new Map<number, LoanFine>();
let tab: (typeof TABS)[number]["id"] = "active";

// what the ticket says about one book: the pickup deadline while reserved, the due date and any fine once borrowed
function ticketLine(loan: Loan): { text: string; tone: "info" | "success" | "warning" | "danger" } {
  const f = fines.get(loan.id);
  if (loan.status === "requested") return { text: f?.pickup_by ? `Reserved · pick up by ${formatDateTime(f.pickup_by)}` : "Reserved, waiting for pickup", tone: "info" };
  if (loan.status === "borrowed") {
    if (f?.amount) return { text: `Overdue since ${formatDate(loan.due_at)} · fine so far ${peso(f.amount)}`, tone: "danger" };
    return { text: `Borrowed · return by ${formatDateTime(loan.due_at)}`, tone: dueLabel(loan.due_at).tone };
  }
  if (loan.status === "returned") return { text: f?.amount ? `Returned late · fine ${peso(f.amount)}` : "Returned", tone: f?.amount ? "warning" : "success" };
  return { text: loan.note ?? loan.status, tone: "warning" };
}

function row(loan: Loan) {
  const due = loan.status === "borrowed" ? dueLabel(loan.due_at) : null;
  const f = fines.get(loan.id);
  return html`
    <article class="loan-row card px" data-reveal>
      ${loan.book ? cover({ id: loan.book.id, title: loan.book.title, cover_url: loan.book.cover_url }) : ""}
      <div>
        <h3 class="card__title">${loan.book?.title ?? "Removed book"} ${statusBadge(loan.status)}</h3>
        <p class="card__meta">${loan.book?.author ?? ""}${f ? ` · ${f.label}: ${plural(f.loan_days, "day")}, ${peso(f.rate)} a day if late` : ""}</p>
        <p class="card__meta">Requested ${formatDateTime(loan.requested_at)}${loan.borrowed_at ? ` · Picked up ${formatDateTime(loan.borrowed_at)}` : ""}${loan.returned_at ? ` · Returned ${formatDateTime(loan.returned_at)}` : ""}</p>
        ${loan.status === "requested" && f?.pickup_by ? html`<span class="badge badge--info">${icon("clock")} Pick up by ${formatDateTime(f.pickup_by)}</span>` : ""}
        ${due ? html`<span class="badge badge--${due.tone}">${due.text} · ${formatDateTime(loan.due_at)}</span>` : ""}
        ${f?.amount ? html`<span class="badge badge--danger">Fine ${peso(f.amount)} (${plural(f.fine_days, "weekday")} late${loan.status === "borrowed" ? ", still growing" : ""})</span>` : ""}
        ${loan.note ? html`<p class="card__meta">Note: ${loan.note}</p>` : ""}
      </div>
      <div class="table__actions">${loan.pickup_code && (loan.status === "requested" || loan.status === "borrowed") ? html`<button class="btn btn--sm btn--accent" type="button" data-action="qr" data-id="${loan.id}">${icon("qr")} My ticket</button>` : ""}${loan.status === "requested" ? html`<button class="btn btn--sm btn--danger px" type="button" data-action="cancel" data-id="${loan.id}">Cancel</button>` : ""}</div>
    </article>`;
}

function draw(): void {
  const counts = Object.fromEntries(TABS.map((t) => [t.id, loans.filter((l) => (t.statuses as readonly string[]).includes(l.status)).length]));
  mount(qs("#loanTabs"), html`${TABS.map((t) => html`<button class="tab" role="tab" type="button" data-action="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.label} <span class="tab__count">${counts[t.id]}</span></button>`)}`);
  const shown = loans.filter((l) => (TABS.find((t) => t.id === tab)!.statuses as readonly string[]).includes(l.status));
  const owed = loans.reduce((sum, l) => sum + (fines.get(l.id)?.amount ?? 0), 0);
  const list = qs("#loanList");
  mount(list, html`
    ${owed && tab === "active" ? html`<div class="alert alert--danger px px--danger" role="status">${icon("info")}<span>You have overdue books. Fines so far: <strong>${peso(owed)}</strong>. Fines grow every weekday until the book is returned at the library.</span></div>` : ""}
    ${shown.length
      ? html`<div class="stack">${shown.map(row)}</div>`
      : empty(tab === "active" ? "No books right now" : "No history yet", tab === "active" ? "Pick something from the catalog." : "Returned and declined books show up here.")}`);
  reveal(list);
}

async function load(): Promise<void> {
  mount(qs("#loanList"), loading("Checking your shelf"));
  // a request not picked up in time is cancelled now (and emailed) rather than shown as still reserved
  await expireUnclaimed().catch(() => 0);
  loans = await myLoans(current().profile!.id);
  fines = await loanFines(loans.map((l) => l.id)).catch(() => new Map());
  draw();
}

boot(async () => {
  const settings = await publicSettings();
  const max = settingNumber(settings, "max_loans", 3);
  const rules = settings.loan_rules as Record<string, { label: string; days: number; fine: number }> | undefined;
  const hours = settingNumber(settings, "pickup_hours", 48);
  qs("#limitNote").textContent = rules
    ? `Up to ${plural(max, "book")} at a time. ${Object.values(rules).map((r) => `${r.label}: ${plural(r.days, "day")}, ${peso(r.fine)} a day if late`).join(" · ")}. Pick up within ${plural(Math.round(hours / 24), "day")}.`
    : `Up to ${plural(max, "book")} at a time.`;
  actions(qs("[data-page-root]"), {
    tab: (el) => {
      tab = el.dataset.tab as typeof tab;
      draw();
    },
    // the ticket: ONE QR the library desk scans for all of the student's books (the same one is in the email),
    // with each book's state: the pickup deadline while reserved, the due date and any fine once picked up
    qr: async (el) => {
      const loan = loans.find((l) => l.id === Number(el.dataset.id));
      if (!loan?.pickup_code) return;
      const image = await QRCode.toDataURL(`${location.origin}/pickup?c=${loan.pickup_code}`, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#0b1f5c", light: "#ffffff" } });
      const mine = loans.filter((l) => l.status === "requested" || l.status === "borrowed");
      const profile = current().profile!;
      openModal("My library ticket", html`<div class="qr-modal ticket">
        <p class="ticket__who"><strong>${profile.full_name || profile.username}</strong>${profile.student_id ? html` · ID ${profile.student_id}` : ""}</p>
        <img src="${image}" alt="QR code for ${loan.pickup_code}"><span class="qr-modal__code mono">${loan.pickup_code}</span>
        <p class="text-soft">Walk in to the library and show this at the desk. Staff scan it once for all your books.</p>
        <ul class="list ticket__books">${mine.map((l) => { const line = ticketLine(l); return html`<li class="list__item"><div class="list__body"><p class="list__title">${l.book?.title ?? "Book"}</p><p class="list__meta"><span class="badge badge--${line.tone}">${line.text}</span></p></div></li>`; })}</ul></div>`, { footer: html`<button class="btn" type="button" data-close>Done</button>` });
    },
    cancel: async (el) => {
      if (!(await confirmBox("Cancel this request?", "The book goes back on the shelf for others.", "Cancel request", true))) return;
      try {
        await cancelRequest(Number(el.dataset.id));
        ok("Request cancelled.");
        await load();
      } catch (error) {
        fail(friendly(error));
      }
    },
  });
  await load();
});
