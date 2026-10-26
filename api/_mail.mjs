// The library's email design: one layout for every email the system sends (request received, pickup confirmed,
// returned, overdue and due-date notices, general messages). It matches the website: library blue and gold,
// the crest, a status pill, a book card, and a QR code in a frame. Built with tables and inline styles because
// email apps (Gmail, Outlook, phone mail) ignore most CSS.
import QRCode from "qrcode";
import { logoBuffer } from "./_logo.mjs";

// the website's colours (Library Blue theme)
const C = {
  page: "#eef3fb", card: "#ffffff", line: "#d3dcec", ink: "#0f1f4d", text: "#1d2b4a", soft: "#5a6a8a", tint: "#dfe8fb",
  brand: "#0a2e9c", deep: "#0b1f5c", gold: "#f5a800", goldText: "#3a2800",
  success: "#17734f", successBg: "#daf2e6", warning: "#8a5a00", warningBg: "#fdeab9", danger: "#b3314a", dangerBg: "#fbe0e5", info: "#0a2e9c", infoBg: "#dfe8fb",
};
const FONT = "'Trebuchet MS','Segoe UI',Verdana,Arial,sans-serif";

export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const formatDate = (iso) => (iso ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)) : "");

const PILLS = { success: [C.successBg, C.success], warning: [C.warningBg, C.warning], danger: [C.dangerBg, C.danger], info: [C.infoBg, C.info] };

// a colour for a book without a cover, the same idea as the website (one colour per book)
function coverColor(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360, s = 0.42, l = 0.46;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + hue / 30) % 12; return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="background:${C.gold};border-radius:8px;border-bottom:3px solid #b97f00"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:bold;color:${C.goldText};text-decoration:none">${esc(label)}</a></td></tr></table>`;
}

