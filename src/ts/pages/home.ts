import { announcements, publicSettings, publicStats, settingText, team } from "../api/content";
import { categories, featuredBooks } from "../api/catalog";
import { boot } from "../core/boot";
import { html, icon, mount, qs } from "../core/dom";
import { formatDate } from "../core/format";
import { typewriter } from "../core/motion";
import { current, homeFor, isMember } from "../core/session";
import { isConfigured } from "../core/supabase";
import { cover, empty, statCard } from "../ui/components";
import { fillFooter } from "../ui/footer";
import type { TeamMember } from "../types";

const stamp = (iso: string, part: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...part }).format(new Date(iso));

function person(member: TeamMember) {
  return html`
    <figure class="team card px${member.character ? " team--char" : ""}" data-reveal tabindex="0">
      <div class="team__portrait">
        ${member.photo_url ? html`<img class="team__photo" src="${member.photo_url}" alt="">` : html`<span class="avatar avatar--lg">${member.name.slice(0, 2)}</span>`}
        ${member.character ? html`<img class="team__char" src="${member.character}" alt="" width="256" height="256" decoding="async">` : ""}
      </div>
      <strong class="team__name">${member.name}</strong>
      ${member.position ? html`<span class="team__role">${member.position}</span>` : ""}
      ${member.bio ? html`<div class="team__more"><p class="team__bio">${member.bio}</p></div>` : ""}
    </figure>`;
}

// someone already signed in (back here from the sidebar): the sign-in and join buttons take them to their own library instead
function welcomeBack(): void {
  const home = homeFor(current().profile);
  const label = home.startsWith("/panel") ? "Open the panel" : "Open the library";
  document.querySelectorAll<HTMLAnchorElement>('main a[href="/register"], main a[href="/login"]').forEach((link) => {
    // a pair like "Create an account / Sign in" would become two identical buttons: keep the first
    const twin = [...(link.parentElement?.children ?? [])].find((el) => el !== link && el instanceof HTMLAnchorElement && el.href === new URL(home, location.href).href);
    link.href = home;
    if (twin) link.hidden = true;
    else link.replaceChildren(label);
  });
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
    location.href = isMember() ? target : `/login?next=${encodeURIComponent(target)}`;
  });
  if (isMember()) welcomeBack();

  const [books, cats, news, stats, people, settings] = await Promise.all([featuredBooks(4), categories(), announcements(3), publicStats(), team(), publicSettings()]);
  fillFooter(settings);

  mount(qs("#heroStats"), html`
    <div><strong>${stats.titles}</strong><span>titles in the catalog</span></div>
    <div><strong>${stats.students}</strong><span>student readers</span></div>`);

  mount(qs("#homeStats"), html`
    ${statCard("Books on the shelves", cats.reduce((sum, c) => sum + c.total, 0), "book")}
    ${statCard("Subjects", cats.length, "tag")}
    ${statCard("Latest updates", news.length, "news")}`);

  mount(qs("#homeBooks"), books.length
    ? html`${books.map((b) => html`
        <a class="book-card card px card--lift" href="${isMember() ? homeFor(current().profile) : "/login"}" data-reveal>
          ${cover(b)}<h3 class="book-card__title">${b.title}</h3><p class="book-card__author">${b.author}</p>
        </a>`)}`
    : empty("No books yet", "The shelves are being stocked."));

  const hours = settingText(settings, "library_hours");
  const contact = settingText(settings, "library_contact");
  const [lead, ...others] = news;
  mount(qs("#homeNews"), lead
    ? html`
      <article class="news-feature card px" data-reveal>
        <time class="date-stamp" datetime="${lead.created_at}"><span class="date-stamp__month">${stamp(lead.created_at, { month: "short" })}</span><span class="date-stamp__day">${stamp(lead.created_at, { day: "numeric" })}</span><span class="date-stamp__year">${stamp(lead.created_at, { year: "numeric" })}</span></time>
        <div class="news-feature__body">
          <h3>${lead.title}</h3>
          <p>${lead.body.length > 420 ? `${lead.body.slice(0, 420)}...` : lead.body}</p>
        </div>
      </article>
      <aside class="news-side card px" aria-label="Visit and more news">
        <h3>Visit the library</h3>
        <dl class="news-visit">
          <div>${icon("clock")}<span><dt>Opening hours</dt><dd>${hours || "Posted in the library news"}</dd></span></div>
          ${contact ? html`<div>${icon("mail")}<span><dt>Contact</dt><dd>${contact}</dd></span></div>` : ""}
        </dl>
        ${others.length ? html`<h3>More news</h3><ul class="news-more">${others.map((n) => html`<li><strong>${n.title}</strong><span class="news-item__date">${formatDate(n.created_at)}</span></li>`)}</ul>` : ""}
      </aside>`
    : empty("All quiet", "No announcements right now."));

  if (people.length) {
    qs("#team").hidden = false;
    mount(qs("#teamGrid"), html`${people.map(person)}`);
  }
  void settingText;
});
