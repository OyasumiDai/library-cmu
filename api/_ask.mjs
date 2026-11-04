// Shared by /api/assistant (typed questions) and /api/voice (spoken questions): who is asking, and the question to the automation.
// Nothing here is a route (the leading underscore keeps Vercel from publishing it).
import { sealToolToken, TOOL_NAMES } from "./_tools.mjs";
import { siteUrlFor } from "./_transport.mjs";

const TIMEOUT_MS = 24_000;

export const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

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

// is the automation connected? (the same three settings the assistant has always needed)
export const configured = () => !!(process.env.ASSISTANT_WEBHOOK_URL && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

// Only signed-in, active library members. Returns { user, profile, token } or { error: { status, body } }.
export async function identify(req) {
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const token = clean((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""), 4000);
  if (!token) return { error: { status: 401, body: { error: "sign_in_required" } } };
  let user;
  try {
    const who = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return { error: { status: 401, body: { error: "sign_in_required" } } };
    user = await who.json();
  } catch {
    return { error: { status: 502, body: { error: "auth_unreachable" } } };
  }
  let profile;
  try {
    const rows = await (await fetch(`${base}/rest/v1/profiles?select=username,role,active&id=eq.${encodeURIComponent(user.id)}`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })).json();
    profile = Array.isArray(rows) ? rows[0] : null;
  } catch {
    profile = null;
  }
  if (!profile || !profile.active) return { error: { status: 403, body: { error: "account_inactive" } } };
  return { user, profile, token };
}

// the tidy history the automation gets (never trust the browser: limit sizes and drop anything odd)
export const cleanHistory = (history) => (Array.isArray(history) ? history : [])
  .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant"))
  .slice(-10)
  .map((turn) => ({ role: turn.role, content: clean(turn.content, 1000) }));

// Asks the automation. Returns { status, body } where body is { reply } or { error }.
export async function askAssistant({ req, who, message, history, page, spoken = false }) {
  const { user, profile, token } = who;
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const hook = process.env.ASSISTANT_WEBHOOK_URL;

  // live facts the assistant may quote
  let facts = {};
  try {
    const rows = await (await fetch(`${base}/rest/v1/site_settings?select=key,value&key=in.(loan_days,max_loans,game_status,library_name,loan_rules,pickup_hours)`, { headers: { apikey: anon } })).json();
    facts = Object.fromEntries((Array.isArray(rows) ? rows : []).map((row) => [row.key, row.value]));
  } catch {
    facts = {};
  }

  const siteUrl = siteUrlFor(req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const answer = await fetch(hook, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(process.env.ASSISTANT_WEBHOOK_SECRET ? { "x-assistant-secret": process.env.ASSISTANT_WEBHOOK_SECRET } : {}) },
      body: JSON.stringify({
        // a spoken question gets a spoken-style answer: short, plain sentences (this hint is added by the server, never by the person)
        message: spoken ? `${message}\n\n(This was asked by voice and the answer will be read aloud: reply in 1 to 3 short plain sentences, no lists and no markdown, in the same language as the question.)` : message,
        history,
        page,
        user: { username: profile.username, role: profile.role },
        facts,
        site: "CMU Library",
        // read-only tools for the AI Agent: it sends this sealed token to tools_url (see n8n/README.md)
        ...(process.env.ASSISTANT_WEBHOOK_SECRET ? { tool_token: sealToolToken({ at: token, uid: user.id, role: profile.role }, process.env.ASSISTANT_WEBHOOK_SECRET), tools_url: `${siteUrl}/api/assistant-tools`, tools: TOOL_NAMES.filter((t) => !t.startsWith("staff_") || ["staff", "admin"].includes(profile.role)) } : {}),
      }),
    });
    if (!answer.ok) return { status: 502, body: { error: "assistant_failed" } };
    const text = await answer.text();
    let data = text;
    try { data = JSON.parse(text); } catch { /* plain text answer */ }
    const reply = pickReply(data).slice(0, 2000);
    if (!reply) return { status: 502, body: { error: "empty_reply" } };
    return { status: 200, body: { reply } };
  } catch {
    return { status: 504, body: { error: "assistant_timeout" } };
  } finally {
    clearTimeout(timer);
  }
}