export function bookCard(book) {
  const cover = /^https?:\/\//.test(book.cover_url ?? "")
    ? `<img src="${esc(book.cover_url)}" width="64" height="96" alt="" style="display:block;border-radius:3px 6px 6px 3px;object-fit:cover;border:0">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" width="64" height="96"><tr><td align="center" valign="middle" style="background:${coverColor(book.title)};border-radius:3px 6px 6px 3px;border-left:6px solid rgba(0,0,0,.25);color:#ffffff;font-family:${FONT};font-size:26px;font-weight:bold">${esc((book.title ?? "?").trim().slice(0, 1).toUpperCase())}</td></tr></table>`;
  const meta = [book.author, book.category, book.shelf ? `Shelf: ${book.shelf}` : ""].filter(Boolean).map((m) => `<div style="color:${C.soft};font-size:13px;line-height:1.5">${esc(m)}</div>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${C.page};border:1px solid ${C.line};border-radius:10px;margin:18px 0"><tr>
    <td width="88" style="padding:14px 8px 14px 14px" valign="top">${cover}</td>
    <td style="padding:14px 14px 14px 6px;font-family:${FONT}" valign="middle"><div style="font-size:17px;font-weight:bold;color:${C.ink};line-height:1.3;margin-bottom:4px">${esc(book.title)}</div>${meta}</td></tr></table>`;
}

export function detailsTable(rows) {
  const body = rows.filter(([, v]) => v).map(([k, v], i, all) => `<tr><td style="padding:9px 0;color:${C.soft};font-size:13px;border-bottom:${i === all.length - 1 ? 0 : 1}px solid ${C.line}">${esc(k)}</td><td align="right" style="padding:9px 0;font-weight:bold;color:${C.ink};font-size:14px;border-bottom:${i === all.length - 1 ? 0 : 1}px solid ${C.line}">${esc(v)}</td></tr>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:${FONT};margin:6px 0">${body}</table>`;
}

// the QR code in a frame, with the code underneath so it still works if the image does not load
export function qrBlock({ cid, code, caption }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0"><tr><td align="center" style="background:${C.tint};border-radius:12px;padding:22px 16px;font-family:${FONT}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border:3px solid ${C.deep};border-radius:12px;padding:12px"><img src="cid:${cid}" width="180" height="180" alt="QR code ${esc(code)}" style="display:block;border:0"></td></tr></table>
    <div style="margin-top:14px;font-size:12px;letter-spacing:2px;color:${C.soft};text-transform:uppercase">Pickup code</div>
    <div style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:3px;color:${C.deep};margin:2px 0 8px">${esc(code)}</div>
    <div style="font-size:13px;color:${C.text};line-height:1.5;max-width:340px">${esc(caption)}</div></td></tr></table>`;
}

// the whole email
export function layout({ title, pill, tone = "info", preheader = "", bodyHtml, library = {}, siteUrl = "", logoSrc = "cid:logo", footerNote = "You are receiving this because you have a CMU Library account." }) {
  const [pillBg, pillFg] = PILLS[tone] ?? PILLS.info;
  const footerLines = [library.hours ? `Library hours: ${library.hours}` : "", library.contact ? `Contact: ${library.contact}` : ""].filter(Boolean).map((l) => `<div>${esc(l)}</div>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    <tr><td style="background:${C.deep};border-radius:14px 14px 0 0;border-bottom:4px solid ${C.gold};padding:18px 24px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="60" valign="middle"><img src="${esc(logoSrc)}" width="52" height="52" alt="CMU Library" style="display:block;border:0"></td>
      <td valign="middle" style="font-family:${FONT}"><div style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:1px">${esc(library.name || "CMU Library")}</div><div style="color:#c9d7fb;font-size:12px;letter-spacing:.5px">City of Malabon University &middot; Read. Borrow. Explore.</div></td></tr></table></td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:28px 28px 24px;font-family:${FONT};color:${C.text};font-size:15px;line-height:1.6">
      <span style="display:inline-block;background:${pillBg};color:${pillFg};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:999px">${esc(pill)}</span>
      <h1 style="margin:14px 0 10px;font-size:24px;line-height:1.25;color:${C.ink};font-family:${FONT}">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td align="center" style="padding:18px 12px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.soft}">${footerLines}
      <div style="margin-top:6px">${esc(footerNote)}${siteUrl ? ` <a href="${esc(siteUrl)}" style="color:${C.brand}">Open the library</a>` : ""}</div></td></tr>
  </table></td></tr></table></body></html>`;
}

// a one-time code in a frame (sign-in and password reset emails sent by Supabase use this)
export function otpBlock(code, caption) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0"><tr><td align="center" style="background:${C.tint};border-radius:12px;padding:24px 16px;font-family:${FONT}">
    <div style="font-size:12px;letter-spacing:2px;color:${C.soft};text-transform:uppercase">Your code</div>
    <div style="font-family:'Courier New',monospace;font-size:38px;font-weight:bold;letter-spacing:10px;color:${C.deep};margin:8px 0 10px;background:#ffffff;border:3px solid ${C.deep};border-radius:12px;padding:10px 20px;display:inline-block">${esc(code)}</div>
    <div style="font-size:13px;color:${C.text};line-height:1.5;max-width:340px">${esc(caption)}</div></td></tr></table>`;
}

export async function qrPng(text) {
  return QRCode.toBuffer(text, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 360, color: { dark: C.deep, light: "#ffffff" } });
}

// ---------------------------------------------------------------- several books in one email
// A student may reserve or collect many books at once. They get ONE email: a compact list (one line per book) and a
// small QR card per book. The cards sit side by side on a desktop and stack on a phone, so the email stays short.
const MANY = {
  requested: { pill: "Reserved for you", tone: "info", title: (n) => `${n} books reserved for you`, subject: (n) => `${n} books reserved`, qr: true,
    lead: (n, f) => `Hi ${f}, these ${n} books are reserved for you. Show the ONE QR code below at the library desk. Staff scan it once and confirm all of them.`, status: "Reserved" },
  borrowed: { pill: "Pickup confirmed", tone: "success", title: (n) => `${n} books picked up`, subject: (n) => `Pickup confirmed: ${n} books`, qr: true,
    lead: (n, f) => `Hi ${f}, the library confirmed your pickup of ${n} books. Keep the QR code, staff may scan it again when you return them.`, status: "Borrowed" },
  returned: { pill: "Returned", tone: "success", title: (n) => `${n} books returned`, subject: (n) => `Returned: ${n} books`, qr: false,
    lead: (n, f) => `Hi ${f}, the library recorded the return of ${n} books. Thank you!`, status: "Returned" },
  rejected: { pill: "Request declined", tone: "danger", title: (n) => `${n} requests declined`, subject: (n) => `${n} requests declined`, qr: false,
    lead: (n, f) => `Hi ${f}, the library could not lend these ${n} books.`, status: "Declined" },
  cancelled: { pill: "Request cancelled", tone: "warning", title: (n) => `${n} requests cancelled`, subject: (n) => `${n} requests cancelled`, qr: false,
    lead: (n, f) => `Hi ${f}, these ${n} requests were cancelled and the copies are back on the shelf.`, status: "Cancelled" },
};

function bookLine(book, right) {
  return `<tr><td style="padding:11px 12px;border-bottom:1px solid ${C.line};font-family:${FONT}" valign="top"><div style="font-size:15px;font-weight:bold;color:${C.ink};line-height:1.3">${esc(book.title)}</div>
    <div style="font-size:12px;color:${C.soft};line-height:1.5">${esc([book.author, book.shelf ? `Shelf ${book.shelf}` : ""].filter(Boolean).join(" · "))}</div></td>
    <td align="right" valign="top" style="padding:11px 12px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:13px;font-weight:bold;color:${C.ink};white-space:nowrap">${esc(right)}</td></tr>`;
}

async function buildManyLoansEmail(list, siteUrl) {
  const { event, student, library } = list[0];
  const copy = MANY[event];
  if (!copy) throw new Error("unknown_event");
  const n = list.length;
  const first = (student.name || student.username || "reader").split(" ")[0];
  const days = library.loan_days ?? 7;
  const right = (c) => (event === "borrowed" ? `Due ${formatDate(c.loan.due_at)}` : copy.status);
  const attachments = [{ filename: "logo.png", content: logoBuffer(), cid: "logo", contentType: "image/png" }];
  let qr = "";
  if (copy.qr) {
    const code = list[0].loan.pickup_code;
    attachments.push({ filename: "pickup-qr.png", content: await qrPng(`${siteUrl}/pickup?c=${encodeURIComponent(code)}`), cid: "qr", contentType: "image/png" });
    qr = qrBlock({ cid: "qr", code, caption: `One QR code for all ${n} books. Staff scan it once at the desk to confirm everything.` });
  }
  const lines = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border:1px solid ${C.line};border-radius:10px;background:${C.page}">${list.map((c) => bookLine(c.book, right(c))).join("")}</table>`;
  const rows = [["Books", String(n)], ["Status", copy.status], event === "requested" ? ["Loan length", `${days} days from pickup`] : null].filter(Boolean);
  const bodyHtml = `<p style="margin:0 0 4px">${esc(copy.lead(n, first))}</p>${lines}${qr}${detailsTable(rows)}${button("View my books", `${siteUrl}/borrowing`)}`;
  const html = layout({ title: copy.title(n), pill: copy.pill, tone: copy.tone, preheader: copy.subject(n), bodyHtml, library, siteUrl });
  const text = [copy.title(n), "", copy.lead(n, first), "", ...list.map((c) => `- ${c.book.title} (${right(c)})`), ...(copy.qr ? ["", `Pickup code (one for all books): ${list[0].loan.pickup_code}`, `Pickup link: ${siteUrl}/pickup?c=${encodeURIComponent(list[0].loan.pickup_code)}`] : []), "", `View my books: ${siteUrl}/borrowing`, "", library.name || "CMU Library"].join("\n");
  return { subject: copy.subject(n), html, text, attachments };
}

// ---------------------------------------------------------------- the loan emails
// ctx is what the database function loan_mail_payload returns; pass a list for several books of one student
export async function buildLoanEmail(input, siteUrl) {
  if (Array.isArray(input)) {
    if (input.length > 1) return buildManyLoansEmail(input, siteUrl);
    input = input[0];
  }
  const ctx = input;
  // the student reserved more than one book: one email, one QR for all of them
  if (ctx.event === "requested" && Array.isArray(ctx.basket) && ctx.basket.length > 1) {
    return buildManyLoansEmail(ctx.basket.map((b) => ({ ...ctx, loan: { ...ctx.loan, id: b.id }, book: b })), siteUrl);
  }
  const { event, loan, book, student, library } = ctx;
  const first = (student.name || student.username || "reader").split(" ")[0];
  const pickupUrl = `${siteUrl}/pickup?c=${encodeURIComponent(loan.pickup_code)}`;
  const link = `${siteUrl}/borrowing`;
  const days = library.loan_days ?? 7;
  const copy = {
    requested: { pill: "Reserved for you", tone: "info", title: "We received your request", subject: `Request received: ${book.title}`, qr: true,
      lead: `Hi ${first}, <strong>${esc(book.title)}</strong> is reserved for you. Show the QR code below at the library desk. Staff will scan it to confirm your pickup.`,
      caption: "Staff scan this at the desk to hand over your book. You can also find it any time under My books on the website.",
      rows: [["Status", "Reserved, waiting for pickup"], ["Requested on", formatDate(loan.requested_at)], ["Loan length", `${days} days from pickup`]], cta: ["View my books", link] },
    borrowed: { pill: "Pickup confirmed", tone: "success", title: "Enjoy your book", subject: `Pickup confirmed: ${book.title}`, qr: true,
      lead: `Hi ${first}, the library confirmed that you picked up <strong>${esc(book.title)}</strong>. Please return it by <strong>${esc(formatDate(loan.due_at))}</strong>.`,
      caption: "Keep this QR code. Staff may scan it again when you return the book.",
      rows: [["Status", "Borrowed"], ["Picked up on", formatDate(loan.borrowed_at)], ["Due date", formatDate(loan.due_at)], ["Loan length", `${days} days`]], cta: ["View my books", link] },
    returned: { pill: "Returned", tone: "success", title: "Thank you for returning your book", subject: `Returned: ${book.title}`, qr: false,
      lead: `Hi ${first}, the library recorded the return of <strong>${esc(book.title)}</strong>. We hope you enjoyed it.`,
      rows: [["Status", "Returned"], ["Returned on", formatDate(loan.returned_at)]], cta: ["Find your next book", `${siteUrl}/catalog`] },
    rejected: { pill: "Request declined", tone: "danger", title: "We could not lend this book", subject: `Request declined: ${book.title}`, qr: false,
      lead: `Hi ${first}, your request for <strong>${esc(book.title)}</strong> was declined.${loan.note ? ` Reason from the library: <em>${esc(loan.note)}</em>` : ""}`,
      rows: [["Status", "Declined"]], cta: ["Browse the catalog", `${siteUrl}/catalog`] },
    cancelled: { pill: "Request cancelled", tone: "warning", title: "Your request was cancelled", subject: `Request cancelled: ${book.title}`, qr: false,
      lead: `Hi ${first}, your request for <strong>${esc(book.title)}</strong> was cancelled and the copy is back on the shelf.`,
      rows: [["Status", "Cancelled"]], cta: ["Browse the catalog", `${siteUrl}/catalog`] },
  }[event];
  if (!copy) throw new Error("unknown_event");

  const attachments = [{ filename: "logo.png", content: logoBuffer(), cid: "logo", contentType: "image/png" }];
  let qr = "";
  if (copy.qr) {
    attachments.push({ filename: "pickup-qr.png", content: await qrPng(pickupUrl), cid: "qr", contentType: "image/png" });
    qr = qrBlock({ cid: "qr", code: loan.pickup_code, caption: copy.caption });
  }
  const bodyHtml = `<p style="margin:0 0 4px">${copy.lead}</p>${bookCard(book)}${qr}${detailsTable(copy.rows)}${button(copy.cta[0], copy.cta[1])}`;
  const html = layout({ title: copy.title, pill: copy.pill, tone: copy.tone, preheader: copy.subject, bodyHtml, library, siteUrl });
  const text = [`${copy.title}`, "", copy.lead.replace(/<[^>]+>/g, ""), "", `${book.title} by ${book.author}`, ...copy.rows.map(([k, v]) => `${k}: ${v}`), copy.qr ? `Pickup code: ${loan.pickup_code}` : "", copy.qr ? `Pickup link: ${pickupUrl}` : "", "", `${copy.cta[0]}: ${copy.cta[1]}`, "", library.name || "CMU Library"].filter((l) => l !== undefined).join("\n");
  return { subject: copy.subject, html, text, attachments, pickupUrl };
}

// ---------------------------------------------------------------- notices staff send
export function buildNoticeEmail({ kind, name, books, message, library = {}, siteUrl = "" }) {
  const subject = kind === "overdue" ? "Overdue library book notice" : kind === "due_soon" ? "Library due date reminder" : "A message from the library";
  const lead = kind === "overdue" ? "Our records show that the following book(s) borrowed from the library are now overdue."
    : kind === "due_soon" ? "This is a friendly reminder that the following book(s) are due to be returned soon."
    : message || "This is a message from the library.";
  const rows = books.map((b) => `<tr><td style="padding:10px 12px;border-bottom:1px solid ${C.line};font-size:14px;color:${C.ink}">${esc(b.title)}</td><td align="right" style="padding:10px 12px;border-bottom:1px solid ${C.line};font-size:14px;font-weight:bold;color:${kind === "overdue" ? C.danger : C.ink}">${esc(formatDate(b.due_at))}</td></tr>`).join("");
  const table = kind !== "general" && books.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border:1px solid ${C.line};border-radius:10px;font-family:${FONT}"><tr><th align="left" style="padding:10px 12px;background:${C.page};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.soft}">Book</th><th align="right" style="padding:10px 12px;background:${C.page};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.soft}">Due date</th></tr>${rows}</table>` : "";
  const bodyHtml = `<p style="margin:0 0 4px">Dear ${esc(name)},</p><p>${esc(lead)}</p>${table}<p>Please visit the library at your earliest convenience. If you have already returned the book(s), kindly ignore this notice.</p><p style="margin-bottom:0">Sincerely,<br><strong>${esc(library.name || "CMU Library")}</strong></p>${siteUrl ? button("Open my books", `${siteUrl}/borrowing`) : ""}`;
  const html = layout({ title: subject, pill: kind === "overdue" ? "Overdue" : kind === "due_soon" ? "Due soon" : "Library notice", tone: kind === "overdue" ? "danger" : kind === "due_soon" ? "warning" : "info", preheader: lead, bodyHtml, library, siteUrl });
  const text = `Dear ${name},\n\n${lead}\n${kind !== "general" && books.length ? "\n" + books.map((b) => `  - ${b.title} (due ${formatDate(b.due_at)})`).join("\n") + "\n" : ""}\nPlease visit the library at your earliest convenience.\n\nSincerely,\n${library.name || "CMU Library"}`;
  return { subject, html, text, attachments: [{ filename: "logo.png", content: logoBuffer(), cid: "logo", contentType: "image/png" }] };
}
