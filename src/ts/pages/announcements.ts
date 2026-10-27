// The library notice board: the newest update is pinned big, older ones follow in a month-by-month timeline.
import { announcements } from "../api/content";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { relative } from "../core/format";
import { empty, loading } from "../ui/components";
import type { Announcement } from "../types";

const DAY = 86_400_000;
const LONG = 240;
const part = (iso: string, options: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...options }).format(new Date(iso));
const isNew = (iso: string): boolean => Date.now() - new Date(iso).getTime() < 7 * DAY;

const stamp = (iso: string, small = false) => html`<time class="date-stamp${small ? " date-stamp--sm" : ""}" datetime="${iso}">
  <span class="date-stamp__month">${part(iso, { month: "short" })}</span><span class="date-stamp__day">${part(iso, { day: "numeric" })}</span><span class="date-stamp__year">${part(iso, { year: "numeric" })}</span></time>`;

function pinned(n: Announcement) {
  return html`
    <article class="update-hero card px" data-reveal>
      ${stamp(n.created_at)}
      <div class="update-hero__body">
        <div class="update-tags"><span class="update-tag">${icon("news", "icon--sm")} Latest</span>${isNew(n.created_at) ? html`<span class="update-tag update-tag--new">New</span>` : ""}</div>
        <h2>${n.title}</h2>
        <p>${n.body}</p>
        <p class="update-meta">${icon("clock", "icon--sm")} Posted ${relative(n.created_at)}</p>
      </div>
    </article>`;
}

function entry(n: Announcement) {
  const long = n.body.length > LONG;
  return html`
    <li class="update" data-reveal>
      ${stamp(n.created_at, true)}
      <article class="update__card card px">
        <div class="update__top"><h3>${n.title}</h3>${isNew(n.created_at) ? html`<span class="update-tag update-tag--new">New</span>` : ""}</div>
        <p class="update__text${long ? " is-clamped" : ""}">${n.body}</p>
        <div class="update__foot">
          <span class="update-meta">${icon("clock", "icon--sm")} ${relative(n.created_at)}</span>
          ${long ? html`<button class="link-button" type="button" data-action="more" aria-expanded="false">Read more</button>` : ""}
        </div>
      </article>
    </li>`;
}

function timeline(items: Announcement[]) {
  const months = new Map<string, Announcement[]>();
  for (const n of items) {
    const key = part(n.created_at, { month: "long", year: "numeric" });
    months.set(key, [...(months.get(key) ?? []), n]);
  }
  return html`${[...months].map(([month, list]) => html`
    <section class="update-month" aria-label="${month}">
      <h2 class="update-month__title">${month}</h2>
      <ol class="update-list">${list.map(entry)}</ol>
    </section>`)}`;
}

boot(async () => {
  const list = qs("#newsList");
  const search = qs<HTMLInputElement>("#updatesSearch");
  mount(list, loading("Reading the notice board"));
  const all = await announcements();
  if (!all.length) {
    mount(list, empty("Nothing posted yet", "When the library posts news it appears here.", "news"));
    qs(".updates-search").hidden = true;
    return;
  }

  const draw = (): void => {
    const q = search.value.trim().toLowerCase();
    const items = q ? all.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(q)) : all;
    if (!items.length) return mount(list, empty("No match", `Nothing in the updates mentions "${search.value.trim()}".`, "search"));
    const [first, ...rest] = items;
    mount(list, html`${q ? "" : pinned(first)}${timeline(q ? items : rest)}`);
  };
  draw();
  search.addEventListener("input", draw);

  actions(list, {
    more: (button) => {
      const text = button.closest(".update__card")?.querySelector(".update__text");
      const open = text?.classList.toggle("is-clamped") === false;
      button.textContent = open ? "Show less" : "Read more";
      button.setAttribute("aria-expanded", String(open));
    },
  });
});
