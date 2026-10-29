// Everything only staff or admins can do. The database refuses these for anyone else (row level security),
// so hiding the buttons is a courtesy, not the lock.
import { isValidIsbn, normalizeIsbn } from "../core/isbn";
import { db } from "../core/supabase";
import type { Announcement, Book, ContentPage, Course, DashboardStats, Profile, Role } from "../types";

const fail = (error: { message: string } | null): void => {
  if (error) throw error;
};

export async function stats(): Promise<DashboardStats> {
  const { data, error } = await db().rpc("dashboard_stats");
  fail(error);
  return data as DashboardStats;
}

// ---------------------------------------------------------------- books
export async function allBooks(): Promise<Book[]> {
  // with who added it, once tools/book-approval.sql is run (before that the link does not exist, so ask without it)
  let { data, error } = await db().from("books").select("*, submitter:profiles!books_submitted_by_fkey(username,full_name)").order("title");
  if (error) ({ data, error } = await db().from("books").select("*").order("title"));
  fail(error);
  return (data ?? []) as Book[];
}

// the admin's decision on a book a staff member added: publish it, or send it back with a note
export async function reviewBook(id: string, decision: "approve" | "revise", note: string): Promise<void> {
  fail((await db().rpc("review_book", { p_book_id: id, p_decision: decision, p_note: note || null })).error);
}

export type BookInput = Omit<Book, "archived">;

// a column that is optional until its SQL file is run: if the database does not have it yet, the book saves without it
const OPTIONAL_COLUMNS = ["edition", "authors", "material", "obsolete_year", "archive_location", "archive_reason", "archived_at"];

export async function saveBook(book: BookInput, isNew: boolean): Promise<void> {
  const row: Record<string, unknown> = { ...book };
  let { error } = isNew ? await db().from("books").insert(row) : await db().from("books").update(row).eq("id", book.id);
  for (let tries = 0; error && tries < OPTIONAL_COLUMNS.length; tries++) {
    const missing = OPTIONAL_COLUMNS.find((c) => c in row && new RegExp(`'${c}' column|column [a-z_.]*${c} does not exist`, "i").test(error!.message));
    if (!missing) break;
    delete row[missing];
    ({ error } = isNew ? await db().from("books").insert(row) : await db().from("books").update(row).eq("id", book.id));
  }
  if (error && /isbn/i.test(error.message) && /column|schema cache/i.test(error.message)) throw new Error("The database has no ISBN column yet. An admin needs to run tools/add-isbn.sql in the Supabase SQL Editor.");
  if (error && /books_isbn_unique|duplicate key/i.test(error.message)) throw new Error("Another book already has that ISBN.");
  fail(error);
}

export async function setIsbn(id: string, isbn: string): Promise<void> {
  const { error } = await db().from("books").update({ isbn }).eq("id", id);
  if (error && /books_isbn_unique|duplicate key/i.test(error.message)) throw new Error("Another book already has that ISBN.");
  fail(error);
}

// the code of each physical copy (ISBN-01, ISBN-02...), kept in step with the copies count by the database
export async function bookCopies(bookId: string): Promise<{ code: string; copy_no: number }[]> {
  const { data, error } = await db().from("book_copies").select("code,copy_no").eq("book_id", bookId).order("copy_no");
  fail(error);
  return (data ?? []) as { code: string; copy_no: number }[];
}

// Open Library's catalogue, searched by title and author; returns the editions' ISBN-13s that pass the check digit
export async function findIsbns(title: string, author: string): Promise<string[]> {
  const params = new URLSearchParams({ title, fields: "isbn", limit: "3" });
  if (author) params.set("author", author);
  const reply = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!reply.ok) throw new Error("The ISBN lookup is not answering right now. Try again later.");
  const { docs = [] } = (await reply.json()) as { docs?: { isbn?: string[] }[] };
  const found = docs.flatMap((d) => d.isbn ?? []).map(normalizeIsbn).filter((i) => i.length === 13 && isValidIsbn(i));
  return [...new Set(found)];
}

export async function setCopies(id: string, copies: number, remarks: string): Promise<void> {
  fail((await db().rpc("adjust_copies", { p_book_id: id, p_copies: copies, p_remarks: remarks })).error);
}

export async function archiveBook(id: string, archived: boolean): Promise<void> {
  fail((await db().rpc("archive_book", { p_book_id: id, p_archived: archived })).error);
}

