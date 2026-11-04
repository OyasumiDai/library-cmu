// Vercel server function: POST /api/voice
// "Hold to talk" in the assistant. The browser records the person while they hold the mic button and sends the clip here.
// This function (1) checks they are a signed-in library member, (2) turns the speech into text with ElevenLabs
// (the language is detected by itself: English, Filipino or Taglish), (3) asks the same assistant the typed chat uses,
// and (4) reads the answer aloud with your ElevenLabs voice. It returns { transcript, reply, audio } (audio = base64 mp3).
// The ElevenLabs key stays on the server, so nobody can read or abuse it from the browser.
//
// Environment variables (Vercel > Settings > Environment Variables, tick Production, then redeploy):
//   ELEVENLABS_API_KEY      your ElevenLabs API key (required for voice)
//   ELEVENLABS_VOICE_ID     optional, the voice that speaks (default UDYENShoqlMksjDyKqGV)
//   ELEVENLABS_TTS_MODEL    optional, default eleven_flash_v2_5 (fast, many languages); eleven_multilingual_v2 sounds a little richer but is slower
//   plus the ones the typed assistant already needs: ASSISTANT_WEBHOOK_URL, ASSISTANT_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY
import { askAssistant, clean, cleanHistory, configured, identify } from "./_ask.mjs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const MAX_AUDIO_B64 = 3_000_000; // about 2 MB of audio: far more than 30 seconds of speech
const MIN_AUDIO_BYTES = 1_200;
const MAX_SPOKEN_CHARS = 600;
const DEFAULT_VOICE = "UDYENShoqlMksjDyKqGV";
const recent = new Map(); // user id -> timestamps (best effort; resets when the function restarts)

const EXTENSIONS = { webm: "webm", mp4: "m4a", m4a: "m4a", ogg: "ogg", wav: "wav", mpeg: "mp3", mp3: "mp3", aac: "aac" };

// the answer without the website-only parts (links, bold, bullets and the [[view:...]] table commands), as plain speech
export function speakable(reply) {
  let text = String(reply ?? "")
    .replace(/\[\[[^\]]*\]\]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/([.!?])\s*\./g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (text.length > MAX_SPOKEN_CHARS) {
    const cut = text.slice(0, MAX_SPOKEN_CHARS);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    text = end > 200 ? cut.slice(0, end + 1) : cut;
  }
  return text;
}

const api = () => (process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io").replace(/\/+$/, "");

async function listen(key, bytes, mime) {
  const kind = /(webm|mp4|m4a|ogg|wav|mpeg|mp3|aac)/.exec(mime)?.[1] ?? "webm";
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("tag_audio_events", "false"); // no "(laughter)" notes in the text
  form.append("file", new Blob([bytes], { type: mime }), `voice.${EXTENSIONS[kind]}`);
  const reply = await fetch(`${api()}/v1/speech-to-text`, { method: "POST", headers: { "xi-api-key": key }, body: form, signal: AbortSignal.timeout(20_000) });
  if (!reply.ok) {
    console.error(`ElevenLabs speech-to-text failed (${reply.status}): ${(await reply.text().catch(() => "")).slice(0, 300)}`);
    return null;
  }
  const data = await reply.json().catch(() => null);
  return clean(data?.text, 500);
}

async function speak(key, text) {
  const voice = String(process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE).replace(/[^A-Za-z0-9]/g, "") || DEFAULT_VOICE;
  const reply = await fetch(`${api()}/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!reply.ok) {
    console.error(`ElevenLabs text-to-speech failed (${reply.status}): ${(await reply.text().catch(() => "")).slice(0, 300)}`);
    return null;
  }
  return Buffer.from(await reply.arrayBuffer()).toString("base64");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = String(process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!key || !configured()) return res.status(503).json({ error: "not_configured" });

  // 1. who is asking? Only signed-in, active library members.
  const who = await identify(req);
  if (who.error) return res.status(who.error.status).json(who.error.body);

  // 2. slow down floods (every clip costs ElevenLabs credits)
  const now = Date.now();
  const stamps = (recent.get(who.user.id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "slow_down" });
  stamps.push(now);
  recent.set(who.user.id, stamps);

  // 3. the recording (never trust the browser: only short audio clips)
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}; } catch { body = {}; }
  const mime = clean(body.mime, 60).toLowerCase().split(";")[0];
  const b64 = typeof body.audio === "string" ? body.audio : "";
  if (!/^(audio|video)\/(webm|mp4|ogg|wav|x-wav|mpeg|mp3|aac|x-m4a)$/.test(mime) || !b64) return res.status(400).json({ error: "bad_audio" });
  if (b64.length > MAX_AUDIO_B64) return res.status(413).json({ error: "too_long" });
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length < MIN_AUDIO_BYTES) return res.status(422).json({ error: "no_speech" });

  // 4. speech to text
  let transcript;
  try { transcript = await listen(key, bytes, mime); } catch { transcript = null; }
  if (transcript === null) return res.status(502).json({ error: "listen_failed" });
  if (!/[\p{L}\p{N}]{2}/u.test(transcript)) return res.status(422).json({ error: "no_speech" });

  // 5. ask the assistant, exactly like a typed question
  const out = await askAssistant({ req, who, message: transcript, history: cleanHistory(body.history), page: clean(body.page, 40), spoken: true });
  if (out.status !== 200) return res.status(out.status).json(out.body);

  // 6. read the answer aloud (if the voice fails the written answer still goes back)
  let audio = null;
  const text = speakable(out.body.reply);
  if (text) { try { audio = await speak(key, text); } catch { audio = null; } }
  return res.status(200).json({ transcript, reply: out.body.reply, audio });
}
