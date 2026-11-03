import { db } from "../core/supabase";
import type { Activity, Loan, LoanStatus } from "../types";

const WITH_BOOK = "*, book:books(id,title,author,cover_url,category)";
const WITH_BOTH = `${WITH_BOOK}, profile:profiles!loans_user_id_fkey(id,username,full_name,student_id)`;

export async function myLoans(userId: string): Promise<Loan[]> {
  const { data, error } = await db().from("loans").select(WITH_BOOK).eq("user_id", userId).order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Loan[];
}

interface StaffLoanRow {
  id: number; book_id: string; status: Loan["status"]; requested_at: string; borrowed_at: string | null; due_at: string | null; returned_at: string | null;
  note: string | null; user_id: string; title: string; author: string; cover_url: string | null; category: string; username: string; full_name: string; student_id: string | null;
}

// everyone's loans, with the book and the borrower's name (staff only; the database checks)
export async function loansByStatus(statuses: LoanStatus[], limit = 500): Promise<Loan[]> {
  const { data, error } = await db().rpc("staff_loans", { p_statuses: statuses, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as StaffLoanRow[]).map((r) => ({
    id: Number(r.id), book_id: r.book_id, user_id: r.user_id, status: r.status, requested_at: r.requested_at, borrowed_at: r.borrowed_at, due_at: r.due_at,
    returned_at: r.returned_at, note: r.note,
    book: { id: r.book_id, title: r.title, author: r.author, cover_url: r.cover_url, category: r.category },
    profile: { id: r.user_id, username: r.username, full_name: r.full_name, student_id: r.student_id },
  }));
}

export type LoanMailEvent = "requested" | "borrowed" | "returned" | "rejected" | "cancelled";

// Asks the server to email the student about this loan (request received with a QR code, pickup confirmed, ...).
// Pass several loan ids to send ONE email listing all the books. The database also does this by itself when the hook is set up; the server sends each email only once.
export async function mailLoan(loanId: number | number[], event: LoanMailEvent): Promise<void> {
  try {
    const { data } = await db().auth.getSession();
    const token = data.session?.access_token;
    const ids = ([] as number[]).concat(loanId).filter(Number.isFinite);
    if (!token || !ids.length) return;
    // keepalive: the email still goes out if the page changes straight after
    const reply = await fetch("/api/loan-mail", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(ids.length > 1 ? { loan_ids: ids, event } : { loan_id: ids[0], event }) });
    if (!reply.ok) console.warn(`Loan email not sent (${reply.status}). Admins: Settings > Loan emails > Send me a test email shows what is missing.`);
  } catch {
    /* an email is a courtesy; the loan itself already worked */
  }
}

// what a scanned QR code points at (staff only)
export interface PickupInfo {
  id: number; status: LoanStatus; pickup_code: string; title: string; author: string; cover_url: string | null; shelf: string;
  username: string; full_name: string; student_id: string | null; requested_at: string; borrowed_at: string | null; due_at: string | null; returned_at: string | null; available: number;
}

export async function lookupLoan(code: string): Promise<PickupInfo | null> {
  const { data, error } = await db().rpc("staff_lookup_loan", { p_code: code });
  if (error) throw error;
  const rows = (data ?? []) as PickupInfo[];
  return rows[0] ? { ...rows[0], id: Number(rows[0].id) } : null;
}

// one scan can hold several books: every open loan of that student (or their last loan when nothing is open)
export async function lookupPickup(code: string): Promise<PickupInfo[]> {
  const { data, error } = await db().rpc("staff_lookup_loan", { p_code: code });
  if (error) throw error;
  return ((data ?? []) as PickupInfo[]).map((r) => ({ ...r, id: Number(r.id) }));
}

// hand over / take back several books with ONE email to the student
export async function checkoutMany(ids: number[]): Promise<void> {
  const done: number[] = [];
  try {
    for (const id of ids) { const { error } = await db().rpc("checkout_loan", { p_loan_id: id }); if (error) throw error; done.push(id); }
  } finally {
    if (done.length) void mailLoan(done, "borrowed");
  }
}
export async function giveBackMany(ids: number[]): Promise<void> {
  const done: number[] = [];
  try {
    for (const id of ids) { const { error } = await db().rpc("return_loan", { p_loan_id: id }); if (error) throw error; done.push(id); }
  } finally {
    if (done.length) void mailLoan(done, "returned");
  }
}

export async function cancelRequest(loanId: number): Promise<void> {
  const { error } = await db().rpc("cancel_request", { p_loan_id: loanId });
  if (error) throw error;
  void mailLoan(loanId, "cancelled");
}

export async function checkout(loanId: number): Promise<void> {
  const { error } = await db().rpc("checkout_loan", { p_loan_id: loanId });
  if (error) throw error;
  void mailLoan(loanId, "borrowed");
}

export async function reject(loanId: number, reason: string): Promise<void> {
  const { error } = await db().rpc("reject_loan", { p_loan_id: loanId, p_reason: reason });
  if (error) throw error;
  void mailLoan(loanId, "rejected");
}

export async function giveBack(loanId: number): Promise<void> {
  const { error } = await db().rpc("return_loan", { p_loan_id: loanId });
  if (error) throw error;
  void mailLoan(loanId, "returned");
}

// ---------------------------------------------------------------- borrowing rules (tools/borrowing-rules.sql)
// per loan: the book's material, its loan period and daily fine, the fine so far, and (while reserved) the pickup deadline
export interface LoanFine {
  loan_id: number; material: "circulation" | "fiction"; label: string; loan_days: number; rate: number; fine_days: number; amount: number; pickup_by: string | null;
}

// before the SQL is run the function does not exist: the pages then simply show no fines
const missing = (error: { message?: string; code?: string } | null) => !!error && (error.code === "PGRST202" || /could not find the function|does not exist/i.test(error.message ?? ""));

export async function loanFines(ids: number[]): Promise<Map<number, LoanFine>> {
  const out = new Map<number, LoanFine>();
  const unique = [...new Set(ids)].filter(Number.isFinite);
  for (let i = 0; i < unique.length; i += 500) {
    const { data, error } = await db().rpc("loan_fines", { p_ids: unique.slice(i, i + 500) });
    if (missing(error)) return out;
    if (error) throw error;
    for (const r of (data ?? []) as LoanFine[]) out.set(Number(r.loan_id), { ...r, loan_id: Number(r.loan_id), rate: Number(r.rate), amount: Number(r.amount), fine_days: Number(r.fine_days), loan_days: Number(r.loan_days) });
  }
  return out;
}

// Cancels requests not picked up within the pickup window (2 days) and emails the students.
// The database also does this every 15 minutes (pg_cron); running it when a page opens keeps it on time without that.
// Students get back only their own; staff get everyone's and send one email per student.
let noExpiry = false; // the SQL is not run yet: ask once per page, not on every scan
export async function expireUnclaimed(): Promise<number> {
  if (noExpiry) return 0;
  const { data, error } = await db().rpc("expire_unclaimed_requests");
  if (missing(error)) noExpiry = true;
  if (error) return 0;
  const rows = (data ?? []) as { loan_id: number; user_id: string }[];
  const byStudent = new Map<string, number[]>();
  for (const r of rows) byStudent.set(r.user_id, [...(byStudent.get(r.user_id) ?? []), Number(r.loan_id)]);
  for (const ids of byStudent.values()) void mailLoan(ids, "cancelled");
  return rows.length;
}

export async function myActivity(userId: string, limit = 25): Promise<Activity[]> {
  const { data, error } = await db().from("user_activity").select("*, book:books(title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Activity[];
}
