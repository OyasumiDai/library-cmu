// A tiny in-memory stand-in for Supabase, for trying the website without a real project:
//   node tests/mock-server.mjs                       (listens on :54321)
//   SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=mock npm run dev
// Sign in with student@cmu.test or admin@cmu.test, password pass1234.
// It understands just enough PostgREST (select/eq/in/order/limit, insert/update/delete/upsert, rpc) for the pages.
import http from "node:http";
import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();
const days = (n) => new Date(Date.now() + n * 86400000).toISOString();
const uid = { student: "11111111-1111-4111-8111-111111111111", admin: "22222222-2222-4222-8222-222222222222", staff: "33333333-3333-4333-8333-333333333333", desk: "44444444-4444-4444-8444-444444444444" };
const profile = (id, username, role, email) => ({ id, username, full_name: `${username} Reyes`, email, role, student_id: role === "student" ? "2024-0001" : null, gender: null, course: "BS Computer Science", major: null, college: "College of Computer Studies", year_level: "2nd Year", phone: null, photo_url: null, terms_version: "1.1", terms_accepted_at: now(), active: true, permissions: [], created_at: now() });

const subjects = ["Fiction", "Science", "History", "Technology", "Arts"];
const db = {
  profiles: [
    profile(uid.student, "Cyrus", "student", "student@cmu.test"), profile(uid.admin, "Librarian", "admin", "admin@cmu.test"),
    { ...profile(uid.staff, "Shan", "staff", "staff@cmu.test"), permissions: ["students", "reports"] }, profile(uid.desk, "Desk", "staff", "desk@cmu.test"),
    ...["Mia", "Leo", "Ana", "Joy", "Ben"].map((n, i) => ({ ...profile(randomUUID(), n, "student", `${n.toLowerCase()}@cmu.test`), course: i % 2 ? null : "BS Computer Science", year_level: i % 2 ? null : "2nd Year", phone: i % 2 ? null : "09171234567", created_at: new Date(Date.now() - i * 3 * 86400000).toISOString() })),
  ],
  movements: [], audit_log: [{ id: 1, actor_id: "22222222-2222-4222-8222-222222222222", action: "update", module: "books", details: "The Quiet Shelf 1 (copies: 3 -> 5)", created_at: now() }],
  books: Array.from({ length: 30 }, (_, i) => ({
    id: `bk-${100 + i}`, title: `${["The Quiet Shelf", "Pixel Gardens", "A Cat in the Stacks", "Night Reading", "Maps of Malabon", "Blue Hour"][i % 6]} ${Math.floor(i / 6) + 1}`,
    author: ["Ana Cruz", "Leo Santos", "Mika Reyes"][i % 3], category: subjects[i % 5], genre: "Cozy", published: String(1990 + i), publication_label: "FIRST PUBLISHED",
    publisher: "CMU Press", language: "English", synopsis: "A gentle story about people, books and the quiet corners where they meet.", copies: i % 7 === 0 ? 1 : 3, shelf: "Main Library", archived: false, cover_url: null, created_at: now(),
    obsolete_year: i === 3 || i === 4 ? 2025 : 2031, archive_location: null, archive_reason: null, archived_at: null,
    approval_status: i === 7 ? "pending" : "approved", review_note: null, submitted_by: i === 7 ? uid.staff : null, ...(i === 7 ? { archived: true, submitter: { username: "Shan", full_name: "Shan Reyes" } } : {}),
  })),
  loans: [], notifications: [], user_activity: [],
  announcements: [{ id: 1, title: "Welcome back, readers!", body: "The library is open Monday to Friday, 8 AM to 6 PM. New arrivals are on the cozy shelf.", published: true, created_at: now() }],
  team_members: [{ id: 1, team_group: "library_staff", name: "Ate Joy", position: "Head Librarian", email: "", photo_url: null, bio: "Keeper of the cat.", display_order: 1, is_active: true }],
  courses: [{ id: 1, college: "College of Computer Studies", program: "BS Computer Science", code: "BSCS", majors: [], sort: 1 }, { id: 2, college: "College of Education", program: "BS Education", code: "BSED", majors: ["English", "Math"], sort: 2 }],
  content_pages: [
    { slug: "about", title: "Our story", body: { paragraphs: ["Every project begins with an idea.", "Ours began with a cozy corner for books."] }, updated_at: now() },
    { slug: "terms", title: "Terms and Agreement", body: { version: "1.1", last_updated: "October 12, 2026", sections: [{ title: "1. Account", paragraphs: ["Keep your password safe."] }] }, updated_at: now() },
    { slug: "help", title: "Help", body: { items: [{ title: "Borrow a book", body: "Search the catalog and press Request." }, { title: "Return a book", body: "Bring it to the desk." }] }, updated_at: now() },
  ],
  site_settings: Object.entries({ loan_days: 7, max_loans: 3, registration_open: true, terms_version: "1.1", year_levels: ["1st Year", "2nd Year", "3rd Year"], game_status: "online", game_title: "CMU Virtual Library", game_description: "Explore the library in an interactive world.", game_entry: "/play/", site_notice: "", site_notice_tone: "info", assistant_enabled: true, library_hours: "Monday to Friday 7:30 AM - 8:00 PM, Saturday 8:00 AM - 5:00 PM, Sunday closed", library_contact: "library@cmu.test", registration_domains: "" }).map(([key, value]) => ({ key, value })),
};
let seq = 100;
const passwords = { "student@cmu.test": "pass1234", "admin@cmu.test": "pass1234", "staff@cmu.test": "pass1234", "desk@cmu.test": "pass1234" };

