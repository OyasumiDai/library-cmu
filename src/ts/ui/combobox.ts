// Turns a <select> into a box you can type in: the list drops down and narrows to what you type.
// The <select> stays in the form (hidden) and keeps the real value, so form data, validation and
// "change" listeners work exactly as before. Options added or removed later (majors after a course
// is picked) show up on their own.

let counter = 0;

interface Item { value: string; text: string; group: string; }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export function searchableSelect(select: HTMLSelectElement): void {
  if (select.dataset.combo) return;
  select.dataset.combo = "1";
  const id = ++counter;

  const wrap = document.createElement("div");
  wrap.className = "combo";
  select.before(wrap);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "input select combo__input";
  input.id = `${select.id || `combo-${id}`}-search`;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  if (select.required) input.setAttribute("aria-required", "true");

  const list = document.createElement("ul");
  list.className = "combo__list";
  list.id = `combo-list-${id}`;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  input.setAttribute("aria-controls", list.id);

  // the label now points at the box you type in
  if (select.id) document.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`)?.setAttribute("for", input.id);
  select.classList.add("visually-hidden");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  wrap.append(input, list, select);

  let shown: Item[] = [];
  let active = -1;
  let query = "";

  const items = (): Item[] => [...select.options]
    .filter((o) => o.value !== "")
    .map((o) => ({ value: o.value, text: o.text, group: o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : "" }));

  // what the box shows when nobody is typing: the chosen option, or the select's placeholder
  const sync = () => {
    const chosen = select.selectedOptions[0];
    input.value = chosen && chosen.value !== "" ? chosen.text : "";
    input.placeholder = select.querySelector<HTMLOptionElement>('option[value=""]')?.text ?? "Choose...";
    input.disabled = select.disabled;
  };

  const render = (query: string) => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    shown = items().filter((it) => { const hay = norm(`${it.text} ${it.group}`); return words.every((w) => hay.includes(w)); });
    // options whose name starts with what was typed come first
    if (words.length) {
      const q = norm(query);
      shown.sort((a, b) => Number(!norm(a.text).startsWith(q)) - Number(!norm(b.text).startsWith(q)));
    }
    list.replaceChildren();
    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "combo__empty";
      li.textContent = "No match. Try other words.";
      list.append(li);
      return;
    }
    let lastGroup = "";
    shown.forEach((it, i) => {
      if (it.group && it.group !== lastGroup && !words.length) {
        const head = document.createElement("li");
        head.className = "combo__group";
        head.setAttribute("role", "presentation");
        head.textContent = it.group;
        list.append(head);
      }
      lastGroup = it.group;
      const li = document.createElement("li");
      li.className = "combo__option";
      li.id = `${list.id}-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(it.value === select.value));
      li.dataset.index = String(i);
      li.textContent = it.text;
      if (it.group && words.length) {
        const small = document.createElement("small");
        small.className = "combo__hint";
        small.textContent = it.group;
        li.append(small);
      }
      list.append(li);
    });
  };

  const highlight = (i: number) => {
    active = shown.length ? Math.max(0, Math.min(i, shown.length - 1)) : -1;
    list.querySelectorAll(".combo__option").forEach((li) => li.classList.toggle("is-active", li.getAttribute("data-index") === String(active)));
    const el = active >= 0 ? list.querySelector<HTMLElement>(`[data-index="${active}"]`) : null;
    if (el) { input.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  };

  const open = (q: string) => {
    query = q;
    if (select.disabled) return;
    render(query);
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    // open upwards when there is no room below
    const box = input.getBoundingClientRect();
    wrap.classList.toggle("combo--up", window.innerHeight - box.bottom < Math.min(list.scrollHeight, 256) + 12 && box.top > window.innerHeight - box.bottom);
    const current = shown.findIndex((it) => it.value === select.value);
    highlight(query ? 0 : current);
  };

  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const pick = (it: Item | undefined) => {
    if (it && it.value !== select.value) {
      select.value = it.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
    sync();
  };

  // leaving the box: keep an exact or only match, clear it when emptied, otherwise put back what was chosen
  const settle = () => {
    const typed = norm(input.value);
    if (!typed) {
      if (select.value !== "") { select.value = ""; select.dispatchEvent(new Event("change", { bubbles: true })); }
      close(); sync(); return;
    }
    const all = items();
    const exact = all.find((it) => norm(it.text) === typed);
    if (exact) return pick(exact);
    if (!list.hidden && shown.length === 1) return pick(shown[0]);
    close(); sync();
  };

  input.addEventListener("focus", () => { input.select(); open(""); });
  input.addEventListener("click", () => { if (list.hidden) open(""); });
  input.addEventListener("input", () => open(input.value));
  input.addEventListener("blur", settle);
  input.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (list.hidden) open(""); else highlight(active + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (list.hidden) open(""); else highlight(active - 1);
        break;
      case "Enter":
        if (!list.hidden) { event.preventDefault(); pick(shown[active]); }
        break;
      case "Escape":
        if (!list.hidden) { event.preventDefault(); close(); sync(); }
        break;
      case "Tab":
        if (!list.hidden && input.value && shown[active]) pick(shown[active]);
        break;
    }
  });
  // keep focus in the box while clicking the list
  list.addEventListener("mousedown", (event) => event.preventDefault());
  list.addEventListener("click", (event) => {
    const li = (event.target as HTMLElement).closest<HTMLElement>(".combo__option");
    if (li) pick(shown[Number(li.dataset.index)]);
  });

  select.addEventListener("change", sync);
  new MutationObserver(() => { sync(); if (!list.hidden) render(query); })
    .observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
  sync();
}
