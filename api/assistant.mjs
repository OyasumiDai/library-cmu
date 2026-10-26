// Vercel server function: POST /api/assistant
// The website sends the student's question here. This function checks they are a signed-in library member,
// forwards the question to your ChatGPT automation (webhook), and returns { reply }.
// The webhook address stays on the server (env ASSISTANT_WEBHOOK_URL), so nobody can read or abuse it from the browser.
//
// Environment variables (Vercel > Settings > Environment Variables):
//   ASSISTANT_WEBHOOK_URL      the webhook of your automation (required for the AI)
//   ASSISTANT_WEBHOOK_SECRET   optional: sent as the x-assistant-secret header so the automation can verify the caller
//   SUPABASE_URL, SUPABASE_ANON_KEY   already set for the site; used to check who is asking
import { sealToolToken, TOOL_NAMES } from "./_tools.mjs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const TIMEOUT_MS = 24_000;
const recent = new Map(); // user id -> timestamps (best effort; resets when the function restarts)

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

// the automation may answer in many shapes; find the text
export function pickReply(data) {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();
  if (Array.isArray(data)) return pickReply(data[0]);
  for (const key of ["reply", "output", "message", "text", "answer", "response", "content", "result"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
    if (data[key] && typeof data[key] === "object") {
      const inner = pickReply(data[key]);
      if (inner) return inner;
    }
  }
  return "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const hook = process.env.ASSISTANT_WEBHOOK_URL;
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!hook || !base || !anon) return res.status(503).json({ error: "not_configured" });

  // 1. who is asking? Only signed-in, active library members.
  const token = clean((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""), 4000);
  if (!token) return res.status(401).json({ error: "sign_in_required" });
  let user;
  try {
    const who = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: "sign_in_required" });
    user = await who.json();
  } catch {
    return res.status(502).json({ error: "auth_unreachable" });
  }
  let profile;
  try {
    const rows = await (await fetch(`${base}/rest/v1/profiles?select=username,role,active&id=eq.${encodeURIComponent(user.id)}`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })).json();
    profile = Array.isArray(rows) ? rows[0] : null;
  } catch {
    profile = null;
  }
  if (!profile || !profile.active) return res.status(403).json({ error: "account_inactive" });

  // 2. slow down floods
  const now = Date.now();
  const stamps = (recent.get(user.id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "slow_down" });
  stamps.push(now);
  recent.set(user.id, stamps);

  // 3. what was asked (never trust the browser: limit sizes and drop anything odd)
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const message = clean(body.message, 500);
  if (!message) return res.status(400).json({ error: "empty_message" });
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant"))
    .slice(-10)
    .map((turn) => ({ role: turn.role, content: clean(turn.content, 1000) }));

  // 4. live facts the assistant may quote
  let facts = {};
  try {
    const rows = await (await fetch(`${base}/rest/v1/site_settings?select=key,value&key=in.(loan_days,max_loans,game_status,library_name)`, { headers: { apikey: anon } })).json();
    facts = Object.fromEntries((Array.isArray(rows) ? rows : []).map((row) => [row.key, row.value]));
  } catch {
    facts = {};
  }

  // 5. ask the automation
  const siteUrl = (process.env.SITE_URL || `${String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0]}://${req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost"}`).replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const answer = await fetch(hook, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(process.env.ASSISTANT_WEBHOOK_SECRET ? { "x-assistant-secret": process.env.ASSISTANT_WEBHOOK_SECRET } : {}) },
      body: JSON.stringify({
        message,
        history,
        page: clean(body.page, 40),
        user: { username: profile.username, role: profile.role },
        facts,
        site: "CMU Library",
        // read-only tools for the AI Agent: it sends this sealed token to tools_url (see n8n/README.md)
        ...(process.env.ASSISTANT_WEBHOOK_SECRET ? { tool_token: sealToolToken({ at: token, uid: user.id, role: profile.role }, process.env.ASSISTANT_WEBHOOK_SECRET), tools_url: `${siteUrl}/api/assistant-tools`, tools: TOOL_NAMES.filter((t) => !t.startsWith("staff_") || ["staff", "admin"].includes(profile.role)) } : {}),
      }),
    });
    if (!answer.ok) return res.status(502).json({ error: "assistant_failed" });
    const text = await answer.text();
    let data = text;
    try { data = JSON.parse(text); } catch { /* plain text answer */ }
    const reply = pickReply(data).slice(0, 2000);
    if (!reply) return res.status(502).json({ error: "empty_reply" });
    return res.status(200).json({ reply });
  } catch {
    return res.status(504).json({ error: "assistant_timeout" });
  } finally {
    clearTimeout(timer);
  }
}
