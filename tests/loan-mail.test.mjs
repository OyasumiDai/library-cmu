// Tests the branded loan emails and /api/loan-mail with a pretend Supabase and a pretend mail server.
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";

let failures = 0;
const check = (ok, message) => { if (!ok) { failures++; console.error("FAIL:", message); } };
const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler).listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

const ctx = (event, extra = {}) => ({
  event,
  loan: { id: 7, status: event, pickup_code: "A1B2C3D4E5F6", requested_at: "2026-10-26T04:00:00Z", borrowed_at: "2026-10-27T02:00:00Z", due_at: "2026-11-03T02:00:00Z", returned_at: "2026-11-02T02:00:00Z", note: "Only one copy" },
  book: { title: "The Quiet Shelf <1>", author: "Ana Cruz", category: "Fiction", shelf: "Main Library", cover_url: null },
  student: { name: "Ann Cruz", username: "Ann", email: "ann@school.edu" },
  library: { name: "CMU Library", hours: "Mon-Fri 7:30-8:00", contact: "library@school.edu", loan_days: 7 },
  ...extra,
});

const sentLog = new Set();
const unclaimed = [];
let ctxEvent = null;
const supabase = await listen(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const bearer = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (req.url.includes("/rpc/mail_loan_context_user")) {
    if (bearer !== "owner") return json(res, 400, { message: "Not allowed." });
    const key = `${body.p_loan}:${body.p_event}`; if (sentLog.has(key)) return json(res, 200, null); sentLog.add(key);
    return json(res, 200, ctx(body.p_event));
  }
  if (req.url.includes("/rpc/mail_loan_context")) {
    if (body.p_secret !== "s3cr3t") return json(res, 400, { message: "Not allowed." });
    const key = `${body.p_loan}:${body.p_event}`; if (sentLog.has(key)) return json(res, 200, null); sentLog.add(key);
    return json(res, 200, ctx(body.p_event));
  }
  if (req.url.includes("/rpc/mail_unclaim")) { unclaimed.push(body); sentLog.delete(`${body.p_loan}:${body.p_event}`); return json(res, 200, null); }
  json(res, 404, {});
});
process.env.SUPABASE_URL = supabase.url;
process.env.SUPABASE_ANON_KEY = "anon";
process.env.SITE_URL = "https://library.example.com";

const sent = [];
let broken = false;
const transport = { sendMail: async (mail) => { if (broken) throw new Error("smtp down"); sent.push(mail); } };
const { createHandler } = await import(pathToFileURL(path.resolve("api/loan-mail.mjs")).href);
const { buildLoanEmail, layout } = await import(pathToFileURL(path.resolve("api/_mail.mjs")).href);
const handler = createHandler({ transport });
const call = async (body, headers = {}, method = "POST", h = handler) => {
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(code) { out.status = code; return this; }, json(data) { out.body = data; return this; } };
  await h({ method, headers, body }, res);
  return out;
};
const PNG = [0x89, 0x50, 0x4e, 0x47];
const isPng = (buf) => PNG.every((b, i) => buf[i] === b);

check((await call({}, {}, "GET")).status === 405, "Only POST is allowed");
check((await call({ loan_id: 7, event: "requested" })).status === 401, "No secret and no sign-in is refused");
check((await call({ loan_id: 7, event: "spam" }, { "x-mail-secret": "s3cr3t" })).status === 400, "Unknown events are refused");
check((await call({ loan_id: "x", event: "requested" }, { "x-mail-secret": "s3cr3t" })).status === 400, "A bad loan id is refused");
check((await call({ loan_id: 7, event: "requested" }, { "x-mail-secret": "wrong" })).status === 403, "A wrong secret is refused");
check((await call({ loan_id: 7, event: "requested" }, { authorization: "Bearer stranger" })).status === 403, "Someone else's token is refused");

