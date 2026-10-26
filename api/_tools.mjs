// What the AI assistant may do, and nothing more. Every tool is READ-ONLY and runs as the student who is asking
// (their own login token goes to Supabase, so the database rules decide what they can see). The assistant cannot
// borrow, cancel, approve, change settings or read anyone else's data.
import crypto from "node:crypto";

export const TOOL_NAMES = ["search_books", "book_status", "my_loans", "my_notifications", "library_info", "staff_summary", "staff_find_loan"];
export const STAFF_TOOLS = new Set(["staff_summary", "staff_find_loan"]);
const TOKEN_MINUTES = 10;

const keyOf = (secret) => crypto.createHash("sha256").update(String(secret)).digest();

// The student's login token must reach the tools endpoint but must never be readable by the automation (n8n),
// so it travels sealed: encrypted with the shared secret and valid for 10 minutes.
export function sealToolToken(claims, secret, now = Date.now()) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ ...claims, exp: now + TOKEN_MINUTES * 60_000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openToolToken(token, secret, now = Date.now()) {
  try {
    const raw = Buffer.from(String(token), "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyOf(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const claims = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
    return claims.exp > now && claims.at && claims.uid ? claims : null;
  } catch {
    return null;
  }
}

export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const short = (text, n = 160) => { const t = String(text ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 3)}...` : t; };
const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

const bookRow = (b) => ({
  id: b.id, title: b.title, author: b.author, category: b.category, shelf: b.shelf, copies: b.copies,
  free_now: b.available, reserved: b.reserved, borrowed: b.borrowed,
  status: b.available > 0 ? "available" : b.borrowed >= b.copies ? "all copies borrowed" : "all free copies reserved",
  summary: short(b.synopsis), link: `/catalog?q=${encodeURIComponent(b.title)}`,
});

// run one tool; returns plain data the AI can read
export async function runTool({ tool, args = {}, claims, base, anon }) {
  const headers = { apikey: anon, Authorization: `Bearer ${claims.at}`, "Content-Type": "application/json" };
  const rpc = async (name, body) => { const r = await fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) }); return r.ok ? r.json() : null; };
  const get = async (path) => { const r = await fetch(`${base}/rest/v1/${path}`, { headers }); return r.ok ? r.json() : null; };
  if (!TOOL_NAMES.includes(tool)) return { error: "unknown_tool", tools: TOOL_NAMES };
  if (STAFF_TOOLS.has(tool) && !["staff", "admin"].includes(claims.role)) return { error: "staff_only", note: "This person is not library staff." };

  switch (tool) {
    case "search_books":
    case "book_status": {
      const query = clean(tool === "book_status" ? args.title ?? args.query : args.query, 80);
      const rows = await rpc("catalog_search", { p_query: query, p_category: clean(args.category, 60), p_availability: args.available_only ? "available" : "all", p_limit: tool === "book_status" ? 3 : 5, p_offset: 0 });
      return { count: rows?.length ?? 0, total_matches: rows?.[0] ? Number(rows[0].total_count) : 0, books: (rows ?? []).map(bookRow), note: "At most 5 books. Tell the student to open Discover for the full catalog." };
    }
    case "my_loans": {
      const want = ["open", "history", "all"].includes(args.status) ? args.status : "all";
      const filter = want === "open" ? "&status=in.(requested,borrowed)" : want === "history" ? "&status=in.(returned,rejected,cancelled)" : "";
      const rows = await get(`loans?select=status,requested_at,borrowed_at,due_at,returned_at,pickup_code,book:books(title,author)&user_id=eq.${encodeURIComponent(claims.uid)}${filter}&order=requested_at.desc&limit=10`);
      const now = Date.now();
      return { loans: (rows ?? []).map((l) => ({ title: l.book?.title, author: l.book?.author, status: l.status, requested_at: l.requested_at, due_at: l.due_at, returned_at: l.returned_at, overdue: l.status === "borrowed" && l.due_at ? new Date(l.due_at).getTime() < now : false, qr_available: ["requested", "borrowed"].includes(l.status) })), note: "Only this student's own loans. The QR code is under My books." };
    }
    case "my_notifications": {
      const rows = await get(`notifications?select=title,message,type,is_read,created_at&user_id=eq.${encodeURIComponent(claims.uid)}${args.unread_only ? "&is_read=eq.false" : ""}&order=created_at.desc&limit=8`);
      return { notifications: rows ?? [] };
    }
    case "library_info": {
      const rows = await get("site_settings?select=key,value&key=in.(library_name,library_hours,library_contact,loan_days,max_loans,game_status,registration_open)");
      return Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
    }
    case "staff_summary": {
      const s = await rpc("dashboard_stats", {});
      return s ? { titles: s.titles, waiting_requests: s.requested, on_loan: s.borrowed, overdue: s.overdue, due_soon: s.due_soon, students: s.students } : { error: "not_allowed" };
    }
    case "staff_find_loan": {
      const q = clean(args.query, 60).toLowerCase();
      const rows = (await rpc("staff_loans", { p_statuses: ["requested", "borrowed"], p_limit: 300 })) ?? [];
      const hits = rows.filter((l) => !q || `${l.username} ${l.full_name} ${l.title} ${l.student_id}`.toLowerCase().includes(q)).slice(0, 5);
      return { loans: hits.map((l) => ({ id: l.id, title: l.title, student: l.username, status: l.status, due_at: l.due_at })), note: "At most 5 open loans. Staff confirm pickups with Scan pickup." };
    }
    default:
      return { error: "unknown_tool" };
  }
}
