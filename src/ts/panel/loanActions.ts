// The four things staff do to a loan, shared by the dashboard, circulation and the student profile.
import { checkout, giveBack, loanFines, reject } from "../api/loans";
import { publicSettings, settingNumber } from "../api/content";
import { sendNotice } from "../api/staff";
import { html } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate, peso, plural } from "../core/format";
import { confirmBox, openModal } from "../core/modal";
import { fail, ok } from "../core/toast";
import type { Loan } from "../types";

async function attempt(work: () => Promise<void>, done: string): Promise<boolean> {
  try {
    await work();
    ok(done);
    return true;
  } catch (error) {
    fail(friendly(error));
    return false;
  }
}

// the due date the database will set: the book's loan period, moved past weekends and listed holidays (Philippine time)
function previewDue(days: number, holidays: string[]): string {
  const manila = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
  const day = new Date(`${manila(new Date())}T12:00:00+08:00`);
  day.setUTCDate(day.getUTCDate() + Math.max(days, 1));
  while ([0, 6].includes(day.getUTCDay()) || holidays.includes(manila(day))) day.setUTCDate(day.getUTCDate() + 1);
  return formatDate(day.toISOString());
}

// shows the due date (by the book's material) before the book leaves the desk
export async function checkOut(loan: Loan, skipConfirm = false): Promise<boolean> {
  if (!skipConfirm) {
    const settings = await publicSettings();
    const rule = (await loanFines([loan.id]).catch(() => new Map())).get(loan.id);
    const days = rule?.loan_days ?? settingNumber(settings, "loan_days", 7);
    const due = previewDue(days, Array.isArray(settings.holidays) ? (settings.holidays as string[]) : []);
    const terms = rule ? ` ${rule.label}: ${plural(days, "day")}, ${peso(rule.rate)} a day if late.` : "";
    const yes = await confirmBox("Check out this book?", `"${loan.book?.title}" goes to ${loan.profile?.username} and is due on ${due}.${terms}`, "Check out");
    if (!yes) return false;
  }
  return attempt(() => checkout(loan.id), "Checked out. The student was notified.");
}

export function rejectLoan(loan: Loan): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const modal = openModal("Decline this request", html`
      <p>"${loan.book?.title}" for ${loan.profile?.username}.</p>
      <div class="field"><label class="field__label" for="reason">Reason (optional, the student will see it)</label><textarea class="textarea" id="reason" maxlength="200"></textarea></div>`, {
      footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn btn--danger" type="button" data-send>Decline</button>`,
    });
    modal.root.querySelector("[data-send]")?.addEventListener("click", async () => {
      answered = true;
      const reason = (modal.root.querySelector("#reason") as HTMLTextAreaElement).value;
      modal.close();
      resolve(await attempt(() => reject(loan.id, reason), "Declined."));
    });
    new MutationObserver((_, observer) => {
      if (!modal.root.isConnected) { observer.disconnect(); if (!answered) resolve(false); }
    }).observe(document.body, { childList: true });
  });
}

export async function recordReturn(loan: Loan): Promise<boolean> {
  // the fine stops at the return: tell the desk what to collect before confirming
  const fine = (await loanFines([loan.id]).catch(() => new Map())).get(loan.id);
  const owed = fine?.amount ? ` Overdue fine to collect: ${peso(fine.amount)} (${plural(fine.fine_days, "weekday")} at ${peso(fine.rate)}).` : "";
  if (!(await confirmBox("Record the return?", `"${loan.book?.title}" from ${loan.profile?.username} goes back on the shelf.${owed}`, "Record return"))) return false;
  return attempt(() => giveBack(loan.id), fine?.amount ? `Return recorded. Collect ${peso(fine.amount)}.` : "Return recorded.");
}

export async function emailBorrower(loan: Loan): Promise<boolean> {
  const overdue = loan.due_at ? new Date(loan.due_at).getTime() < Date.now() : false;
  return attempt(() => sendNotice({ kind: overdue ? "overdue" : "due_soon", loan_id: loan.id }), `Email sent to ${loan.profile?.username}.`);
}
