// The report CSV is a clean table by default: row 1 is the column headings and every row after it is data.
// With the title block on, who/when/filters go above the table and an end line below it. Filters always go into the file name.
import { build } from "esbuild";
import assert from "node:assert/strict";

const out = await build({ entryPoints: ["src/ts/core/format.ts"], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "silent" });
const code = out.outputFiles[0].text;
const { downloadCsv, csvSheet } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));

// a stand-in for the browser's download link
let saved;
globalThis.document = { createElement: () => (saved = { click() {} }) };
URL.createObjectURL = (blob) => { saved.blob = blob; return "blob:test"; };
URL.revokeObjectURL = () => {};
const text = async () => (await saved.blob.text()).replace(/^\uFEFF/, "");

const report = { title: "Loans", file: "loans", by: "Desk (desk, staff)", header: ["Loan no.", "Book", "Fine (Php)"], rows: [[1, "A, B", "12.00"], [2, "=cmd", ""]], filters: [["From", "2026-10-01"], ["To", ""], ["Status", "Borrowed now"]] };
const at = "2026-10-29T06:30:00.000Z"; // 14:30 in Manila

downloadCsv(report, at);
assert.equal(await text(), ["Loan no.,Book,Fine (Php)", '1,"A, B",12.00', "2,'=cmd,"].join("\r\n"), "clean table: headings on row 1, data only");
assert.equal(saved.download, "cmu-library_loans_from-2026-10-01_status-borrowed-now_2026-10-29_1430.csv", "filters in the file name, empty ones left out");
assert.equal(csvSheet({ ...report, filters: [] }, at).name, "cmu-library_loans_2026-10-29_1430.csv");

downloadCsv({ ...report, titleBlock: true }, at);
const lines = (await text()).split("\r\n");
assert.equal(lines[0], "CMU Library Explorer,City of Malabon University Library");
assert.ok(lines.includes("Loan no.,Book,Fine (Php)"), "headings still present");
assert.equal(lines.at(-1), "End of report. 2 rows.");

console.log("PASS: report CSVs are a clean table by default, with the optional title block and filters in the file name.");
