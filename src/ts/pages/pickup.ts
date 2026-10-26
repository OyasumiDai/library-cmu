// The staff desk: scan a student's QR code (camera or typed code) to hand over or take back their books.
// A student has ONE QR code however many books they borrowed: one scan lists every book that is reserved or on loan.
// Confirming marks them all as borrowed, notifies the student and sends ONE "pickup confirmed" email.
import { checkoutMany, giveBackMany, lookupPickup, type PickupInfo } from "../api/loans";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { dueLabel, formatDate, formatDateTime, relative } from "../core/format";
import { fail, ok } from "../core/toast";
import { beep, extractCode, startScanner, type Scanner } from "../ui/scanner";
import { cover, empty, statusBadge } from "../ui/components";

const AUTO = "cmu-scan-auto";
const recent: { title: string; username: string; what: string; at: string }[] = [];

function remember(rows: PickupInfo[], what: string): void {
  recent.unshift({ title: rows.length > 1 ? `${rows.length} books` : rows[0].title, username: rows[0].username, what, at: new Date().toISOString() });
  recent.length = Math.min(recent.length, 6);
  qs("#recentCard").hidden = false;
  mount(qs("#recentScans"), html`${recent.map((r) => html`<li class="list__item"><div class="list__body"><p class="list__title">${r.title}</p><p class="list__meta">${r.username} · ${r.what} · ${relative(r.at)}</p></div></li>`)}`);
}

const open = (rows: PickupInfo[], status: string) => rows.filter((r) => r.status === status);

function card(rows: PickupInfo[], banner = "") {
  const who = rows[0];
  const waiting = open(rows, "requested");
  const out = open(rows, "borrowed");
  const tone = waiting.length ? "is-ready" : out.length ? "is-out" : "is-closed";
  return html`
    <article class="card px scan-result ${tone}">
      ${banner ? html`<div class="alert alert--success px px--success" role="status">${icon("check")}<span>${banner}</span></div>` : ""}
      <div>
        <h2>${who.full_name || who.username}</h2>
        <p class="text-soft">${who.username}${who.student_id ? ` · ID ${who.student_id}` : ""} · Code <span class="mono">${who.pickup_code}</span></p>
      </div>
      <ul class="list">${rows.map((r) => html`<li class="list__item">
        <div class="scan-result__cover">${cover({ id: String(r.id), title: r.title, cover_url: r.cover_url })}</div>
        <div class="list__body"><p class="list__title">${r.title}</p><p class="list__meta">${r.author} · Shelf ${r.shelf}</p>
          ${r.due_at ? html`<p class="list__meta">Due ${formatDate(r.due_at)} <span class="badge badge--${dueLabel(r.due_at).tone}">${dueLabel(r.due_at).text.replace(/^Due [A-Z][a-z]{2} \d+, \d{4}$/, "On loan")}</span></p>` : html`<p class="list__meta">Requested ${formatDateTime(r.requested_at)}</p>`}</div>
        ${statusBadge(r.status)}</li>`)}</ul>
      <div class="cluster">
        ${waiting.length ? html`<button class="btn btn--lg" type="button" data-action="confirm">${icon("check")} Confirm pickup${waiting.length > 1 ? ` (${waiting.length} books)` : ""}</button>` : ""}
        ${out.length ? html`<button class="btn btn--lg btn--secondary" type="button" data-action="return">${icon("download")} Record return${out.length > 1 ? ` (${out.length} books)` : ""}</button>` : ""}
        ${!waiting.length && !out.length ? html`<p class="text-soft">Nothing to do: this student has no reserved or borrowed books.</p>` : ""}
        <button class="btn btn--quiet" type="button" data-action="clear">Scan another</button>
      </div>
    </article>`;
}

