import {
  actions,
  boot,
  contentPage,
  formatDate,
  html,
  icon,
  mount,
  qs,
  team
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/content.ts
var PRIVACY_FALLBACK = {
  sections: [
    { title: "What we keep", paragraphs: ["Your name, school email, student ID, course and the books you request or read. This is used only to run the library."] },
    { title: "Who can see it", paragraphs: ["You can see your own records. Library staff can see borrowing records to lend and recover books. We never sell your information."] },
    { title: "Your choices", paragraphs: ["You can update your details from your profile at any time. Ask library staff to close your account or remove your records."] }
  ]
};
var paragraphs = (list = []) => html`${list.map((p) => html`<p>${p}</p>`)}`;
function sections(body) {
  return html`
    ${body.last_updated ? html`<p class="text-soft">Version ${body.version ?? ""} · Updated ${body.last_updated}</p>` : ""}
    ${paragraphs(body.paragraphs)}
    ${(body.sections ?? []).map((s) => html`<h2>${s.title}</h2>${paragraphs(s.paragraphs)}`)}`;
}
function faq(body) {
  return html`<div class="faq">${(body.items ?? []).map((item, i) => html`
    <div class="faq__item card px px--flat">
      <button class="faq__q" type="button" data-action="faq" aria-expanded="false" aria-controls="faq-${i}">${item.title}${icon("chevron-down")}</button>
      <div class="faq__a" id="faq-${i}" hidden><p>${item.body}</p></div>
    </div>`)}</div>`;
}
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
      document.getElementById(button.getAttribute("aria-controls") ?? "").hidden = open;
    }
  });
  if (slug === "about") {
    const people = await team();
    if (people.length) {
      qs("#teamSection").hidden = false;
      mount(qs("#teamGrid"), html`${people.map(person)}`);
    }
  }
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL2NvbnRlbnQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIE9uZSBzY3JpcHQgZm9yIHRoZSBmb3VyIHRleHQgcGFnZXMgKGFib3V0LCBoZWxwLCB0ZXJtcywgcHJpdmFjeSkuIFRoZSB3b3JkcyBsaXZlIGluIHRoZVxyXG4vLyBjb250ZW50X3BhZ2VzIHRhYmxlLCBzbyBhZG1pbnMgZWRpdCB0aGVtIGluIHRoZSBwYW5lbCBhbmQgbm90aGluZyBpcyBoYXJkLWNvZGVkIGhlcmUuXHJcbmltcG9ydCB7IGNvbnRlbnRQYWdlLCB0ZWFtIH0gZnJvbSBcIi4uL2FwaS9jb250ZW50XCI7XHJcbmltcG9ydCB7IGJvb3QgfSBmcm9tIFwiLi4vY29yZS9ib290XCI7XHJcbmltcG9ydCB7IGFjdGlvbnMsIGh0bWwsIGljb24sIG1vdW50LCBxcyB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xyXG5pbXBvcnQgeyBmb3JtYXREYXRlIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XHJcbmltcG9ydCB0eXBlIHsgQ29udGVudEJvZHksIFRlYW1NZW1iZXIgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuXHJcbmNvbnN0IFBSSVZBQ1lfRkFMTEJBQ0s6IENvbnRlbnRCb2R5ID0ge1xyXG4gIHNlY3Rpb25zOiBbXHJcbiAgICB7IHRpdGxlOiBcIldoYXQgd2Uga2VlcFwiLCBwYXJhZ3JhcGhzOiBbXCJZb3VyIG5hbWUsIHNjaG9vbCBlbWFpbCwgc3R1ZGVudCBJRCwgY291cnNlIGFuZCB0aGUgYm9va3MgeW91IHJlcXVlc3Qgb3IgcmVhZC4gVGhpcyBpcyB1c2VkIG9ubHkgdG8gcnVuIHRoZSBsaWJyYXJ5LlwiXSB9LFxyXG4gICAgeyB0aXRsZTogXCJXaG8gY2FuIHNlZSBpdFwiLCBwYXJhZ3JhcGhzOiBbXCJZb3UgY2FuIHNlZSB5b3VyIG93biByZWNvcmRzLiBMaWJyYXJ5IHN0YWZmIGNhbiBzZWUgYm9ycm93aW5nIHJlY29yZHMgdG8gbGVuZCBhbmQgcmVjb3ZlciBib29rcy4gV2UgbmV2ZXIgc2VsbCB5b3VyIGluZm9ybWF0aW9uLlwiXSB9LFxyXG4gICAgeyB0aXRsZTogXCJZb3VyIGNob2ljZXNcIiwgcGFyYWdyYXBoczogW1wiWW91IGNhbiB1cGRhdGUgeW91ciBkZXRhaWxzIGZyb20geW91ciBwcm9maWxlIGF0IGFueSB0aW1lLiBBc2sgbGlicmFyeSBzdGFmZiB0byBjbG9zZSB5b3VyIGFjY291bnQgb3IgcmVtb3ZlIHlvdXIgcmVjb3Jkcy5cIl0gfSxcclxuICBdLFxyXG59O1xyXG5cclxuY29uc3QgcGFyYWdyYXBocyA9IChsaXN0OiBzdHJpbmdbXSA9IFtdKSA9PiBodG1sYCR7bGlzdC5tYXAoKHApID0+IGh0bWxgPHA+JHtwfTwvcD5gKX1gO1xyXG5cclxuZnVuY3Rpb24gc2VjdGlvbnMoYm9keTogQ29udGVudEJvZHkpIHtcclxuICByZXR1cm4gaHRtbGBcclxuICAgICR7Ym9keS5sYXN0X3VwZGF0ZWQgPyBodG1sYDxwIGNsYXNzPVwidGV4dC1zb2Z0XCI+VmVyc2lvbiAke2JvZHkudmVyc2lvbiA/PyBcIlwifSBcdTAwQjcgVXBkYXRlZCAke2JvZHkubGFzdF91cGRhdGVkfTwvcD5gIDogXCJcIn1cclxuICAgICR7cGFyYWdyYXBocyhib2R5LnBhcmFncmFwaHMpfVxyXG4gICAgJHsoYm9keS5zZWN0aW9ucyA/PyBbXSkubWFwKChzKSA9PiBodG1sYDxoMj4ke3MudGl0bGV9PC9oMj4ke3BhcmFncmFwaHMocy5wYXJhZ3JhcGhzKX1gKX1gO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmYXEoYm9keTogQ29udGVudEJvZHkpIHtcclxuICByZXR1cm4gaHRtbGA8ZGl2IGNsYXNzPVwiZmFxXCI+JHsoYm9keS5pdGVtcyA/PyBbXSkubWFwKChpdGVtLCBpKSA9PiBodG1sYFxyXG4gICAgPGRpdiBjbGFzcz1cImZhcV9faXRlbSBjYXJkIHB4IHB4LS1mbGF0XCI+XHJcbiAgICAgIDxidXR0b24gY2xhc3M9XCJmYXFfX3FcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJmYXFcIiBhcmlhLWV4cGFuZGVkPVwiZmFsc2VcIiBhcmlhLWNvbnRyb2xzPVwiZmFxLSR7aX1cIj4ke2l0ZW0udGl0bGV9JHtpY29uKFwiY2hldnJvbi1kb3duXCIpfTwvYnV0dG9uPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZmFxX19hXCIgaWQ9XCJmYXEtJHtpfVwiIGhpZGRlbj48cD4ke2l0ZW0uYm9keX08L3A+PC9kaXY+XHJcbiAgICA8L2Rpdj5gKX08L2Rpdj5gO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwZXJzb24obWVtYmVyOiBUZWFtTWVtYmVyKSB7XHJcbiAgcmV0dXJuIGh0bWxgXHJcbiAgICA8ZmlndXJlIGNsYXNzPVwidGVhbSBjYXJkIHB4XCIgZGF0YS1yZXZlYWwgdGFiaW5kZXg9XCIwXCI+XHJcbiAgICAgICR7bWVtYmVyLnBob3RvX3VybCA/IGh0bWxgPGltZyBjbGFzcz1cInRlYW1fX3Bob3RvXCIgc3JjPVwiJHttZW1iZXIucGhvdG9fdXJsfVwiIGFsdD1cIlwiPmAgOiBodG1sYDxzcGFuIGNsYXNzPVwiYXZhdGFyIGF2YXRhci0tbGdcIj4ke21lbWJlci5uYW1lLnNsaWNlKDAsIDIpfTwvc3Bhbj5gfVxyXG4gICAgICA8c3Ryb25nIGNsYXNzPVwidGVhbV9fbmFtZVwiPiR7bWVtYmVyLm5hbWV9PC9zdHJvbmc+XHJcbiAgICAgICR7bWVtYmVyLnBvc2l0aW9uID8gaHRtbGA8c3BhbiBjbGFzcz1cInRlYW1fX3JvbGVcIj4ke21lbWJlci5wb3NpdGlvbn08L3NwYW4+YCA6IFwiXCJ9XHJcbiAgICAgICR7bWVtYmVyLmJpbyA/IGh0bWxgPGRpdiBjbGFzcz1cInRlYW1fX21vcmVcIj48cCBjbGFzcz1cInRlYW1fX2Jpb1wiPiR7bWVtYmVyLmJpb308L3A+PC9kaXY+YCA6IFwiXCJ9XHJcbiAgICA8L2ZpZ3VyZT5gO1xyXG59XHJcblxyXG5ib290KGFzeW5jICgpID0+IHtcclxuICBjb25zdCByb290ID0gcXMoXCJbZGF0YS1wYWdlLXJvb3RdXCIpO1xyXG4gIGNvbnN0IHNsdWcgPSByb290LmRhdGFzZXQuc2x1ZyA/PyBcIlwiO1xyXG4gIGNvbnN0IHBhZ2UgPSBhd2FpdCBjb250ZW50UGFnZShzbHVnKTtcclxuICBjb25zdCBib2R5ID0gcGFnZT8uYm9keSA/PyAoc2x1ZyA9PT0gXCJwcml2YWN5XCIgPyBQUklWQUNZX0ZBTExCQUNLIDoge30pO1xyXG4gIHFzKFwiI3BhZ2VUaXRsZVwiKS50ZXh0Q29udGVudCA9IHBhZ2U/LnRpdGxlID8/IHFzKFwiI3BhZ2VUaXRsZVwiKS50ZXh0Q29udGVudDtcclxuICBjb25zdCB0YXJnZXQgPSBxcyhcIiNwYWdlQm9keVwiKTtcclxuICBtb3VudCh0YXJnZXQsIHNsdWcgPT09IFwiaGVscFwiID8gZmFxKGJvZHkpIDogc2VjdGlvbnMoYm9keSkpO1xyXG4gIGlmIChzbHVnID09PSBcImhlbHBcIikgdGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoXCJwcm9zZVwiKTtcclxuICBpZiAocGFnZT8udXBkYXRlZF9hdCAmJiBzbHVnICE9PSBcInRlcm1zXCIpIHRhcmdldC5hcHBlbmQoT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKSwgeyBjbGFzc05hbWU6IFwidGV4dC1zb2Z0XCIsIHRleHRDb250ZW50OiBgTGFzdCBlZGl0ZWQgJHtmb3JtYXREYXRlKHBhZ2UudXBkYXRlZF9hdCl9YCB9KSk7XHJcblxyXG4gIGFjdGlvbnModGFyZ2V0LCB7XHJcbiAgICBmYXE6IChidXR0b24pID0+IHtcclxuICAgICAgY29uc3Qgb3BlbiA9IGJ1dHRvbi5nZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIpID09PSBcInRydWVcIjtcclxuICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtZXhwYW5kZWRcIiwgU3RyaW5nKCFvcGVuKSk7XHJcbiAgICAgIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b24uZ2V0QXR0cmlidXRlKFwiYXJpYS1jb250cm9sc1wiKSA/PyBcIlwiKSBhcyBIVE1MRWxlbWVudCkuaGlkZGVuID0gb3BlbjtcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIGlmIChzbHVnID09PSBcImFib3V0XCIpIHtcclxuICAgIGNvbnN0IHBlb3BsZSA9IGF3YWl0IHRlYW0oKTtcclxuICAgIGlmIChwZW9wbGUubGVuZ3RoKSB7XHJcbiAgICAgIHFzKFwiI3RlYW1TZWN0aW9uXCIpLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICBtb3VudChxcyhcIiN0ZWFtR3JpZFwiKSwgaHRtbGAke3Blb3BsZS5tYXAocGVyc29uKX1gKTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7O0FBUUEsSUFBTSxtQkFBZ0M7QUFBQSxFQUNwQyxVQUFVO0FBQUEsSUFDUixFQUFFLE9BQU8sZ0JBQWdCLFlBQVksQ0FBQyxzSEFBc0gsRUFBRTtBQUFBLElBQzlKLEVBQUUsT0FBTyxrQkFBa0IsWUFBWSxDQUFDLGtJQUFrSSxFQUFFO0FBQUEsSUFDNUssRUFBRSxPQUFPLGdCQUFnQixZQUFZLENBQUMsNEhBQTRILEVBQUU7QUFBQSxFQUN0SztBQUNGO0FBRUEsSUFBTSxhQUFhLENBQUMsT0FBaUIsQ0FBQyxNQUFNLE9BQU8sS0FBSyxJQUFJLENBQUMsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDO0FBRXJGLFNBQVMsU0FBUyxNQUFtQjtBQUNuQyxTQUFPO0FBQUEsTUFDSCxLQUFLLGVBQWUsb0NBQW9DLEtBQUssV0FBVyxFQUFFLGNBQWMsS0FBSyxZQUFZLFNBQVMsRUFBRTtBQUFBLE1BQ3BILFdBQVcsS0FBSyxVQUFVLENBQUM7QUFBQSxPQUMxQixLQUFLLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLFdBQVcsRUFBRSxLQUFLLFFBQVEsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7QUFDNUY7QUFFQSxTQUFTLElBQUksTUFBbUI7QUFDOUIsU0FBTyx5QkFBeUIsS0FBSyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxNQUFNO0FBQUE7QUFBQSx3R0FFbUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxHQUFHLEtBQUssY0FBYyxDQUFDO0FBQUEsb0NBQzNHLENBQUMsZUFBZSxLQUFLLElBQUk7QUFBQSxXQUNsRCxDQUFDO0FBQ1o7QUFFQSxTQUFTLE9BQU8sUUFBb0I7QUFDbEMsU0FBTztBQUFBO0FBQUEsUUFFRCxPQUFPLFlBQVkscUNBQXFDLE9BQU8sU0FBUyxjQUFjLHVDQUF1QyxPQUFPLEtBQUssTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTO0FBQUEsbUNBQ2xJLE9BQU8sSUFBSTtBQUFBLFFBQ3RDLE9BQU8sV0FBVyxnQ0FBZ0MsT0FBTyxRQUFRLFlBQVksRUFBRTtBQUFBLFFBQy9FLE9BQU8sTUFBTSxvREFBb0QsT0FBTyxHQUFHLGVBQWUsRUFBRTtBQUFBO0FBRXBHO0FBRUEsS0FBSyxZQUFZO0FBQ2YsUUFBTSxPQUFPLEdBQUcsa0JBQWtCO0FBQ2xDLFFBQU0sT0FBTyxLQUFLLFFBQVEsUUFBUTtBQUNsQyxRQUFNLE9BQU8sTUFBTSxZQUFZLElBQUk7QUFDbkMsUUFBTSxPQUFPLE1BQU0sU0FBUyxTQUFTLFlBQVksbUJBQW1CLENBQUM7QUFDckUsS0FBRyxZQUFZLEVBQUUsY0FBYyxNQUFNLFNBQVMsR0FBRyxZQUFZLEVBQUU7QUFDL0QsUUFBTSxTQUFTLEdBQUcsV0FBVztBQUM3QixRQUFNLFFBQVEsU0FBUyxTQUFTLElBQUksSUFBSSxJQUFJLFNBQVMsSUFBSSxDQUFDO0FBQzFELE1BQUksU0FBUyxPQUFRLFFBQU8sVUFBVSxPQUFPLE9BQU87QUFDcEQsTUFBSSxNQUFNLGNBQWMsU0FBUyxRQUFTLFFBQU8sT0FBTyxPQUFPLE9BQU8sU0FBUyxjQUFjLEdBQUcsR0FBRyxFQUFFLFdBQVcsYUFBYSxhQUFhLGVBQWUsV0FBVyxLQUFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUV6TCxVQUFRLFFBQVE7QUFBQSxJQUNkLEtBQUssQ0FBQyxXQUFXO0FBQ2YsWUFBTSxPQUFPLE9BQU8sYUFBYSxlQUFlLE1BQU07QUFDdEQsYUFBTyxhQUFhLGlCQUFpQixPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ2xELE1BQUMsU0FBUyxlQUFlLE9BQU8sYUFBYSxlQUFlLEtBQUssRUFBRSxFQUFrQixTQUFTO0FBQUEsSUFDaEc7QUFBQSxFQUNGLENBQUM7QUFFRCxNQUFJLFNBQVMsU0FBUztBQUNwQixVQUFNLFNBQVMsTUFBTSxLQUFLO0FBQzFCLFFBQUksT0FBTyxRQUFRO0FBQ2pCLFNBQUcsY0FBYyxFQUFFLFNBQVM7QUFDNUIsWUFBTSxHQUFHLFdBQVcsR0FBRyxPQUFPLE9BQU8sSUFBSSxNQUFNLENBQUMsRUFBRTtBQUFBLElBQ3BEO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
