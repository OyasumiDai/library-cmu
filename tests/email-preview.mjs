// Writes every email the library sends as a normal web page so you can open and look at them:
//   node tests/email-preview.mjs            (files go to tests/previews/)
// The inline pictures (logo, QR code) are turned into embedded images so the pages look like the real email.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { buildLoanEmail, buildNoticeEmail } = await import(pathToFileURL(path.resolve("api/_mail.mjs")).href);
const out = path.resolve("tests/previews");
fs.mkdirSync(out, { recursive: true });

const ctx = (event) => ({
  event,
  loan: { id: 7, status: event, pickup_code: "A1B2C3D4E5F6", requested_at: "2026-10-26T04:00:00Z", borrowed_at: "2026-10-27T02:00:00Z", due_at: "2026-11-03T02:00:00Z", returned_at: "2026-11-02T02:00:00Z", note: "Only one copy is held for classroom use." },
  book: { title: "A Cat in the Stacks", author: "Mika Reyes", category: "Fiction", shelf: "Main Library", cover_url: null },
  student: { name: "Cyrus Reyes", username: "Cyrus", email: "student@cmu.test" },
  library: { name: "CMU Library", hours: "Monday to Friday 7:30 AM - 8:00 PM, Saturday 8:00 AM - 5:00 PM", contact: "library@cmu.edu.ph", loan_days: 7 },
});

const inline = (mail) => {
  let html = mail.html;
  for (const a of mail.attachments ?? []) html = html.replaceAll(`cid:${a.cid}`, `data:image/png;base64,${Buffer.from(a.content).toString("base64")}`);
  return html;
};

const mails = {};
for (const event of ["requested", "borrowed", "returned", "rejected", "cancelled"]) mails[`loan-${event}`] = await buildLoanEmail(ctx(event), "https://library.example.com");
const library = ctx("x").library;
mails["notice-overdue"] = buildNoticeEmail({ kind: "overdue", name: "Cyrus Reyes", books: [{ title: "A Cat in the Stacks", due_at: "2026-10-20T00:00:00Z" }, { title: "Pixel Gardens", due_at: "2026-10-22T00:00:00Z" }], library, siteUrl: "https://library.example.com" });
mails["notice-due-soon"] = buildNoticeEmail({ kind: "due_soon", name: "Cyrus Reyes", books: [{ title: "Maps of Malabon", due_at: "2026-11-01T00:00:00Z" }], library, siteUrl: "https://library.example.com" });
mails["notice-general"] = buildNoticeEmail({ kind: "general", name: "Cyrus Reyes", books: [], message: "The library closes early this Friday for a staff meeting. Sorry for the trouble!", library, siteUrl: "https://library.example.com" });

for (const [name, mail] of Object.entries(mails)) fs.writeFileSync(path.join(out, `${name}.html`), inline(mail));
console.log(`${Object.keys(mails).length} emails written to ${out}`);
