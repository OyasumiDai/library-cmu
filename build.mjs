// Builds the website into dist/:
//   public/**          copied as they are (fonts, images, sprites, the game under /play)
//   src/pages/*.html   stamped into the shared layout (header, footer and navigation are written once)
//   src/ts/**          bundled by esbuild, one script per page
//   src/styles/**      bundled into a single stylesheet
//   config.js          written from SUPABASE_URL / SUPABASE_ANON_KEY when they are set (Vercel environment variables)
// Usage: node build.mjs            production build
//        node build.mjs --serve    build, watch and serve on http://localhost:5173
import { build, context } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const serve = process.argv.includes("--serve");
const version = Date.now().toString(36);
const vercelHeaders = fs.existsSync(path.join(root, "vercel.json")) ? JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).headers ?? [] : [];

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

// ------------------------------------------------------------------ html
const navGroups = JSON.parse(read(path.join(src, "data", "nav.json")));
const footerLinks = JSON.parse(read(path.join(src, "data", "footer.json")));
const themes = JSON.parse(read(path.join(src, "data", "themes.json")));
const partial = (name) => read(path.join(src, "partials", `${name}.html`));

const link = (item, current, group) => {
  const active = item.page === current && !item.tab ? " is-active" : "";
  const aria = active ? ' aria-current="page"' : "";
  const tab = (item.tab ? ` data-tab="${item.tab}"` : "") + (item.need ? ` data-need="${item.need}"` : "");
  const visible = item.visible ?? group.visible ?? "all";
  return `<a class="nav-link${active}" href="${item.href}" title="${item.label}" data-visible="${visible}"${tab}${aria}><svg class="icon" aria-hidden="true"><use href="/assets/icons/icons.svg#${item.icon}"/></svg><span>${item.label}</span></a>`;
};
// the app sidebar: groups of links, each group shown only to the people it is meant for; "fold" groups are dropdowns, open when they hold the current page
const foldGroup = (group, current, links) => {
  const open = group.items.some((item) => item.page === current && !item.tab) ? " open" : "";
  return `<details class="nav-group nav-group--fold" data-visible="${group.visible ?? "all"}"${open}><summary class="nav-group__toggle" title="${group.label}"><svg class="icon" aria-hidden="true"><use href="/assets/icons/icons.svg#${group.icon}"/></svg><span>${group.label}</span><svg class="icon nav-group__chevron" aria-hidden="true"><use href="/assets/icons/icons.svg#chevron-down"/></svg></summary><div class="nav-group__items" data-label="${group.label}">${links}</div></details>`;
};
// "pin" groups (the account links) sit at the bottom of the sidebar, below the part that scrolls, and have no heading
const renderNav = (current, pinned = false) => navGroups.filter((group) => !!group.pin === pinned).map((group) => {
  const links = group.items.map((item) => link(item, current, group)).join("");
  if (group.fold) return foldGroup(group, current, links);
  if (pinned) return `<div class="nav-group" data-visible="${group.visible ?? "all"}">${links}</div>`;
  return `<div class="nav-group" data-visible="${group.visible ?? "all"}"><span class="nav-group__label">${group.label}</span>${links}</div>`;
}).join("\n        ");
// phones: students get their library links and their profile as a tab bar along the bottom of the app
const renderTabbar = (current) => {
  const student = navGroups.find((group) => group.visible === "student");
  const profile = navGroups.find((group) => group.pin).items.find((item) => item.page === "profile");
  return [...student.items, profile].map((item) => {
    const on = item.page === current;
    return `<a class="tabbar__link${on ? " is-active" : ""}" href="${item.href}"${on ? ' aria-current="page"' : ""}><svg class="icon" aria-hidden="true"><use href="/assets/icons/icons.svg#${item.icon}"/></svg><span>${item.label}</span></a>`;
  }).join("");
};
const renderFooterLinks = () => footerLinks.map((l) => `<a href="${l.href}" data-visible="${l.visible ?? "all"}">${l.label}</a>`).join("\n        ");
// theme cards for the Settings page: a tiny preview painted by CSS, one per theme in themes.json
const renderThemeCards = () => themes.map((t) => `<button class="theme-card" type="button" data-theme-choice="${t.id}" aria-pressed="false"><span class="theme-card__preview" aria-hidden="true"><span class="theme-card__side"></span><span class="theme-card__body"><span class="theme-card__line"></span><span class="theme-card__line theme-card__line--accent"></span><span class="theme-card__line"></span></span></span><span class="theme-card__name">${t.label}</span><span class="text-soft">${t.note}</span></button>`).join("");