const send = (res, status, body, extra = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "*", ...extra });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const fail = (res, message, status = 400) => send(res, status, { message, code: "P0001" });

const token = (user) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
};
const session = (p) => ({
  access_token: token(p), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${p.id}`,
  user: { id: p.id, aud: "authenticated", role: "authenticated", email: p.email, app_metadata: {}, user_metadata: {}, created_at: p.created_at },
});
const who = (req) => {
  const raw = (req.headers.authorization ?? "").replace("Bearer ", "");
  try { return db.profiles.find((p) => p.id === JSON.parse(Buffer.from(raw.split(".")[1], "base64url")).sub) ?? null; } catch { return null; }
};

// ------------------------------------------------------------ PostgREST subset
const conv = (v) => (v === "true" ? true : v === "false" ? false : v);
function matches(row, params) {
  for (const [key, expr] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const [op, ...rest] = expr.split(".");
    const val = rest.join(".");
    const cell = row[key];
    if (op === "eq" && String(cell) !== String(conv(val))) return false;
    if (op === "neq" && String(cell) === String(val)) return false;
    if (op === "in" && !val.replace(/[()"]/g, "").split(",").includes(String(cell))) return false;
  }
  return true;
}
function embed(table, row, select) {
  const out = { ...row };
  if (table === "loans") {
    if (select.includes("book:")) out.book = db.books.find((b) => b.id === row.book_id) ?? null;
    if (select.includes("profile:")) out.profile = db.profiles.find((p) => p.id === row.user_id) ?? null;
  }
  if (table === "user_activity" && select.includes("book:")) out.book = db.books.find((b) => b.id === row.book_id) ?? null;
  return out;
}
function query(table, params) {
  let rows = (db[table] ?? []).filter((r) => matches(r, params));
  const order = params.get("order");
  if (order) for (const spec of order.split(",").reverse()) {
    const [col, dir] = spec.split(".");
    rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const offset = Number(params.get("offset") ?? 0);
  rows = rows.slice(offset, params.get("limit") ? offset + Number(params.get("limit")) : undefined);
  return rows.map((r) => embed(table, r, params.get("select") ?? "*"));
}
const keyOf = (table) => ({ profiles: "id", books: "id", site_settings: "key", content_pages: "slug" }[table] ?? "id");

// ------------------------------------------------------------ rpc
const openLoans = (id) => db.loans.filter((l) => l.user_id === id && ["requested", "borrowed"].includes(l.status));
const countOf = (b, status) => db.loans.filter((l) => l.book_id === b.id && l.status === status).length;
const availability = (b) => Math.max(b.copies - countOf(b, "borrowed") - countOf(b, "requested"), 0);
const staffOnly = (me) => { if (!me || !["staff", "admin"].includes(me.role)) throw new Error("Staff only."); };
const note = (user_id, title, message, type) => db.notifications.push({ id: ++seq, user_id, title, message, type, is_read: false, created_at: now() });
const rpc = {
  username_available: (a) => !db.profiles.some((p) => p.username.toLowerCase() === String(a.p_username).trim().toLowerCase()),
  catalog_categories: () => Object.entries(db.books.reduce((m, b) => ({ ...m, [b.category]: (m[b.category] ?? 0) + 1 }), {})).map(([category, total]) => ({ category, total })),
  staff_lookup_loan: (a, me) => {
    staffOnly(me);
    const code = String(a.p_code).trim().toUpperCase();
    let rows = db.loans.filter((x) => x.pickup_code === code && ["requested", "borrowed"].includes(x.status));
    if (!rows.length) rows = db.loans.filter((x) => x.pickup_code === code).slice(-1);
    return rows.map((l) => { const b = db.books.find((x) => x.id === l.book_id); const p = db.profiles.find((x) => x.id === l.user_id); return { id: l.id, status: l.status, pickup_code: l.pickup_code, title: b.title, author: b.author, cover_url: b.cover_url, shelf: b.shelf, username: p.username, full_name: p.full_name, student_id: p.student_id, requested_at: l.requested_at, borrowed_at: l.borrowed_at, due_at: l.due_at, returned_at: l.returned_at, available: availability(b) }; });
  },
  public_stats: () => ({ titles: db.books.length, students: db.profiles.filter((p) => p.role === "student").length, games: 1 }),
  registration_info: () => ({ open: true, domains: null, terms_version: "1.1" }),
  log_event: (a, me) => { if (me) db.user_activity.push({ id: ++seq, user_id: me.id, type: a.p_type, book_id: null, details: {}, created_at: now() }); },
  refresh_overdue_notices: () => 0,
  staff_loans: (a, me) => { staffOnly(me); return db.loans.filter((l) => a.p_statuses.includes(l.status)).map((l) => { const b = db.books.find((x) => x.id === l.book_id); const p = db.profiles.find((x) => x.id === l.user_id); return { ...l, title: b.title, author: b.author, cover_url: b.cover_url, category: b.category, username: p.username, full_name: p.full_name, student_id: p.student_id }; }); },
  staff_movements: (a, me) => { staffOnly(me); return db.movements.filter((m) => !a.p_type || m.action === a.p_type).map((m) => ({ ...m, title: db.books.find((b) => b.id === m.book_id)?.title ?? "", actor: "Librarian" })); },
  record_notice: (a, me) => { staffOnly(me); note(a.p_user, "Library notice", a.p_subject, "notice"); },
  set_permissions: (a, me) => { if (me?.role !== "admin") throw new Error("Admins only."); db.profiles.find((p) => p.id === a.p_user).permissions = a.p_perms.filter((x) => ["students", "game_edit", "game_host", "system", "reports", "audit"].includes(x)); },
  audit_trail: (a, me) => { if (!me || !(me.role === "admin" || me.permissions?.includes("audit"))) return []; return db.audit_log.filter((r) => !a.p_search || r.details.toLowerCase().includes(a.p_search.toLowerCase())).map((r) => ({ ...r, actor: "Librarian" })); },
  catalog_stock: () => db.books.filter((b) => !b.archived).map((b) => ({ id: b.id, copies: b.copies, borrowed: countOf(b, "borrowed"), reserved: countOf(b, "requested"), available: availability(b) })),
  catalog_search: (a) => {
    const q = a.p_query.trim().toLowerCase();
    const rows = db.books.filter((b) => !b.archived && (!q || `${b.title} ${b.author} ${b.genre} ${b.category}`.toLowerCase().includes(q)) && (!a.p_category || b.category === a.p_category))
      .map((b) => ({ ...b, available: availability(b), borrowed: countOf(b, "borrowed"), reserved: countOf(b, "requested") }))
      .filter((b) => a.p_availability === "all" || (a.p_availability === "available" ? b.available > 0 : b.available === 0));
    return rows.slice(a.p_offset, a.p_offset + a.p_limit).map((b) => ({ ...b, total_count: rows.length }));
  },
  request_book: (a, me) => {
    if (!me) throw new Error("Please sign in with an active account.");
    if (openLoans(me.id).length >= 3) throw new Error("You can have up to 3 books requested or borrowed at once.");
    if (db.loans.some((l) => l.user_id === me.id && l.book_id === a.p_book_id && ["requested", "borrowed"].includes(l.status))) throw new Error("You already have this book requested or borrowed.");
    if (availability(db.books.find((b) => b.id === a.p_book_id)) <= 0) throw new Error("Every copy is reserved or borrowed right now.");
    const loan = { id: ++seq, pickup_code: (me.pickup_code ??= randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()), book_id: a.p_book_id, user_id: me.id, status: "requested", requested_at: now(), borrowed_at: null, due_at: null, returned_at: null, note: null };
    db.loans.push(loan);
    db.profiles.filter((p) => p.role !== "student").forEach((p) => note(p.id, "New book request", `${me.username} requested a book.`, "request"));
    db.user_activity.push({ id: ++seq, user_id: me.id, type: "request", book_id: a.p_book_id, details: {}, created_at: now() });
    return loan.id;
  },
  cancel_request: (a, me) => { const l = db.loans.find((x) => x.id === a.p_loan_id && x.user_id === me?.id && x.status === "requested"); if (!l) throw new Error("That request cannot be cancelled."); l.status = "cancelled"; },
  checkout_loan: (a, me) => { staffOnly(me); const l = db.loans.find((x) => x.id === a.p_loan_id && x.status === "requested"); if (!l) throw new Error("That request is no longer waiting."); Object.assign(l, { status: "borrowed", borrowed_at: now(), due_at: days(7) }); db.movements.push({ id: ++seq, book_id: l.book_id, action: "checkout", quantity: 1, remarks: `loan ${l.id}`, created_at: now() }); note(l.user_id, "Request approved", "Your book is ready.", "approved"); },
  reject_loan: (a, me) => { staffOnly(me); const l = db.loans.find((x) => x.id === a.p_loan_id && x.status === "requested"); if (!l) throw new Error("That request is no longer waiting."); Object.assign(l, { status: "rejected", note: a.p_reason || null }); },
  return_loan: (a, me) => { staffOnly(me); const l = db.loans.find((x) => x.id === a.p_loan_id && x.status === "borrowed"); if (!l) throw new Error("That book is not out on loan."); Object.assign(l, { status: "returned", returned_at: now() }); db.movements.push({ id: ++seq, book_id: l.book_id, action: "return", quantity: 1, remarks: `loan ${l.id}`, created_at: now() }); },
  mark_read: (a, me) => { db.user_activity.push({ id: ++seq, user_id: me.id, type: "read", book_id: a.p_book_id, details: {}, created_at: now() }); },
  accept_terms: (a, me) => { me.terms_version = a.p_version; },
  adjust_copies: (a, me) => { staffOnly(me); db.books.find((b) => b.id === a.p_book_id).copies = a.p_copies; },
  archive_book: (a, me) => { staffOnly(me); db.books.find((b) => b.id === a.p_book_id).archived = a.p_archived; },
  set_user_role: (a, me) => { if (me?.role !== "admin") throw new Error("Admins only."); db.profiles.find((p) => p.id === a.p_user).role = a.p_role; },
  set_user_active: (a, me) => { if (!(me?.role === "admin" || me?.permissions?.includes("students"))) throw new Error("You need the Student Profiles permission."); db.profiles.find((p) => p.id === a.p_user).active = a.p_active; },
  // tools/borrowing-rules.sql, roughly: even-numbered books are Fiction (5 days, Php 10), the rest Circulation (3 days, Php 20)
  loan_fines: (a, me) => {
    const rule = (b) => (Number(b.id.replace(/\D/g, "")) % 2 ? { material: "circulation", label: "Circulation / Reserve", loan_days: 3, rate: 20 } : { material: "fiction", label: "Fiction", loan_days: 5, rate: 10 });
    const weekdays = (from, to) => { let n = 0; const d = new Date(from); d.setUTCHours(12); d.setUTCDate(d.getUTCDate() + 1); while (d <= to) { if (d.getUTCDay() % 6) n++; d.setUTCDate(d.getUTCDate() + 1); } return n; };
    return db.loans.filter((l) => (a.p_ids ?? []).includes(l.id) && (l.user_id === me?.id || me?.role !== "student")).map((l) => {
      const r = rule(db.books.find((b) => b.id === l.book_id));
      const days = l.due_at && ["borrowed", "returned"].includes(l.status) ? weekdays(new Date(l.due_at), l.returned_at ? new Date(l.returned_at) : new Date()) : 0;
      return { loan_id: l.id, ...r, fine_days: days, amount: days * r.rate, pickup_by: l.status === "requested" ? new Date(new Date(l.requested_at).getTime() + 48 * 3600000).toISOString() : null };
    });
  },
  expire_unclaimed_requests: (_a, me) => db.loans.filter((l) => l.status === "requested" && Date.now() - new Date(l.requested_at).getTime() > 48 * 3600000)
    .map((l) => { Object.assign(l, { status: "cancelled", note: "Not picked up within 2 days" }); return { loan_id: l.id, user_id: l.user_id }; })
    .filter((r) => me?.role !== "student" || r.user_id === me.id),
  // tools/book-obsolete-archive.sql: archive books whose obsolete year has come and that have nothing out
  archive_obsolete_books: (_a, me) => { staffOnly(me); const year = new Date().getFullYear();
    return db.books.filter((b) => !b.archived && b.obsolete_year && b.obsolete_year <= year && !db.loans.some((l) => l.book_id === b.id && ["requested", "borrowed"].includes(l.status)))
      .map((b) => { Object.assign(b, { archived: true, archive_reason: "obsolete", archive_location: null, archived_at: now() }); return { id: b.id, title: b.title }; }); },
  review_book: (a, me) => { if (me?.role !== "admin") throw new Error("Only an admin can approve books."); const b = db.books.find((x) => x.id === a.p_book_id);
    if (a.p_decision === "approve") Object.assign(b, { approval_status: "approved", archived: false, review_note: a.p_note }); else { if (!a.p_note) throw new Error("Say what needs to change."); Object.assign(b, { approval_status: "revision", review_note: a.p_note }); } },
  dashboard_stats: (_a, me) => {
    staffOnly(me);
    const count = (st) => db.loans.filter((l) => l.status === st).length;
    const series = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10); return { day: d, total: db.loans.filter((l) => l.requested_at.slice(0, 10) === d).length }; });
    return { titles: db.books.length, copies: db.books.reduce((s, b) => s + b.copies, 0), borrowed: count("borrowed"), requested: count("requested"),
      overdue: db.loans.filter((l) => l.status === "borrowed" && new Date(l.due_at) < new Date()).length, due_soon: 0,
      students: db.profiles.filter((p) => p.role === "student").length, new_students: 2, requests_now: db.loans.length, requests_before: 1, series,
      full_titles: db.books.filter((b) => b.copies > 0 && countOf(b, "borrowed") >= b.copies).slice(0, 5).map((b) => ({ title: b.title, copies: b.copies })),
      recent: db.user_activity.filter((a) => ["request", "checkout", "return"].includes(a.type)).slice(-8).reverse().map((a) => ({ type: a.type, created_at: a.created_at, username: db.profiles.find((p) => p.id === a.user_id)?.username ?? "?", title: db.books.find((b) => b.id === a.book_id)?.title ?? null })),
      popular: db.loans.slice(0, 5).map((l) => ({ title: db.books.find((b) => b.id === l.book_id).title, total: 1 })), categories: [{ category: "Fiction", total: 2 }] };
  },
};

// MOCK_DEMO=1 also gives the admin a few notifications of every kind, to see the bell panel
if (process.env.MOCK_DEMO) {
  const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
  [["New book request", "Cyrus Reyes requested \"The Quiet Shelf 1\".", "request", 12, false], ["New book request", "Mia Reyes requested \"Pixel Gardens 1\".", "request", 95, false],
   ["Book overdue", "Joy Reyes has not returned \"Maps of Malabon 2\" (2 days late).", "overdue", 240, false], ["Book returned", "Leo Reyes returned \"Blue Hour 3\".", "returned", 60 * 26, true],
   ["Request cancelled", "Ana Reyes did not pick up \"Night Reading 4\" within 2 days.", "cancelled", 60 * 30, true], ["New announcement", "Library hours change next week.", "announcement", 60 * 50, true]]
    .forEach(([title, message, type, m, read], i) => db.notifications.push({ id: 900 + i, user_id: uid.admin, title, message, type, is_read: read, created_at: ago(m) }));
}

// MOCK_DEMO=1 fills in two months of loans, so the dashboard, analytics and reports have something to draw
if (process.env.MOCK_DEMO) {
  const students = db.profiles.filter((p) => p.role === "student");
  const at = (dayAgo, hour) => new Date(Date.now() - dayAgo * 86400000 - hour * 3600000).toISOString();
  for (let i = 0; i < 60; i++) {
    const book = db.books[(i * 7) % db.books.length];
    const person = students[i % students.length];
    const ago = (i * 37) % 60;
    const status = ago < 3 ? "requested" : i % 9 === 0 ? "rejected" : ago < 14 ? "borrowed" : "returned";
    const loan = { id: ++seq, pickup_code: `DE40000${i % students.length}`, book_id: book.id, user_id: person.id, status, requested_at: at(ago, i % 9), borrowed_at: null, due_at: null, returned_at: null, note: null };
    if (status === "borrowed" || status === "returned") Object.assign(loan, { borrowed_at: at(ago - 0.5, 0), due_at: at(ago - 7.5, 0) });
    if (status === "returned") loan.returned_at = at(Math.max(ago - 6 - (i % 4), 0.2), 0);
    db.loans.push(loan);
    db.user_activity.push({ id: ++seq, user_id: person.id, type: status === "returned" ? "return" : status === "borrowed" ? "checkout" : "request", book_id: book.id, details: {}, created_at: loan.requested_at });
  }
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url, "http://x");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || "null") : null;
  const me = who(req);
  try {
    if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const p = db.profiles.find((x) => `r-${x.id}` === body.refresh_token);
        return p ? send(res, 200, session(p)) : fail(res, "Invalid Refresh Token", 401);
      }
      const p = db.profiles.find((x) => x.email === body.email);
      return p && passwords[body.email] === body.password ? send(res, 200, session(p)) : fail(res, "Invalid login credentials");
    }
    if (url.pathname === "/auth/v1/signup") {
      const m = body.data ?? {};
      if (db.profiles.some((p) => p.email === body.email)) return fail(res, "User already registered");
      const p = { ...profile(randomUUID(), m.username, "student", body.email), ...m, role: "student", active: true };
      delete p.password;
      db.profiles.push(p);
      passwords[body.email] = body.password;
      return send(res, 200, session(p));
    }
    if (url.pathname === "/auth/v1/verify") { const p = db.profiles.find((x) => x.email === body.email); return p && body.token === "123456" ? send(res, 200, session(p)) : fail(res, "Token has expired or is invalid"); }
    if (url.pathname === "/auth/v1/user" && req.method === "PUT") { if (!me) return fail(res, "Not signed in", 401); if (body.password) passwords[me.email] = body.password; return send(res, 200, session(me).user); }
    if (url.pathname === "/auth/v1/user") return me ? send(res, 200, session(me).user) : fail(res, "Not signed in", 401);
    if (url.pathname === "/auth/v1/logout") return send(res, 204);
    if (url.pathname === "/auth/v1/recover") return send(res, 200, {});
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const fn = rpc[url.pathname.split("/").pop()];
      return fn ? send(res, 200, fn(body ?? {}, me) ?? null) : fail(res, "Unknown function", 404);
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (url.pathname.startsWith("/rest/v1/") && table in db) {
      const params = url.searchParams;
      if (req.method === "GET") {
        const rows = query(table, params);
        if ((req.headers.accept ?? "").includes("pgrst.object")) return rows[0] ? send(res, 200, rows[0]) : fail(res, "No rows", 406);
        return send(res, 200, rows);
      }
      if (req.method === "POST") {
        const list = Array.isArray(body) ? body : [body];
        const key = keyOf(table);
        for (const item of list) {
          const at = db[table].findIndex((r) => r[key] === item[key]);
          if (at >= 0 && (req.headers.prefer ?? "").includes("merge")) db[table][at] = { ...db[table][at], ...item };
          else db[table].push({ id: ++seq, created_at: now(), ...item });
        }
        return send(res, 201);
      }
      if (req.method === "PATCH") { db[table].filter((r) => matches(r, params)).forEach((r) => Object.assign(r, body)); return send(res, 204); }
      if (req.method === "DELETE") { db[table] = db[table].filter((r) => !matches(r, params)); return send(res, 204); }
    }
    return fail(res, "Not found", 404);
  } catch (error) {
    return fail(res, error.message);
  }
}).listen(54321, () => console.log("Mock Supabase on http://localhost:54321"));
