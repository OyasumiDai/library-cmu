// Draws the database ERD (docs/erd.svg, and docs/erd.png through headless Edge/Chrome when one is installed).
// Run: node tools/make-erd.mjs. The tables follow docs/erd.mmd and the tools/*.sql files.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 330, HEAD = 34, PAD = 4, ROW = 21, FOOT = 8;
// the site's light theme (src/styles/themes.css): --primary, --primary-edge, --accent
const C = { head: "#0a2e9c", ink: "#14204a", grey: "#7d859c", stripe: "#EEF2FC", line: "#061c63", pk: "#B87900", fk: "#0b3ab8", uk: "#2E8540" };

// [key, name, type, notNull]
const tables = {
  auth_users: { label: "auth.users", x: 60, y: 150, rows: [
    ["PK", "id", "UUID", 1], ["", "email", "TEXT"], ["", "email_confirmed_at", "TIMESTAMPTZ"], ["", "raw_user_meta_data", "JSONB"]] },
  courses: { x: 60, y: 330, rows: [
    ["PK", "id", "INT", 1], ["", "college", "TEXT"], ["", "program", "TEXT"], ["", "code", "TEXT"], ["", "majors", "TEXT[]"], ["", "sort", "INT"]] },
  notifications: { x: 60, y: 550, rows: [
    ["PK", "id", "BIGINT", 1], ["FK", "user_id", "UUID"], ["", "title", "TEXT"], ["", "message", "TEXT"], ["", "type", "TEXT"], ["", "is_read", "BOOLEAN"], ["", "created_at", "TIMESTAMPTZ"]] },
  audit_log: { x: 60, y: 790, rows: [
    ["PK", "id", "BIGINT", 1], ["FK", "actor_id", "UUID"], ["", "action", "TEXT"], ["", "module", "TEXT"], ["", "details", "TEXT"], ["", "created_at", "TIMESTAMPTZ"]] },
  profiles: { x: 540, y: 150, rows: [
    ["PK FK", "id", "UUID", 1], ["UK", "username", "TEXT"], ["", "full_name", "TEXT"], ["", "email", "TEXT"], ["", "role", "TEXT"],
    ["", "student_id", "TEXT"], ["", "gender", "TEXT"], ["", "course", "TEXT"], ["", "major", "TEXT"], ["", "college", "TEXT"],
    ["", "year_level", "TEXT"], ["", "phone", "TEXT"], ["", "photo_url", "TEXT"], ["", "terms_version", "TEXT"],
    ["", "terms_accepted_at", "TIMESTAMPTZ"], ["", "active", "BOOLEAN"], ["", "permissions", "TEXT[]"], ["", "created_at", "TIMESTAMPTZ"]] },
  user_activity: { x: 540, rows: [
    ["PK", "id", "BIGINT", 1], ["FK", "user_id", "UUID"], ["", "type", "TEXT"], ["FK", "book_id", "TEXT"], ["", "details", "JSONB"], ["", "created_at", "TIMESTAMPTZ"]] },
  books: { x: 1020, y: 150, rows: [
    ["PK", "id", "TEXT", 1], ["UK", "isbn", "TEXT"], ["", "title", "TEXT"], ["", "author", "TEXT"], ["", "authors", "TEXT[]"],
    ["", "edition", "TEXT"], ["", "category", "TEXT"], ["", "genre", "TEXT"], ["", "published", "TEXT"], ["", "publisher", "TEXT"],
    ["", "language", "TEXT"], ["", "synopsis", "TEXT"], ["", "copies", "INT"], ["", "shelf", "TEXT"], ["", "cover_url", "TEXT"],
    ["", "material", "TEXT", 1], ["", "obsolete_year", "INT"], ["", "archived", "BOOLEAN"], ["", "archive_location", "TEXT"],
    ["", "archive_reason", "TEXT"], ["", "archived_at", "TIMESTAMPTZ"], ["", "approval_status", "TEXT", 1], ["", "review_note", "TEXT"],
    ["FK", "submitted_by", "UUID"], ["FK", "reviewed_by", "UUID"], ["", "reviewed_at", "TIMESTAMPTZ"], ["", "created_at", "TIMESTAMPTZ"]] },
  book_copies: { x: 1020, y: 810, rows: [
    ["PK", "code", "TEXT", 1], ["FK", "book_id", "TEXT", 1], ["", "copy_no", "INT", 1], ["", "created_at", "TIMESTAMPTZ", 1]] },
  loans: { x: 1500, y: 150, rows: [
    ["PK", "id", "BIGINT", 1], ["FK", "book_id", "TEXT"], ["FK", "user_id", "UUID"], ["", "status", "TEXT"], ["", "pickup_code", "TEXT"],
    ["", "requested_at", "TIMESTAMPTZ"], ["", "borrowed_at", "TIMESTAMPTZ"], ["", "due_at", "TIMESTAMPTZ"], ["", "returned_at", "TIMESTAMPTZ"], ["", "note", "TEXT"]] },
  loan_emails: { x: 1500, y: 450, rows: [
    ["PK", "id", "BIGSERIAL", 1], ["FK", "loan_id", "BIGINT", 1], ["", "kind", "TEXT", 1], ["FK", "sent_by", "UUID"], ["", "sent_at", "TIMESTAMPTZ", 1]] },
  movements: { x: 1500, rows: [
    ["PK", "id", "BIGINT", 1], ["FK", "book_id", "TEXT"], ["", "action", "TEXT"], ["", "quantity", "INT"], ["", "remarks", "TEXT"], ["FK", "actor_id", "UUID"], ["", "created_at", "TIMESTAMPTZ"]] },
  site_settings: { x: 2040, y: 150, rows: [["PK", "key", "TEXT", 1], ["", "value", "JSONB"], ["", "updated_at", "TIMESTAMPTZ"]] },
  announcements: { x: 2040, y: 300, rows: [
    ["PK", "id", "BIGINT", 1], ["", "title", "TEXT"], ["", "body", "TEXT"], ["", "published", "BOOLEAN"], ["", "created_at", "TIMESTAMPTZ"]] },
  content_pages: { x: 2040, y: 490, rows: [["PK", "slug", "TEXT", 1], ["", "title", "TEXT"], ["", "body", "JSONB"], ["", "updated_at", "TIMESTAMPTZ"]] },
  team_members: { x: 2040, y: 660, rows: [
    ["PK", "id", "INT", 1], ["", "team_group", "TEXT"], ["", "name", "TEXT"], ["", "position", "TEXT"], ["", "email", "TEXT"],
    ["", "photo_url", "TEXT"], ["", "character", "TEXT"], ["", "bio", "TEXT"], ["", "display_order", "INT"], ["", "is_active", "BOOLEAN"]] },
};

