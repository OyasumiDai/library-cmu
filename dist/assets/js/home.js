import {
  categories,
  featuredBooks
} from "./chunks/chunk-BJZOPE75.js";
import "./chunks/chunk-OAO6RVBP.js";
import {
  cover,
  empty,
  statCard
} from "./chunks/chunk-YFDTB4J4.js";
import {
  announcements,
  boot,
  fillFooter,
  formatDate,
  html,
  icon,
  isConfigured,
  mount,
  publicSettings,
  publicStats,
  qs,
  settingText,
  team,
  typewriter
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/home.ts
var stamp = (iso, part) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...part }).format(new Date(iso));
function person(member) {
  return html`
    <figure class="team card px" data-reveal tabindex="0">
      ${member.photo_url ? html`<img class="team__photo" src="${member.photo_url}" alt="">` : html`<span class="avatar avatar--lg">${member.name.slice(0, 2)}</span>`}
      <strong class="team__name">${member.name}</strong>
      ${member.position ? html`<span class="team__role">${member.position}</span>` : ""}
      ${member.bio ? html`<div class="team__more"><p class="team__bio">${member.bio}</p></div>` : ""}
    </figure>`;
}
boot(async () => {
  const tagline = qs("#heroTagline");
  typewriter(tagline, tagline.dataset.text ?? "");
  if (!isConfigured()) return;
  qs("#quickSearch").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = form.elements.namedItem("q").value.trim();
    const kind = form.elements.namedItem("filter").value;
    const target = `/catalog?${new URLSearchParams({ ...text ? { q: text } : {}, ...kind === "available" ? { availability: "available" } : {} })}`;
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
  mount(qs("#homeBooks"), books.length ? html`${books.map((b) => html`
        <a class="book-card card px card--lift" href="/login" data-reveal>
          ${cover(b)}<h3 class="book-card__title">${b.title}</h3><p class="book-card__author">${b.author}</p>
        </a>`)}` : empty("No books yet", "The shelves are being stocked."));
  const hours = settingText(settings, "library_hours");
  const contact = settingText(settings, "library_contact");
  const [lead, ...others] = news;
  mount(qs("#homeNews"), lead ? html`
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
      </aside>` : empty("All quiet", "No announcements right now."));
  if (people.length) {
    qs("#team").hidden = false;
    mount(qs("#teamGrid"), html`${people.map(person)}`);
  }
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL2hvbWUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGFubm91bmNlbWVudHMsIHB1YmxpY1NldHRpbmdzLCBwdWJsaWNTdGF0cywgc2V0dGluZ1RleHQsIHRlYW0gfSBmcm9tIFwiLi4vYXBpL2NvbnRlbnRcIjtcclxuaW1wb3J0IHsgY2F0ZWdvcmllcywgZmVhdHVyZWRCb29rcyB9IGZyb20gXCIuLi9hcGkvY2F0YWxvZ1wiO1xyXG5pbXBvcnQgeyBib290IH0gZnJvbSBcIi4uL2NvcmUvYm9vdFwiO1xyXG5pbXBvcnQgeyBodG1sLCBpY29uLCBtb3VudCwgcXMgfSBmcm9tIFwiLi4vY29yZS9kb21cIjtcclxuaW1wb3J0IHsgZm9ybWF0RGF0ZSB9IGZyb20gXCIuLi9jb3JlL2Zvcm1hdFwiO1xyXG5pbXBvcnQgeyB0eXBld3JpdGVyIH0gZnJvbSBcIi4uL2NvcmUvbW90aW9uXCI7XHJcbmltcG9ydCB7IGlzQ29uZmlndXJlZCB9IGZyb20gXCIuLi9jb3JlL3N1cGFiYXNlXCI7XHJcbmltcG9ydCB7IGNvdmVyLCBlbXB0eSwgc3RhdENhcmQgfSBmcm9tIFwiLi4vdWkvY29tcG9uZW50c1wiO1xyXG5pbXBvcnQgeyBmaWxsRm9vdGVyIH0gZnJvbSBcIi4uL3VpL2Zvb3RlclwiO1xyXG5pbXBvcnQgdHlwZSB7IFRlYW1NZW1iZXIgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuXHJcbmNvbnN0IHN0YW1wID0gKGlzbzogc3RyaW5nLCBwYXJ0OiBJbnRsLkRhdGVUaW1lRm9ybWF0T3B0aW9ucyk6IHN0cmluZyA9PiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdChcImVuLVBIXCIsIHsgdGltZVpvbmU6IFwiQXNpYS9NYW5pbGFcIiwgLi4ucGFydCB9KS5mb3JtYXQobmV3IERhdGUoaXNvKSk7XHJcblxyXG5mdW5jdGlvbiBwZXJzb24obWVtYmVyOiBUZWFtTWVtYmVyKSB7XHJcbiAgcmV0dXJuIGh0bWxgXHJcbiAgICA8ZmlndXJlIGNsYXNzPVwidGVhbSBjYXJkIHB4XCIgZGF0YS1yZXZlYWwgdGFiaW5kZXg9XCIwXCI+XHJcbiAgICAgICR7bWVtYmVyLnBob3RvX3VybCA/IGh0bWxgPGltZyBjbGFzcz1cInRlYW1fX3Bob3RvXCIgc3JjPVwiJHttZW1iZXIucGhvdG9fdXJsfVwiIGFsdD1cIlwiPmAgOiBodG1sYDxzcGFuIGNsYXNzPVwiYXZhdGFyIGF2YXRhci0tbGdcIj4ke21lbWJlci5uYW1lLnNsaWNlKDAsIDIpfTwvc3Bhbj5gfVxyXG4gICAgICA8c3Ryb25nIGNsYXNzPVwidGVhbV9fbmFtZVwiPiR7bWVtYmVyLm5hbWV9PC9zdHJvbmc+XHJcbiAgICAgICR7bWVtYmVyLnBvc2l0aW9uID8gaHRtbGA8c3BhbiBjbGFzcz1cInRlYW1fX3JvbGVcIj4ke21lbWJlci5wb3NpdGlvbn08L3NwYW4+YCA6IFwiXCJ9XHJcbiAgICAgICR7bWVtYmVyLmJpbyA/IGh0bWxgPGRpdiBjbGFzcz1cInRlYW1fX21vcmVcIj48cCBjbGFzcz1cInRlYW1fX2Jpb1wiPiR7bWVtYmVyLmJpb308L3A+PC9kaXY+YCA6IFwiXCJ9XHJcbiAgICA8L2ZpZ3VyZT5gO1xyXG59XHJcblxyXG5ib290KGFzeW5jICgpID0+IHtcclxuICBjb25zdCB0YWdsaW5lID0gcXMoXCIjaGVyb1RhZ2xpbmVcIik7XHJcbiAgdHlwZXdyaXRlcih0YWdsaW5lLCB0YWdsaW5lLmRhdGFzZXQudGV4dCA/PyBcIlwiKTtcclxuICBpZiAoIWlzQ29uZmlndXJlZCgpKSByZXR1cm47XHJcblxyXG4gIC8vIHRoZSBzZWFyY2ggYm94IG9uIHRoZSBob21lIHBhZ2U6IGd1ZXN0cyBhcmUgYXNrZWQgdG8gc2lnbiBpbiwgdGhlbiBsYW5kIG9uIHRoZSByZXN1bHRzXHJcbiAgcXM8SFRNTEZvcm1FbGVtZW50PihcIiNxdWlja1NlYXJjaFwiKS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChldmVudCkgPT4ge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGNvbnN0IGZvcm0gPSBldmVudC5jdXJyZW50VGFyZ2V0IGFzIEhUTUxGb3JtRWxlbWVudDtcclxuICAgIGNvbnN0IHRleHQgPSAoZm9ybS5lbGVtZW50cy5uYW1lZEl0ZW0oXCJxXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlLnRyaW0oKTtcclxuICAgIGNvbnN0IGtpbmQgPSAoZm9ybS5lbGVtZW50cy5uYW1lZEl0ZW0oXCJmaWx0ZXJcIikgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgY29uc3QgdGFyZ2V0ID0gYC9jYXRhbG9nPyR7bmV3IFVSTFNlYXJjaFBhcmFtcyh7IC4uLih0ZXh0ID8geyBxOiB0ZXh0IH0gOiB7fSksIC4uLihraW5kID09PSBcImF2YWlsYWJsZVwiID8geyBhdmFpbGFiaWxpdHk6IFwiYXZhaWxhYmxlXCIgfSA6IHt9KSB9KX1gO1xyXG4gICAgbG9jYXRpb24uaHJlZiA9IGAvbG9naW4/bmV4dD0ke2VuY29kZVVSSUNvbXBvbmVudCh0YXJnZXQpfWA7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IFtib29rcywgY2F0cywgbmV3cywgc3RhdHMsIHBlb3BsZSwgc2V0dGluZ3NdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2ZlYXR1cmVkQm9va3MoNCksIGNhdGVnb3JpZXMoKSwgYW5ub3VuY2VtZW50cygzKSwgcHVibGljU3RhdHMoKSwgdGVhbSgpLCBwdWJsaWNTZXR0aW5ncygpXSk7XHJcbiAgZmlsbEZvb3RlcihzZXR0aW5ncyk7XHJcblxyXG4gIG1vdW50KHFzKFwiI2hlcm9TdGF0c1wiKSwgaHRtbGBcclxuICAgIDxkaXY+PHN0cm9uZz4ke3N0YXRzLnRpdGxlc308L3N0cm9uZz48c3Bhbj50aXRsZXMgaW4gdGhlIGNhdGFsb2c8L3NwYW4+PC9kaXY+XHJcbiAgICA8ZGl2PjxzdHJvbmc+JHtzdGF0cy5zdHVkZW50c308L3N0cm9uZz48c3Bhbj5zdHVkZW50IHJlYWRlcnM8L3NwYW4+PC9kaXY+XHJcbiAgICA8ZGl2PjxzdHJvbmc+JHtzdGF0cy5nYW1lc308L3N0cm9uZz48c3Bhbj4ke3N0YXRzLmdhbWVzID09PSAxID8gXCJnYW1lIGhvc3RlZFwiIDogXCJnYW1lcyBob3N0ZWRcIn08L3NwYW4+PC9kaXY+YCk7XHJcblxyXG4gIG1vdW50KHFzKFwiI2hvbWVTdGF0c1wiKSwgaHRtbGBcclxuICAgICR7c3RhdENhcmQoXCJCb29rcyBvbiB0aGUgc2hlbHZlc1wiLCBjYXRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLnRvdGFsLCAwKSwgXCJib29rXCIpfVxyXG4gICAgJHtzdGF0Q2FyZChcIlN1YmplY3RzXCIsIGNhdHMubGVuZ3RoLCBcInRhZ1wiKX1cclxuICAgICR7c3RhdENhcmQoXCJMYXRlc3QgdXBkYXRlc1wiLCBuZXdzLmxlbmd0aCwgXCJuZXdzXCIpfWApO1xyXG5cclxuICBtb3VudChxcyhcIiNob21lQm9va3NcIiksIGJvb2tzLmxlbmd0aFxyXG4gICAgPyBodG1sYCR7Ym9va3MubWFwKChiKSA9PiBodG1sYFxyXG4gICAgICAgIDxhIGNsYXNzPVwiYm9vay1jYXJkIGNhcmQgcHggY2FyZC0tbGlmdFwiIGhyZWY9XCIvbG9naW5cIiBkYXRhLXJldmVhbD5cclxuICAgICAgICAgICR7Y292ZXIoYil9PGgzIGNsYXNzPVwiYm9vay1jYXJkX190aXRsZVwiPiR7Yi50aXRsZX08L2gzPjxwIGNsYXNzPVwiYm9vay1jYXJkX19hdXRob3JcIj4ke2IuYXV0aG9yfTwvcD5cclxuICAgICAgICA8L2E+YCl9YFxyXG4gICAgOiBlbXB0eShcIk5vIGJvb2tzIHlldFwiLCBcIlRoZSBzaGVsdmVzIGFyZSBiZWluZyBzdG9ja2VkLlwiKSk7XHJcblxyXG4gIGNvbnN0IGhvdXJzID0gc2V0dGluZ1RleHQoc2V0dGluZ3MsIFwibGlicmFyeV9ob3Vyc1wiKTtcclxuICBjb25zdCBjb250YWN0ID0gc2V0dGluZ1RleHQoc2V0dGluZ3MsIFwibGlicmFyeV9jb250YWN0XCIpO1xyXG4gIGNvbnN0IFtsZWFkLCAuLi5vdGhlcnNdID0gbmV3cztcclxuICBtb3VudChxcyhcIiNob21lTmV3c1wiKSwgbGVhZFxyXG4gICAgPyBodG1sYFxyXG4gICAgICA8YXJ0aWNsZSBjbGFzcz1cIm5ld3MtZmVhdHVyZSBjYXJkIHB4XCIgZGF0YS1yZXZlYWw+XHJcbiAgICAgICAgPHRpbWUgY2xhc3M9XCJkYXRlLXN0YW1wXCIgZGF0ZXRpbWU9XCIke2xlYWQuY3JlYXRlZF9hdH1cIj48c3BhbiBjbGFzcz1cImRhdGUtc3RhbXBfX21vbnRoXCI+JHtzdGFtcChsZWFkLmNyZWF0ZWRfYXQsIHsgbW9udGg6IFwic2hvcnRcIiB9KX08L3NwYW4+PHNwYW4gY2xhc3M9XCJkYXRlLXN0YW1wX19kYXlcIj4ke3N0YW1wKGxlYWQuY3JlYXRlZF9hdCwgeyBkYXk6IFwibnVtZXJpY1wiIH0pfTwvc3Bhbj48c3BhbiBjbGFzcz1cImRhdGUtc3RhbXBfX3llYXJcIj4ke3N0YW1wKGxlYWQuY3JlYXRlZF9hdCwgeyB5ZWFyOiBcIm51bWVyaWNcIiB9KX08L3NwYW4+PC90aW1lPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuZXdzLWZlYXR1cmVfX2JvZHlcIj5cclxuICAgICAgICAgIDxoMz4ke2xlYWQudGl0bGV9PC9oMz5cclxuICAgICAgICAgIDxwPiR7bGVhZC5ib2R5Lmxlbmd0aCA+IDQyMCA/IGAke2xlYWQuYm9keS5zbGljZSgwLCA0MjApfS4uLmAgOiBsZWFkLmJvZHl9PC9wPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICA8L2FydGljbGU+XHJcbiAgICAgIDxhc2lkZSBjbGFzcz1cIm5ld3Mtc2lkZSBjYXJkIHB4XCIgYXJpYS1sYWJlbD1cIlZpc2l0IGFuZCBtb3JlIG5ld3NcIj5cclxuICAgICAgICA8aDM+VmlzaXQgdGhlIGxpYnJhcnk8L2gzPlxyXG4gICAgICAgIDxkbCBjbGFzcz1cIm5ld3MtdmlzaXRcIj5cclxuICAgICAgICAgIDxkaXY+JHtpY29uKFwiY2xvY2tcIil9PHNwYW4+PGR0Pk9wZW5pbmcgaG91cnM8L2R0PjxkZD4ke2hvdXJzIHx8IFwiUG9zdGVkIGluIHRoZSBsaWJyYXJ5IG5ld3NcIn08L2RkPjwvc3Bhbj48L2Rpdj5cclxuICAgICAgICAgICR7Y29udGFjdCA/IGh0bWxgPGRpdj4ke2ljb24oXCJtYWlsXCIpfTxzcGFuPjxkdD5Db250YWN0PC9kdD48ZGQ+JHtjb250YWN0fTwvZGQ+PC9zcGFuPjwvZGl2PmAgOiBcIlwifVxyXG4gICAgICAgIDwvZGw+XHJcbiAgICAgICAgJHtvdGhlcnMubGVuZ3RoID8gaHRtbGA8aDM+TW9yZSBuZXdzPC9oMz48dWwgY2xhc3M9XCJuZXdzLW1vcmVcIj4ke290aGVycy5tYXAoKG4pID0+IGh0bWxgPGxpPjxzdHJvbmc+JHtuLnRpdGxlfTwvc3Ryb25nPjxzcGFuIGNsYXNzPVwibmV3cy1pdGVtX19kYXRlXCI+JHtmb3JtYXREYXRlKG4uY3JlYXRlZF9hdCl9PC9zcGFuPjwvbGk+YCl9PC91bD5gIDogXCJcIn1cclxuICAgICAgPC9hc2lkZT5gXHJcbiAgICA6IGVtcHR5KFwiQWxsIHF1aWV0XCIsIFwiTm8gYW5ub3VuY2VtZW50cyByaWdodCBub3cuXCIpKTtcclxuXHJcbiAgaWYgKHBlb3BsZS5sZW5ndGgpIHtcclxuICAgIHFzKFwiI3RlYW1cIikuaGlkZGVuID0gZmFsc2U7XHJcbiAgICBtb3VudChxcyhcIiN0ZWFtR3JpZFwiKSwgaHRtbGAke3Blb3BsZS5tYXAocGVyc29uKX1gKTtcclxuICB9XHJcbiAgdm9pZCBzZXR0aW5nVGV4dDtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFXQSxJQUFNLFFBQVEsQ0FBQyxLQUFhLFNBQTZDLElBQUksS0FBSyxlQUFlLFNBQVMsRUFBRSxVQUFVLGVBQWUsR0FBRyxLQUFLLENBQUMsRUFBRSxPQUFPLElBQUksS0FBSyxHQUFHLENBQUM7QUFFcEssU0FBUyxPQUFPLFFBQW9CO0FBQ2xDLFNBQU87QUFBQTtBQUFBLFFBRUQsT0FBTyxZQUFZLHFDQUFxQyxP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
