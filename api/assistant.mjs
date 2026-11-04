// Vercel server function: POST /api/assistant
// The website sends the student's question here. This function checks they are a signed-in library member,
// forwards the question to your ChatGPT automation (webhook), and returns { reply }.
// The webhook address stays on the server (env ASSISTANT_WEBHOOK_URL), so nobody can read or abuse it from the browser.
//
// Environment variables (Vercel > Settings > Environment Variables):
//   ASSISTANT_WEBHOOK_URL      the webhook of your automation (required for the AI)
//   ASSISTANT_WEBHOOK_SECRET   optional: sent as the x-assistant-secret header so the automation can verify the caller
//   SUPABASE_URL, SUPABASE_ANON_KEY   already set for the site; used to check who is asking
import { askAssistant, clean, cleanHistory, configured, identify, pickReply } from "./_ask.mjs";

export { pickReply };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const recent = new Map(); // user id -> timestamps (best effort; resets when the function restarts)

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!configured()) return res.status(503).json({ error: "not_configured" });

  // 1. who is asking? Only signed-in, active library members.
  const who = await identify(req);
  if (who.error) return res.status(who.error.status).json(who.error.body);

  // 2. slow down floods
  const now = Date.now();
  const stamps = (recent.get(who.user.id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "slow_down" });
  stamps.push(now);
  recent.set(who.user.id, stamps);

  // 3. what was asked
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const message = clean(body.message, 500);
  if (!message) return res.status(400).json({ error: "empty_message" });

  // 4. ask the automation
  const out = await askAssistant({ req, who, message, history: cleanHistory(body.history), page: clean(body.page, 40) });
  return res.status(out.status).json(out.body);
}
