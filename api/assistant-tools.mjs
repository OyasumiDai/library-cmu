// Vercel server function: POST /api/assistant-tools
// The tools your n8n AI Agent can call. Read-only. See ASSISTANT_PROMPT.md and n8n/README.md.
//
// Call it with:
//   header  x-assistant-secret: <ASSISTANT_WEBHOOK_SECRET>
//   body    { "tool_token": "<from the webhook body>", "tool": "search_books", "args": { "query": "cats" } }
// The tool_token is sealed (n8n cannot read it) and expires after 10 minutes.
import { openToolToken, runTool, safeEqual, TOOL_NAMES } from "./_tools.mjs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const recent = new Map();

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const secret = process.env.ASSISTANT_WEBHOOK_SECRET;
  const base = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!secret || !base || !anon) return res.status(503).json({ error: "not_configured" });
  if (!safeEqual(req.headers["x-assistant-secret"] ?? "", secret)) return res.status(401).json({ error: "bad_secret" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const claims = openToolToken(body.tool_token, secret);
  if (!claims) return res.status(401).json({ error: "token_expired_or_invalid" });
  if (!TOOL_NAMES.includes(body.tool)) return res.status(400).json({ error: "unknown_tool", tools: TOOL_NAMES });

  const now = Date.now();
  const stamps = (recent.get(claims.uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "slow_down" });
  stamps.push(now);
  recent.set(claims.uid, stamps);

  try {
    const result = await runTool({ tool: body.tool, args: typeof body.args === "object" && body.args ? body.args : {}, claims, base, anon });
    return res.status(200).json(result);
  } catch {
    return res.status(502).json({ error: "tool_failed" });
  }
}
