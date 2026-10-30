// Draws the use case diagram (docs/use-case.svg, and docs/use-case.png through headless Edge/Chrome).
// Run: node tools/make-usecase.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1400, height = 1860;
const title = ["CMU LIBRARY EXPLORER:", "A WEB-BASED LIBRARY CATALOG, BOOK BORROWING", "AND CIRCULATION MANAGEMENT SYSTEM"];
const B = { x1: 330, y1: 50, x2: 1070, y2: 1800 }; // system boundary
const EW = 135, EH = 34; // ellipse radii
const LX = 525, RX = 875; // the two columns of use cases

const login = { c: [700, 200], text: "Login" };
const register = { c: [LX, 310], text: "Register student account and confirm email code" };
const verify = { c: [RX, 310], text: "Verify credentials in User Accounts" };
const col = (x, y0, texts) => texts.map((text, i) => ({ c: [x, y0 + 92 * i], text }));
const student = col(LX, 410, [
  "Search and browse the book catalog", "View book details and availability", "Request to borrow a book", "Cancel a borrow request",
  "Show pickup QR ticket", "View loans, due dates and fines", "Receive notifications and email reminders", "View announcements",
  "Update profile and account"]);
const staff = col(RX, 410, [
  "Add or edit book details", "Review pending loan requests", "Scan QR ticket to check out a book", "Record book returns",
  "Send loan reminder emails", "Post announcements and site content", "View circulation and movement records", "Download library reports"]);
const admin = col(RX, 1370, [
  "Approve or request revision of submitted books", "Manage staff accounts and permissions", "Set borrowing rules and system settings",
  "View analytics and generate reports", "View audit trail"]);
const audit = { c: [LX, 1554], text: "Record action in Audit Trail" };

const actors = { S: { x: 160, y: 760, name: "Student" }, T: { x: 1240, y: 720, name: "Library Staff" }, A: { x: 1240, y: 1540, name: "Administrator" } };
const hand = (a, side) => [a.x + side * 42, a.y - 22];

// the point where a line toward p leaves the ellipse
const rim = (u, p) => {
  const [cx, cy] = u.c, dx = p[0] - cx, dy = p[1] - cy, t = 1 / Math.hypot(dx / EW, dy / EH);
  return [cx + dx * t, cy + dy * t];
};
const rimAt = (u, side, dy) => [u.c[0] + side * EW * Math.sqrt(1 - (dy / EH) ** 2), u.c[1] + dy];

let lines = "", dashed = "";
const line = (pts, cls = "") => (lines += `<path d="M${pts.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join("L")}"${cls}/>`);
const rel = (from, to, kind, ends) => {
  const [a, b] = ends ?? [rim(from, to.c), rim(to, from.c)];
  dashed += `<path d="M${a.join(" ")}L${b.join(" ")}" class="dash" marker-end="url(#open)"/>`;
  dashed += `<text x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 + 4}" class="stereo">«${kind}»</text>`;
};

// associations
const S = hand(actors.S, 1), T = hand(actors.T, -1), A = hand(actors.A, -1);
line([S, [360, 200], rimAt(login, -1, 0)]);
for (const u of [register, ...student]) line([S, rimAt(u, -1, 0)]);
line([T, [1040, 214], rimAt(login, 1, 14)]);
for (const u of staff) line([T, rimAt(u, 1, 0)]);
line([[actors.A.x + 42, actors.A.y - 22], [1330, actors.A.y - 22], [1330, 186], rimAt(login, 1, -14)]);
for (const u of admin) line([A, rimAt(u, 1, 0)]);
// an administrator can do everything staff can
lines += `<path d="M${actors.A.x} ${actors.A.y - 98}V${actors.T.y + 122}" marker-end="url(#gen)"/>`;

rel(register, login, "extend");
rel(login, verify, "include");
for (const u of admin) rel(u, audit, "include", [rimAt(u, -1, 0), rimAt(audit, 1, (u.c[1] - audit.c[1]) * 0.12)]);

const wrap = (s, max = 30) => s.split(" ").reduce((ls, w) => {
  if (ls.length && (ls[ls.length - 1] + " " + w).length <= max) ls[ls.length - 1] += " " + w; else ls.push(w);
  return ls;
}, []);
const ellipse = (u) => `<ellipse cx="${u.c[0]}" cy="${u.c[1]}" rx="${EW}" ry="${EH}" class="uc"/>`
  + wrap(u.text).map((t, i, all) => `<text x="${u.c[0]}" y="${u.c[1] + 4.5 - (all.length - 1) * 8 + i * 16}" class="uct">${t}</text>`).join("");
const actor = (a) => `<g class="actor"><circle cx="${a.x}" cy="${a.y - 76}" r="22"/><path d="M${a.x} ${a.y - 54}V${a.y + 20}M${a.x - 42} ${a.y - 22}H${a.x + 42}M${a.x} ${a.y + 20}L${a.x - 36} ${a.y + 84}M${a.x} ${a.y + 20}L${a.x + 36} ${a.y + 84}"/></g>`
  + `<text x="${a.x}" y="${a.y + 112}" class="aname">${a.name}</text>`;

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M1 1L11 6L1 11" fill="none" stroke="#000" stroke-width="1.4"/></marker>
  <marker id="gen" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="16" markerHeight="16" orient="auto"><path d="M1 1L13 7L1 13Z" fill="#fff" stroke="#000" stroke-width="1.2"/></marker>
  <filter id="bg" x="-0.05" y="-0.1" width="1.1" height="1.2"><feFlood flood-color="#fff"/><feComposite in="SourceGraphic"/></filter>
</defs>
<style>
  text { font-family: Arial, Helvetica, sans-serif; fill: #000; text-anchor: middle; }
  .bound { fill: none; stroke: #000; stroke-width: 1.8; }
  .title { font-size: 16px; font-weight: 700; }
  .uc { fill: #fff; stroke: #000; stroke-width: 1.5; }
  .uct { font-size: 13px; }
  .lines path { fill: none; stroke: #000; stroke-width: 1.2; }
  .dash { fill: none; stroke: #000; stroke-width: 1.2; stroke-dasharray: 6 5; }
  .stereo { font-size: 11.5px; filter: url(#bg); }
  .actor circle, .actor path { fill: #fff; stroke: #000; stroke-width: 1.8; }
  .aname { font-size: 16px; font-weight: 700; }
</style>
<rect width="100%" height="100%" fill="#fff"/>
<rect x="${B.x1}" y="${B.y1}" width="${B.x2 - B.x1}" height="${B.y2 - B.y1}" rx="22" class="bound"/>
${title.map((t, i) => `<text x="${(B.x1 + B.x2) / 2}" y="${B.y1 + 36 + i * 21}" class="title">${t}</text>`).join("")}
<g class="lines">${lines}</g>
${dashed}
${[login, register, verify, ...student, ...staff, ...admin, audit].map(ellipse).join("\n")}
${Object.values(actors).map(actor).join("\n")}
</svg>
`;

const svgFile = path.join(root, "docs", "use-case.svg");
fs.writeFileSync(svgFile, out);
console.log(`wrote ${svgFile}`);

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((b) => fs.existsSync(b));
if (browsers.length) {
  const png = path.join(root, "docs", "use-case.png");
  execFileSync(browsers[0], ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${width},${height}`, `--screenshot=${png}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${png}`);
}
