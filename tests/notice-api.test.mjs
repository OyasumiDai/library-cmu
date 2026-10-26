// Tests the /api/notice email function with a pretend Supabase and a pretend mail server.
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";

let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };
const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler).listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

const people = {
  staffplain: { id: "s1", role: "staff", permissions: [], active: true },
  staffperm: { id: "s2", role: "staff", permissions: ["students"], active: true },
  student: { id: "u9", role: "student", permissions: [], active: true },
  off: { id: "s3", role: "staff", permissions: [], active: false },
};
const recorded = [];
const supabase = await listen(async (req, res) => {
  const bearer = (req.headers.authorization ?? "").replace("Bearer ", "");
  const who = people[bearer];
  const chunks = []; for await (const c of req) chunks.push(c);
  if (req.url.startsWith("/auth/v1/user")) return who ? json(res, 200, { id: who.id }) : json(res, 401, {});
  if (req.url.includes("/rest/v1/profiles") && req.url.includes("select=id,role")) return json(res, 200, [who]);
  if (req.url.includes("/rest/v1/profiles") && req.url.includes("select=id,email")) return json(res, 200, [{ id: "u1", email: "ann@school.edu", full_name: "Ann <b>Cruz</b>", username: "Ann" }]);
  if (req.url.includes("/rpc/staff_loan_contact")) return json(res, 200, [{ user_id: "u1", email: "ann@school.edu", full_name: "Ann Cruz", username: "Ann", title: "The Quiet Shelf", due_at: "2026-10-20T00:00:00Z", status: "borrowed" }]);
  if (req.url.includes("/rpc/staff_user_open_loans")) return json(res, 200, [{ title: "Pixel Gardens", due_at: "2026-10-22T00:00:00Z", status: "borrowed" }]);
  if (req.url.includes("/rpc/record_notice")) { recorded.push(JSON.parse(Buffer.concat(chunks).toString())); return json(res, 200, null); }
  json(res, 404, {});
});

process.env.SUPABASE_URL = supabase.url;
process.env.SUPABASE_ANON_KEY = "anon";
const sent = [];
let breakMail = false;
const transport = { sendMail: async (mail) => { if (breakMail) throw new Error("smtp down"); sent.push(mail); } };
const { createHandler } = await import(pathToFileURL(path.resolve("api/notice.mjs")).href);
const { buildNoticeEmail } = await import(pathToFileURL(path.resolve("api/_mail.mjs")).href);
const handler = createHandler({ transport });
const call = async (body, token = "staffplain", method = "POST", h = createHandler({ transport })) => {
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(code) { out.status = code; return this; }, json(data) { out.body = data; return this; } };
  await h({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return out;
};

check((await call({ kind: "overdue", loan_id: 1 }, "staffplain", "GET")).status === 405, "Only POST is allowed");
check((await call({ kind: "overdue", loan_id: 1 }, "")).status === 401, "No sign-in is refused");
check((await call({ kind: "overdue", loan_id: 1 }, "student")).status === 403, "A student cannot send notices");
check((await call({ kind: "overdue", loan_id: 1 }, "off")).status === 403, "A disabled staff account cannot send notices");
check((await call({ kind: "spam", loan_id: 1 })).status === 400, "Unknown kinds are refused");
check((await call({ kind: "overdue" })).status === 400, "A notice needs someone to go to");

let r = await call({ kind: "overdue", loan_id: 1 });
check(r.status === 200 && sent.length === 1 && sent[0].to === "ann@school.edu", "Staff can email a borrower about an overdue loan");
check(sent[0].subject === "Overdue library book notice" && sent[0].html.includes("Dear Ann Cruz") && sent[0].html.includes("The Quiet Shelf") && sent[0].html.includes("October 20, 2026") && sent[0].html.includes("#0b1f5c"), "The letter has the greeting, the book, the due date and the library colours");
check(sent[0].text.includes("Sincerely,") && sent[0].html.includes("City of Malabon University"), "The letter is formal and has a plain-text version");
check(recorded.length === 1 && recorded[0].p_kind === "overdue", "The notice is recorded for the student's bell and the audit trail");

check((await call({ kind: "general", user_id: "u1", message: "Hello" })).status === 403, "A general reminder to a named student needs the Student Profiles permission");
r = await call({ kind: "general", user_id: "u1", message: "The library closes early on Friday. <script>" }, "staffperm");
check(r.status === 200 && sent[1].html.includes("closes early on Friday. &lt;script&gt;") && sent[1].html.includes("Dear Ann &lt;b&gt;Cruz&lt;/b&gt;"), "Names and messages are escaped in the email");
r = await call({ kind: "due_soon", user_id: "u1" }, "staffperm");
check(r.status === 200 && sent[2].text.includes("Pixel Gardens"), "A due date reminder lists the student's borrowed books");

breakMail = true;
check((await call({ kind: "overdue", loan_id: 1 })).status === 502, "A mail failure is reported cleanly");
breakMail = false;
delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD;
const notReady = createHandler();
check((await call({ kind: "overdue", loan_id: 1 }, "staffplain", "POST", notReady)).status === 503, "Without Gmail settings the function says it is not configured");
const letter = buildNoticeEmail({ kind: "general", name: "Mia", books: [], message: "Hi", library: { name: "CMU Library" } });
check(letter.subject === "A message from the library" && !letter.html.includes("Due date"), "A general letter has no book table");
check(sent[0].html.includes("cid:logo") && sent[0].attachments.some((a) => a.cid === "logo" && a.content.length > 1000), "Every notice carries the library logo");

let last;
const flood = createHandler({ transport });
for (let i = 0; i < 21; i++) last = await call({ kind: "overdue", loan_id: 1 }, "staffplain", "POST", flood);
check(last.status === 429, "Flooding is slowed down");

supabase.server.close();
void handler;
if (failures) process.exit(1);
console.log("PASS: notice function checks the sender, writes a formal escaped letter, records it and handles failures.");
