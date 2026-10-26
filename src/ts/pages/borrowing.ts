import { cancelRequest, myLoans } from "../api/loans";
import { publicSettings, settingNumber } from "../api/content";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox } from "../core/modal";
import { reveal } from "../core/motion";
import { dueLabel, formatDate, plural } from "../core/format";
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
let tab: (typeof TABS)[number]["id"] = "active";

function row(loan: Loan) {
  const due = loan.status === "borrowed" ? dueLabel(loan.due_at) : null;
  return html`
    <article class="loan-row card px" data-reveal>
      ${loan.book ? cover({ id: loan.book.id, title: loan.book.title, cover_url: loan.book.cover_url }) : ""}
      <div>
        <h3 class="card__title">${loan.book?.title ?? "Removed book"} ${statusBadge(loan.status)}</h3>
        <p class="card__meta">${loan.book?.author ?? ""}</p>
        <p class="card__meta">Requested ${formatDate(loan.requested_at)}${loan.returned_at ? ` · Returned ${formatDate(loan.returned_at)}` : ""}</p>
        ${due ? html`<span class="badge badge--${due.tone}">${due.text}</span>` : ""}
        ${loan.note ? html`<p class="card__meta">Note: ${loan.note}</p>` : ""}
      </div>
      <div class="table__actions">${loan.pickup_code && (loan.status === "requested" || loan.status === "borrowed") ? html`<button class="btn btn--sm btn--accent" type="button" data-action="qr" data-id="${loan.id}">${icon("qr")} My QR</button>` : ""}${loan.status === "requested" ? html`<button class="btn btn--sm btn--danger px" type="button" data-action="cancel" data-id="${loan.id}">Cancel</button>` : ""}</div>
    </article>`;
}

function draw(): void {
  const counts = Object.fromEntries(TABS.map((t) => [t.id, loans.filter((l) => (t.statuses as readonly string[]).includes(l.status)).length]));
  mount(qs("#loanTabs"), html`${TABS.map((t) => html`<button class="tab" role="tab" type="button" data-action="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.label} <span class="tab__count">${counts[t.id]}</span></button>`)}`);
  const shown = loans.filter((l) => (TABS.find((t) => t.id === tab)!.statuses as readonly string[]).includes(l.status));
  const list = qs("#loanList");
  mount(list, shown.length
    ? html`<div class="stack">${shown.map(row)}</div>`
    : empty(tab === "active" ? "No books right now" : "No history yet", tab === "active" ? "Pick something from the catalog." : "Returned and declined books show up here."));
  reveal(list);
}

async function load(): Promise<void> {
  mount(qs("#loanList"), loading("Checking your shelf"));
  loans = await myLoans(current().profile!.id);
  draw();
}

boot(async () => {
  const settings = await publicSettings();
  const max = settingNumber(settings, "max_loans", 3);
  const days = settingNumber(settings, "loan_days", 7);
  qs("#limitNote").textContent = `Up to ${plural(max, "book")} at a time, ${plural(days, "day")} each.`;
  actions(qs("[data-page-root]"), {
    tab: (el) => {
      tab = el.dataset.tab as typeof tab;
      draw();
    },
    // the ONE QR the library desk scans for all of the student's books; the same one is in the email
    qr: async (el) => {
      const loan = loans.find((l) => l.id === Number(el.dataset.id));
      if (!loan?.pickup_code) return;
      const image = await QRCode.toDataURL(`${location.origin}/pickup?c=${loan.pickup_code}`, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#0b1f5c", light: "#ffffff" } });
      const mine = loans.filter((l) => l.status === "requested" || l.status === "borrowed");
      openModal("My pickup QR", html`<div class="qr-modal"><img src="${image}" alt="QR code for ${loan.pickup_code}"><span class="qr-modal__code mono">${loan.pickup_code}</span>
        <p class="text-soft">One QR for all your books. Show it at the library desk and staff scan it once.</p>
        <ul class="list">${mine.map((l) => html`<li class="list__item"><div class="list__body"><p class="list__title">${l.book?.title ?? "Book"}</p><p class="list__meta">${l.status === "requested" ? "Reserved, waiting for pickup" : "Borrowed"}</p></div></li>`)}</ul></div>`, { footer: html`<button class="btn" type="button" data-close>Done</button>` });
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
