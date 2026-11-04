import { allAnnouncements, deleteAnnouncement, saveAnnouncement } from "../api/staff";
import { actions, debounce, formData, html, icon, mount } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate } from "../core/format";
import { confirmBox, openModal } from "../core/modal";
import { fail, ok } from "../core/toast";
import { empty, field } from "../ui/components";
import type { Announcement } from "../types";
import type { PanelTab } from "./tab";

type Filter = "all" | "published" | "drafts";

export const announcementsTab: PanelTab = {
  id: "announcements",
  label: "Announcements",
  icon: "news",
  async render(root, query = "") {
    let items: Announcement[] = [];
    let filter: Filter = "all";
    let term = query;

    const draw = () => {
      const needle = term.toLowerCase();
      const rows = items.filter((n) => (filter === "all" || (filter === "published" ? n.published : !n.published)) && (!needle || `${n.title} ${n.body}`.toLowerCase().includes(needle)));
      root.querySelectorAll<HTMLElement>("[data-filter]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.filter === filter)));
      mount(root.querySelector<HTMLElement>("[data-body]")!, rows.length
        ? html`<ul class="list">${rows.map((n) => html`<li class="list__item">
            <div class="list__body"><p class="list__title">${n.title} ${n.published ? html`<span class="badge badge--success">published</span>` : html`<span class="badge">draft</span>`}</p>
              <p class="list__meta">${formatDate(n.created_at)}</p><p>${n.body.length > 220 ? `${n.body.slice(0, 220)}...` : n.body}</p></div>
            <div class="table__actions">
              <button class="btn btn--sm btn--quiet" data-action="toggle" data-id="${n.id}">${n.published ? "Unpublish" : "Publish"}</button>
              <button class="btn btn--sm btn--quiet" data-action="edit" data-id="${n.id}" aria-label="Edit">${icon("edit")}</button>
              <button class="btn btn--sm btn--danger" data-action="delete" data-id="${n.id}" aria-label="Delete">${icon("trash")}</button></div></li>`)}</ul>`
        : empty("No announcements", filter === "drafts" ? "No drafts." : "Post the first one.", "news"));
    };
    const reload = async () => { items = await allAnnouncements(); draw(); };

    const editor = (item: Announcement | null) => {
      const modal = openModal(item ? "Edit announcement" : "New announcement", html`
        <div class="split">
          <form class="form" id="newsForm" novalidate>
            ${field("title", "Title", { value: item?.title ?? "", required: true })}
            <div class="field"><label class="field__label" for="f-body">Message</label><textarea class="textarea" id="f-body" name="body" rows="8">${item?.body ?? ""}</textarea></div>
            <label class="check"><input class="check__box" type="checkbox" name="published" ${item?.published === false ? "" : html`checked`}><span>Publish now (untick to save as a draft)</span></label>
          </form>
          <aside class="preview" aria-label="Preview of the Updates page"><span class="eyebrow">Live preview</span>
            <article class="card px"><h3 class="card__title" id="pvTitle">${item?.title ?? "Your title"}</h3><p class="card__meta">${formatDate(new Date().toISOString())}</p><p id="pvBody">${item?.body ?? "Your message appears here as students will see it."}</p></article></aside>
        </div>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save>Save</button>`,
      });
      const form = modal.root.querySelector<HTMLFormElement>("#newsForm")!;
      form.addEventListener("input", () => {
        const d = formData(form);
        modal.root.querySelector("#pvTitle")!.textContent = d.title || "Your title";
        modal.root.querySelector("#pvBody")!.textContent = d.body || "Your message appears here as students will see it.";
      });
      modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
        const d = formData(form);
        if (!d.title || !d.body) return fail("Add a title and a message.");
        try {
          await saveAnnouncement({ id: item?.id, title: d.title, body: d.body, published: (form.elements.namedItem("published") as HTMLInputElement).checked });
          modal.close();
          ok("Saved.");
          await reload();
        } catch (error) { fail(friendly(error)); }
      });
    };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Announcements</h2><button class="btn" data-action="add">${icon("plus")} New</button></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="newsSearch">Search announcements</label>${icon("search")}<input class="input" id="newsSearch" type="search" placeholder="Search" value="${term}"></div>
        <div class="seg" role="group" aria-label="Show">${(["all", "published", "drafts"] as Filter[]).map((f) => html`<button class="seg__btn" type="button" data-action="filter" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`)}</div>
      </div>
      <div class="card px" data-body></div></div>`);
    root.querySelector("#newsSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value; draw(); }, 200));
    actions(root, {
      add: () => editor(null),
      filter: (el) => { filter = el.dataset.filter as Filter; draw(); },
      edit: (el) => editor(items.find((n) => n.id === Number(el.dataset.id)) ?? null),
      toggle: async (el) => {
        const n = items.find((x) => x.id === Number(el.dataset.id))!;
        try { await saveAnnouncement({ id: n.id, title: n.title, body: n.body, published: !n.published }); ok(n.published ? "Unpublished." : "Published."); await reload(); } catch (error) { fail(friendly(error)); }
      },
      delete: async (el) => {
        if (!(await confirmBox("Delete this announcement?", "It disappears for everyone.", "Delete", true))) return;
        try { await deleteAnnouncement(Number(el.dataset.id)); await reload(); } catch (error) { fail(friendly(error)); }
      },
    });
    await reload();
  },
};
