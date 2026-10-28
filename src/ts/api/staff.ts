// Everything only staff or admins can do. The database refuses these for anyone else (row level security),
// so hiding the buttons is a courtesy, not the lock.
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
  const { data, error } = await db().from("books").select("*").order("title");
  fail(error);
  return (data ?? []) as Book[];
}

export type BookInput = Omit<Book, "archived">;

export async function saveBook(book: BookInput, isNew: boolean): Promise<void> {
  const { error } = isNew ? await db().from("books").insert(book) : await db().from("books").update(book).eq("id", book.id);
  fail(error);
}

export async function setCopies(id: string, copies: number, remarks: string): Promise<void> {
  fail((await db().rpc("adjust_copies", { p_book_id: id, p_copies: copies, p_remarks: remarks })).error);
}

export async function archiveBook(id: string, archived: boolean): Promise<void> {
  fail((await db().rpc("archive_book", { p_book_id: id, p_archived: archived })).error);
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
