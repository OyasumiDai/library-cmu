// Tests the /api/voice server function with a pretend Supabase, a pretend automation webhook and a pretend ElevenLabs.
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";

let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };

const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler).listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readAll = async (req) => { const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks); };

const supabase = await listen((req, res) => {
  const bearer = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (req.url.startsWith("/auth/v1/user")) return bearer === "good" || bearer === "off" ? json(res, 200, { id: bearer === "good" ? "u1" : "u2" }) : json(res, 401, {});
  if (req.url.startsWith("/rest/v1/profiles")) return json(res, 200, [{ username: "Cyrus", role: "student", active: bearer === "good" }]);
  if (req.url.startsWith("/rest/v1/site_settings")) return json(res, 200, [{ key: "loan_days", value: 7 }]);
  json(res, 404, {});
});

let hookBody = null;
const hook = await listen(async (req, res) => {
  hookBody = JSON.parse((await readAll(req)).toString());
  json(res, 200, { reply: "Open **Discover** and press [Request to borrow](/catalog).\n- Easy\n[[view:my_loans]]" });
});

let heard = "Paano ako manghiram ng libro?";
let sttKey = null;
let sttFields = null;
let ttsRequest = null;
let ttsFails = false;
const eleven = await listen(async (req, res) => {
  sttKey = req.headers["xi-api-key"];
  const raw = await readAll(req);
  if (req.url.startsWith("/v1/speech-to-text")) {
    sttFields = raw.toString("latin1");
    return json(res, 200, { language_code: "tgl", text: heard });
  }
  if (req.url.startsWith("/v1/text-to-speech/")) {
    ttsRequest = { url: req.url, body: JSON.parse(raw.toString()) };
    if (ttsFails) return json(res, 500, { detail: "nope" });
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    return res.end(Buffer.from("ID3-fake-mp3"));
  }
  json(res, 404, {});
});

const call = async (handler, { method = "POST", token = "good", body } = {}) => {
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(code) { out.status = code; return this; }, json(data) { out.body = data; return this; } };
  await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return out;
};

const clip = (bytes = 4000) => ({ audio: Buffer.alloc(bytes, 7).toString("base64"), mime: "audio/webm;codecs=opus", history: [{ role: "user", content: "hi" }], page: "catalog" });

const file = pathToFileURL(path.resolve("api/voice.mjs")).href;
const { default: handler, speakable } = await import(file);

// what is read aloud is plain speech
check(speakable("Open **Discover** and press [Request to borrow](/catalog).\n- Easy\n[[view:overdue]]") === "Open Discover and press Request to borrow. Easy.", "Links, bold, bullets and view commands are removed from the spoken text");
check(speakable("a. ".repeat(400)).length <= 600, "A long answer is cut short for speaking");

delete process.env.ELEVENLABS_API_KEY;
process.env.ASSISTANT_WEBHOOK_URL = hook.url;
process.env.ASSISTANT_WEBHOOK_SECRET = "s3cret";
process.env.SUPABASE_URL = supabase.url;
process.env.SUPABASE_ANON_KEY = "anon";
process.env.ELEVENLABS_API_URL = eleven.url;
check((await call(handler, { body: clip() })).status === 503, "Without an ElevenLabs key voice says it is not configured");

process.env.ELEVENLABS_API_KEY = "xi-test-key";
check((await call(handler, { method: "GET" })).status === 405, "Only POST is allowed");
check((await call(handler, { token: "", body: clip() })).status === 401, "No sign-in is refused");
check((await call(handler, { token: "off", body: clip() })).status === 403, "A disabled account is refused");
check((await call(handler, { body: { audio: "", mime: "audio/webm" } })).status === 400, "A missing recording is refused");
check((await call(handler, { body: { ...clip(), mime: "text/html" } })).status === 400, "Only audio types are accepted");
check((await call(handler, { body: clip(100) })).status === 422, "A tiny recording counts as silence");
check((await call(handler, { body: { ...clip(), audio: "A".repeat(3_100_000) } })).status === 413, "A huge recording is refused");

const r = await call(handler, { body: clip() });
check(r.status === 200, `A member gets an answer (got ${r.status})`);
check(r.body.transcript === heard, "The transcript comes back (the page keeps it out of the chat)");
check(r.body.reply.includes("[[view:my_loans]]"), "The written reply keeps the view command so the page can open the table");
check(typeof r.body.audio === "string" && Buffer.from(r.body.audio, "base64").toString() === "ID3-fake-mp3", "The spoken answer is returned as base64 audio");
check(sttKey === "xi-test-key", "The ElevenLabs key is sent from the server");
check(/scribe_v1/.test(sttFields) && !/language_code/.test(sttFields), "The language is detected by itself (none is forced)");
check(ttsRequest.url.startsWith("/v1/text-to-speech/UDYENShoqlMksjDyKqGV"), "The chosen voice speaks");
check(!/view|\*\*|\]\(/.test(ttsRequest.body.text) && ttsRequest.body.model_id === "eleven_flash_v2_5", "Only plain words are sent to the voice");
check(hookBody.message.startsWith(heard) && /read aloud/.test(hookBody.message) && hookBody.user.username === "Cyrus" && hookBody.tools_url.endsWith("/api/assistant-tools"), "The assistant gets the spoken question like a typed one, with who is asking");
check(hookBody.history.length === 1 && hookBody.page === "catalog", "History and page are passed on");

ttsFails = true;
let f = await call(handler, { body: clip() });
check(f.status === 200 && f.body.audio === null && f.body.reply, "If the voice fails the written answer still arrives");
ttsFails = false;

heard = "  ";
f = await call(handler, { body: clip() });
check(f.status === 422 && f.body.error === "no_speech", "Nothing heard is reported, not sent to the assistant");
heard = "ok";

// slow down floods: 8 a minute
let limited = false;
for (let i = 0; i < 10; i++) if ((await call(handler, { body: clip() })).status === 429) limited = true;
check(limited, "Too many voice questions in a minute are slowed down");

for (const s of [supabase, hook, eleven]) s.server.close();
if (failures) { console.error(`${failures} voice check(s) failed.`); process.exit(1); }
console.log("PASS: voice function checks sign-in, limits clips, hears the language, asks the assistant and speaks with the chosen voice.");
