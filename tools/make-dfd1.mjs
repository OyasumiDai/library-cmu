// Draws the Level 1 data flow diagram (docs/dfd-level1.svg, and docs/dfd-level1.png through headless Edge/Chrome).
// Every flow of the Level 0 diagram (tools/make-dfd.mjs) appears here once, on the process that handles it.
// Run: node tools/make-dfd1.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1500;

// side L flows are drawn top to bottom: the Administrator's first, then the Student's (that order keeps their lines apart)
// [entity, "in" (to the process) | "out" (to the entity), label]
const processes = [
  { no: "6.0", name: ["System Administration"], store: ["D6", "Settings & Audit Log"], down: "Settings & Audit Entries", up: "Audit Records",
    L: [["A", "in", "Staff Accounts & Permissions"], ["A", "in", "Borrowing Rules & Settings"], ["A", "out", "Audit Trail Logs"]], R: [] },
  { no: "5.0", name: ["Reports &", "Analytics"], store: ["D5", "User Activity"], down: "Report Downloads", up: "Activity & Usage Data",
    L: [["A", "in", "Report & Analytics Request"], ["A", "out", "Analytics Dashboard"], ["A", "out", "Generated Reports"]],
    R: [["T", "out", "Library Reports"]] },
  { no: "1.0", name: ["Registration &", "Authentication"], store: ["D1", "User Accounts"], down: "Account Details", up: "Account Information",
    L: [["A", "in", "Login Credentials"], ["A", "out", "Login Status"], ["S", "in", "Registration Details"], ["S", "in", "Login Credentials"],
        ["S", "in", "Profile & Account Updates"], ["S", "out", "Email Verification Code"], ["S", "out", "Login Status"]],
    R: [["T", "in", "Login Credentials"], ["T", "out", "Login Status"]] },
  { no: "2.0", name: ["Catalog & Book", "Management"], store: ["D2", "Books & Copies"], down: "Book Records", up: "Book Details & Availability",
    L: [["A", "in", "Book Approval Decisions"], ["A", "out", "Books Awaiting Approval"], ["S", "in", "Book Search & Filters"], ["S", "out", "Book Details & Availability"]],
    R: [["T", "in", "New / Edited Book Details"], ["T", "out", "Book Approval Results"]] },
  { no: "3.0", name: ["Borrowing &", "Circulation"], store: ["D3", "Loans & Movements"], down: "Loan & Movement Records", up: "Loan Status & History",
    L: [["S", "in", "Borrow Request"], ["S", "in", "Request Cancellation"], ["S", "out", "Pickup QR Ticket"], ["S", "out", "Due Dates & Overdue Fines"]],
    R: [["T", "in", "Pickup QR Scan (Checkout)"], ["T", "in", "Book Returns"], ["T", "out", "Pending Loan Requests"], ["T", "out", "Circulation & Movement Records"]] },
  { no: "4.0", name: ["Notifications &", "Announcements"], store: ["D4", "Notifications & Announcements"], down: "Notices & Email Log", up: "Notices to Deliver",
    L: [["S", "out", "Notifications & Email Reminders"], ["S", "out", "Announcements"]],
    R: [["T", "in", "Loan Reminder Emails"], ["T", "in", "Announcements & Site Content"]] },
];

const PX1 = 620, PX2 = 880, GAP = 22, STORE = 50;
let y = 60;
for (const p of processes) {
  p.y = y;
  p.h = Math.max(116, 52 + GAP * Math.max(p.L.length, p.R.length));
  p.sy = p.y + p.h + 60;
  y = p.sy + STORE + 70;
}
const height = y - 10;
const flowY = (p, k) => p.y + 48 + GAP * k;

// each entity sits beside one process, so the flows of that process run straight across
const at = (no) => processes.find((p) => p.no === no);
const ent = {
  A: { name: ["Administrator"], x1: 60, x2: 300, p: at("6.0") },
  S: { name: ["Student"], x1: 60, x2: 300, p: at("3.0") },
  T: { name: ["Library Staff"], x1: 1200, x2: 1440, p: at("3.0") },
};
for (const e of Object.values(ent)) { e.y1 = e.p.y; e.y2 = e.p.y + e.p.h; }

const paths = []; // { pts, arrowAtEnd }
const labels = [];
const add = (pts, dir, text, lx, anchor, ly) => {
  if (dir === "out") pts.reverse();
  paths.push(pts);
  labels.push([lx, ly, text, anchor]);
};

// the other flows travel in lanes above or below the entity, nested so they never cross each other
const groups = {};
for (const p of processes) for (const side of ["L", "R"]) p[side].forEach(([who, dir, text], k) => {
  const e = ent[who], fy = flowY(p, k), px = side === "L" ? PX1 : PX2;
  const lx = side === "L" ? PX1 - 20 : PX2 + 20, anchor = side === "L" ? "end" : "start";
  if (e.p === p) return add([[side === "L" ? e.x2 : e.x1, fy], [px, fy]], dir, text, side === "L" ? e.x2 + 20 : e.x1 - 20, side === "L" ? "start" : "end", fy);
  const key = who + (fy < e.y1 ? "up" : "down");
  (groups[key] ??= []).push({ fy, px, dir, text, lx, anchor, e });
});
const lane = {
  Adown: (k) => 176 - 16 * k, // lower target, further left
  Sup: (k) => 200 + 16 * k, // higher target, further left
  Sdown: (k) => 280 - 16 * k,
  Tup: (k) => 1424 - 16 * k, // higher target, further right
  Tdown: (k) => 1220 + 16 * k,
};
for (const [key, list] of Object.entries(groups)) {
  list.sort((a, b) => a.fy - b.fy);
  if (key.endsWith("up")) list.reverse(); // count outwards from the entity
  list.forEach((f, k) => {
    const x = lane[key](key.endsWith("up") ? list.length - 1 - k : k);
    const ey = key.endsWith("up") ? f.e.y1 : f.e.y2;
    add([[x, ey], [x, f.fy], [f.px, f.fy]], f.dir, f.text, f.lx, f.anchor, f.fy);
  });
}

