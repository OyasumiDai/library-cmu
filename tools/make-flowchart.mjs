// Draws the system flowchart (docs/flowchart.svg, and docs/flowchart.png through headless Edge/Chrome):
// sign up / sign in, then the student's borrowing loop and the staff panel, in standard flowchart symbols.
// Run: node tools/make-flowchart.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1740, height = 2360;
const C = { primary: "#0a2e9c", edge: "#061c63", ink: "#14204a", tint: "#dfe8fb", soft: "#eef2fc", accent: "#f5a800", grey: "#5b6584", yes: "#2E8540", no: "#B3261E" };
const T = 70; // everything sits below the title

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// centred lines of text around (x, y)
const text = (x, y, lines, { size = 15, weight = 600, fill = C.ink } = {}) => {
  const list = Array.isArray(lines) ? lines : [lines];
  const lh = size * 1.25;
  return list.map((l, i) => `<text x="${x}" y="${y + (i - (list.length - 1) / 2) * lh}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${esc(l)}</text>`).join("");
};

const shapes = [];
const lines = [];
// terminator: start / end
const term = (x, y, label) => shapes.push(`<rect x="${x - 85}" y="${y - 26}" width="170" height="52" rx="26" fill="${C.primary}" stroke="${C.edge}" stroke-width="2.5"/>${text(x, y, label, { size: 17, weight: 700, fill: "#fff" })}`);
// process
const proc = (x, y, w, h, label) => shapes.push(`<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="6" fill="#fff" stroke="${C.primary}" stroke-width="2.5"/>${text(x, y, label)}`);
// input / output (parallelogram)
const io = (x, y, w, h, label) => { const k = 18; shapes.push(`<polygon points="${x - w / 2 + k},${y - h / 2} ${x + w / 2 + k},${y - h / 2} ${x + w / 2 - k},${y + h / 2} ${x - w / 2 - k},${y + h / 2}" fill="${C.soft}" stroke="${C.primary}" stroke-width="2.5"/>${text(x, y, label)}`); };
// decision
const dec = (x, y, w, h, label) => shapes.push(`<polygon points="${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}" fill="${C.tint}" stroke="${C.primary}" stroke-width="2.5"/>${text(x, y, label, { size: 14, weight: 700 })}`);
// database (cylinder)
const db = (x, y, w, h, label) => { const r = 10; shapes.push(`<path d="M${x - w / 2},${y - h / 2 + r} a${w / 2},${r} 0 0 1 ${w},0 v${h - 2 * r} a${w / 2},${r} 0 0 1 ${-w},0 z" fill="#fff8e6" stroke="${C.accent}" stroke-width="2.5"/><path d="M${x - w / 2},${y - h / 2 + r} a${w / 2},${r} 0 0 0 ${w},0" fill="none" stroke="${C.accent}" stroke-width="2.5"/>${text(x, y + 6, label, { size: 13 })}`); };
// connector through points; label sits beside the first segment
const line = (pts, { arrow = true, dashed = false, label = "", tone = C.grey, at = 0, dx = 0, dy = -10 } = {}) => {
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  lines.push(`<path d="${d}" fill="none" stroke="${dashed ? C.accent : C.edge}" stroke-width="2.2" ${dashed ? 'stroke-dasharray="7 5"' : ""} ${arrow ? `marker-end="url(#${dashed ? "arrowGold" : "arrow"})"` : ""}/>`);
  if (label) {
    const [a, b] = [pts[at], pts[at + 1]];
    const lx = (a[0] + b[0]) / 2 + dx, ly = (a[1] + b[1]) / 2 + dy;
    const w = label.length * 7.4 + 14;
    lines.push(`<rect x="${lx - w / 2}" y="${ly - 11}" width="${w}" height="22" rx="11" fill="#fff" stroke="${tone}" stroke-width="1.4"/>${text(lx, ly, label, { size: 12.5, weight: 700, fill: tone })}`);
  }
};
const yes = (pts, o = {}) => line(pts, { label: "Yes", tone: C.yes, ...o });
const no = (pts, o = {}) => line(pts, { label: "No", tone: C.no, ...o });

// ---------------------------------------------------------------- sign up / sign in (the spine at x = 870)
const X = 870;
term(X, T + 40, "Start");
proc(X, T + 140, 280, 56, ["Open CMU Library Explorer", "(website landing page)"]);
dec(X, T + 270, 240, 120, ["Has a library", "account?"]);
io(X, T + 410, 300, 62, ["Enter email and password"]);
dec(X, T + 540, 240, 120, ["Credentials", "valid?"]);
proc(560, T + 540, 230, 70, ["Count failed try;", "lock sign-in after", "too many tries"]);
dec(X, T + 680, 220, 110, ["User role?"]);
line([[X, T + 66], [X, T + 112]]);
line([[X, T + 168], [X, T + 210]]);
yes([[X, T + 330], [X, T + 379]], { dx: 26, dy: 0 });
line([[X, T + 441], [X, T + 480]]);
no([[X - 120, T + 540], [675, T + 540]], { dy: -14 });
line([[560, T + 505], [560, T + 410], [X - 168, T + 410]]);
yes([[X, T + 600], [X, T + 625]], { dx: 26, dy: 0 });

