// One script for the four text pages (about, help, terms, privacy). The words live in the
// content_pages table, so admins edit them in the panel and nothing is hard-coded here.
import { contentPage, team } from "../api/content";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { formatDate } from "../core/format";
import type { ContentBody, TeamMember } from "../types";

const PRIVACY_FALLBACK: ContentBody = {
  sections: [
    { title: "What we keep", paragraphs: ["Your name, school email, student ID, course and the books you request or read. This is used only to run the library."] },
    { title: "Who can see it", paragraphs: ["You can see your own records. Library staff can see borrowing records to lend and recover books. We never sell your information."] },
    { title: "Your choices", paragraphs: ["You can update your details from your profile at any time. Ask library staff to close your account or remove your records."] },
  ],
};

const paragraphs = (list: string[] = []) => html`${list.map((p) => html`<p>${p}</p>`)}`;

function sections(body: ContentBody) {
  return html`
    ${body.last_updated ? html`<p class="text-soft">Version ${body.version ?? ""} · Updated ${body.last_updated}</p>` : ""}
    ${paragraphs(body.paragraphs)}
    ${(body.sections ?? []).map((s) => html`<h2>${s.title}</h2>${paragraphs(s.paragraphs)}`)}`;
}

function faq(body: ContentBody) {
  return html`<div class="faq">${(body.items ?? []).map((item, i) => html`
    <div class="faq__item card px px--flat">
      <button class="faq__q" type="button" data-action="faq" aria-expanded="false" aria-controls="faq-${i}">${item.title}${icon("chevron-down")}</button>
      <div class="faq__a" id="faq-${i}" hidden><p>${item.body}</p></div>
    </div>`)}</div>`;
}

function person(member: TeamMember) {
  return html`
    <figure class="team card px" data-reveal>
      ${member.photo_url ? html`<img class="team__photo" src="${member.photo_url}" alt="">` : html`<span class="avatar avatar--lg">${member.name.slice(0, 2)}</span>`}
      <strong>${member.name}</strong>
      <span class="text-soft">${member.position}</span>
      ${member.bio ? html`<small>${member.bio}</small>` : ""}
    </figure>`;
}

boot(async () => {
  const root = qs("[data-page-root]");
  const slug = root.dataset.slug ?? "";
  const page = await contentPage(slug);
  const body = page?.body ?? (slug === "privacy" ? PRIVACY_FALLBACK : {});
  qs("#pageTitle").textContent = page?.title ?? qs("#pageTitle").textContent;
  const target = qs("#pageBody");
  mount(target, slug === "help" ? faq(body) : sections(body));
  if (slug === "help") target.classList.remove("prose");
  if (page?.updated_at && slug !== "terms") target.append(Object.assign(document.createElement("p"), { className: "text-soft", textContent: `Last edited ${formatDate(page.updated_at)}` }));

  actions(target, {
    faq: (button) => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      (document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLElement).hidden = open;
    },
  });

  if (slug === "about") {
    const people = await team();
    if (people.length) {
      qs("#teamSection").hidden = false;
      mount(qs("#teamGrid"), html`${people.map(person)}`);
    }
  }
});
