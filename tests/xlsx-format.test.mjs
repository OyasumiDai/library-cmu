// Report downloads are formatted Excel files: title band, headings on row 5 (frozen, with filters), real dates and pesos,
// tinted rows, a Total row with SUM formulas, and the filters in the file name.
// XLSX_SAMPLE=path node tests/xlsx-format.test.mjs also saves the sample workbook, to open in Excel by hand.
import { build } from "esbuild";
import assert from "node:assert/strict";
import fs from "node:fs";

const out = await build({ entryPoints: ["src/ts/core/sheet.ts"], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "silent" });
const { buildXlsx } = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));

// read the stored (uncompressed) zip back into its parts
const unzip = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = {};
  for (let at = 0; view.getUint32(at, true) === 0x04034b50;) {
    const size = view.getUint32(at + 18, true), nameLength = view.getUint16(at + 26, true);
    const name = Buffer.from(bytes.subarray(at + 30, at + 30 + nameLength)).toString();
    parts[name] = Buffer.from(bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size)).toString();
    at += 30 + nameLength + size;
  }
  return parts;
};

const report = {
  title: "Loans", file: "loans", by: "Desk Reyes (desk, staff)",
  header: ["Loan no.", "Book", "Student ID", "Status", "Due", "Days overdue", "Fine (Php)"],
  rows: [[13, "Blue Hour 2 & <Friends>", "2024-0001", "borrowed", "2026-10-30 17:00", 4, "40.00"], [12, "=HYPERLINK(\"x\")", "2024-0002", "returned", "2026-11-09 17:00", "", ""]],
  filters: [["From", "2026-10-01"], ["To", ""], ["Status", "Borrowed now"]],
  totals: ["Fine (Php)"],
  tone: (row) => (row[5] !== "" ? "danger" : ""),
};
const at = "2026-10-29T06:30:00.000Z"; // 14:30 in Manila
const { name, bytes } = buildXlsx(report, at);
if (process.env.XLSX_SAMPLE) fs.writeFileSync(process.env.XLSX_SAMPLE, bytes);

assert.equal(name, "cmu-library_loans_from-2026-10-01_status-borrowed-now_2026-10-29_1430.xlsx", "filters in the file name, empty ones left out");
const parts = unzip(bytes);
assert.deepEqual(Object.keys(parts).sort(), ["[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
const sheet = parts["xl/worksheets/sheet1.xml"];
assert.match(sheet, /<t xml:space="preserve">CMU Library {2}· {2}Loans<\/t>/, "title band");
assert.match(sheet, /<pane ySplit="5" topLeftCell="A6"[^>]*state="frozen"/, "headings stay in view");
assert.match(sheet, /<autoFilter ref="A5:G7"\/>/, "filter arrows on the headings");
assert.match(sheet, /<c r="E6" s="\d+"><v>46325\.70833333/, "dates are real Excel dates");
assert.match(sheet, /<c r="G6" s="\d+"><v>40<\/v>/, "pesos are numbers");
assert.match(sheet, /<c r="C6" s="\d+" t="inlineStr"><is><t xml:space="preserve">2024-0001</, "IDs stay text");
assert.match(sheet, /Blue Hour 2 &amp; &lt;Friends&gt;/, "text is escaped");
assert.match(sheet, /<t xml:space="preserve">=HYPERLINK\(&quot;x&quot;\)<\/t>/, "a typed formula stays plain text");
assert.match(sheet, /<c r="G8" s="\d+"><f>SUM\(G6:G7\)<\/f><v>40<\/v>/, "Total row adds up the fines");
const style = (ref) => Number(sheet.match(new RegExp(`<c r="${ref}" s="([0-9]+)"`))[1]);
assert.notEqual(style("B6"), style("B7"), "the overdue row is tinted");
assert.match(parts["xl/workbook.xml"], /_xlnm.Print_Titles[^<]*<\/definedName>/, "headings repeat on every printed page");

const empty = unzip(buildXlsx({ ...report, rows: [] }, at).bytes)["xl/worksheets/sheet1.xml"];
assert.match(empty, /No rows for these filters\./);
assert.doesNotMatch(empty, /autoFilter/);

console.log("PASS: report downloads are formatted Excel files with a title band, frozen filtered headings, real dates and pesos, tints and totals.");
