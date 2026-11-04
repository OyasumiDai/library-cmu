// The assistant's table commands: only the allowed ones are read, and they are removed from the visible reply.
import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "views-")), "views.mjs");
await build({ entryPoints: ["src/ts/core/assistantViews.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", define: { "import.meta.env": "{}" } });
const { extractViews } = await import(pathToFileURL(out).href);

const a = extractViews("3 books are overdue. Opening the table.\n\n[[view:overdue]]");
assert.equal(a.text, "3 books are overdue. Opening the table.");
assert.deepEqual(a.views, [{ name: "overdue", query: "" }]);

const b = extractViews("Here you go [[view:find: Ann <script>alert(1)</script> ]]");
assert.equal(b.views[0].name, "find");
assert.ok(!/[<>()]/.test(b.views[0].query), "search text is cleaned");
assert.ok(!b.text.includes("[["));

assert.deepEqual(extractViews("[[view:delete_everything]] [[view:../../x]]").views, [], "unknown commands are ignored");
assert.equal(extractViews("[[view:overdue]] [[view:overdue]] [[view:requests]] [[view:on_loan]]").views.length, 2, "at most two, no repeats");
assert.equal(extractViews("[[VIEW:my_loans]]").views[0].name, "my_loans");
console.log("PASS: assistant view commands are allow-listed, cleaned and hidden from the reply.");
