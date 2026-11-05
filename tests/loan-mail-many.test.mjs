// Several books in one email: a compact list and one QR per book, never one long email per book.
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildLoanEmail } from "../api/_mail.mjs";

const mk = (i, title) => ({
  event: "requested",
  loan: { id: i, pickup_code: "CMU-1001", requested_at: "2026-10-27T01:00:00Z", due_at: null },
  book: { title, author: "Some Author", shelf: `A${i}`, category: "Fiction" },
  student: { name: "Ann Reyes", username: "ann", email: "ann@x.test" },
  library: { name: "CMU Library", loan_days: 7, hours: "8-5", contact: "lib@x.test" },
});
const list = [mk(1, "Noli Me Tangere"), mk(2, "A Very Long Title About Everything In The Philippine Library System"), mk(3, "Cats"), mk(4, "Dogs")];
const mail = await buildLoanEmail(list, "https://lib.test");

assert.equal(mail.subject, "4 books reserved");
assert.equal(mail.attachments.filter((a) => a.cid.startsWith("qr")).length, 1, "ONE QR for all the books");
assert.ok(mail.attachments.some((a) => a.cid === "logo"), "logo");
assert.ok(mail.html.includes("CMU-1001") && mail.text.includes("CMU-1001"));
for (const l of list) assert.ok(mail.html.includes(l.book.title.slice(0, 10)), "every book is listed");
assert.equal((mail.html.match(/<h1/g) ?? []).length, 1, "one heading, one email");
assert.equal((mail.html.match(/cid:qr/g) ?? []).length, 1);
assert.ok(mail.html.length < 20_000, "the email stays small");

// one book still gets the full single layout
const one = await buildLoanEmail([list[0]], "https://lib.test");
assert.equal(one.subject, "Request received: Noli Me Tangere");

// a single request whose basket holds several books also becomes one email
const basketMail = await buildLoanEmail({ ...list[0], basket: list.map((c) => ({ id: c.loan.id, ...c.book })) }, "https://lib.test");
assert.equal(basketMail.subject, "4 books reserved");

// a pickup of many
const done = await buildLoanEmail(list.map((c) => ({ ...c, event: "borrowed", loan: { ...c.loan, due_at: "2026-11-03T01:00:00Z" } })), "https://lib.test");
assert.equal(done.subject, "Pickup confirmed: 4 books");
assert.ok(done.html.includes("Due November 3, 2026"));

if (process.env.PREVIEW_DIR) fs.writeFileSync(`${process.env.PREVIEW_DIR}/many.html`, mail.html.replace(/cid:logo/g, "logo.png").replace(/cid:qr\d/g, "qr.png"));
console.log("PASS: several books arrive in one compact, wrapping email.");
