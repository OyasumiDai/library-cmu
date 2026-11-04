// Tiny safe-HTML helpers. Everything interpolated into html`...` is escaped unless it is already Safe,
// so pages can build markup with templates and still never inject user text as markup.
export class Safe {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (text: unknown): string => String(text ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const raw = (value: string): Safe => new Safe(value);

type Part = Safe | string | number | boolean | null | undefined | Part[];

function render(part: Part): string {
  if (part === null || part === undefined || part === false || part === true) return "";
  if (part instanceof Safe) return part.value;
  if (Array.isArray(part)) return part.map(render).join("");
  return escapeHtml(part);
}

export function html(strings: TemplateStringsArray, ...values: Part[]): Safe {
  let out = "";
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += render(values[i]);
  });
  return new Safe(out);
}

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

export const qsa = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

export const maybe = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(selector);

export function mount(target: Element, content: Safe | string): void {
  target.innerHTML = content instanceof Safe ? content.value : escapeHtml(content);
}

export function icon(name: string, extra = ""): Safe {
  return new Safe(`<svg class="icon ${escapeHtml(extra)}" aria-hidden="true"><use href="/assets/icons/icons.svg#${escapeHtml(name)}"/></svg>`);
}

// delegate clicks on [data-action="..."] inside a root: on(root, { save: (el, event) => ... })
export function actions(root: Element, handlers: Record<string, (el: HTMLElement, event: Event) => void | Promise<void>>): void {
  root.addEventListener("click", (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-action]");
    if (!target || !root.contains(target)) return;
    const handler = handlers[target.dataset.action ?? ""];
    if (!handler) return;
    event.preventDefault();
    void handler(target, event);
  });
}

export function formData(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") out[key] = value.trim();
  });
  return out;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 280): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export async function busy<T>(button: HTMLElement | null, work: () => Promise<T>): Promise<T> {
  button?.classList.add("is-loading");
  button?.setAttribute("aria-disabled", "true");
  try {
    return await work();
  } finally {
    button?.classList.remove("is-loading");
    button?.removeAttribute("aria-disabled");
  }
}