// request received, sent by the database hook
let r = await call({ loan_id: 7, event: "requested" }, { "x-mail-secret": "s3cr3t" });
check(r.status === 200 && sent.length === 1 && sent[0].to === "ann@school.edu", "The hook sends the request email");
const m = sent[0];
check(m.subject === "Request received: The Quiet Shelf <1>", "The subject names the book");
check(m.html.includes("The Quiet Shelf &lt;1&gt;") && !m.html.includes("The Quiet Shelf <1>"), "The book title is escaped in the email");
check(m.html.includes("cid:logo") && m.html.includes("cid:qr") && m.html.includes("A1B2C3D4E5F6"), "The email shows the logo, the QR and the pickup code");
const qr = m.attachments.find((a) => a.cid === "qr");
const logo = m.attachments.find((a) => a.cid === "logo");
check(qr && isPng(qr.content) && qr.content.length > 800, "A real QR image is attached");
check(logo && isPng(logo.content), "The library crest is attached");
check(m.html.includes("#0b1f5c") && m.html.includes("#f5a800") && m.html.includes("City of Malabon University"), "The email uses the library colours and name");
check(m.html.includes("Mon-Fri 7:30-8:00") && m.html.includes("library@school.edu"), "The footer shows the hours and contact");
check(m.html.includes("https://library.example.com/borrowing"), "The button links to the website");
check(m.text.includes("Pickup code: A1B2C3D4E5F6") && m.text.includes("/pickup?c=A1B2C3D4E5F6"), "A plain-text version carries the code and the pickup link");
check(m.html.startsWith("<!doctype html>") && m.html.includes('name="viewport"') && m.html.includes("max-width:600px"), "The layout is a responsive email page");

// the same email is never sent twice
r = await call({ loan_id: 7, event: "requested" }, { "x-mail-secret": "s3cr3t" });
check(r.status === 200 && r.body.skipped && sent.length === 1, "A second request for the same email is skipped");

// the website's fallback, for the borrower
r = await call({ loan_id: 7, event: "borrowed" }, { authorization: "Bearer owner" });
check(r.status === 200 && sent.length === 2 && sent[1].subject.startsWith("Pickup confirmed") && sent[1].html.includes("November 3, 2026") && sent[1].attachments.some((a) => a.cid === "qr"), "Pickup confirmed: due date and the QR again");
r = await call({ loan_id: 7, event: "returned" }, { "x-mail-secret": "s3cr3t" });
check(sent[2].subject.startsWith("Returned") && !sent[2].html.includes("cid:qr") && sent[2].html.includes("Thank you"), "Returned: a thank-you without a QR");
r = await call({ loan_id: 7, event: "rejected" }, { "x-mail-secret": "s3cr3t" });
check(sent[3].html.includes("Only one copy") && sent[3].subject.startsWith("Request declined"), "Declined: shows the reason");
r = await call({ loan_id: 7, event: "cancelled" }, { "x-mail-secret": "s3cr3t" });
check(sent[4].subject.startsWith("Request cancelled"), "Cancelled email");

// a failed send is un-claimed so it can be retried
broken = true;
r = await call({ loan_id: 9, event: "requested" }, { "x-mail-secret": "s3cr3t" });
check(r.status === 502 && unclaimed.length === 1 && unclaimed[0].p_loan === 9, "A mail failure frees the claim for a retry");
broken = false;
r = await call({ loan_id: 9, event: "requested" }, { "x-mail-secret": "s3cr3t" });
check(r.status === 200 && sent.length === 6, "The retry sends the email");

// without a mail account the function says so
delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD;
check((await call({ loan_id: 7, event: "requested" }, { "x-mail-secret": "s3cr3t" }, "POST", createHandler())).status === 503, "Without Gmail settings it reports not configured");

// building an email directly: a cover link is used when there is one
const withCover = await buildLoanEmail(ctx("requested", { book: { title: "Pixel Gardens", author: "Leo", category: "Art", shelf: "A1", cover_url: "https://x.supabase.co/storage/v1/object/public/media/covers/a.png" } }), "https://library.example.com");
check(withCover.html.includes('src="https://x.supabase.co/storage/v1/object/public/media/covers/a.png"'), "A real cover picture is shown when the book has one");
check(layout({ title: "T", pill: "P", bodyHtml: "<p>x</p>" }).includes("CMU Library"), "The layout works with no library details");

supabase.server.close();
if (failures) process.exit(1);
console.log("PASS: loan emails are branded, carry the logo and a real QR, are sent once, escape text and recover from failures.");
