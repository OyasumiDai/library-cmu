// Fails when a page or script uses a class name that no stylesheet defines (a forgotten detail),
// or when the stylesheet uses a CSS variable that no theme/token defines.
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("src");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(src);
const css = files.filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const code = files.filter((f) => /\.(html|ts)$/.test(f));

// classes defined: .name in any selector
const defined = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));

// classes used: class="a b" in html/templates and classList.add/toggle('x'), className = "x"
const used = new Map();
const note = (name, file) => { if (/^[A-Za-z][\w-]*$/.test(name)) used.set(name, file); };
for (const file of code) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g)) for (const n of m[1].split(/\s+/)) note(n, file);
  for (const m of text.matchAll(/classList\.(?:add|toggle|remove)\(\s*["']([\w-]+)["']/g)) note(m[1], file);
  for (const m of text.matchAll(/class="[^"]*?([\w-]+)--\$\{/g)) { /* dynamic modifier: checked below */ }
}
// classes toggled only by script or standing for hooks, not styles
const allowed = new Set(["is-ready", "no-js", "has-modal", "reduce-motion", "theme-fade"]);
const missing = [...used].filter(([name]) => !defined.has(name) && !allowed.has(name));

// dynamic modifiers the code builds: badge--${tone}, alert--${tone}, px--${tone}, toast--${tone}, assistant__msg--${role}
const dynamic = ["badge--success", "badge--danger", "badge--warning", "badge--info", "alert--success", "alert--danger", "alert--warning", "alert--info", "px--success", "px--danger", "px--warning", "px--info", "toast--success", "toast--error", "toast--info", "assistant__msg--user", "assistant__msg--assistant"];
for (const name of dynamic) if (!defined.has(name)) missing.push([name, "dynamic modifier"]);

// variables used but never defined
const varsDefined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const varsUsed = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
const localVars = new Set(["--h", "--ring", "--w", "--c", "--i", "--x", "--y", "--d", "--c", "--a", "--w", "--speed", "--delay", "--value", "--cols", "--min", "--hue", "--sat", "--lum", "--size", "--px-fill"]);
const undefinedVars = [...varsUsed].filter((v) => !varsDefined.has(v) && !localVars.has(v));

let failed = false;
if (missing.length) { failed = true; console.error("FAIL: classes used but not styled:\n" + missing.map(([n, f]) => `  .${n}  (${path.relative(src, f)})`).join("\n")); }
if (undefinedVars.length) { failed = true; console.error("FAIL: CSS variables used but never defined: " + undefinedVars.join(", ")); }
if (failed) process.exit(1);
console.log(`PASS: ${used.size} classes used by pages and scripts are all styled; every CSS variable is defined.`);
