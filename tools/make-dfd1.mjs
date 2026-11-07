// Draws the Level 1 data flow diagram (docs/dfd-level1.svg, and docs/dfd-level1.png through headless Edge/Chrome).
// Every flow between a user and the system in the Level 0 diagram (tools/make-dfd.mjs) appears here once, on the
// process that handles it. The flows between processes and data stores show what each process reads and saves.
// Layout: Administrator on top, Student on the left, Library Staff on the right, the processes in the middle with
// their data stores beside them.
// Run: node tools/make-dfd1.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1700, height = 1290;

// ---- shapes ----------------------------------------------------------------
const ent = {
  A: { name: ["Administrator"], x1: 640, y1: 30, x2: 900, y2: 140 },
  S: { name: ["Student"], x1: 30, y1: 715, x2: 270, y2: 875 },
  T: { name: ["Library Staff"], x1: 1420, y1: 960, x2: 1660, y2: 1120 },
};
const proc = {
  "1.0": { name: ["Registration &", "Authentication"], x1: 680, y1: 230, x2: 860, y2: 370 },
  "2.0": { name: ["Catalog & Book", "Management"], x1: 680, y1: 470, x2: 860, y2: 590 },
  "3.0": { name: ["Borrowing &", "Circulation"], x1: 680, y1: 715, x2: 860, y2: 875 },
  "4.0": { name: ["Notifications &", "Announcements"], x1: 680, y1: 1020, x2: 860, y2: 1140 },
  "5.0": { name: ["Reports &", "Analytics"], x1: 1160, y1: 35, x2: 1360, y2: 150 },
  "6.0": { name: ["System", "Administration"], x1: 180, y1: 35, x2: 400, y2: 150 },
};
// data stores: [id, name, x1, y1] (each 200 x 36)
const stores = {
  D1: ["D1", "User Accounts", 430, 175],
  D2: ["D2", "Books & Copies", 920, 630],
  D3: ["D3", "Loans & Movements", 440, 925],
  D4: ["D4", "Notifications & Announcements", 920, 1185],
  D5: ["D5", "User Activity", 1160, 210],
  D6: ["D6", "Settings & Audit Log", 150, 210],
};
const SW = 220, SH = 36;

// ---- flows: [points], label, label position -----------------------------------
// the arrow points at the last point; label: { x, y, anchor } or { seg, t } (on segment seg, fraction t)
const flows = [];
const f = (pts, text, at = {}) => flows.push({ pts, text, at });

// Administrator
f([[640, 70], [400, 70]], "Manage Users & Permission");
f([[400, 115], [640, 115]], "Audit Trail Logs");
f([[1160, 70], [900, 70]], "Analytics Dashboard");
f([[1160, 115], [900, 115]], "Generated Reports");
f([[840, 140], [840, 230]], "Login Credentials", { x: 832, y: 168, anchor: "end" });
f([[880, 140], [880, 430], [800, 430], [800, 470]], "Book Manage Request", { x: 872, y: 405, anchor: "end" });
f([[830, 470], [830, 450], [900, 450], [900, 140]], "Book Manage Request", { x: 908, y: 405, anchor: "start" });

// Student
f([[70, 715], [70, 275], [680, 275]], "Registration Details", { seg: 1, t: 0.62 });
f([[110, 715], [110, 305], [680, 305]], "Login Credentials", { seg: 1, t: 0.62 });
f([[680, 335], [150, 335], [150, 715]], "2D-3D Library Game", { seg: 0, t: 0.38 });
f([[200, 715], [200, 530], [680, 530]], "View Catalog", { seg: 1, t: 0.6 });
f([[270, 745], [680, 745]], "Borrow Request");
f([[270, 775], [680, 775]], "Request Cancellation");
f([[680, 805], [270, 805]], "Pickup QR Ticket");
f([[680, 835], [270, 835]], "Due Dates & Overdue Fines");
f([[680, 1100], [150, 1100], [150, 875]], "Notifications & Email Reminders", { seg: 0, t: 0.45 });