// ---- obsolete years and the archive (tools/book-obsolete-archive.sql)
// archives every book whose obsolete year has come (nothing out on loan); returns them so staff can say where each is kept
export async function archiveObsolete(): Promise<{ id: string; title: string }[]> {
  const { data, error } = await db().rpc("archive_obsolete_books");
  if (error) return []; // the SQL is not run yet
  return (data ?? []) as { id: string; title: string }[];
}

// where an archived book is kept, and why it was archived; or, when restoring, a new obsolete year
export async function setArchiveDetails(id: string, details: { archive_location?: string | null; archive_reason?: string | null; archived_at?: string | null; obsolete_year?: number | null }): Promise<void> {
  fail((await db().from("books").update(details).eq("id", id)).error);
}

export async function deleteBook(id: string): Promise<void> {
  fail((await db().from("books").delete().eq("id", id)).error);
}

// ---------------------------------------------------------------- people
export async function people(): Promise<Profile[]> {
  const { data, error } = await db().from("profiles").select("*").order("created_at", { ascending: false }).limit(1000);
  fail(error);
  return (data ?? []) as Profile[];
}

export async function setRole(userId: string, role: Role): Promise<void> {
  fail((await db().rpc("set_user_role", { p_user: userId, p_role: role })).error);
}

export async function setActive(userId: string, active: boolean): Promise<void> {
  fail((await db().rpc("set_user_active", { p_user: userId, p_active: active })).error);
}

// ---------------------------------------------------------------- announcements, team, pages, courses, settings
export async function allAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await db().from("announcements").select("*").order("created_at", { ascending: false });
  fail(error);
  return (data ?? []) as Announcement[];
}

export async function saveAnnouncement(item: Partial<Announcement> & { title: string; body: string }): Promise<void> {
  const { error } = item.id ? await db().from("announcements").update(item).eq("id", item.id) : await db().from("announcements").insert(item);
  fail(error);
}

export async function deleteAnnouncement(id: number): Promise<void> {
  fail((await db().from("announcements").delete().eq("id", id)).error);
}

export async function allPages(): Promise<ContentPage[]> {
  const { data, error } = await db().from("content_pages").select("*").order("slug");
  fail(error);
  return (data ?? []) as ContentPage[];
}

export async function savePage(slug: string, title: string, body: ContentPage["body"]): Promise<void> {
  fail((await db().from("content_pages").upsert({ slug, title, body, updated_at: new Date().toISOString() })).error);
}

export async function saveCourse(course: Omit<Course, "id"> & { id?: number }): Promise<void> {
  const { error } = course.id ? await db().from("courses").update(course).eq("id", course.id) : await db().from("courses").insert(course);
  fail(error);
}

export async function deleteCourse(id: number): Promise<void> {
  fail((await db().from("courses").delete().eq("id", id)).error);
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  fail((await db().from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() })).error);
}

export interface AuditEntry {
  id: number;
  created_at: string;
  action: string;
  module: string;
  details: string;
  actor: string;
}

