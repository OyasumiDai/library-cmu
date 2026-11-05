// Vercel server function: POST /api/mail-check   { send?: true }
// For the admin: checks that the website can send email (settings present, Gmail accepts the login, the database
// has the loan-email functions) and, with { send: true }, sends a real branded test email with a QR code to the admin.
// Settings > Loan emails with QR codes > "Send me a test email" calls this.
import { buildLoanEmail } from "./_mail.mjs";
import { explainMailError, gmailTransport, mailEnv, siteUrlFor } from "./_transport.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").slice(0, 4000);
  if (!base || !anon) return res.status(200).json({ ok: false, problems: ["SUPABASE_URL and SUPABASE_ANON_KEY are not set in Vercel."] });
  if (!token) return res.status(401).json({ error: "sign_in_required" });

  const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  let me;
  try {
    const rows = await (await fetch(`${base}/rest/v1/profiles?select=username,email,role,active&id=eq.${encodeURIComponent(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub)}`, { headers })).json();
    me = Array.isArray(rows) ? rows[0] : null;
  } catch {
    me = null;
  }
  if (!me?.active || me.role !== "admin") return res.status(403).json({ error: "admins_only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const problems = [];
  const { user, pass } = mailEnv();
  if (!user) problems.push("GMAIL_USER is not set in Vercel.");
  if (!pass) problems.push("GMAIL_APP_PASSWORD is not set in Vercel.");
  if (!process.env.SITE_URL) problems.push(`SITE_URL is not set in Vercel. Email links and QR codes point to ${siteUrlFor(req)} for now; set it to the library's real address.`);

  // are the database functions there? (site.sql must be run again after updates)
  const probe = await fetch(`${base}/rest/v1/rpc/mail_loan_context_user`, { method: "POST", headers, body: JSON.stringify({ p_loan: 0, p_event: "requested" }) }).catch(() => null);
  if (probe && probe.status === 404) problems.push("The database is missing the loan email functions: run supabase/site.sql again in the Supabase SQL editor.");

  const mailer = gmailTransport();
  if (mailer) {
    try { await mailer.verify(); } catch (error) { problems.push(explainMailError(error)); }
  }

  let sent = false;
  if (body.send && mailer && !problems.some((p) => /Gmail|GMAIL/.test(p)) && me.email) {
    const siteUrl = siteUrlFor(req);
    const book = (title, author, shelf) => ({ title, author, shelf, category: "Sample" });
    const ctx = {
      event: "requested",
      loan: { id: 0, pickup_code: "TEST1234", requested_at: new Date().toISOString(), due_at: null },
      book: book("A Test Book", "The Library", "A1"),
      basket: [{ id: 1, ...book("A Test Book", "The Library", "A1") }, { id: 2, ...book("Another Test Book", "The Library", "B2") }],
      student: { name: me.username, username: me.username, email: me.email },
      library: { name: "CMU Library", loan_days: 7 },
    };
    try {
      const mail = await buildLoanEmail(ctx, siteUrl);
      await mailer.sendMail({ from: `"CMU Library" <${user}>`, to: me.email, subject: `Test: ${mail.subject}`, text: mail.text, html: mail.html, attachments: mail.attachments });
      sent = true;
    } catch (error) {
      problems.push(explainMailError(error));
    }
  }
  return res.status(200).json({ ok: problems.length === 0, sent, to: sent ? me.email : undefined, problems });
}
