// Vercel server function: POST /api/notice
// Sends a formal letter by email (overdue notice, due date reminder or general reminder) from the library's Gmail account.
// Only signed-in staff may call it. General reminders to a named student also need the "Student Profiles" permission.
//
// Environment variables (Vercel > Settings > Environment Variables):
//   GMAIL_USER            the library's Gmail address
//   GMAIL_APP_PASSWORD    a Google "App password" (Google account > Security > 2-Step Verification > App passwords)
//   LIBRARY_FROM_NAME     optional, default "CMU Library"
//   SUPABASE_URL, SUPABASE_ANON_KEY   already set for the site
import nodemailer from "nodemailer";
import { buildNoticeEmail } from "./_mail.mjs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const recent = new Map();

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

export function createHandler({ transport } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const base = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    const mailer = transport ?? (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
      ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }) : null);
    if (!mailer || !base || !anon) return res.status(503).json({ error: "not_configured" });
    const fromName = process.env.LIBRARY_FROM_NAME || "CMU Library";
    const siteUrl = (process.env.SITE_URL || `${String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0]}://${req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost"}`).replace(/\/$/, "");

    // who is sending? an active staff member or admin
    const token = clean((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""), 4000);
    if (!token) return res.status(401).json({ error: "sign_in_required" });
    const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    let sender;
    try {
      const who = await fetch(`${base}/auth/v1/user`, { headers });
      if (!who.ok) return res.status(401).json({ error: "sign_in_required" });
      const user = await who.json();
      const rows = await (await fetch(`${base}/rest/v1/profiles?select=id,role,permissions,active&id=eq.${encodeURIComponent(user.id)}`, { headers })).json();
      sender = Array.isArray(rows) ? rows[0] : null;
    } catch {
      return res.status(502).json({ error: "auth_unreachable" });
    }
    if (!sender || !sender.active || !["staff", "admin"].includes(sender.role)) return res.status(403).json({ error: "staff_only" });
    const mayReadStudents = sender.role === "admin" || (sender.permissions ?? []).includes("students");

    const now = Date.now();
    const stamps = (recent.get(sender.id) ?? []).filter((t) => now - t < WINDOW_MS);
    if (stamps.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "slow_down" });
    stamps.push(now);
    recent.set(sender.id, stamps);

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const kind = ["overdue", "due_soon", "general"].includes(body.kind) ? body.kind : null;
    if (!kind) return res.status(400).json({ error: "bad_kind" });
    const rpc = async (name, args) => { const r = await fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(args) }); return r.ok ? r.json() : null; };

    // who is the letter for?
    let target = null;
    let books = [];
    if (body.loan_id) {
      const rows = await rpc("staff_loan_contact", { p_loan: Number(body.loan_id) });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return res.status(404).json({ error: "loan_not_found" });
      target = { id: row.user_id, email: row.email, name: row.full_name || row.username };
      books = [{ title: row.title, due_at: row.due_at }];
    } else if (body.user_id) {
      if (!mayReadStudents) return res.status(403).json({ error: "permission_needed" });
      const rows = await (await fetch(`${base}/rest/v1/profiles?select=id,email,full_name,username&id=eq.${encodeURIComponent(body.user_id)}`, { headers })).json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return res.status(404).json({ error: "student_not_found" });
      target = { id: row.id, email: row.email, name: row.full_name || row.username };
      books = ((await rpc("staff_user_open_loans", { p_user: row.id })) ?? []).filter((b) => b.status === "borrowed");
    } else return res.status(400).json({ error: "nobody_to_email" });
    if (!target.email) return res.status(422).json({ error: "no_email" });

    // library name, hours and contact for the footer of the letter
    let library = { name: fromName };
    try {
      const rows = await (await fetch(`${base}/rest/v1/site_settings?select=key,value&key=in.(library_name,library_hours,library_contact)`, { headers })).json();
      const map = Object.fromEntries((Array.isArray(rows) ? rows : []).map((r) => [r.key, r.value]));
      library = { name: process.env.LIBRARY_FROM_NAME || map.library_name || fromName, hours: map.library_hours || "", contact: map.library_contact || "" };
    } catch { /* the letter works without the footer details */ }
    const letter = buildNoticeEmail({ kind, name: target.name, books, message: clean(body.message, 600), library, siteUrl });
    try {
      await mailer.sendMail({ from: `"${fromName}" <${process.env.GMAIL_USER ?? "library@localhost"}>`, to: target.email, subject: letter.subject, text: letter.text, html: letter.html, attachments: letter.attachments });
    } catch {
      return res.status(502).json({ error: "send_failed" });
    }
    await rpc("record_notice", { p_user: target.id, p_kind: kind, p_subject: letter.subject });
    return res.status(200).json({ ok: true });
  };
}

export default createHandler();
