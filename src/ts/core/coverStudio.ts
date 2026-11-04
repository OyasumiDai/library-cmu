// Cover studio: staff take (or choose) a photo of a book cover and it comes out clean and the same shape for every book.
// Everything runs in the browser, so it is instant, free and the photo never leaves the phone until it is saved.
//   1. the page guesses where the cover is (background versus book), staff can drag the 4 corner dots to fix it
//   2. the cover is straightened into a fixed 3:4 picture (perspective fix)
//   3. light, contrast and colour are evened out
import { html, icon } from "./dom";
import { openModal } from "./modal";

export const COVER_W = 600;
export const COVER_H = 800;
const WORK_SIDE = 1600;

type Point = { x: number; y: number };

// ---------------------------------------------------------------- maths
// solves a x = b for a small square system (Gaussian elimination)
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    if (Math.abs(m[c][c]) < 1e-12) throw new Error("flat quad");
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

// homography that sends the rectangle (0,0)(w,0)(w,h)(0,h) onto the 4 picked corners (tl, tr, br, bl)
export function homography(corners: Point[], w: number, h: number): number[] {
  const dst = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const a: number[][] = [];
  const b: number[] = [];
  dst.forEach((d, i) => {
    const s = corners[i];
    a.push([d.x, d.y, 1, 0, 0, 0, -d.x * s.x, -d.y * s.x]); b.push(s.x);
    a.push([0, 0, 0, d.x, d.y, 1, -d.x * s.y, -d.y * s.y]); b.push(s.y);
  });
  return solve(a, b);
}

// cuts the quad out of the photo and straightens it to w x h (bilinear)
export function straighten(src: ImageData, corners: Point[], w = COVER_W, h = COVER_H): ImageData {
  const H = homography(corners, w, h);
  const out = new ImageData(w, h);
  const { data, width, height } = src;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = H[6] * x + H[7] * y + 1;
      const sx = (H[0] * x + H[1] * y + H[2]) / d;
      const sy = (H[3] * x + H[4] * y + H[5]) / d;
      const x0 = Math.max(0, Math.min(width - 2, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(height - 2, Math.floor(sy)));
      const fx = Math.max(0, Math.min(1, sx - x0)), fy = Math.max(0, Math.min(1, sy - y0));
      const i00 = (y0 * width + x0) * 4, i10 = i00 + 4, i01 = i00 + width * 4, i11 = i01 + 4;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        out.data[o + c] = (data[i00 + c] * (1 - fx) + data[i10 + c] * fx) * (1 - fy) + (data[i01 + c] * (1 - fx) + data[i11 + c] * fx) * fy;
      }
      out.data[o + 3] = 255;
    }
  }
  return out;
}

// evens out the light: stretches each colour so the dim photo uses the full range (1% to 99%), then a little contrast and colour
export function enhance(img: ImageData, strength = 1): ImageData {
  const { data } = img;
  const lows = [0, 0, 0], highs = [255, 255, 255];
  for (let c = 0; c < 3; c++) {
    const hist = new Uint32Array(256);
    for (let i = c; i < data.length; i += 4) hist[data[i]]++;
    const total = data.length / 4;
    let acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lows[c] = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { highs[c] = v; break; } }
    if (highs[c] - lows[c] < 40) { lows[c] = 0; highs[c] = 255; } // a nearly flat colour: leave it alone
  }
  const out = new ImageData(new Uint8ClampedArray(data), img.width, img.height);
  const o = out.data;
  for (let i = 0; i < o.length; i += 4) {
    let r = (data[i] - lows[0]) / (highs[0] - lows[0]), g = (data[i + 1] - lows[1]) / (highs[1] - lows[1]), b = (data[i + 2] - lows[2]) / (highs[2] - lows[2]);
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = 1 + 0.12 * strength;
    r = grey + (r - grey) * sat; g = grey + (g - grey) * sat; b = grey + (b - grey) * sat;
    // a gentle S-curve for contrast (smoothstep blended with the straight line)
    const curve = (v: number) => { const x = Math.max(0, Math.min(1, v)); return x + strength * 0.3 * (x * x * (3 - 2 * x) - x); };
    o[i] = curve(r) * 255; o[i + 1] = curve(g) * 255; o[i + 2] = curve(b) * 255;
  }
  return out;
}

// where is the book? compares every pixel with the colour of the photo's edges (the table or wall), keeps what differs
export function guessCorners(img: ImageData): Point[] {
  const { width: w, height: h, data } = img;
  const step = Math.max(1, Math.round(w / 160));
  const px = (x: number, y: number) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const border: number[][] = [];
  for (let x = 0; x < w; x += step) { border.push(px(x, 0), px(x, h - 1)); }
  for (let y = 0; y < h; y += step) { border.push(px(0, y), px(w - 1, y)); }
  const med = (k: number) => border.map((p) => p[k]).sort((a, b) => a - b)[border.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const xs: number[] = [], ys: number[] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const p = px(x, y);
    if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) { xs.push(x); ys.push(y); }
  }
  const cells = Math.ceil(w / step) * Math.ceil(h / step);
  const inset = (): Point[] => [{ x: w * 0.1, y: h * 0.08 }, { x: w * 0.9, y: h * 0.08 }, { x: w * 0.9, y: h * 0.92 }, { x: w * 0.1, y: h * 0.92 }];
  if (xs.length < cells * 0.08 || xs.length > cells * 0.93) return inset();
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const q = (list: number[], f: number) => list[Math.min(list.length - 1, Math.max(0, Math.floor(list.length * f)))];
  const left = q(xs, 0.01), right = q(xs, 0.99), top = q(ys, 0.01), bottom = q(ys, 0.99);
  if (right - left < w * 0.2 || bottom - top < h * 0.2) return inset();
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
}

