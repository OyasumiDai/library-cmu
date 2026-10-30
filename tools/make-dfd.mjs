// Draws the Level 0 data flow diagram (docs/dfd-level0.svg, and docs/dfd-level0.png through headless Edge/Chrome).
// Run: node tools/make-dfd.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1500, height = 1060;

// flows, top to bottom as they leave or reach each entity
const student = {
  in: ["Registration Details", "Login Credentials", "Book Search & Filters", "Borrow Request", "Request Cancellation", "Profile & Account Updates"],
  out: ["Email Verification Code", "Login Status", "Book Details & Availability", "Pickup QR Ticket", "Due Dates & Overdue Fines", "Notifications & Email Reminders", "Announcements"],
};
const staff = {
  in: ["Login Credentials", "New / Edited Book Details", "Pickup QR Scan (Checkout)", "Book Returns", "Loan Reminder Emails", "Announcements & Site Content"],
  out: ["Login Status", "Pending Loan Requests", "Circulation & Movement Records", "Book Approval Results", "Library Reports"],
};
const admin = {
  in: ["Login Credentials", "Book Approval Decisions", "Staff Accounts & Permissions", "Borrowing Rules & Settings", "Report & Analytics Request"],
  out: ["Login Status", "Books Awaiting Approval", "Analytics Dashboard", "Audit Trail Logs", "Generated Reports"],
};

const P = { x1: 600, y1: 430, x2: 900, y2: 650 };
const S = { x1: 50, y1: 70, x2: 410, y2: 290 };
const T = { x1: 1090, y1: 70, x2: 1450, y2: 290 };
const A = { x1: 560, y1: 860, x2: 940, y2: 1010 };

let lines = "", labels = "";
const flow = (pts) => (lines += `<path d="${pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("")}" marker-end="url(#arrow)"/>`);
const label = (x, y, text, anchor) => (labels += `<text x="${x}" y="${y + 4.5}" text-anchor="${anchor}">${text.replace(/&/g, "&amp;")}</text>`);

// Student: inputs leave its right side and drop into the top of the process; outputs leave the process's left side and rise into it
student.in.forEach((t, i) => { const y = 95 + 36 * i, x = 740 - 18 * i; flow([[S.x2, y], [x, y], [x, P.y1]]); label(S.x2 + 12, y, t, "start"); });
student.out.forEach((t, j) => { const y = 470 + 25 * j, x = 380 - 45 * j; flow([[P.x1, y], [x, y], [x, S.y2]]); label(P.x1 - 12, y, t, "end"); });

// Library Staff: the mirror image on the right
staff.in.forEach((t, i) => { const y = 95 + 36 * i, x = 760 + 18 * i; flow([[T.x1, y], [x, y], [x, P.y1]]); label(T.x1 - 12, y, t, "end"); });
staff.out.forEach((t, j) => { const y = 470 + 25 * j, x = 1120 + 45 * j; flow([[P.x2, y], [x, y], [x, T.y2]]); label(P.x2 + 12, y, t, "start"); });

// Administrator: inputs loop out to the left and up into the process's bottom; outputs come down its bottom and loop in from the right
admin.in.forEach((t, i) => {
  const y = 885 + 25 * i, x = 380 - 40 * i, turn = 760 - 20 * i, xp = 720 - 20 * i;
  flow([[A.x1, y], [x, y], [x, turn], [xp, turn], [xp, P.y2]]); label(A.x1 - 12, y, t, "end");
});
admin.out.forEach((t, i) => {
  const y = 885 + 25 * i, x = 1120 + 40 * i, turn = 760 - 20 * i, xp = 780 + 20 * i;
  flow([[xp, P.y2], [xp, turn], [x, turn], [x, y], [A.x2, y]]); label(A.x2 + 18, y, t, "start");
});

const entity = (b, text) => `<rect x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}" class="box"/>`
  + text.map((t, i) => `<text x="${(b.x1 + b.x2) / 2}" y="${(b.y1 + b.y2) / 2 + 10 - (text.length - 1) * 15 + i * 30}" class="name">${t}</text>`).join("");

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
  <path d="M0 0L10 5L0 10Z" fill="#000"/></marker>
  <filter id="bg" x="-0.03" y="-0.1" width="1.06" height="1.2"><feFlood flood-color="#fff"/><feComposite in="SourceGraphic"/></filter></defs>
<style>
  text { font-family: Verdana, "Segoe UI", Arial, sans-serif; fill: #000; }
  .box { fill: #fff; stroke: #000; stroke-width: 2; }
  .name { font-size: 26px; font-weight: 700; text-anchor: middle; }
  .flows path { fill: none; stroke: #000; stroke-width: 1.3; }
  .labels text { font-size: 13px; filter: url(#bg); }
</style>
<rect width="100%" height="100%" fill="#fff"/>
<g class="flows">${lines}</g>
${entity(S, ["Student"])}
${entity(T, ["Library Staff"])}
${entity(A, ["Administrator"])}
<rect x="${P.x1}" y="${P.y1}" width="${P.x2 - P.x1}" height="${P.y2 - P.y1}" rx="26" class="box"/>
<path d="M${P.x1} ${P.y1 + 40}H${P.x2}" stroke="#000" stroke-width="2"/>
<text x="${(P.x1 + P.x2) / 2}" y="${P.y1 + 29}" class="name" style="font-size:24px">0</text>
<text x="${(P.x1 + P.x2) / 2}" y="${P.y1 + 112}" class="name">CMU Library</text>
<text x="${(P.x1 + P.x2) / 2}" y="${P.y1 + 144}" class="name">Explorer</text>
<text x="${(P.x1 + P.x2) / 2}" y="${P.y1 + 176}" class="name">System</text>
<g class="labels">${labels}</g>
</svg>
`;

const svgFile = path.join(root, "docs", "dfd-level0.svg");
fs.writeFileSync(svgFile, out);
console.log(`wrote ${svgFile}`);

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((b) => fs.existsSync(b));
if (browsers.length) {
  const png = path.join(root, "docs", "dfd-level0.png");
  execFileSync(browsers[0], ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${width},${height}`, `--screenshot=${png}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${png}`);
}
