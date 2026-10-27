// The four things staff do to a loan, shared by the dashboard, circulation and the student profile.
import { checkout, giveBack, reject } from "../api/loans";
import { publicSettings, settingNumber } from "../api/content";
import { sendNotice } from "../api/staff";
import { html } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate } from "../core/format";
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

// shows the due date before the book leaves the desk
export async function checkOut(loan: Loan, skipConfirm = false): Promise<boolean> {
  if (!skipConfirm) {
    const days = settingNumber(await publicSettings(), "loan_days", 7);
    const due = formatDate(new Date(Date.now() + days * 86400000).toISOString());
    const yes = await confirmBox("Check out this book?", `"${loan.book?.title}" goes to ${loan.profile?.username} and is due on ${due}.`, "Check out");
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
  if (!(await confirmBox("Record the return?", `"${loan.book?.title}" from ${loan.profile?.username} goes back on the shelf.`, "Record return"))) return false;
  return attempt(() => giveBack(loan.id), "Return recorded.");
}

export async function emailBorrower(loan: Loan): Promise<boolean> {
  const overdue = loan.due_at ? new Date(loan.due_at).getTime() < Date.now() : false;
  return attempt(() => sendNotice({ kind: overdue ? "overdue" : "due_soon", loan_id: loan.id }), `Email sent to ${loan.profile?.username}.`);
}