export async function auditTrail(filter: { search?: string; module?: string; from?: string; to?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const { data, error } = await db().rpc("audit_trail", { p_search: filter.search ?? "", p_module: filter.module ?? "", p_from: filter.from || null, p_to: filter.to || null, p_limit: filter.limit ?? 300 });
  fail(error);
  return (data ?? []) as AuditEntry[];
}

export interface Movement {
  id: number;
  book_id: string;
  title: string;
  action: string;
  quantity: number;
  remarks: string | null;
  created_at: string;
  actor: string | null;
}

export async function movements(filter: { type?: string; from?: string; to?: string; limit?: number } = {}): Promise<Movement[]> {
  const { data, error } = await db().rpc("staff_movements", { p_type: filter.type ?? "", p_from: filter.from || null, p_to: filter.to || null, p_limit: filter.limit ?? 300 });
  fail(error);
  return (data ?? []) as Movement[];
}

// downloads of reports are recorded in the audit trail
export async function logReportDownload(): Promise<void> {
  await db().rpc("log_event", { p_type: "report" });
}

export async function refreshOverdue(): Promise<number> {
  const { data, error } = await db().rpc("refresh_overdue_notices");
  fail(error);
  return Number(data ?? 0);
}

export async function setPermissions(userId: string, permissions: string[]): Promise<void> {
  fail((await db().rpc("set_permissions", { p_user: userId, p_perms: permissions })).error);
}

export async function staffAccounts(): Promise<Profile[]> {
  const { data, error } = await db().from("profiles").select("*").in("role", ["staff", "admin"]).order("created_at");
  fail(error);
  return (data ?? []) as Profile[];
}

export async function userActivity(userId: string, limit = 50): Promise<{ id: number; type: string; book_id: string | null; created_at: string; book: { title: string } | null }[]> {
  const { data, error } = await db().from("user_activity").select("id,type,book_id,created_at,book:books(title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  fail(error);
  return (data ?? []) as unknown as { id: number; type: string; book_id: string | null; created_at: string; book: { title: string } | null }[];
}

// ---- which loans were already emailed (tools/loan-email-log.sql); before the SQL is run these quietly do nothing
export interface LoanEmail { loan_id: number; kind: string; sent_at: string; sender: { username: string; full_name: string } | null }

export async function logLoanEmail(loanId: number, kind: string): Promise<void> {
  const { data } = await db().auth.getSession();
  await db().from("loan_emails").insert({ loan_id: loanId, kind, sent_by: data.session?.user.id });
}

// every email per loan, newest first
let noEmailLog = false; // tools/loan-email-log.sql not run yet: ask once per page, not on every refresh
export async function loanEmails(ids: number[]): Promise<Map<number, LoanEmail[]>> {
  const out = new Map<number, LoanEmail[]>();
  if (noEmailLog) return out;
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 300) {
    const { data, error } = await db().from("loan_emails").select("loan_id,kind,sent_at,sender:profiles(username,full_name)").in("loan_id", unique.slice(i, i + 300)).order("sent_at", { ascending: false });
    if (error) { if (error.code === "PGRST205" || error.code === "42P01" || /does not exist|could not find/i.test(error.message)) noEmailLog = true; return out; }
    for (const row of (data ?? []) as unknown as LoanEmail[]) out.set(Number(row.loan_id), [...(out.get(Number(row.loan_id)) ?? []), row]);
  }
  return out;
}

// formal email through the server function (the library's Gmail account); the function checks the sender is staff
export async function sendNotice(input: { kind: "overdue" | "due_soon" | "general"; loan_id?: number; user_id?: string; message?: string }): Promise<void> {
  const { data } = await db().auth.getSession();
  const reply = await fetch("/api/notice", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(input),
  });
  if (reply.ok) return;
  // say why: the server names the problem (and, for Gmail failures, a safe reason)
  const { error, reason } = (await reply.json().catch(() => ({}))) as { error?: string; reason?: string };
  const why: Record<string, string> = {
    not_configured: "Email is not set up yet. Add the Gmail settings in Vercel (see the README).",
    sign_in_required: "Your session ended. Sign in again, then send it.",
    staff_only: "Only active staff can send notices.",
    permission_needed: "Sending a notice to a student needs the Student Profiles permission.",
    student_not_found: "That account could not be found. It may have been removed.",
    no_email: "That account has no email address saved.",
    slow_down: "Too many emails in the last minute. Wait a moment and try again.",
    send_failed: reason ?? "Gmail did not accept the email.",
    crashed: `The email server hit an error: ${reason ?? "unknown"}.`,
  };
  if (!error && reply.status === 404) throw new Error("The email service is not deployed on this site (api/notice is missing). Redeploy on Vercel, then try again.");
  throw new Error((error && why[error]) || `The email could not be sent (${reply.status}). Please try again.`);
}

// ---------------------------------------------------------------- pictures
// pictures are checked (type, size, dimensions) and stored under a random name
const MAX_BYTES = 3_000_000;
const MAX_SIDE = 4000;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadPicture(folder: string, file: File): Promise<string> {
  const extension = TYPES[file.type];
  if (!extension) throw new Error("Please choose a JPG, PNG or WEBP picture.");
  if (file.size > MAX_BYTES) throw new Error("That picture is bigger than 3 MB.");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That file is not a readable picture.");
  const { width, height } = bitmap;
  bitmap.close();
  if (width > MAX_SIDE || height > MAX_SIDE) throw new Error(`Pictures can be at most ${MAX_SIDE} pixels wide or tall.`);
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const bucket = db().storage.from("media");
  const { error } = await bucket.upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return bucket.getPublicUrl(path).data.publicUrl;
}
