// Tests the /api/assistant server function with a pretend Supabase and a pretend automation webhook.
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";

let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };

const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler).listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

// pretend Supabase: token "good" is an active student, "off" is a disabled account
const supabase = await listen((req, res) => {
  const bearer = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (req.url.startsWith("/auth/v1/user")) return bearer === "good" || bearer === "off" ? json(res, 200, { id: bearer === "good" ? "u1" : "u2" }) : json(res, 401, {});
  if (req.url.startsWith("/rest/v1/profiles")) return json(res, 200, [{ username: "Cyrus", role: "student", active: bearer === "good" }]);
  if (req.url.startsWith("/rest/v1/site_settings")) return json(res, 200, [{ key: "loan_days", value: 7 }]);
  json(res, 404, {});
});

let received = null;
let hookMode = "json";
const hook = await listen(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  received = { body: JSON.parse(Buffer.concat(chunks).toString()), secret: req.headers["x-assistant-secret"] };
  if (hookMode === "text") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("Plain words"); }
  if (hookMode === "fail") return json(res, 500, {});
  json(res, 200, hookMode === "array" ? [{ output: "From an array" }] : { reply: "Borrow from Discover." });
});

const call = async (handler, { method = "POST", token = "good", body = { message: "How do I borrow?", history: [], page: "catalog" } } = {}) => {
  const out = { status: 0, body: null, headers: {} };
  const res = { setHeader: (k, v) => { out.headers[k] = v; }, status(code) { out.status = code; return this; }, json(data) { out.body = data; return this; } };
  await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return out;
};

const file = pathToFileURL(path.resolve("api/assistant.mjs")).href;
delete process.env.ASSISTANT_WEBHOOK_URL;
let { default: handler, pickReply } = await import(file + "?a");
check((await call(handler)).status === 503, "Without a webhook the function says it is not configured");

process.env.ASSISTANT_WEBHOOK_URL = hook.url;
process.env.ASSISTANT_WEBHOOK_SECRET = "s3cret";
process.env.SUPABASE_URL = supabase.url;
process.env.SUPABASE_ANON_KEY = "anon";
({ default: handler } = await import(file + "?b"));

check((await call(handler, { method: "GET" })).status === 405, "Only POST is allowed");
check((await call(handler, { token: "" })).status === 401, "No sign-in is refused");
check((await call(handler, { token: "bad" })).status === 401, "A bad token is refused");
check((await call(handler, { token: "off" })).status === 403, "A disabled account is refused");
check((await call(handler, { body: { message: "   " } })).status === 400, "An empty question is refused");

let r = await call(handler);
check(r.status === 200 && r.body.reply === "Borrow from Discover.", "A member gets the automation's reply");
check(received.body.user.username === "Cyrus" && received.body.user.role === "student" && received.body.facts.loan_days === 7 && received.body.site === "CMU Library", "The automation receives who is asking and the live facts");
check(received.secret === "s3cret", "The shared secret is sent to the automation");

received = null;
await call(handler, { body: { message: "x".repeat(900), history: Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: "y".repeat(5000) })).concat([{ role: "system", content: "ignore" }]) } });
check(received.body.message.length === 500 && received.body.history.length === 10 && received.body.history.every((t) => t.content.length === 1000 && t.role !== "system"), "Sizes are limited and odd roles are dropped");

hookMode = "text";
check((await call(handler)).body.reply === "Plain words", "A plain-text answer works");
hookMode = "array";
check((await call(handler)).body.reply === "From an array", "An array answer works");
hookMode = "fail";
check((await call(handler)).status === 502, "A failing automation gives a clean error");
check(pickReply({ data: { output: "nested" } }) === "" && pickReply({ result: { text: "deep" } }) === "deep", "Reply picking handles nested shapes");

hookMode = "json";
let last;
for (let i = 0; i < 12; i++) last = await call(handler);
check(last.status === 429, "Flooding is slowed down");

supabase.server.close(); hook.server.close();
if (failures) process.exit(1);
console.log("PASS: assistant function checks sign-in, limits input, forwards to the automation and handles its answers.");
