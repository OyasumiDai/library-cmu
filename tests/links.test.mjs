// Run after `npm run build`. Every internal link, image, script, stylesheet and icon in the built pages must exist,
// so the site can be deployed (and checked for broken parts) even before the game is published under /play.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
if (!fs.existsSync(dist)) { console.error("FAIL: run `npm run build` first"); process.exit(1); }

const pages = fs.readdirSync(dist).filter((f) => f.endsWith(".html"));
const exists = (url) => {
  const clean = decodeURIComponent(url.split("#")[0].split("?")[0]);
  if (clean === "" || clean === "/") return fs.existsSync(path.join(dist, "index.html"));
  const target = path.join(dist, clean);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  return fs.existsSync(`${target}.html`);
};
// served by Vercel at runtime, or the optional game build
const runtime = (url) => url.startsWith("/api/") || url.startsWith("/play");

const broken = [];
let checked = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(dist, page), "utf8");
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = m[1];
    if (url.startsWith("//") || runtime(url)) continue;
    checked++;
    if (!exists(url.replace(/(\.svg)#.*/, "$1"))) broken.push(`${page}: ${url}`);
  }
}

// icons: every <use href="/assets/icons/icons.svg#name"> must be a real symbol
const sprite = fs.readFileSync(path.join(dist, "assets/icons/icons.svg"), "utf8");
const symbols = new Set([...sprite.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]));
const source = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : source.push(path.join(dir, e.name))));
walk(path.resolve("src"));
const iconNames = new Set();
for (const file of source.filter((f) => /\.(html|ts|json)$/.test(f))) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/icons\.svg#([\w-]+)/g)) iconNames.add(m[1]);
  for (const m of text.matchAll(/\bicon\(\s*["']([\w-]+)["']/g)) iconNames.add(m[1]);
  if (file.endsWith("nav.json")) for (const m of text.matchAll(/"icon":\s*"([\w-]+)"/g)) iconNames.add(m[1]);
  for (const m of text.matchAll(/\bicon\(\s*[^"'\s)][^)]*\?\s*"([\w-]+)"\s*:\s*"([\w-]+)"/g)) { iconNames.add(m[1]); iconNames.add(m[2]); }
}
for (const name of iconNames) if (!symbols.has(name)) broken.push(`icon not in sprite: ${name}`);

// no form may fall back to GET (that would put passwords in the address)
for (const page of pages) {
  const html = fs.readFileSync(path.join(dist, page), "utf8");
  for (const m of html.matchAll(/<form[^>]*>/g)) if (!/\smethod="post"/.test(m[0])) broken.push(`${page}: form without method="post"`);
}

// every page has the pieces the scripts expect
for (const page of pages) {
  const html = fs.readFileSync(path.join(dist, page), "utf8");
  if (!/<title>[^<]+<\/title>/.test(html) || !html.includes('id="main"') || !html.includes('id="toasts"')) broken.push(`${page}: missing title, #main or #toasts`);
  const entry = /\/assets\/js\/([\w-]+)\.js/.exec(html);
  if (!entry) broken.push(`${page}: no script`);
}
if (broken.length) { console.error("FAIL: broken references:\n  " + broken.join("\n  ")); process.exit(1); }
console.log(`PASS: ${pages.length} pages, ${checked} links and files, ${iconNames.size} icons all resolve (game and api excluded).`);