function renderPage(file) {
  const raw = read(file);
  const match = raw.match(/^<!--page\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!match) throw new Error(`${file} needs a <!--page {...} --> header`);
  const meta = JSON.parse(match[1]);
  const page = path.basename(file, ".html");
  const shell = meta.shell ?? "landing";
  const values = {
    title: meta.title, description: meta.description ?? "", entry: meta.entry ?? page, access: meta.access ?? "all",
    page, version, body: meta.body ?? "", content: raw.slice(match[0].length),
    header: shell === "landing" ? partial("header") : "", footer: shell === "landing" ? partial("footer") : "",
    nav: renderNav(page), navFoot: renderNav(page, true), tabbar: renderTabbar(page), footerLinks: renderFooterLinks(), themeCards: renderThemeCards(), authHero: partial("auth-hero"),
  };
  let html = partial(shell === "app" ? "layout-app" : shell === "auth" ? "layout-auth" : "layout");
  for (let pass = 0; pass < 3; pass++) {
    html = html.replace(/\{\{(\w+)\}\}/g, (all, key) => (key in values ? String(values[key]) : all));
  }
  // header and footer are inserted by the first pass and may contain placeholders of their own.
  // Every form posts, so if the page script has not loaded yet a submit can never put a password in the address bar.
  return html.replace(/<form(?![^>]*\smethod=)/g, '<form method="post"');
}

function buildHtml() {
  for (const file of fs.readdirSync(path.join(src, "pages"))) {
    if (file.endsWith(".html")) write(path.join(dist, file), renderPage(path.join(src, "pages", file)));
  }
}

function writeConfig() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? "";
  if (url && key) {
    write(path.join(dist, "config.js"), `window.LIBRARY_ONLINE = ${JSON.stringify({ supabase_url: url, anon_key: key })};\n`);
  }
}

// ------------------------------------------------------------------ scripts and styles
const pageEntries = fs.readdirSync(path.join(src, "ts", "pages")).filter((f) => f.endsWith(".ts")).map((f) => path.join(src, "ts", "pages", f));
const shared = { bundle: true, logLevel: "info", target: "es2022", external: ["/assets/*"], absWorkingDir: root };
const scriptOptions = { ...shared, entryPoints: pageEntries, outdir: path.join(dist, "assets", "js"), format: "esm", splitting: true, minify: !serve, sourcemap: serve ? "inline" : false, chunkNames: "chunks/[name]-[hash]" };
const styleOptions = { ...shared, entryPoints: { site: path.join(src, "styles", "site.css") }, outdir: path.join(dist, "assets", "css"), minify: !serve, sourcemap: serve ? "inline" : false };

function copyPublic() {
  fs.cpSync(path.join(root, "public"), dist, { recursive: true });
}

fs.rmSync(dist, { recursive: true, force: true });
copyPublic();
buildHtml();
writeConfig();

if (!serve) {
  await build(scriptOptions);
  await build(styleOptions);
  console.log(`Site built in ${path.relative(process.cwd(), dist) || "dist"}`);
} else {
  const scripts = await context(scriptOptions);
  const styles = await context(styleOptions);
  await scripts.watch();
  await styles.watch();
  let pending;
  const refresh = () => { clearTimeout(pending); pending = setTimeout(() => { try { buildHtml(); writeConfig(); } catch (e) { console.error(e.message); } }, 120); };
  fs.watch(src, { recursive: true }, (event, name) => { if (name && (name.endsWith(".html") || name.endsWith(".json"))) refresh(); });
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".otf": "font/otf", ".wasm": "application/wasm", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
  http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pathname.endsWith("/")) pathname += "index";
    let file = path.join(dist, pathname);
    let missing = false;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (fs.existsSync(`${file}.html`)) file = `${file}.html`;
      else { file = path.join(dist, "404.html"); missing = true; }
    }
    // the same security headers Vercel will send (vercel.json), so a blocked script or image shows up here first
    const extra = {};
    const origin = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";
    for (const rule of vercelHeaders) {
      if (!new RegExp(`^${rule.source}$`).test(pathname)) continue;
      for (const h of rule.headers) {
        if (/^(strict-transport-security|cache-control)$/i.test(h.key)) continue;
        extra[h.key] = /content-security-policy/i.test(h.key) && origin ? h.value.replace("connect-src 'self'", `connect-src 'self' ${origin} ${origin.replace(/^http/, "ws")}`).replace("img-src 'self'", `img-src 'self' ${origin}`) : h.value;
      }
    }
    res.writeHead(missing || !fs.existsSync(file) ? 404 : 200, { ...extra, "Content-Type": types[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(fs.existsSync(file) ? fs.readFileSync(file) : "Not found");
  }).listen(5173, () => console.log("Serving http://localhost:5173"));
}
