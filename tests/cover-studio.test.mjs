// The cover studio maths: finding the book, straightening it to 3:4, evening out the light.
import assert from "node:assert/strict";
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

globalThis.ImageData = class { constructor(a, b, c) { if (typeof a === "number") { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); } else { this.data = a; this.width = b; this.height = c; } } };
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cover-")), "studio.mjs");
await build({ entryPoints: ["src/ts/core/coverStudio.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
const { guessCorners, straighten, enhance, homography, COVER_W, COVER_H } = await import(pathToFileURL(out).href);

// a 400x500 photo: grey table, a red book from (100,80) to (300,380)
const W = 400, H = 500, photo = new ImageData(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4, book = x >= 100 && x < 300 && y >= 80 && y < 380;
  photo.data.set(book ? [200, 30, 30, 255] : [120, 120, 120, 255], i);
}

const corners = guessCorners(photo);
const near = (p, x, y) => Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12;
assert.ok(near(corners[0], 100, 80) && near(corners[1], 300, 80) && near(corners[2], 300, 380) && near(corners[3], 100, 380), "finds the book against the table");

// a photo with no clear book falls back to a safe frame inside the photo
const flat = new ImageData(W, H); flat.data.fill(128);
const fallback = guessCorners(flat);
assert.ok(fallback.every((p) => p.x > 0 && p.x < W && p.y > 0 && p.y < H));

// straightening gives a 600x800 picture and the book fills it
const cover = straighten(photo, corners);
assert.equal(cover.width, COVER_W); assert.equal(cover.height, COVER_H);
const mid = ((COVER_H >> 1) * COVER_W + (COVER_W >> 1)) * 4;
assert.deepEqual([...cover.data.slice(mid, mid + 3)], [200, 30, 30]);
const edge = (5 * COVER_W + 5) * 4;
assert.ok(cover.data[edge] > 150 && cover.data[edge + 1] < 80, "no table left at the edges");

// a tilted quad still maps its corners to the corners of the result
const tilt = [{ x: 120, y: 60 }, { x: 320, y: 100 }, { x: 300, y: 400 }, { x: 90, y: 380 }];
const H3 = homography(tilt, 600, 800);
const map = (x, y) => { const d = H3[6] * x + H3[7] * y + 1; return [(H3[0] * x + H3[1] * y + H3[2]) / d, (H3[3] * x + H3[4] * y + H3[5]) / d]; };
assert.ok(Math.abs(map(600, 0)[0] - 320) < 0.01 && Math.abs(map(0, 800)[1] - 380) < 0.01);

// a dull photo gets its light stretched
const dull = new ImageData(50, 50);
for (let i = 0; i < dull.data.length; i += 4) dull.data.set([90 + (i % 7) * 10, 90, 90, 255], i);
dull.data[0] = 60; dull.data[4] = 140;
const bright = enhance(dull);
const range = (d, c) => { let lo = 255, hi = 0; for (let i = c; i < d.length; i += 4) { lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]); } return hi - lo; };
assert.ok(range(bright.data, 0) > range(dull.data, 0), "contrast widens");
console.log("PASS: cover studio finds, straightens and brightens a cover photo.");
