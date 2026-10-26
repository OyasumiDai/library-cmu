import { allTeam, deleteTeamMember, saveTeamMember, uploadPicture } from "../api/staff";
import { actions, formData, html, icon, mount } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox, openModal } from "../core/modal";
import { fail, ok } from "../core/toast";
import { empty, field, selectField } from "../ui/components";
import type { TeamMember } from "../types";
import type { PanelTab } from "./tab";

const GROUPS = [{ value: "library_staff", label: "Library staff" }, { value: "dev_team", label: "Developer team" }];

export const teamTab: PanelTab = {
  id: "team",
  label: "Team page",
  icon: "paw",
  adminOnly: true,
  async render(root) {
    let members: TeamMember[] = [];
    const draw = () => mount(root.querySelector<HTMLElement>("[data-body]")!, members.length
      ? html`<ul class="list">${members.map((m) => html`<li class="list__item">
          ${m.photo_url ? html`<img class="avatar" src="${m.photo_url}" alt="">` : html`<span class="avatar">${m.name.slice(0, 2)}</span>`}
          <div class="list__body"><p class="list__title">${m.name} ${m.is_active ? "" : html`<span class="badge">hidden</span>`}</p><p class="list__meta">${m.position} · ${GROUPS.find((g) => g.value === m.team_group)?.label}</p></div>
          <div class="table__actions"><button class="btn btn--sm btn--quiet px" data-action="edit" data-id="${m.id}">${icon("edit")}</button>
            <button class="btn btn--sm btn--danger px" data-action="delete" data-id="${m.id}">${icon("trash")}</button></div></li>`)}</ul>`
      : empty("No team members", "Add the people behind the library."));
    const reload = async () => {
      members = await allTeam();
      draw();
    };
    const editor = (m: TeamMember | null) => {
      const modal = openModal(m ? "Edit team member" : "Add team member", html`<form class="form" id="teamForm" novalidate>
        ${field("name", "Name", { value: m?.name ?? "", required: true })}
        ${field("position", "Position", { value: m?.position ?? "", required: true })}
        <div class="form__row">${selectField("team_group", "Group", GROUPS, m?.team_group ?? "library_staff", true)}${field("display_order", "Order", { type: "number", value: String(m?.display_order ?? 0) })}</div>
        ${field("email", "Email", { value: m?.email ?? "", type: "email" })}
        <div class="field"><label class="field__label" for="f-bio">Short bio</label><textarea class="textarea" id="f-bio" name="bio">${m?.bio ?? ""}</textarea></div>
        <div class="field"><label class="field__label" for="photo">Photo</label><input type="file" id="photo" accept="image/png,image/jpeg,image/webp"></div>
        <label class="check"><input class="check__box" type="checkbox" name="is_active" ${m?.is_active === false ? "" : html`checked`}><span>Show on the About page</span></label></form>`, {
        footer: html`<button class="btn btn--quiet px" type="button" data-close>Cancel</button><button class="btn px" type="button" data-save>Save</button>`,
      });
      modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
        const form = modal.root.querySelector<HTMLFormElement>("#teamForm")!;
        const d = formData(form);
        if (!d.name || !d.position) return fail("Name and position are needed.");
        try {
          const file = (modal.root.querySelector("#photo") as HTMLInputElement).files?.[0];
          await saveTeamMember({
            id: m?.id, name: d.name, position: d.position, team_group: d.team_group as TeamMember["team_group"], email: d.email ?? "", bio: d.bio ?? "",
            display_order: Number(d.display_order) || 0, is_active: (form.elements.namedItem("is_active") as HTMLInputElement).checked,
            photo_url: file ? await uploadPicture("team", file) : m?.photo_url ?? null,
          });
          modal.close();
          ok("Saved.");
          await reload();
        } catch (error) {
          fail(friendly(error));
        }
      });
    };
    mount(root, html`<div class="panel__tab"><div class="panel__heading"><h2>Team page</h2><button class="btn px" data-action="add">${icon("plus")} Add</button></div><div class="card px" data-body></div></div>`);
    actions(root, {
      add: () => editor(null),
      edit: (el) => editor(members.find((m) => m.id === Number(el.dataset.id)) ?? null),
      delete: async (el) => {
        if (!(await confirmBox("Remove this person?", "They will no longer appear on the About page.", "Remove", true))) return;
        try {
          await deleteTeamMember(Number(el.dataset.id));
          await reload();
        } catch (error) {
          fail(friendly(error));
        }
      },
    });
    await reload();
  },
};
