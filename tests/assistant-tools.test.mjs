// The assistant's tools: sealed token, secret check, read-only scope, staff-only tools.
import assert from "node:assert/strict";
import handler from "../api/assistant-tools.mjs";
import assistant from "../api/assistant.mjs";
import { openToolToken, sealToolToken } from "../api/_tools.mjs";

const SECRET = "test-secret-123";
process.env.ASSISTANT_WEBHOOK_SECRET = SECRET;
process.env.SUPABASE_URL = "http://supabase.test";
process.env.SUPABASE_ANON_KEY = "anon";

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  const u = String(url);
  const json = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
  if (u.includes("/rpc/catalog_search")) return json([{ id: 1, title: "Cats", author: "A", category: "Pets", shelf: "B2", copies: 2, available: 0, reserved: 1, borrowed: 1, synopsis: "x".repeat(400), total_count: 1 }]);
  if (u.includes("/rpc/dashboard_stats")) return json({ titles: 10, requested: 2, borrowed: 3, overdue: 1, due_soon: 0, students: 5 });
  if (u.includes("/rpc/staff_loans")) return json([{ id: 9, title: "Cats", username: "ann", full_name: "Ann", student_id: "1", status: "requested", due_at: null }]);
  if (u.includes("/rest/v1/loans")) return json([{ status: "borrowed", due_at: "2020-01-01T00:00:00Z", book: { title: "Cats", author: "A" } }]);
  if (u.includes("/auth/v1/user")) return json({ id: "u1" });
  if (u.includes("/rest/v1/profiles")) return json([{ username: "ann", role: "student", active: true }]);
  if (u.includes("/rest/v1/site_settings")) return json([{ key: "loan_days", value: 7 }]);
  if (u.includes("webhook.test")) return json({ reply: "ok" });
  return { ok: false, status: 404, json: async () => null, text: async () => "" };
};

const call = async (headers, body, h = handler) => {
  let status = 0, out;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(o) { out = o; return this; } };
  await h({ method: "POST", headers, body }, res);
  return { status, out };
};

// sealing
const token = sealToolToken({ at: "jwt", uid: "u1", role: "student" }, SECRET);
assert.ok(!token.includes("jwt"), "token must not expose the login token");
assert.equal(openToolToken(token, SECRET).uid, "u1");
assert.equal(openToolToken(token, "other"), null, "wrong secret");
assert.equal(openToolToken(token + "x", SECRET), null, "tampered");
assert.equal(openToolToken(sealToolToken({ at: "a", uid: "u" }, SECRET, Date.now() - 11 * 60_000), SECRET), null, "expired");

// secret and token required
assert.equal((await call({}, { tool: "search_books", tool_token: token })).status, 401);
assert.equal((await call({ "x-assistant-secret": SECRET }, { tool: "search_books", tool_token: "junk" })).status, 401);
assert.equal((await call({ "x-assistant-secret": SECRET }, { tool: "delete_everything", tool_token: token })).status, 400);

// reading books acts as the student
const books = await call({ "x-assistant-secret": SECRET }, { tool: "search_books", tool_token: token, args: { query: "cats" } });
assert.equal(books.status, 200);
assert.equal(books.out.books[0].status, "all free copies reserved");
assert.ok(books.out.books[0].summary.length <= 160);
assert.ok(calls.at(-1).init.headers.Authorization === "Bearer jwt");

const loans = await call({ "x-assistant-secret": SECRET }, { tool: "my_loans", tool_token: token, args: {} });
assert.equal(loans.out.loans[0].overdue, true);
assert.ok(calls.at(-1).url.includes("user_id=eq.u1"), "loans are limited to the asking student");

// staff tools are refused for students, allowed for staff
const denied = await call({ "x-assistant-secret": SECRET }, { tool: "staff_summary", tool_token: token });
assert.equal(denied.out.error, "staff_only");
const staffToken = sealToolToken({ at: "jwt", uid: "s1", role: "staff" }, SECRET);
assert.equal((await call({ "x-assistant-secret": SECRET }, { tool: "staff_summary", tool_token: staffToken })).out.waiting_requests, 2);
assert.equal((await call({ "x-assistant-secret": SECRET }, { tool: "staff_find_loan", tool_token: staffToken, args: { query: "ann" } })).out.loans.length, 1);

// the assistant function hands n8n the sealed token and never the raw login token
process.env.ASSISTANT_WEBHOOK_URL = "http://webhook.test/hook";
const before = calls.length;
await call({ authorization: "Bearer rawjwt", host: "site.test" }, { message: "hi" }, assistant);
const sent = calls.slice(before).find((c) => c.url.includes("webhook.test"));
const payload = JSON.parse(sent.init.body);
assert.ok(payload.tool_token && payload.tools_url.endsWith("/api/assistant-tools"));
assert.ok(!sent.init.body.includes("rawjwt"), "raw login token must not reach n8n");
assert.equal(openToolToken(payload.tool_token, SECRET).at, "rawjwt");
assert.ok(!payload.tools.includes("staff_summary"), "students are not offered staff tools");

console.log("PASS: assistant tools are sealed, read-only, scoped to the asking student and staff-only where needed.");