// process <-> data store
for (const p of processes) {
  paths.push([[690, p.y + p.h], [690, p.sy]]);
  labels.push([680, (p.y + p.h + p.sy) / 2, p.down, "end"]);
  paths.push([[810, p.sy], [810, p.y + p.h]]);
  labels.push([820, (p.y + p.h + p.sy) / 2, p.up, "start"]);
}

// a small hop where a horizontal line passes over a vertical one
const verticals = paths.flatMap((pts, id) => pts.slice(1).map((b, i) => [pts[i], b, id]).filter(([a, b]) => a[0] === b[0])
  .map(([a, b]) => ({ id, x: a[0], y1: Math.min(a[1], b[1]), y2: Math.max(a[1], b[1]) })));
const R = 5;
const draw = (pts, id) => {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    if (ay === by) {
      const s = Math.sign(bx - ax);
      verticals.filter((v) => v.id !== id && v.y1 < ay && ay < v.y2 && Math.min(ax, bx) + R < v.x && v.x < Math.max(ax, bx) - R)
        .sort((u, v) => s * (u.x - v.x))
        .forEach((v) => (d += `L${v.x - s * R} ${ay}A${R} ${R} 0 0 ${s > 0 ? 1 : 0} ${v.x + s * R} ${ay}`));
    }
    d += `L${bx} ${by}`;
  }
  return `<path d="${d}" marker-end="url(#arrow)"/>`;
};

const esc = (s) => s.replace(/&/g, "&amp;");
const box = (e) => `<rect x="${e.x1}" y="${e.y1}" width="${e.x2 - e.x1}" height="${e.y2 - e.y1}" class="box"/>`
  + e.name.map((t, i) => `<text x="${(e.x1 + e.x2) / 2}" y="${(e.y1 + e.y2) / 2 + 7 - (e.name.length - 1) * 12 + i * 24}" class="ent">${t}</text>`).join("");
const proc = (p) => {
  const cx = (PX1 + PX2) / 2, mid = p.y + 30 + (p.h - 30) / 2;
  return `<rect x="${PX1}" y="${p.y}" width="${PX2 - PX1}" height="${p.h}" rx="18" class="box"/>`
    + `<path d="M${PX1} ${p.y + 30}H${PX2}" class="rule"/><text x="${cx}" y="${p.y + 21}" class="no">${p.no}</text>`
    + p.name.map((t, i) => `<text x="${cx}" y="${mid + 6 - (p.name.length - 1) * 10 + i * 20}" class="pname">${esc(t)}</text>`).join("")
    + `<path d="M960 ${p.sy}H${PX1 + 20}V${p.sy + STORE}H960M${PX1 + 80} ${p.sy}V${p.sy + STORE}" class="rule"/>`
    + `<text x="${PX1 + 50}" y="${p.sy + 30}" class="sid">${p.store[0]}</text>`
    + `<text x="${(PX1 + 80 + 960) / 2}" y="${p.sy + 30}" class="sname">${esc(p.store[1])}</text>`;
};

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
  <path d="M0 0L10 5L0 10Z" fill="#000"/></marker>
  <filter id="bg" x="-0.03" y="-0.1" width="1.06" height="1.2"><feFlood flood-color="#fff"/><feComposite in="SourceGraphic"/></filter></defs>
<style>
  text { font-family: Arial, Helvetica, sans-serif; fill: #000; }
  .box { fill: #fff; stroke: #000; stroke-width: 2; }
  .rule { fill: none; stroke: #000; stroke-width: 1.6; }
  .ent { font-size: 21px; font-weight: 700; text-anchor: middle; }
  .no { font-size: 16px; text-anchor: middle; }
  .pname { font-size: 16px; font-weight: 700; text-anchor: middle; }
  .sid { font-size: 14px; text-anchor: middle; }
  .sname { font-size: 14px; text-anchor: middle; }
  .flows path { fill: none; stroke: #000; stroke-width: 1.3; }
  .labels text { font-size: 12.5px; filter: url(#bg); }
</style>
<rect width="100%" height="100%" fill="#fff"/>
<g class="flows">${paths.map(draw).join("")}</g>
${processes.map(proc).join("\n")}
${Object.values(ent).map(box).join("\n")}
<g class="labels">${labels.map(([x, ly, t, a]) => `<text x="${x}" y="${ly + 4.5}" text-anchor="${a}">${esc(t)}</text>`).join("")}</g>
</svg>
`;

const svgFile = path.join(root, "docs", "dfd-level1.svg");
fs.writeFileSync(svgFile, out);
console.log(`wrote ${svgFile}`);

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((b) => fs.existsSync(b));
if (browsers.length) {
  const png = path.join(root, "docs", "dfd-level1.png");
  execFileSync(browsers[0], ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${width},${height}`, `--screenshot=${png}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${png}`);
}
