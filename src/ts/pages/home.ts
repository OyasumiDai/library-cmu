import { announcements, publicSettings, publicStats, settingText, team } from "../api/content";
import { categories, featuredBooks } from "../api/catalog";
import { boot } from "../core/boot";
import { html, icon, mount, qs } from "../core/dom";
import { formatDate } from "../core/format";
import { typewriter } from "../core/motion";
import { isConfigured } from "../core/supabase";
import { cover, empty, statCard } from "../ui/components";
import { fillFooter } from "../ui/footer";
import type { TeamMember } from "../types";

function person(member: TeamMember) {
  return html`
    <figure class="team card px" data-reveal>
      ${member.photo_url ? html`<img class="team__photo" src="${member.photo_url}" alt="">` : html`<span class="avatar avatar--lg">${member.name.slice(0, 2)}</span>`}
      <strong>${member.name}</strong><span class="text-soft">${member.position}</span>${member.bio ? html`<small>${member.bio}</small>` : ""}
    </figure>`;
}

boot(async () => {
  const tagline = qs("#heroTagline");
  typewriter(tagline, tagline.dataset.text ?? "");
  if (!isConfigured()) return;

  // the search box on the home page: guests are asked to sign in, then land on the results
  qs<HTMLFormElement>("#quickSearch").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const text = (form.elements.namedItem("q") as HTMLInputElement).value.trim();
    const kind = (form.elements.namedItem("filter") as HTMLSelectElement).value;
    const target = `/catalog?${new URLSearchParams({ ...(text ? { q: text } : {}), ...(kind === "available" ? { availability: "available" } : {}) })}`;
    location.href = `/login?next=${encodeURIComponent(target)}`;
  });

  const [books, cats, news, stats, people, settings] = await Promise.all([featuredBooks(4), categories(), announcements(3), publicStats(), team(), publicSettings()]);
  fillFooter(settings);

  mount(qs("#heroStats"), html`
    <div><strong>${stats.titles}</strong><span>titles in the catalog</span></div>
    <div><strong>${stats.students}</strong><span>student readers</span></div>
    <div><strong>${stats.games}</strong><span>${stats.games === 1 ? "game hosted" : "games hosted"}</span></div>`);

  mount(qs("#homeStats"), html`
    ${statCard("Books on the shelves", cats.reduce((sum, c) => sum + c.total, 0), "book")}
    ${statCard("Subjects", cats.length, "tag")}
    ${statCard("Latest updates", news.length, "news")}`);

  mount(qs("#homeBooks"), books.length
    ? html`${books.map((b) => html`
        <a class="book-card card px card--lift" href="/login" data-reveal>
          ${cover(b)}<h3 class="book-card__title">${b.title}</h3><p class="book-card__author">${b.author}</p>
        </a>`)}`
    : empty("No books yet", "The shelves are being stocked."));

  mount(qs("#homeNews"), news.length
    ? html`${news.map((n) => html`
        <article class="news-item card px" data-reveal>
          <span class="news-item__date">${icon("calendar", "icon--sm")} ${formatDate(n.created_at)}</span>
          <h3>${n.title}</h3>
          <p>${n.body.length > 140 ? `${n.body.slice(0, 140)}...` : n.body}</p>
        </article>`)}`
    : empty("All quiet", "No announcements right now."));

  if (people.length) {
    qs("#team").hidden = false;
    mount(qs("#teamGrid"), html`${people.map(person)}`);
  }
  void settingText;
});