const rowY = (t, i) => tables[t].y + HEAD + PAD + ROW * i + ROW / 2;
// line up the cards whose link is drawn straight across
tables.user_activity.y = rowY("books", 26) - (HEAD + PAD + ROW * 3 + ROW / 2);
tables.movements.y = rowY("books", 25) - (HEAD + PAD + ROW * 1 + ROW / 2);
const height = (t) => HEAD + PAD + ROW * tables[t].rows.length + FOOT;
const edge = (t, side) => (side === "R" ? tables[t].x + W : tables[t].x);

// [parent, row, side, parent end, child, row, side, child end, via (alternating lane x / y), dashed]
const links = [
  ["auth_users", 0, "R", "one", "profiles", 0, "L", "one", []],
  ["courses", 2, "R", "one", "profiles", 7, "L", "many", [440], true],
  ["profiles", 9, "L", "one", "notifications", 1, "R", "many", [465]],
  ["profiles", 11, "L", "zeroOne", "audit_log", 1, "R", "many", [490]],
  ["profiles", 17, "R", "one", "user_activity", 1, "R", "many", [895]],
  ["profiles", 15, "R", "zeroOne", "books", 23, "L", "many", [990]],
  ["profiles", 16, "R", "zeroOne", "books", 24, "L", "many", [960]],
  ["books", 26, "L", "zeroOne", "user_activity", 3, "R", "many", []],
  ["profiles", 2, "R", "one", "loans", 2, "R", "many", [945, 124, 1860]],
  ["profiles", 1, "R", "zeroOne", "loan_emails", 3, "R", "many", [930, 112, 1920]],
  ["profiles", 0, "R", "zeroOne", "movements", 5, "R", "many", [915, 100, 1950]],
  ["books", 1, "R", "one", "loans", 1, "L", "many", []],
  ["books", 25, "R", "one", "movements", 1, "L", "many", []],
  ["books", 26, "R", "one", "book_copies", 1, "R", "many", [1380]],
  ["loans", 9, "R", "one", "loan_emails", 1, "R", "many", [1890]],
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
let svg = "";

for (const [name, t] of Object.entries(tables)) {
  const h = height(name);
  svg += `<g><rect x="${t.x}" y="${t.y}" width="${W}" height="${h}" rx="7" fill="#fff" stroke="${C.line}" stroke-width="1.6"/>`;
  svg += `<path d="M${t.x} ${t.y + HEAD}V${t.y + 7}a7 7 0 0 1 7 -7H${t.x + W - 7}a7 7 0 0 1 7 7V${t.y + HEAD}Z" fill="${C.head}" stroke="${C.line}" stroke-width="1.6"/>`;
  svg += `<text x="${t.x + 14}" y="${t.y + 22}" class="head">${esc(t.label ?? name)}</text>`;
  t.rows.forEach(([key, col, type, nn], i) => {
    const y = t.y + HEAD + PAD + ROW * i, mid = y + 15;
    if (i % 2) svg += `<rect x="${t.x + 1}" y="${y}" width="${W - 2}" height="${ROW}" fill="${C.stripe}"/>`;
    if (key) {
      const parts = key.split(" ");
      parts.forEach((k, j) => (svg += `<text x="${t.x + 12 + j * 18}" y="${mid}" class="key" fill="${C[k.toLowerCase()]}">${k}</text>`));
    }
    svg += `<text x="${t.x + 52}" y="${mid}" class="${key.includes("PK") ? "col pk" : "col"}">${esc(col)}</text>`;
    svg += `<text x="${t.x + W - 12}" y="${mid}" class="type">${esc(type)}${nn ? " NN" : ""}</text>`;
  });
  svg += `</g>`;
}

// crow's-foot ends; d is the direction the line leaves the card (+1 right, -1 left)
function end(x, y, d, kind) {
  const tick = (o) => `<path d="M${x + d * o} ${y - 7}V${y + 7}"/>`;
  const ring = (o) => `<circle cx="${x + d * o}" cy="${y}" r="5" fill="#fff"/>`;
  if (kind === "one") return tick(8) + tick(13);
  if (kind === "zeroOne") return tick(8) + ring(18);
  return `<path d="M${x + d * 13} ${y}L${x} ${y - 7}M${x + d * 13} ${y}L${x} ${y + 7}M${x + d * 13} ${y}H${x}"/>` + ring(19);
}

for (const [pa, pr, ps, pe, ch, cr, cs, ce, via, dashed] of links) {
  const x1 = edge(pa, ps), y1 = rowY(pa, pr), x2 = edge(ch, cs), y2 = rowY(ch, cr);
  const pts = [[x1, y1]];
  let cur = [x1, y1];
  via.forEach((v, i) => { cur = i % 2 === 0 ? [v, cur[1]] : [cur[0], v]; pts.push(cur); });
  // the last lane is vertical when via has an odd length; then turn to the target row
  if (via.length % 2) pts.push([cur[0], y2]);
  else if (cur[1] !== y2) pts.push([cur[0], y2]);
  pts.push([x2, y2]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  svg += `<g class="link"${dashed ? ' stroke-dasharray="6 5"' : ""}><path d="${d}" fill="none"/></g>`;
  svg += `<g class="link">${end(x1, y1, ps === "R" ? 1 : -1, pe)}${end(x2, y2, cs === "R" ? 1 : -1, ce)}</g>`;
}

const width = 2040 + W + 60;
const bottom = Math.max(...Object.keys(tables).map((t) => tables[t].y + height(t)));
const ly = bottom + 60;
const legend = `
<text x="60" y="${ly}" class="legend-title">Legend</text>
<text x="60" y="${ly + 30}" class="key" fill="${C.pk}">PK</text><text x="88" y="${ly + 30}" class="lg">Primary key</text>
<text x="210" y="${ly + 30}" class="key" fill="${C.fk}">FK</text><text x="238" y="${ly + 30}" class="lg">Foreign key</text>
<text x="360" y="${ly + 30}" class="key" fill="${C.uk}">UK</text><text x="390" y="${ly + 30}" class="lg">Unique key</text>
<text x="510" y="${ly + 30}" class="key" fill="${C.grey}">NN</text><text x="540" y="${ly + 30}" class="lg">Not null</text>
<g class="link"><path d="M700 ${ly + 25}H760"/></g><text x="772" y="${ly + 30}" class="lg">Foreign key enforced in PostgreSQL</text>
<g class="link" stroke-dasharray="6 5"><path d="M700 ${ly + 51}H760"/></g><text x="772" y="${ly + 56}" class="lg">Relationship used by the application (matched by name, not enforced)</text>
<g class="link">${end(1240, ly + 25, -1, "one")}<path d="M1240 ${ly + 25}H1215"/></g><text x="1252" y="${ly + 30}" class="lg">exactly one</text>
<g class="link">${end(1400, ly + 25, -1, "zeroOne")}<path d="M1400 ${ly + 25}H1375"/></g><text x="1412" y="${ly + 30}" class="lg">zero or one</text>
<g class="link">${end(1560, ly + 25, -1, "many")}<path d="M1560 ${ly + 25}H1535"/></g><text x="1572" y="${ly + 30}" class="lg">zero or many</text>
<text x="1215" y="${ly + 56}" class="note">profiles.id is also auth.users.id (Supabase Auth). site_settings holds loan_rules, pickup_hours, holidays and archive_locations.</text>`;

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ly + 90}" viewBox="0 0 ${width} ${ly + 90}">
<style>
  text { font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif; fill: ${C.ink}; }
  .title { font-size: 26px; font-weight: 700; }
  .head { font-size: 15px; font-weight: 700; fill: #fff; }
  .key { font-size: 10.5px; font-weight: 700; }
  .col { font-size: 13px; }
  .pk { font-weight: 700; text-decoration: underline; }
  .type { font-size: 11px; fill: ${C.grey}; text-anchor: end; }
  .group { font-size: 13px; fill: ${C.grey}; font-style: italic; }
  .legend-title { font-size: 14px; font-weight: 700; }
  .lg { font-size: 13px; }
  .note { font-size: 11.5px; fill: ${C.grey}; }
  .link { stroke: ${C.line}; stroke-width: 1.4; fill: none; }
</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="${width / 2}" y="52" class="title" text-anchor="middle">Entity Relationship Diagram — CMU Library Explorer</text>
<text x="2040" y="138" class="group">Settings and site content (no foreign keys)</text>
${svg}
${legend}
</svg>
`;

const svgFile = path.join(root, "docs", "erd.svg");
fs.writeFileSync(svgFile, out);
console.log(`wrote ${svgFile}`);

// PNG at 2x through a headless Chromium browser, if one is around
const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((b) => fs.existsSync(b));
if (browsers.length) {
  const png = path.join(root, "docs", "erd.png");
  execFileSync(browsers[0], ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${width},${ly + 90}`, `--screenshot=${png}`, "file:///" + svgFile.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(`wrote ${png}`);
}
