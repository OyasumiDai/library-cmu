// Editing the About the game page: the "Inside the game" cards and the "Controls" (Edit Game permission).
// Pictures upload as soon as they are chosen; Save writes everything to the game_page setting.
import { saveSetting, uploadPicture } from "../api/staff";
import { actions, html, icon, mount, raw, type Safe } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox } from "../core/modal";
import { fail, ok } from "../core/toast";
import { DEFAULT_GAME_PAGE, controlsHtml, featuresHtml, readGamePage, type GamePage } from "../ui/gamePage";

const MAX_FEATURES = 12;
const MAX_KEYS = 16;

// game pictures go in their own folder; if the storage rules only allow the covers folder, they go there instead
async function upload(file: File): Promise<string> {
  try { return await uploadPicture("game", file); } catch (error) {
    if (/row-level security|not authorized|unauthorized|policy/i.test((error as Error).message ?? "")) return uploadPicture("covers", file);
    throw error;
  }
}

export function mountGamePageEditor(root: HTMLElement, saved: unknown, canEdit: boolean): void {
  let page: GamePage = structuredClone(readGamePage(saved));
  let dirty = false;
  const off = canEdit ? "" : raw("disabled");

  // a picture slot: preview, choose / remove; the path says which picture ("features.2", "controls", "phone")
  const pictureSlot = (path: string, src: string | null, optional = false): Safe => html`
    <div class="gp-pic">
      <div class="shot__frame shot__frame--art">${src ? html`<img src="${src}" alt="">` : html`<div class="shot__ph">${icon("image", "icon--lg")}<span>${optional ? "No picture (optional)" : "No picture yet"}</span></div>`}</div>
      ${canEdit ? html`<div class="cluster">
        <label class="btn btn--sm btn--secondary">${icon("upload")} ${src ? "Change" : "Add"} picture<input class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" data-pic="${path}"></label>
        ${src ? html`<button class="btn btn--sm btn--quiet" type="button" data-action="drop-pic" data-path="${path}">Remove</button>` : ""}</div>` : ""}
    </div>`;

  const draw = () => {
    mount(root, html`
      <div class="panel__heading"><div><h3>Game page</h3><p class="text-soft">The "Inside the game" cards and the "Controls" on the <a href="/game" target="_blank" rel="noopener">About the game</a> page. Pictures: JPG, PNG or WEBP up to 3 MB, wide (3:2) looks best.</p></div>
        ${canEdit ? html`<div class="cluster"><button class="btn btn--quiet" type="button" data-action="reset">${icon("refresh")} Original text</button><button class="btn" type="button" data-action="save">${icon("check")} Save game page</button></div>` : ""}</div>
      ${canEdit ? "" : html`<p class="field__hint">You need the Edit Game permission to change this.</p>`}

      <h4 class="gp-head">Inside the game <span class="text-soft">(${page.features.length} cards)</span></h4>
      <div class="gp-cards">${page.features.map((f, i) => html`
        <article class="gp-card card px px--soft">
          ${pictureSlot(`features.${i}`, f.image)}
          <div class="field"><label class="field__label" for="gp-ft-${i}">Title</label><input class="input" id="gp-ft-${i}" maxlength="60" value="${f.title}" data-path="features.${i}.title" ${off}></div>
          <div class="field"><label class="field__label" for="gp-fx-${i}">Text</label><textarea class="textarea" id="gp-fx-${i}" rows="3" maxlength="300" data-path="features.${i}.text" ${off}>${f.text}</textarea></div>
          ${canEdit ? html`<div class="cluster gp-card__tools">
            <button class="btn btn--sm btn--quiet" type="button" data-action="move" data-i="${i}" data-by="-1" ${i === 0 ? raw("disabled") : ""} aria-label="Move earlier">${icon("chevron-left")}</button>
            <button class="btn btn--sm btn--quiet" type="button" data-action="move" data-i="${i}" data-by="1" ${i === page.features.length - 1 ? raw("disabled") : ""} aria-label="Move later">${icon("chevron-right")}</button>
            <button class="btn btn--sm btn--danger" type="button" data-action="drop-card" data-i="${i}" aria-label="Remove this card">${icon("trash")}</button></div>` : ""}
        </article>`)}
        ${canEdit && page.features.length < MAX_FEATURES ? html`<button class="gp-add card" type="button" data-action="add-card">${icon("plus", "icon--lg")}<span>Add a card</span></button>` : ""}
      </div>

      <h4 class="gp-head">Controls</h4>
      <div class="grid grid--2">
        <section class="card px px--soft gp-controls">
          <div class="field"><label class="field__label" for="gp-ct">Heading</label><input class="input" id="gp-ct" maxlength="40" value="${page.controls.title}" data-path="controls.title" ${off}></div>
          ${pictureSlot("controls", page.controls.image, true)}
          <div class="gp-keys">${page.controls.keys.map((k, i) => html`<div class="gp-key">
            <input class="input" aria-label="Keys" placeholder="W A S D, or T or Enter" maxlength="30" value="${k.keys}" data-path="controls.keys.${i}.keys" ${off}>
            <input class="input" aria-label="What it does" placeholder="What it does" maxlength="60" value="${k.action}" data-path="controls.keys.${i}.action" ${off}>
            ${canEdit ? html`<button class="btn btn--sm btn--quiet" type="button" data-action="drop-key" data-i="${i}" aria-label="Remove this control">${icon("cross")}</button>` : ""}</div>`)}</div>
          ${canEdit && page.controls.keys.length < MAX_KEYS ? html`<button class="btn btn--sm btn--secondary" type="button" data-action="add-key">${icon("plus")} Add a control</button>` : ""}
          <p class="field__hint">Keys are separated by spaces; "or" between alternatives. Key names (W, Shift, Space, Enter, Esc...) are drawn as keyboard keys.</p>
        </section>
        <section class="card px px--soft gp-controls">
          <div class="field"><label class="field__label" for="gp-pt">Heading</label><input class="input" id="gp-pt" maxlength="40" value="${page.phone.title}" data-path="phone.title" ${off}></div>
          ${pictureSlot("phone", page.phone.image)}
          <div class="field"><label class="field__label" for="gp-px">Text</label><textarea class="textarea" id="gp-px" rows="3" maxlength="300" data-path="phone.text" ${off}>${page.phone.text}</textarea></div>
        </section>
      </div>

      <h4 class="gp-head">Preview</h4>
      <div class="gp-preview" id="gpPreview"></div>`);
    preview();
  };

  // what visitors will see, updated as you type
  const preview = () => {
    const box = root.querySelector<HTMLElement>("#gpPreview");
    if (box) mount(box, html`<div class="feature-grid">${featuresHtml(page)}</div><div class="controls-grid">${controlsHtml(page)}</div>`);
    box?.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
  };

  // "features.2.title" -> page.features[2].title
  const setPath = (path: string, value: unknown) => {
    const keys = path.split(".");
    let target: Record<string, unknown> = page as unknown as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) target = target[k] as Record<string, unknown>;
    target[keys[keys.length - 1]] = value;
    dirty = true;
  };
  const pictureOf = (path: string): { image: string | null } => (path === "controls" ? page.controls : path === "phone" ? page.phone : page.features[Number(path.split(".")[1])]);

  root.addEventListener("input", (event) => {
    const el = event.target as HTMLInputElement;
    if (!el.dataset.path) return;
    setPath(el.dataset.path, el.value);
    preview();
  });
  root.addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement;
    const path = input.dataset.pic;
    const file = input.files?.[0];
    if (!path || !file) return;
    const label = input.closest("label");
    label?.classList.add("is-busy");
    try {
      pictureOf(path).image = await upload(file);
      dirty = true;
      ok("Picture added. Press Save game page to publish it.");
      draw();
    } catch (error) { fail(friendly(error)); label?.classList.remove("is-busy"); }
  });

  actions(root, {
    "add-card": () => { page.features.push({ title: "New card", text: "", image: null }); dirty = true; draw(); root.querySelector<HTMLInputElement>(`#gp-ft-${page.features.length - 1}`)?.select(); },
    "drop-card": async (el) => {
      const i = Number(el.dataset.i);
      if (!(await confirmBox("Remove this card?", `"${page.features[i].title || "Untitled"}" will be taken off the page when you save.`, "Remove", true))) return;
      page.features.splice(i, 1); dirty = true; draw();
    },
    move: (el) => {
      const i = Number(el.dataset.i), j = i + Number(el.dataset.by);
      if (j < 0 || j >= page.features.length) return;
      [page.features[i], page.features[j]] = [page.features[j], page.features[i]]; dirty = true; draw();
    },
    "add-key": () => { page.controls.keys.push({ keys: "", action: "" }); dirty = true; draw(); root.querySelectorAll<HTMLInputElement>(".gp-key input")[page.controls.keys.length * 2 - 2]?.focus(); },
    "drop-key": (el) => { page.controls.keys.splice(Number(el.dataset.i), 1); dirty = true; draw(); },
    "drop-pic": (el) => { pictureOf(el.dataset.path ?? "").image = null; dirty = true; draw(); },
    reset: async () => {
      if (!(await confirmBox("Go back to the original text?", "The cards and controls return to the text the site came with, without your pictures. Nothing changes on the page until you save.", "Use the original"))) return;
      page = structuredClone(DEFAULT_GAME_PAGE); dirty = true; draw();
    },
    save: async (el) => {
      const clean: GamePage = {
        features: page.features.map((f) => ({ title: f.title.trim(), text: f.text.trim(), image: f.image })).filter((f) => f.title || f.text || f.image),
        controls: { title: page.controls.title.trim() || "On a computer", image: page.controls.image, keys: page.controls.keys.map((k) => ({ keys: k.keys.trim(), action: k.action.trim() })).filter((k) => k.keys || k.action) },
        phone: { title: page.phone.title.trim() || "On a phone", text: page.phone.text.trim(), image: page.phone.image },
      };
      if (!clean.features.length) return fail("Keep at least one card in Inside the game.");
      if (clean.features.some((f) => !f.title)) return fail("Every card needs a title.");
      (el as HTMLButtonElement).disabled = true;
      try {
        await saveSetting("game_page", clean);
        page = clean; dirty = false; draw();
        ok("Game page saved. It is live on the About the game page.");
      } catch (error) { fail(friendly(error)); (el as HTMLButtonElement).disabled = false; }
    },
  });
  window.addEventListener("beforeunload", (event) => { if (dirty && root.isConnected) event.preventDefault(); });
  draw();
}
