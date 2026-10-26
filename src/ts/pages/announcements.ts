import { announcements } from "../api/content";
import { boot } from "../core/boot";
import { html, icon, mount, qs } from "../core/dom";
import { formatDate } from "../core/format";
import { empty, loading } from "../ui/components";

boot(async () => {
  const list = qs("#newsList");
  mount(list, loading("Reading the notice board"));
  const items = await announcements();
  mount(list, items.length
    ? html`${items.map((n) => html`
        <article class="card px" data-reveal>
          <h2 class="card__title">${icon("news")} ${n.title}</h2>
          <p class="card__meta">${icon("calendar", "icon--sm")} ${formatDate(n.created_at)}</p>
          <p>${n.body}</p>
        </article>`)}`
    : empty("Nothing posted yet", "Check back soon."));
});