// ---------------------------------------------------------------- the pop-up
const toCanvas = (img: ImageData): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
};
const toBlob = (c: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.86));

// Resolves with the cleaned cover (a webp File), the photo only made smaller when staff choose "Use my photo as it is", or null when they cancel.
export async function openCoverStudio(file: File): Promise<File | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That file is not a readable picture.");
  const scale = Math.min(1, WORK_SIDE / Math.max(bitmap.width, bitmap.height));
  const work = document.createElement("canvas");
  work.width = Math.round(bitmap.width * scale); work.height = Math.round(bitmap.height * scale);
  const wctx = work.getContext("2d", { willReadFrequently: true })!;
  wctx.drawImage(bitmap, 0, 0, work.width, work.height);
  bitmap.close();
  const source = wctx.getImageData(0, 0, work.width, work.height);

  let corners = guessCorners(source);
  let cleaned: HTMLCanvasElement | null = null;
  let showOriginal = false;

  return new Promise((resolve) => {
    let settled = false;
    const done = (value: File | null) => { if (!settled) { settled = true; resolve(value); } };
    const modal = openModal("Clean up the cover", html`
      <p class="table__sub">Drag the 4 dots to the corners of the book cover. The preview on the right updates by itself.</p>
      <div class="cover-studio">
        <div class="cover-studio__pane"><canvas class="cover-studio__photo" id="csPhoto" aria-label="Your photo with 4 corner dots"></canvas></div>
        <div class="cover-studio__pane cover-studio__pane--result">
          <canvas class="cover-studio__result" id="csResult" width="${COVER_W}" height="${COVER_H}" aria-label="The cleaned cover"></canvas>
          <button class="btn btn--sm btn--quiet" type="button" id="csCompare">${icon("image")} Hold to see the plain version</button>
        </div>
      </div>`, {
      wide: true,
      footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn btn--secondary" type="button" id="csOriginal">Use my photo as it is</button><button class="btn" type="button" id="csUse">Use this cover</button>`,
    });
    const $ = <T extends HTMLElement>(sel: string) => modal.root.querySelector<T>(sel)!;
    const photo = $<HTMLCanvasElement>("#csPhoto");
    const result = $<HTMLCanvasElement>("#csResult");
    const view = { w: 0, h: 0, k: 1 };

    const layout = () => {
      const room = Math.max(220, Math.min(photo.parentElement!.clientWidth || 360, 520));
      view.k = Math.min(room / work.width, 460 / work.height);
      view.w = Math.round(work.width * view.k); view.h = Math.round(work.height * view.k);
      photo.width = view.w; photo.height = view.h;
    };
    const drawPhoto = () => {
      const ctx = photo.getContext("2d")!;
      ctx.clearRect(0, 0, view.w, view.h);
      ctx.drawImage(work, 0, 0, view.w, view.h);
      ctx.lineWidth = 2; ctx.strokeStyle = "#ffd23f"; ctx.fillStyle = "rgba(255,210,63,.18)";
      ctx.beginPath();
      corners.forEach((p, i) => (i ? ctx.lineTo(p.x * view.k, p.y * view.k) : ctx.moveTo(p.x * view.k, p.y * view.k)));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const p of corners) {
        ctx.beginPath(); ctx.arc(p.x * view.k, p.y * view.k, 11, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.stroke();
      }
    };
    const drawResult = () => {
      try {
        const flat = straighten(source, corners);
        cleaned = toCanvas(enhance(flat));
        const plain = toCanvas(flat);
        result.getContext("2d")!.drawImage(showOriginal ? plain : cleaned, 0, 0);
      } catch { /* the 4 dots were dragged into a line: keep the last good picture */ }
    };
    const redraw = () => { drawPhoto(); drawResult(); };
    layout(); redraw();

    let drag = -1;
    const at = (event: PointerEvent): Point => {
      const box = photo.getBoundingClientRect();
      return { x: ((event.clientX - box.left) / box.width) * work.width, y: ((event.clientY - box.top) / box.height) * work.height };
    };
    photo.style.touchAction = "none";
    photo.addEventListener("pointerdown", (event) => {
      const p = at(event);
      const reach = (28 / view.k) * (photo.getBoundingClientRect().width ? view.w / photo.getBoundingClientRect().width : 1);
      let best = -1, bestD = reach;
      corners.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bestD) { best = i; bestD = d; } });
      if (best >= 0) { drag = best; photo.setPointerCapture(event.pointerId); event.preventDefault(); }
    });
    photo.addEventListener("pointermove", (event) => {
      if (drag < 0) return;
      const p = at(event);
      corners[drag] = { x: Math.max(0, Math.min(work.width, p.x)), y: Math.max(0, Math.min(work.height, p.y)) };
      redraw();
    });
    const release = () => { drag = -1; };
    photo.addEventListener("pointerup", release);
    photo.addEventListener("pointercancel", release);

    const compare = $("#csCompare");
    const hold = (on: boolean) => { showOriginal = on; drawResult(); };
    compare.addEventListener("pointerdown", () => hold(true));
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) compare.addEventListener(ev, () => hold(false));

    $("#csOriginal").addEventListener("click", async () => {
      done(new File([await toBlob(work)], `cover-${Date.now()}.webp`, { type: "image/webp" }));
      modal.close();
    });
    $("#csUse").addEventListener("click", async () => {
      if (!cleaned) return;
      const blob = await toBlob(cleaned);
      done(new File([blob], `cover-${Date.now()}.webp`, { type: "image/webp" }));
      modal.close();
    });
    new MutationObserver((_, observer) => { if (!modal.root.isConnected) { observer.disconnect(); done(null); } }).observe(document.body, { childList: true });
  });
}
