// Vercel server function: POST /api/loan-mail   { loan_id, event }  or  { loan_ids: [..], event } for several books in one email
// Sends the branded loan emails (request received with a QR code, pickup confirmed, returned, declined, cancelled).
// It works on its own: no n8n or assistant is needed. Two ways to call it:
//   1. the database hook (pg_net) with the shared header x-mail-secret: covers every loan, including ones made in the game
//   2. the website, right after an action, with the signed-in person's token (a fallback and the only way if pg_net is off)
// Each email is sent once per loan (the database remembers it).
//
// Environment variables: GMAIL_USER, GMAIL_APP_PASSWORD (required), SITE_URL (optional, e.g. https://library.example.com),
// SUPABASE_URL, SUPABASE_ANON_KEY (already set for the site)
import { explainMailError, gmailTransport, siteUrlFor } from "./_transport.mjs";
import { buildLoanEmail } from "./_mail.mjs";

const EVENTS = ["requested", "borrowed", "returned", "rejected", "cancelled"];

// The borrowing rules (tools/borrowing-rules.sql) for each book in the email: its material's loan days and daily fine,
// and the pickup window. Books and settings are public, so the anon key reads them. Without the SQL, emails keep the old wording.
async function addRules(list, base, anon) {
  try {
    const get = (path) => fetch(`${base}/rest/v1/${path}`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } }).then((r) => (r.ok ? r.json() : []));
    const settings = Object.fromEntries((await get("site_settings?select=key,value&key=in.(loan_rules,pickup_hours)")).map((s) => [s.key, s.value]));
    if (!settings.loan_rules) return;
    for (const ctx of list) {
      const book = ctx.book ?? {};
      // by id when the payload has it; otherwise title and author (two editions can share a title)
      const query = book.id ? `id=eq.${encodeURIComponent(book.id)}` : `title=eq.${encodeURIComponent(book.title ?? "")}${book.author ? `&author=eq.${encodeURIComponent(book.author)}` : ""}`;
      const [row] = await get(`books?select=material&${query}&limit=1`);
      const material = row?.material === "fiction" ? "fiction" : "circulation";
      const rule = settings.loan_rules[material];
      if (rule) ctx.rules = { ...rule, material, pickup_hours: Number(settings.pickup_hours) || 48 };
    }
  } catch { /* the email still goes out with the general wording */ }
}

export function createHandler({ transport } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const base = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    const mailer = transport ?? gmailTransport();
    if (!mailer || !base || !anon) return res.status(503).json({ error: "not_configured" });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    // one loan { loan_id } or several books at once { loan_ids: [..] } (one email, a compact list)
    const ids = [...new Set((Array.isArray(body.loan_ids) ? body.loan_ids : [body.loan_id]).map(Number))].slice(0, 10);
    const event = String(body.event ?? "");
    if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 1) || !EVENTS.includes(event)) return res.status(400).json({ error: "bad_request" });

    const secret = String(req.headers["x-mail-secret"] ?? "");
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").slice(0, 4000);
    if (!secret && !token) return res.status(401).json({ error: "unauthorized" });
    const headers = { apikey: anon, "Content-Type": "application/json", Authorization: `Bearer ${token || anon}` };
    const call = async (name, args) => fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(args) });
    const args = (id) => (secret ? { p_loan: id, p_event: event, p_secret: secret } : { p_loan: id, p_event: event });
    const unclaim = (claimed) => Promise.all(claimed.map((c) => call("mail_unclaim", args(c.id)).catch(() => undefined)));

    // the database decides who may ask, and records that each email was claimed
    const claimed = [];
    for (const id of ids) {
      const answer = await call(secret ? "mail_loan_context" : "mail_loan_context_user", args(id));
      if (!answer.ok) { await unclaim(claimed); return res.status(403).json({ error: "not_allowed" }); }
      const ctx = await answer.json();
      if (ctx) claimed.push(Object.assign(ctx, { id }));
    }
    if (!claimed.length) return res.status(200).json({ ok: true, skipped: "already_sent_or_no_email" });
    if (new Set(claimed.map((c) => c.student.email)).size > 1) { await unclaim(claimed); return res.status(400).json({ error: "one_student_per_email" }); }

    const siteUrl = siteUrlFor(req);
    const first = claimed[0];
    try {
      await addRules(claimed, base, anon);
      const mail = await buildLoanEmail(claimed, siteUrl);
      await mailer.sendMail({ from: `"${first.library.name || "CMU Library"}" <${process.env.GMAIL_USER ?? "library@localhost"}>`, to: first.student.email, subject: mail.subject, text: mail.text, html: mail.html, attachments: mail.attachments });
      return res.status(200).json({ ok: true, books: claimed.length });
    } catch (error) {
      console.error("loan-mail: send failed", error?.code, error?.responseCode, error?.message);
      await unclaim(claimed);
      return res.status(502).json({ error: "send_failed", reason: explainMailError(error) });
    }
  };
}

export default createHandler();