// Library Staff
f([[1570, 960], [1570, 290], [860, 290]], "Login Credentials", { seg: 1, t: 0.5 });
f([[1530, 960], [1530, 510], [860, 510]], "Manage Book", { seg: 1, t: 0.5 });
f([[860, 555], [1490, 555], [1490, 960]], "Book Approval Results", { seg: 0, t: 0.5 });
f([[1420, 990], [1340, 990], [1340, 745], [860, 745]], "Pickup QR Scan (Checkout)", { seg: 2, t: 0.5 });
f([[1420, 1020], [1300, 1020], [1300, 775], [860, 775]], "Book Returns", { seg: 2, t: 0.5 });
f([[860, 805], [1260, 805], [1260, 1050], [1420, 1050]], "Pending Borrow Requests", { seg: 0, t: 0.5 });
f([[860, 835], [1220, 835], [1220, 1080], [1420, 1080]], "Circulation & Movement Records", { seg: 0, t: 0.5 });
f([[1360, 95], [1610, 95], [1610, 960]], "Generated Reports", { seg: 0, t: 0.5 });

// processes <-> data stores
f([[720, 230], [720, 193], [650, 193]], "Account Details", { x: 728, y: 205, anchor: "start" });
f([[560, 211], [560, 250], [680, 250]], "Account Information", { x: 552, y: 233, anchor: "end" });
f([[400, 135], [470, 135], [470, 175]], "Staff Accounts & Roles", { x: 478, y: 157, anchor: "start" });
f([[820, 590], [820, 648], [920, 648]], "Book Records", { x: 812, y: 615, anchor: "end" });
f([[1020, 630], [1020, 575], [860, 575]], "Catalog Details", { x: 1028, y: 603, anchor: "start" });
f([[1100, 666], [1100, 695], [840, 695], [840, 715]], "Copy Availability", { seg: 1, t: 0.45 });
f([[720, 875], [720, 943], [660, 943]], "Loan & Movement Records", { x: 728, y: 905, anchor: "start" });
f([[540, 925], [540, 860], [680, 860]], "Loan Status & History", { x: 532, y: 895, anchor: "end" });
f([[600, 961], [600, 1050], [680, 1050]], "Due & Overdue Loans", { x: 592, y: 1005, anchor: "end" });
f([[820, 1140], [820, 1203], [920, 1203]], "Notices & Email Log", { x: 812, y: 1170, anchor: "end" });
f([[1020, 1185], [1020, 1080], [860, 1080]], "Notices to Deliver", { x: 1028, y: 1135, anchor: "start" });
f([[1210, 150], [1210, 210]], "Report Downloads", { x: 1202, y: 182, anchor: "end" });
f([[1310, 210], [1310, 150]], "Activity & Usage Data", { x: 1318, y: 182, anchor: "start" });
f([[230, 150], [230, 210]], "Settings & Audit Entries", { x: 222, y: 182, anchor: "end" });
f([[340, 210], [340, 150]], "Audit Records", { x: 348, y: 182, anchor: "start" });

// ---- drawing -------------------------------------------------------------------
// a small hop where a horizontal line passes over a vertical one
const verticals = flows.flatMap(({ pts }, id) => pts.slice(1).map((b, i) => [pts[i], b]).filter(([a, b]) => a[0] === b[0])
  .map(([a, b]) => ({ id, x: a[0], y1: Math.min(a[1], b[1]), y2: Math.max(a[1], b[1]) })));
