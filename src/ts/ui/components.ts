// Reusable pieces of markup. Each returns Safe html, so pages just drop them into templates.
import { escapeHtml, html, icon, raw, type Safe } from "../core/dom";
import type { Book, CatalogBook } from "../types";

// a stable number from text, used to give every book its own colour without storing one
export function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function cover(book: Pick<Book, "id" | "title" | "cover_url">): Safe {
  if (book.cover_url) {
    return html`<span class="cover"><img class="cover__img" src="${book.cover_url}" alt="Cover of ${book.title}" loading="lazy"></span>`;
  }
  // stepping by the golden angle spreads ids that differ by one character (bk-100, bk-101) far apart on the colour wheel
  const hue = Math.round((hash(book.id) * 137.508) % 360);
  return raw(`<span class="cover" style="--hue:${hue}" role="img" aria-label="${escapeHtml(book.title)}"><span class="cover__title">${escapeHtml(book.title)}</span><span class="cover__band"></span>${icon("book", "cover__mark").value}</span>`);
}

export type MyStatus = "requested" | "borrowed" | undefined;

// what everyone sees: free, reserved (waiting for staff) or borrowed
export function stockBadge(book: Pick<CatalogBook, "available" | "copies" | "borrowed" | "reserved">): Safe {
  if (book.available > 0) {
    return html`<span class="badge badge--success">${icon("check", "icon--sm")} ${book.available} of ${book.copies} free</span>${book.reserved > 0 ? html`<span class="badge badge--warning">${book.reserved} reserved</span>` : ""}`;
  }
  if (book.borrowed >= book.copies) return html`<span class="badge badge--danger">${icon("clock", "icon--sm")} All borrowed</span>`;
  return html`<span class="badge badge--warning">${icon("clock", "icon--sm")} Reserved</span>`;
}

// what is true for you only
export function mineBadge(mine: MyStatus): Safe {
  if (mine === "borrowed") return html`<span class="badge badge--primary">You borrowed this</span>`;
  if (mine === "requested") return html`<span class="badge badge--info">You requested this</span>`;
  return raw("");
}

export function bookCard(book: CatalogBook, mine?: MyStatus): Safe {
  return html`
    <button class="book-card card px card--lift" type="button" data-action="open-book" data-id="${book.id}" data-reveal>
      <span class="book-card__art">${cover(book)}<span class="book-card__peek">${icon("eye")} View details</span></span>
      <h3 class="book-card__title">${book.title}</h3>
      <p class="book-card__author">${book.author || "Unknown author"}</p>
      <div class="book-card__foot">${mineBadge(mine)}${stockBadge(book)}<span class="badge">${book.category}</span></div>
    </button>`;
}

export function empty(title: string, text: string, art = "shelf"): Safe {
  return html`
    <div class="empty">
      <div class="empty__art">${icon(art === "none" ? "book" : art, "icon--xl")}</div>
      <p class="empty__title">${title}</p>
      <p>${text}</p>
      ${art === "none" ? "" : ""}
    </div>`;
}

export function loading(label = "Fetching books"): Safe {
  return html`
    <div class="loading-block" role="status">
      <div class="shelf-loader" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => raw(`<span class="shelf-loader__book" style="--i:${i}"></span>`))}</div>
      <span>${label}...</span>
    </div>`;
}

export function pagination(page: number, pages: number): Safe {
  if (pages <= 1) return raw("");
  const numbers: (number | "gap")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }
  return html`
    <nav class="pagination" aria-label="Pages">
      <button class="pagination__page" type="button" data-action="page" data-page="${page - 1}" ${page <= 1 ? raw("disabled") : ""} aria-label="Previous page">${icon("chevron-left")}</button>
      ${numbers.map((n) => n === "gap"
        ? html`<span class="pagination__gap">...</span>`
        : html`<button class="pagination__page" type="button" data-action="page" data-page="${n}" ${n === page ? raw('aria-current="page"') : ""}>${n}</button>`)}
      <button class="pagination__page" type="button" data-action="page" data-page="${page + 1}" ${page >= pages ? raw("disabled") : ""} aria-label="Next page">${icon("chevron-right")}</button>
    </nav>`;
}

export function statCard(label: string, value: number, iconName: string, note = ""): Safe {
  return html`
    <div class="stat card px" data-reveal>
      <span class="stat__label">${icon(iconName)} ${label}</span>
      <span class="stat__value" data-count="${value}">0</span>
      ${note ? html`<span class="stat__note">${note}</span>` : ""}
    </div>`;
}

export function field(name: string, label: string, options: { type?: string; value?: string; required?: boolean; hint?: string; autocomplete?: string; placeholder?: string; attrs?: string } = {}): Safe {
  const { type = "text", value = "", required = false, hint = "", autocomplete = "", placeholder = "", attrs = "" } = options;
  return html`
    <div class="field" data-field="${name}">
      <label class="field__label" for="f-${name}">${label}${required ? " *" : ""}</label>
      <input class="input" id="f-${name}" name="${name}" type="${type}" value="${value}" ${required ? raw("required") : ""} ${autocomplete ? raw(`autocomplete="${escapeHtml(autocomplete)}"`) : ""} ${placeholder ? raw(`placeholder="${escapeHtml(placeholder)}"`) : ""} ${raw(attrs)}>
      ${hint ? html`<span class="field__hint">${hint}</span>` : ""}
      <span class="field__error" aria-live="polite"></span>
    </div>`;
}

export function selectField(name: string, label: string, choices: { value: string; label?: string }[], selected = "", required = false, blank = "Choose..."): Safe {
  return html`
    <div class="field" data-field="${name}">
      <label class="field__label" for="f-${name}">${label}${required ? " *" : ""}</label>
      <select class="select" id="f-${name}" name="${name}" ${required ? raw("required") : ""}>
        <option value="">${blank}</option>
        ${choices.map((c) => html`<option value="${c.value}" ${c.value === selected ? raw("selected") : ""}>${c.label ?? c.value}</option>`)}
      </select>
      <span class="field__error" aria-live="polite"></span>
    </div>`;
}

export function setFieldError(form: HTMLElement, name: string, message: string): void {
  const wrap = form.querySelector<HTMLElement>(`[data-field="${name}"]`);
  if (!wrap) return;
  wrap.classList.toggle("is-invalid", message !== "");
  const slot = wrap.querySelector(".field__error");
  if (slot) slot.textContent = message;
}

export function clearErrors(form: HTMLElement): void {
  form.querySelectorAll<HTMLElement>("[data-field]").forEach((w) => {
    w.classList.remove("is-invalid");
    const slot = w.querySelector(".field__error");
    if (slot) slot.textContent = "";
  });
}

export function statusBadge(status: string): Safe {
  const tone: Record<string, string> = { requested: "badge--warning", borrowed: "badge--info", returned: "badge--success", rejected: "badge--danger", cancelled: "badge" };
  return html`<span class="badge ${tone[status] ?? ""}">${status}</span>`;
}