// registration (right of the spine)
const R = 1380;
io(R, T + 270, 300, 62, ["Enter account & student details", "(username, ID, course, year)"]);
proc(R, T + 380, 290, 56, ["Send 6-digit verification code", "to the student's email"]);
dec(R, T + 500, 230, 110, ["Code", "correct?"]);
proc(R, T + 620, 240, 56, ["Create the account"]);
db(1630, T + 620, 140, 74, ["D1 User", "Accounts"]);
no([[X + 120, T + 270], [R - 168, T + 270]], { dy: -14 });
line([[R, T + 301], [R, T + 352]]);
line([[R, T + 408], [R, T + 445]]);
no([[R + 115, T + 500], [1610, T + 500], [1610, T + 380], [R + 145, T + 380]], { dy: -14 });
yes([[R, T + 555], [R, T + 592]], { dx: 26, dy: 0 });
line([[R + 120, T + 620], [1560, T + 620]], { dashed: true, arrow: true });
line([[R - 120, T + 620], [1090, T + 620], [1090, T + 410], [X + 168, T + 410]], { label: "Account ready", tone: C.primary, at: 1, dx: 62, dy: 0 });

// ---------------------------------------------------------------- the student (left column)
// the student borrows on the website or inside the 3D game; both lead to the same request and QR ticket
const S = 430, cy = T + 810, sy = T + 950, G = 765;
dec(S, cy, 250, 120, ["Website", "or game?"]);
proc(G, cy, 250, 56, ["Enter the 2D-3D library game"]);
proc(G, sy, 250, 84, ["Walk to the librarian (NPC)", "or walk to a shelf and", "pick a book"]);
line([[S + 125, cy], [G - 125, cy]], { label: "Game", tone: C.primary, dy: -14 });
line([[G, cy + 28], [G, sy - 42]]);
line([[G, sy + 42], [G, sy + 125], [S + 115, sy + 125]]);
line([[S, cy + 60], [S, sy - 28]], { label: "Website", tone: C.primary, dx: 40, dy: 0 });
proc(S, sy, 280, 56, ["Search and filter the catalog"]);
db(140, sy, 150, 74, ["D2 Books", "& Copies"]);
dec(S, sy + 125, 230, 110, ["Book", "available?"]);
proc(S, sy + 250, 290, 60, ["Request the book", "(on the website or in the game)"]);
proc(S, sy + 355, 320, 84, ["Reserve a copy and make the QR", "ticket (shown in My books and", "in the game) and email it"]);
db(140, sy + 355, 150, 74, ["D3 Loans", "& Movements"]);
dec(S, sy + 490, 250, 120, ["Picked up within", "2 days?"]);
proc(140, sy + 490, 210, 84, ["Request cancelled", "by itself; book goes", "back on the shelf"]);
proc(S, sy + 630, 320, 84, ["Desk scans the QR: book checked", "out, due date set (Fiction 5 days,", "Circulation 3 days)"]);
dec(S, sy + 775, 250, 120, ["Returned by", "the due date?"]);
proc(730, sy + 775, 220, 84, ["Overdue: fine for each", "late weekday, email", "reminders"]);
proc(S, sy + 905, 300, 62, ["Return the book at the desk;", "staff record the return"]);
line([[X - 110, T + 680], [S, T + 680], [S, cy - 60]], { label: "Student", tone: C.primary, at: 0, dy: -14 });
line([[215, sy - 8], [S - 140, sy - 8]], { dashed: true });
line([[S, sy + 28], [S, sy + 70]]);
no([[S - 115, sy + 125], [258, sy + 125], [258, sy + 18], [S - 140, sy + 18]], { dy: -14 });
yes([[S, sy + 180], [S, sy + 220]], { dx: 26, dy: 0 });
line([[S, sy + 280], [S, sy + 313]]);
line([[S - 160, sy + 355], [215, sy + 355]], { dashed: true });
line([[S, sy + 397], [S, sy + 430]]);
no([[S - 125, sy + 490], [245, sy + 490]], { dy: -14 });
yes([[S, sy + 550], [S, sy + 588]], { dx: 26, dy: 0 });
line([[S, sy + 672], [S, sy + 715]]);
no([[S + 125, sy + 775], [620, sy + 775]], { dy: -14 });
line([[730, sy + 817], [730, sy + 905], [S + 150, sy + 905]]);
yes([[S, sy + 835], [S, sy + 874]], { dx: 26, dy: 0 });