boot(({ params }) => {
  const video = qs<HTMLVideoElement>("#scanVideo");
  const toggle = qs<HTMLButtonElement>("#scanToggle");
  const auto = qs<HTMLInputElement>("#autoConfirm");
  const form = qs<HTMLFormElement>("#codeForm");
  const result = qs("#scanResult");
  let scanner: Scanner | null = null;
  let lastCode = "";
  let lastAt = 0;
  let working = false;

  try { auto.checked = localStorage.getItem(AUTO) === "1"; } catch { /* private mode */ }
  auto.addEventListener("change", () => { try { localStorage.setItem(AUTO, auto.checked ? "1" : "0"); } catch { /* ignore */ } });

  const waitingView = () => mount(result, empty("Waiting for a scan", "Point the camera at the QR code, or type the code on the right.", "qr"));
  waitingView();

  const show = (rows: PickupInfo[], banner = "") => mount(result, card(rows, banner));

  const confirm = async (rows: PickupInfo[]): Promise<void> => {
    const ids = open(rows, "requested").map((r) => r.id);
    try {
      await checkoutMany(ids);
      const fresh = await lookupPickup(rows[0].pickup_code);
      ok(ids.length > 1 ? `Handed over ${ids.length} books` : `Handed over: ${rows[0].title}`);
      beep(true);
      remember(open(rows, "requested"), "picked up");
      show(fresh.length ? fresh : rows, `Pickup confirmed. ${rows[0].username} was notified and emailed once for ${ids.length > 1 ? "all the books" : "the book"}.`);
    } catch (error) {
      beep(false);
      fail(friendly(error));
    }
  };

  const handle = async (text: string): Promise<void> => {
    const code = extractCode(text);
    if (!code) { beep(false); return fail("That is not a library QR code."); }
    if (working || (code === lastCode && Date.now() - lastAt < 4000)) return;
    working = true; lastCode = code; lastAt = Date.now();
    try {
      const rows = await lookupPickup(code);
      if (!rows.length) { beep(false); mount(result, empty("Code not found", `Nothing matches ${code}. Check the code and try again.`, "cross")); return; }
      if (open(rows, "requested").length && auto.checked) { await confirm(rows); return; }
      beep(true);
      show(rows);
    } catch (error) {
      fail(friendly(error));
    } finally {
      working = false;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handle(qs<HTMLInputElement>("#f-code").value);
  });

  const stop = () => {
    scanner?.stop();
    scanner = null;
    qs("#scanner").classList.remove("is-live");
    toggle.innerHTML = html`${icon("camera")} Start camera`.value;
  };
  toggle.addEventListener("click", async () => {
    if (scanner) return stop();
    try {
      scanner = await startScanner(video, (text) => void handle(text));
      qs("#scanner").classList.add("is-live");
      toggle.innerHTML = html`${icon("cross")} Stop camera`.value;
    } catch (error) {
      fail((error as Error).name === "NotAllowedError" ? "Allow the camera in your browser to scan, or type the code." : (error as Error).message || "The camera could not start.");
    }
  });
  window.addEventListener("pagehide", stop);

  actions(qs("[data-page-root]"), {
    confirm: async () => {
      const rows = await lookupPickup(lastCode).catch(() => []);
      if (open(rows, "requested").length) await confirm(rows);
    },
    return: async () => {
      const rows = await lookupPickup(lastCode).catch(() => []);
      const ids = open(rows, "borrowed").map((r) => r.id);
      if (!ids.length) return;
      try {
        await giveBackMany(ids);
        beep(true);
        remember(open(rows, "borrowed"), "returned");
        const fresh = await lookupPickup(rows[0].pickup_code);
        show(fresh.length ? fresh : rows, `Return recorded. ${rows[0].username} was notified and emailed once.`);
      } catch (error) { fail(friendly(error)); }
    },
    clear: () => { lastCode = ""; waitingView(); },
  });

  // a phone camera opens /pickup?c=CODE straight from the QR code
  const fromLink = params.get("c");
  if (fromLink) { qs<HTMLInputElement>("#f-code").value = fromLink; void handle(fromLink); }
});