const R = 5;
const draw = ({ pts }, id) => {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    if (ay === by) {
      const s = Math.sign(bx - ax);
      verticals.filter((v) => v.id !== id && v.y1 + 1 < ay && ay < v.y2 - 1 && Math.min(ax, bx) + R < v.x && v.x < Math.max(ax, bx) - R)
        .sort((u, v) => s * (u.x - v.x))
        .forEach((v) => (d += `L${v.x - s * R} ${ay}A${R} ${R} 0 0 ${s > 0 ? 1 : 0} ${v.x + s * R} ${ay}`));
    }
    d += `L${bx} ${by}`;
  }
  return `<path d="${d}" marker-end="url(#arrow)"/>`;
};
const esc = (s) => s.replace(/&/g, "&amp;");
const label = ({ pts, text, at }) => {
  let x, y, anchor = "middle";
  if (at.x !== undefined) ({ x, y } = at), (anchor = at.anchor ?? "middle");
  else {
    const seg = at.seg ?? 0, t = at.t ?? 0.5;
    const [a, b] = [pts[seg], pts[seg + 1]];
    x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t;
  }
  return `<text x="${x}" y="${y + 4.5}" text-anchor="${anchor}">${esc(text)}</text>`;
};

const box = (e) => `<rect x="${e.x1}" y="${e.y1}" width="${e.x2 - e.x1}" height="${e.y2 - e.y1}" class="box"/>`
  + e.name.map((t, i) => `<text x="${(e.x1 + e.x2) / 2}" y="${(e.y1 + e.y2) / 2 + 8 - (e.name.length - 1) * 13 + i * 26}" class="ent">${t}</text>`).join("");
const procBox = ([no, p]) => {
  const cx = (p.x1 + p.x2) / 2, mid = p.y1 + 28 + (p.y2 - p.y1 - 28) / 2;
  return `<rect x="${p.x1}" y="${p.y1}" width="${p.x2 - p.x1}" height="${p.y2 - p.y1}" rx="16" class="box"/>`
    + `<path d="M${p.x1} ${p.y1 + 28}H${p.x2}" class="rule"/><text x="${cx}" y="${p.y1 + 20}" class="no">${no}</text>`
    + p.name.map((t, i) => `<text x="${cx}" y="${mid + 6 - (p.name.length - 1) * 10 + i * 20}" class="pname">${esc(t)}</text>`).join("");
};
const storeBox = ([id, name, x, y]) => `<rect x="${x}" y="${y}" width="${SW}" height="${SH}" fill="#fff"/>`
  + `<path d="M${x + SW} ${y}H${x}V${y + SH}H${x + SW}M${x + 40} ${y}V${y + SH}" class="rule"/>`
  + `<text x="${x + 20}" y="${y + 23}" class="sid">${id}</text>`
  + `<text x="${x + 40 + (SW - 40) / 2}" y="${y + 23}" class="sname">${esc(name)}</text>`;

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
  <path d="M0 0L10 5L0 10Z" fill="#000"/></marker>
  <filter id="bg" x="-0.03" y="-0.1" width="1.06" height="1.2"><feFlood flood-color="#fff"/><feComposite in="SourceGraphic"/></filter></defs>
<style>
  text { font-family: Arial, Helvetica, sans-serif; fill: #000; }
  .box { fill: #fff; stroke: #000; stroke-width: 2; }
  .rule { fill: none; stroke: #000; stroke-width: 1.6; }
  .ent { font-size: 22px; font-weight: 700; text-anchor: middle; }
  .no { font-size: 15px; text-anchor: middle; }
  .pname { font-size: 15px; font-weight: 700; text-anchor: middle; }
  .sid { font-size: 13px; text-anchor: middle; }
  .sname { font-size: 12.5px; text-anchor: middle; }
  .flows path { fill: none; stroke: #000; stroke-width: 1.3; }
  .labels text { font-size: 12px; filter: url(#bg); }
</style>
<rect width="100%" height="100%" fill="#fff"/>
<g class="flows">${flows.map(draw).join("")}</g>
${Object.values(stores).map(storeBox).join("\n")}
${Object.entries(proc).map(procBox).join("\n")}
${Object.values(ent).map(box).join("\n")}
<g class="labels">${flows.map(label).join("")}</g>
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