// ---------------------------------------------------------------- staff and admins (right column)
const F = 1300, fy = T + 820;
proc(F, fy, 260, 56, ["Open the staff dashboard"]);
dec(F, fy + 125, 230, 110, ["Choose a", "module"]);
const mods = [["Books:", "add, edit,", "archive, approve"], ["Circulation:", "requests, QR", "pickups, returns"], ["Students:", "profiles,", "notices"], ["Reports &", "analytics,", "CSV downloads"], ["Settings &", "staff", "(admin only)"]];
const mw = 140, mg = 10, mx0 = F - ((mods.length - 1) * (mw + mg)) / 2, my = fy + 290;
line([[X + 110, T + 680], [F, T + 680], [F, fy - 28]], { label: "Staff / Admin", tone: C.primary, at: 0, dy: -14 });
line([[F, fy + 28], [F, fy + 70]]);
line([[F, fy + 180], [F, fy + 215]], { arrow: false });
line([[mx0, fy + 215], [mx0 + (mods.length - 1) * (mw + mg), fy + 215]], { arrow: false });
mods.forEach((m, i) => {
  const mx = mx0 + i * (mw + mg);
  proc(mx, my, mw, 92, m);
  line([[mx, fy + 215], [mx, my - 46]]);
  line([[mx, my + 46], [mx, fy + 375]], { arrow: false });
});
line([[mx0, fy + 375], [mx0 + (mods.length - 1) * (mw + mg), fy + 375]], { arrow: false });
proc(F, fy + 460, 300, 62, ["Save the change and record", "it in the audit trail"]);
db(1630, fy + 460, 150, 74, ["D6 Settings", "& Audit Log"]);
dec(F, fy + 600, 230, 110, ["More tasks?"]);
line([[F, fy + 375], [F, fy + 429]]);
line([[F + 150, fy + 460], [1555, fy + 460]], { dashed: true });
line([[F, fy + 491], [F, fy + 545]]);
yes([[F + 115, fy + 600], [1712, fy + 600], [1712, fy + 125], [F + 115, fy + 125]], { dy: -14 });

// ---------------------------------------------------------------- the end
const ey = sy + 1030;
proc(X, ey, 240, 56, ["Log out"]);
term(X, ey + 100, "End");
line([[140, sy + 532], [140, ey], [S, ey]], { arrow: false });
line([[S, sy + 936], [S, ey], [X - 120, ey]]);
no([[F, fy + 655], [F, ey], [X + 120, ey]], { dx: 26, dy: 0 });
line([[X, ey + 28], [X, ey + 74]]);

// legend
const lg = [[`<rect x="0" y="-13" width="44" height="26" rx="13" fill="${C.primary}"/>`, "Start / End"], [`<rect x="0" y="-13" width="44" height="26" rx="4" fill="#fff" stroke="${C.primary}" stroke-width="2"/>`, "Process"],
  [`<polygon points="22,-15 44,0 22,15 0,0" fill="${C.tint}" stroke="${C.primary}" stroke-width="2"/>`, "Decision"], [`<polygon points="8,-13 48,-13 40,13 0,13" fill="${C.soft}" stroke="${C.primary}" stroke-width="2"/>`, "Input / Output"],
  [`<rect x="0" y="-15" width="44" height="30" rx="8" fill="#fff8e6" stroke="${C.accent}" stroke-width="2"/>`, "Data store"], [`<path d="M0,0 H44" stroke="${C.accent}" stroke-width="2.2" stroke-dasharray="7 5"/>`, "Data read / saved"]];
const legend = lg.map(([icon, label], i) => `<g transform="translate(${60 + (i % 3) * 230},${height - 92 + Math.floor(i / 3) * 40})">${icon}<text x="60" y="0" font-size="14" font-weight="600" fill="${C.ink}" dominant-baseline="central">${label}</text></g>`).join("");

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, Arial, sans-serif">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.edge}"/></marker>
  <marker id="arrowGold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.accent}"/></marker>
</defs>
<rect width="100%" height="100%" fill="#fff"/>
<rect x="0" y="0" width="${width}" height="56" fill="${C.primary}"/>
<text x="${width / 2}" y="28" font-size="22" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central" letter-spacing="1.5">SYSTEM FLOWCHART · CMU LIBRARY EXPLORER</text>
${lines.join("\n")}
${shapes.join("\n")}
<line x1="40" x2="${width - 40}" y1="${height - 124}" y2="${height - 124}" stroke="${C.tint}" stroke-width="2"/>
${legend}
</svg>
`;

const svgFile = path.join(root, "docs", "flowchart.svg");
fs.writeFileSync(svgFile, out);
console.log(`wrote ${svgFile}`);

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((b) => fs.existsSync(b));
if (browsers.length) {
  const png = path.join(root, "docs", "flowchart.png");
  execFileSync(browsers[0], ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${width},${height}`, `--screenshot=${png}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${png}`);
}
