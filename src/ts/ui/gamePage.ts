// The editable parts of the About the game page: the "Inside the game" cards and the "Controls" section.
// Staff edit them in the panel (Game manage > Game page); they are kept in the game_page setting.
// Until someone edits them, the page shows the defaults in src/data/game-page.json.
import defaults from "../../data/game-page.json";
import { html, type Safe } from "../core/dom";

export interface GameFeature { title: string; text: string; image: string | null }
export interface GameKey { keys: string; action: string }
export interface GamePage {
  features: GameFeature[];
  controls: { title: string; image: string | null; keys: GameKey[] };
  phone: { title: string; text: string; image: string | null };
}

export const DEFAULT_GAME_PAGE = defaults as GamePage;
const FRAME = "/assets/game/frame.webp";

// the saved setting, filled in with the defaults wherever something is missing or malformed
export function readGamePage(value: unknown): GamePage {
  const v = (value && typeof value === "object" ? value : {}) as Partial<GamePage>;
  const text = (x: unknown, fallback: string) => (typeof x === "string" ? x : fallback);
  const image = (x: unknown) => (typeof x === "string" && /^(https:\/\/|\/)/.test(x) ? x : null);
  return {
    features: Array.isArray(v.features) ? v.features.map((f) => ({ title: text(f?.title, ""), text: text(f?.text, ""), image: image(f?.image) })) : DEFAULT_GAME_PAGE.features,
    controls: {
      title: text(v.controls?.title, DEFAULT_GAME_PAGE.controls.title),
      image: image(v.controls?.image),
      keys: Array.isArray(v.controls?.keys) ? v.controls!.keys.map((k) => ({ keys: text(k?.keys, ""), action: text(k?.action, "") })) : DEFAULT_GAME_PAGE.controls.keys,
    },
    phone: { title: text(v.phone?.title, DEFAULT_GAME_PAGE.phone.title), text: text(v.phone?.text, DEFAULT_GAME_PAGE.phone.text), image: image(v.phone?.image) },
  };
}

const picture = (src: string | null, alt: string) =>
  html`<div class="shot__frame shot__frame--art"><img src="${src ?? FRAME}" width="1500" height="1000" alt="${src ? alt : ""}" loading="lazy" decoding="async"></div>`;

// "T or Enter" -> <kbd>T</kbd> or <kbd>Enter</kbd>; "W A S D" -> four keys; a word like "Mouse" stays plain text
const KEY_NAMES = /^([a-z0-9]|shift|space|enter|tab|esc|ctrl|alt|backspace|delete|up|down|left|right|f\d{1,2}|[←→↑↓])$/i;
export function keyCaps(keys: string): Safe {
  const parts = keys.split(/\s+or\s+/i).map((part) => part.trim()).filter(Boolean);
  return html`${parts.map((part, i) => html`${i ? " or " : ""}${part.split(/\s+/).map((k, j) => (KEY_NAMES.test(k) ? html`<kbd>${k}</kbd>` : html`${j ? " " : ""}${k}`))}`)}`;
}

export function featuresHtml(page: GamePage): Safe {
  return html`${page.features.filter((f) => f.title || f.text || f.image).map((f) => html`
    <article class="feature card px" data-reveal>
      ${picture(f.image, f.title)}
      <h3>${f.title}</h3><p class="text-soft">${f.text}</p>
    </article>`)}`;
}

export function controlsHtml(page: GamePage): Safe {
  return html`
    <div class="card px controls" data-reveal>
      <h3>${page.controls.title}</h3>
      ${page.controls.image ? picture(page.controls.image, page.controls.title) : ""}
      <dl class="keys">${page.controls.keys.filter((k) => k.keys || k.action).map((k) => html`<dt>${keyCaps(k.keys)}</dt><dd>${k.action}</dd>`)}</dl>
    </div>
    <div class="card px controls" data-reveal>
      <h3>${page.phone.title}</h3>
      ${picture(page.phone.image, page.phone.title)}
      <p class="text-soft">${page.phone.text}</p>
    </div>`;
}
