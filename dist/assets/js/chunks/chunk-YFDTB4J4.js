import {
  escapeHtml,
  html,
  icon,
  raw
} from "./chunk-EIGZ5BRM.js";

// src/ts/ui/components.ts
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = h * 31 + text.charCodeAt(i) >>> 0;
  return h;
}
function cover(book) {
  if (book.cover_url) {
    return html`<span class="cover"><img class="cover__img" src="${book.cover_url}" alt="Cover of ${book.title}" loading="lazy"></span>`;
  }
  const hue = hash(book.id) % 360;
  return raw(`<span class="cover" style="--hue:${hue}" role="img" aria-label="${escapeHtml(book.title)}"><span class="cover__title">${escapeHtml(book.title)}</span><span class="cover__band"></span>${icon("book", "cover__mark").value}</span>`);
}
function stockBadge(book) {
  if (book.available > 0) {
    return html`<span class="badge badge--success">${icon("check", "icon--sm")} ${book.available} of ${book.copies} free</span>${book.reserved > 0 ? html`<span class="badge badge--warning">${book.reserved} reserved</span>` : ""}`;
  }
  if (book.borrowed >= book.copies) return html`<span class="badge badge--danger">${icon("clock", "icon--sm")} All borrowed</span>`;
  return html`<span class="badge badge--warning">${icon("clock", "icon--sm")} Reserved</span>`;
}
function mineBadge(mine) {
  if (mine === "borrowed") return html`<span class="badge badge--primary">You borrowed this</span>`;
  if (mine === "requested") return html`<span class="badge badge--info">You requested this</span>`;
  return raw("");
}
function bookCard(book, mine) {
  return html`
    <button class="book-card card px card--lift" type="button" data-action="open-book" data-id="${book.id}" data-reveal>
      ${cover(book)}
      <h3 class="book-card__title">${book.title}</h3>
      <p class="book-card__author">${book.author || "Unknown author"}</p>
      <div class="book-card__foot">${mineBadge(mine)}${stockBadge(book)}<span class="badge">${book.category}</span></div>
    </button>`;
}
function empty(title, text, art = "shelf") {
  return html`
    <div class="empty">
      <div class="empty__art">${icon(art === "none" ? "book" : art, "icon--xl")}</div>
      <p class="empty__title">${title}</p>
      <p>${text}</p>
      ${art === "none" ? "" : ""}
    </div>`;
}
function loading(label = "Fetching books") {
  return html`
    <div class="loading-block" role="status">
      <div class="shelf-loader" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => raw(`<span class="shelf-loader__book" style="--i:${i}"></span>`))}</div>
      <span>${label}...</span>
    </div>`;
}
function pagination(page, pages) {
  if (pages <= 1) return raw("");
  const numbers = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }
  return html`
    <nav class="pagination" aria-label="Pages">
      <button class="pagination__page" type="button" data-action="page" data-page="${page - 1}" ${page <= 1 ? raw("disabled") : ""} aria-label="Previous page">${icon("chevron-left")}</button>
      ${numbers.map((n) => n === "gap" ? html`<span class="pagination__gap">...</span>` : html`<button class="pagination__page" type="button" data-action="page" data-page="${n}" ${n === page ? raw('aria-current="page"') : ""}>${n}</button>`)}
      <button class="pagination__page" type="button" data-action="page" data-page="${page + 1}" ${page >= pages ? raw("disabled") : ""} aria-label="Next page">${icon("chevron-right")}</button>
    </nav>`;
}
function statCard(label, value, iconName, note = "") {
  return html`
    <div class="stat card px" data-reveal>
      <span class="stat__label">${icon(iconName)} ${label}</span>
      <span class="stat__value" data-count="${value}">0</span>
      ${note ? html`<span class="stat__note">${note}</span>` : ""}
    </div>`;
}
function field(name, label, options = {}) {
  const { type = "text", value = "", required = false, hint = "", autocomplete = "", placeholder = "", attrs = "" } = options;
  return html`
    <div class="field" data-field="${name}">
      <label class="field__label" for="f-${name}">${label}${required ? " *" : ""}</label>
      <input class="input" id="f-${name}" name="${name}" type="${type}" value="${value}" ${required ? raw("required") : ""} ${autocomplete ? raw(`autocomplete="${escapeHtml(autocomplete)}"`) : ""} ${placeholder ? raw(`placeholder="${escapeHtml(placeholder)}"`) : ""} ${raw(attrs)}>
      ${hint ? html`<span class="field__hint">${hint}</span>` : ""}
      <span class="field__error" aria-live="polite"></span>
    </div>`;
}
function selectField(name, label, choices, selected = "", required = false, blank = "Choose...") {
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
function setFieldError(form, name, message) {
  const wrap = form.querySelector(`[data-field="${name}"]`);
  if (!wrap) return;
  wrap.classList.toggle("is-invalid", message !== "");
  const slot = wrap.querySelector(".field__error");
  if (slot) slot.textContent = message;
}
function clearErrors(form) {
  form.querySelectorAll("[data-field]").forEach((w) => {
    w.classList.remove("is-invalid");
    const slot = w.querySelector(".field__error");
    if (slot) slot.textContent = "";
  });
}
function statusBadge(status) {
  const tone = { requested: "badge--warning", borrowed: "badge--info", returned: "badge--success", rejected: "badge--danger", cancelled: "badge" };
  return html`<span class="badge ${tone[status] ?? ""}">${status}</span>`;
}

export {
  cover,
  stockBadge,
  mineBadge,
  bookCard,
  empty,
  loading,
  pagination,
  statCard,
  field,
  selectField,
  setFieldError,
  clearErrors,
  statusBadge
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL3RzL3VpL2NvbXBvbmVudHMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIFJldXNhYmxlIHBpZWNlcyBvZiBtYXJrdXAuIEVhY2ggcmV0dXJucyBTYWZlIGh0bWwsIHNvIHBhZ2VzIGp1c3QgZHJvcCB0aGVtIGludG8gdGVtcGxhdGVzLlxyXG5pbXBvcnQgeyBlc2NhcGVIdG1sLCBodG1sLCBpY29uLCByYXcsIHR5cGUgU2FmZSB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xyXG5pbXBvcnQgdHlwZSB7IEJvb2ssIENhdGFsb2dCb29rIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG4vLyBhIHN0YWJsZSBudW1iZXIgZnJvbSB0ZXh0LCB1c2VkIHRvIGdpdmUgZXZlcnkgYm9vayBpdHMgb3duIGNvbG91ciB3aXRob3V0IHN0b3Jpbmcgb25lXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNoKHRleHQ6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgbGV0IGggPSAwO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykgaCA9IChoICogMzEgKyB0ZXh0LmNoYXJDb2RlQXQoaSkpID4+PiAwO1xyXG4gIHJldHVybiBoO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY292ZXIoYm9vazogUGljazxCb29rLCBcImlkXCIgfCBcInRpdGxlXCIgfCBcImNvdmVyX3VybFwiPik6IFNhZmUge1xyXG4gIGlmIChib29rLmNvdmVyX3VybCkge1xyXG4gICAgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJjb3ZlclwiPjxpbWcgY2xhc3M9XCJjb3Zlcl9faW1nXCIgc3JjPVwiJHtib29rLmNvdmVyX3VybH1cIiBhbHQ9XCJDb3ZlciBvZiAke2Jvb2sudGl0bGV9XCIgbG9hZGluZz1cImxhenlcIj48L3NwYW4+YDtcclxuICB9XHJcbiAgY29uc3QgaHVlID0gaGFzaChib29rLmlkKSAlIDM2MDtcclxuICByZXR1cm4gcmF3KGA8c3BhbiBjbGFzcz1cImNvdmVyXCIgc3R5bGU9XCItLWh1ZToke2h1ZX1cIiByb2xlPVwiaW1nXCIgYXJpYS1sYWJlbD1cIiR7ZXNjYXBlSHRtbChib29rLnRpdGxlKX1cIj48c3BhbiBjbGFzcz1cImNvdmVyX190aXRsZVwiPiR7ZXNjYXBlSHRtbChib29rLnRpdGxlKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJjb3Zlcl9fYmFuZFwiPjwvc3Bhbj4ke2ljb24oXCJib29rXCIsIFwiY292ZXJfX21hcmtcIikudmFsdWV9PC9zcGFuPmApO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNeVN0YXR1cyA9IFwicmVxdWVzdGVkXCIgfCBcImJvcnJvd2VkXCIgfCB1bmRlZmluZWQ7XHJcblxyXG4vLyB3aGF0IGV2ZXJ5b25lIHNlZXM6IGZyZWUsIHJlc2VydmVkICh3YWl0aW5nIGZvciBzdGFmZikgb3IgYm9ycm93ZWRcclxuZXhwb3J0IGZ1bmN0aW9uIHN0b2NrQmFkZ2UoYm9vazogUGljazxDYXRhbG9nQm9vaywgXCJhdmFpbGFibGVcIiB8IFwiY29waWVzXCIgfCBcImJvcnJvd2VkXCIgfCBcInJlc2VydmVkXCI+KTogU2FmZSB7XHJcbiAgaWYgKGJvb2suYXZhaWxhYmxlID4gMCkge1xyXG4gICAgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tc3VjY2Vzc1wiPiR7aWNvbihcImNoZWNrXCIsIFwiaWNvbi0tc21cIil9ICR7Ym9vay5hdmFpbGFibGV9IG9mICR7Ym9vay5jb3BpZXN9IGZyZWU8L3NwYW4+JHtib29rLnJlc2VydmVkID4gMCA/IGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0td2FybmluZ1wiPiR7Ym9vay5yZXNlcnZlZH0gcmVzZXJ2ZWQ8L3NwYW4+YCA6IFwiXCJ9YDtcclxuICB9XHJcbiAgaWYgKGJvb2suYm9ycm93ZWQgPj0gYm9vay5jb3BpZXMpIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLWRhbmdlclwiPiR7aWNvbihcImNsb2NrXCIsIFwiaWNvbi0tc21cIil9IEFsbCBib3Jyb3dlZDwvc3Bhbj5gO1xyXG4gIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLXdhcm5pbmdcIj4ke2ljb24oXCJjbG9ja1wiLCBcImljb24tLXNtXCIpfSBSZXNlcnZlZDwvc3Bhbj5gO1xyXG59XHJcblxyXG4vLyB3aGF0IGlzIHRydWUgZm9yIHlvdSBvbmx5XHJcbmV4cG9ydCBmdW5jdGlvbiBtaW5lQmFkZ2UobWluZTogTXlTdGF0dXMpOiBTYWZlIHtcclxuICBpZiAobWluZSA9PT0gXCJib3Jyb3dlZFwiKSByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImJhZGdlIGJhZGdlLS1wcmltYXJ5XCI+WW91IGJvcnJvd2VkIHRoaXM8L3NwYW4+YDtcclxuICBpZiAobWluZSA9PT0gXCJyZXF1ZXN0ZWRcIikgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0taW5mb1wiPllvdSByZXF1ZXN0ZWQgdGhpczwvc3Bhbj5gO1xyXG4gIHJldHVybiByYXcoXCJcIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBib29rQ2FyZChib29rOiBDYXRhbG9nQm9vaywgbWluZT86IE15U3RhdHVzKTogU2FmZSB7XHJcbiAgcmV0dXJuIGh0bWxgXHJcbiAgICA8YnV0dG9uIGNsYXNzPVwiYm9vay1jYXJkIGNhcmQgcHggY2FyZC0tbGlmdFwiIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cIm9wZW4tYm9va1wiIGRhdGEtaWQ9XCIke2Jvb2suaWR9XCIgZGF0YS1yZXZlYWw+XHJcbiAgICAgICR7Y292ZXIoYm9vayl9XHJcbiAgICAgIDxoMyBjbGFzcz1cImJvb2stY2FyZF9fdGl0bGVcIj4ke2Jvb2sudGl0bGV9PC9oMz5cclxuICAgICAgPHAgY2xhc3M9XCJib29rLWNhcmRfX2F1dGhvclwiPiR7Ym9vay5hdXRob3IgfHwgXCJVbmtub3duIGF1dGhvclwifTwvcD5cclxuICAgICAgPGRpdiBjbGFzcz1cImJvb2stY2FyZF9fZm9vdFwiPiR7bWluZUJhZGdlKG1pbmUpfSR7c3RvY2tCYWRnZShib29rKX08c3BhbiBjbGFzcz1cImJhZGdlXCI+JHtib29rLmNhdGVnb3J5fTwvc3Bhbj48L2Rpdj5cclxuICAgIDwvYnV0dG9uPmA7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlbXB0eSh0aXRsZTogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIGFydCA9IFwic2hlbGZcIik6IFNhZmUge1xyXG4gIHJldHVybiBodG1sYFxyXG4gICAgPGRpdiBjbGFzcz1cImVtcHR5XCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJlbXB0eV9fYXJ0XCI+JHtpY29uKGFydCA9PT0gXCJub25lXCIgPyBcImJvb2tcIiA6IGFydCwgXCJpY29uLS14bFwiKX08L2Rpdj5cclxuICAgICAgPHAgY2xhc3M9XCJlbXB0eV9fdGl0bGVcIj4ke3RpdGxlfTwvcD5cclxuICAgICAgPHA+JHt0ZXh0fTwvcD5cclxuICAgICAgJHthcnQgPT09IFwibm9uZVwiID8gXCJcIiA6IFwiXCJ9XHJcbiAgICA8L2Rpdj5gO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZGluZyhsYWJlbCA9IFwiRmV0Y2hpbmcgYm9va3NcIik6IFNhZmUge1xyXG4gIHJldHVybiBodG1sYFxyXG4gICAgPGRpdiBjbGFzcz1cImxvYWRpbmctYmxvY2tcIiByb2xlPVwic3RhdHVzXCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJzaGVsZi1sb2FkZXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4ke1swLCAxLCAyLCAzLCA0LCA1XS5tYXAoKGkpID0+IHJhdyhgPHNwYW4gY2xhc3M9XCJzaGVsZi1sb2FkZXJfX2Jvb2tcIiBzdHlsZT1cIi0taToke2l9XCI+PC9zcGFuPmApKX08L2Rpdj5cclxuICAgICAgPHNwYW4+JHtsYWJlbH0uLi48L3NwYW4+XHJcbiAgICA8L2Rpdj5gO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFnaW5hdGlvbihwYWdlOiBudW1iZXIsIHBhZ2VzOiBudW1iZXIpOiBTYWZlIHtcclxuICBpZiAocGFnZXMgPD0gMSkgcmV0dXJuIHJhdyhcIlwiKTtcclxuICBjb25zdCBudW1iZXJzOiAobnVtYmVyIHwgXCJnYXBcIilbXSA9IFtdO1xyXG4gIGZvciAobGV0IG4gPSAxOyBuIDw9IHBhZ2VzOyBuKyspIHtcclxuICAgIGlmIChuID09PSAxIHx8IG4gPT09IHBhZ2VzIHx8IE1hdGguYWJzKG4gLSBwYWdlKSA8PSAxKSBudW1iZXJzLnB1c2gobik7XHJcbiAgICBlbHNlIGlmIChudW1iZXJzW251bWJlcnMubGVuZ3RoIC0gMV0gIT09IFwiZ2FwXCIpIG51bWJlcnMucHVzaChcImdhcFwiKTtcclxuICB9XHJcbiAgcmV0dXJuIGh0bWxgXHJcbiAgICA8bmF2IGNsYXNzPVwicGFnaW5hdGlvblwiIGFyaWEtbGFiZWw9XCJQYWdlc1wiPlxyXG4gICAgICA8YnV0dG9uIGNsYXNzPVwicGFnaW5hdGlvbl9fcGFnZVwiIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInBhZ2VcIiBkYXRhLXBhZ2U9XCIke3BhZ2UgLSAxfVwiICR7cGFnZSA8PSAxID8gcmF3KFwiZGlzYWJsZWRcIikgOiBcIlwifSBhcmlhLWxhYmVsPVwiUHJldmlvdXMgcGFnZVwiPiR7aWNvbihcImNoZXZyb24tbGVmdFwiKX08L2J1dHRvbj5cclxuICAgICAgJHtudW1iZXJzLm1hcCgobikgPT4gbiA9PT0gXCJnYXBcIlxyXG4gICAgICAgID8gaHRtbGA8c3BhbiBjbGFzcz1cInBhZ2luYXRpb25fX2dhcFwiPi4uLjwvc3Bhbj5gXHJcbiAgICAgICAgOiBodG1sYDxidXR0b24gY2xhc3M9XCJwYWdpbmF0aW9uX19wYWdlXCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwicGFnZVwiIGRhdGEtcGFnZT1cIiR7bn1cIiAke24gPT09IHBhZ2UgPyByYXcoJ2FyaWEtY3VycmVudD1cInBhZ2VcIicpIDogXCJcIn0+JHtufTwvYnV0dG9uPmApfVxyXG4gICAgICA8YnV0dG9uIGNsYXNzPVwicGFnaW5hdGlvbl9fcGFnZVwiIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInBhZ2VcIiBkYXRhLXBhZ2U9XCIke3BhZ2UgKyAxfVwiICR7cGFnZSA+PSBwYWdlcyA/IHJhdyhcImRpc2FibGVkXCIpIDogXCJcIn0gYXJpYS1sYWJlbD1cIk5leHQgcGFnZVwiPiR7aWNvbihcImNoZXZyb24tcmlnaHRcIil9PC9idXR0b24+XHJcbiAgICA8L25hdj5gO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RhdENhcmQobGFiZWw6IHN0cmluZywgdmFsdWU6IG51bWJlciwgaWNvbk5hbWU6IHN0cmluZywgbm90ZSA9IFwiXCIpOiBTYWZlIHtcclxuICByZXR1cm4gaHRtbGBcclxuICAgIDxkaXYgY2xhc3M9XCJzdGF0IGNhcmQgcHhcIiBkYXRhLXJldmVhbD5cclxuICAgICAgPHNwYW4gY2xhc3M9XCJzdGF0X19sYWJlbFwiPiR7aWNvbihpY29uTmFtZSl9ICR7bGFiZWx9PC9zcGFuPlxyXG4gICAgICA8c3BhbiBjbGFzcz1cInN0YXRfX3ZhbHVlXCIgZGF0YS1jb3VudD1cIiR7dmFsdWV9XCI+MDwvc3Bhbj5cclxuICAgICAgJHtub3RlID8gaHRtbGA8c3BhbiBjbGFzcz1cInN0YXRfX25vdGVcIj4ke25vdGV9PC9zcGFuPmAgOiBcIlwifVxyXG4gICAgPC9kaXY+YDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpZWxkKG5hbWU6IHN0cmluZywgbGFiZWw6IHN0cmluZywgb3B0aW9uczogeyB0eXBlPzogc3RyaW5nOyB2YWx1ZT86IHN0cmluZzsgcmVxdWlyZWQ/OiBib29sZWFuOyBoaW50Pzogc3RyaW5nOyBhdXRvY29tcGxldGU/OiBzdHJpbmc7IHBsYWNlaG9sZGVyPzogc3RyaW5nOyBhdHRycz86IHN0cmluZyB9ID0ge30pOiBTYWZlIHtcclxuICBjb25zdCB7IHR5cGUgPSBcInRleHRcIiwgdmFsdWUgPSBcIlwiLCByZXF1aXJlZCA9IGZhbHNlLCBoaW50ID0gXCJcIiwgYXV0b2NvbXBsZXRlID0gXCJcIiwgcGxhY2Vob2xkZXIgPSBcIlwiLCBhdHRycyA9IFwiXCIgfSA9IG9wdGlvbnM7XHJcbiAgcmV0dXJuIGh0bWxgXHJcbiAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIiBkYXRhLWZpZWxkPVwiJHtuYW1lfVwiPlxyXG4gICAgICA8bGFiZWwgY2xhc3M9XCJmaWVsZF9fbGFiZWxcIiBmb3I9XCJmLSR7bmFtZX1cIj4ke2xhYmVsfSR7cmVxdWlyZWQgPyBcIiAqXCIgOiBcIlwifTwvbGFiZWw+XHJcbiAgICAgIDxpbnB1dCBjbGFzcz1cImlucHV0XCIgaWQ9XCJmLSR7bmFtZX1cIiBuYW1lPVwiJHtuYW1lfVwiIHR5cGU9XCIke3R5cGV9XCIgdmFsdWU9XCIke3ZhbHVlfVwiICR7cmVxdWlyZWQgPyByYXcoXCJyZXF1aXJlZFwiKSA6IFwiXCJ9ICR7YXV0b2NvbXBsZXRlID8gcmF3KGBhdXRvY29tcGxldGU9XCIke2VzY2FwZUh0bWwoYXV0b2NvbXBsZXRlKX1cImApIDogXCJcIn0gJHtwbGFjZWhvbGRlciA/IHJhdyhgcGxhY2Vob2xkZXI9XCIke2VzY2FwZUh0bWwocGxhY2Vob2xkZXIpfVwiYCkgOiBcIlwifSAke3JhdyhhdHRycyl9PlxyXG4gICAgICAke2hpbnQgPyBodG1sYDxzcGFuIGNsYXNzPVwiZmllbGRfX2hpbnRcIj4ke2hpbnR9PC9zcGFuPmAgOiBcIlwifVxyXG4gICAgICA8c3BhbiBjbGFzcz1cImZpZWxkX19lcnJvclwiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiPjwvc3Bhbj5cclxuICAgIDwvZGl2PmA7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RGaWVsZChuYW1lOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcsIGNob2ljZXM6IHsgdmFsdWU6IHN0cmluZzsgbGFiZWw/OiBzdHJpbmcgfVtdLCBzZWxlY3RlZCA9IFwiXCIsIHJlcXVpcmVkID0gZmFsc2UsIGJsYW5rID0gXCJDaG9vc2UuLi5cIik6IFNhZmUge1xyXG4gIHJldHVybiBodG1sYFxyXG4gICAgPGRpdiBjbGFzcz1cImZpZWxkXCIgZGF0YS1maWVsZD1cIiR7bmFtZX1cIj5cclxuICAgICAgPGxhYmVsIGNsYXNzPVwiZmllbGRfX2xhYmVsXCIgZm9yPVwiZi0ke25hbWV9XCI+JHtsYWJlbH0ke3JlcXVpcmVkID8gXCIgKlwiIDogXCJcIn08L2xhYmVsPlxyXG4gICAgICA8c2VsZWN0IGNsYXNzPVwic2VsZWN0XCIgaWQ9XCJmLSR7bmFtZX1cIiBuYW1lPVwiJHtuYW1lfVwiICR7cmVxdWlyZWQgPyByYXcoXCJyZXF1aXJlZFwiKSA6IFwiXCJ9PlxyXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj4ke2JsYW5rfTwvb3B0aW9uPlxyXG4gICAgICAgICR7Y2hvaWNlcy5tYXAoKGMpID0+IGh0bWxgPG9wdGlvbiB2YWx1ZT1cIiR7Yy52YWx1ZX1cIiAke2MudmFsdWUgPT09IHNlbGVjdGVkID8gcmF3KFwic2VsZWN0ZWRcIikgOiBcIlwifT4ke2MubGFiZWwgPz8gYy52YWx1ZX08L29wdGlvbj5gKX1cclxuICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgIDxzcGFuIGNsYXNzPVwiZmllbGRfX2Vycm9yXCIgYXJpYS1saXZlPVwicG9saXRlXCI+PC9zcGFuPlxyXG4gICAgPC9kaXY+YDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEZpZWxkRXJyb3IoZm9ybTogSFRNTEVsZW1lbnQsIG5hbWU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgY29uc3Qgd3JhcCA9IGZvcm0ucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oYFtkYXRhLWZpZWxkPVwiJHtuYW1lfVwiXWApO1xyXG4gIGlmICghd3JhcCkgcmV0dXJuO1xyXG4gIHdyYXAuY2xhc3NMaXN0LnRvZ2dsZShcImlzLWludmFsaWRcIiwgbWVzc2FnZSAhPT0gXCJcIik7XHJcbiAgY29uc3Qgc2xvdCA9IHdyYXAucXVlcnlTZWxlY3RvcihcIi5maWVsZF9fZXJyb3JcIik7XHJcbiAgaWYgKHNsb3QpIHNsb3QudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJFcnJvcnMoZm9ybTogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuICBmb3JtLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtZmllbGRdXCIpLmZvckVhY2goKHcpID0+IHtcclxuICAgIHcuY2xhc3NMaXN0LnJlbW92ZShcImlzLWludmFsaWRcIik7XHJcbiAgICBjb25zdCBzbG90ID0gdy5xdWVyeVNlbGVjdG9yKFwiLmZpZWxkX19lcnJvclwiKTtcclxuICAgIGlmIChzbG90KSBzbG90LnRleHRDb250ZW50ID0gXCJcIjtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0YXR1c0JhZGdlKHN0YXR1czogc3RyaW5nKTogU2FmZSB7XHJcbiAgY29uc3QgdG9uZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgcmVxdWVzdGVkOiBcImJhZGdlLS13YXJuaW5nXCIsIGJvcnJvd2VkOiBcImJhZGdlLS1pbmZvXCIsIHJldHVybmVkOiBcImJhZGdlLS1zdWNjZXNzXCIsIHJlamVjdGVkOiBcImJhZGdlLS1kYW5nZXJcIiwgY2FuY2VsbGVkOiBcImJhZGdlXCIgfTtcclxuICByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImJhZGdlICR7dG9uZVtzdGF0dXNdID8/IFwiXCJ9XCI+JHtzdGF0dXN9PC9zcGFuPmA7XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFLTyxTQUFTLEtBQUssTUFBc0I7QUFDekMsTUFBSSxJQUFJO0FBQ1IsV0FBUyxJQUFJLEdBQUcsSUFBSSxLQUFLLFFBQVEsSUFBSyxLQUFLLElBQUksS0FBSyxLQUFLLFdBQVcsQ0FBQyxNQUFPO0FBQzVFLFNBQU87QUFDVDtBQUVPLFNBQVMsTUFBTSxNQUFzRDtBQUMxRSxNQUFJLEtBQUssV0FBVztBQUNsQixXQUFPLHdEQUF3RCxLQUFL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
