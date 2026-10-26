// Admins: who works at the library and what each person may do.
import { sendResetEmail } from "../api/auth";
import { people, setActive, setPermissions, setRole } from "../api/staff";
import { actions, debounce, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate, initials } from "../core/format";
import { confirmBox, openModal } from "../core/modal";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { empty, loading } from "../ui/components";
import type { Profile } from "../types";
import type { PanelTab } from "./tab";

export const PERMISSIONS: { id: string; label: string; text: string; sensitive?: boolean }[] = [
  { id: "students", label: "Student Profiles", text: "Student list and profiles, send notices, disable accounts.", sensitive: true },
  { id: "game_edit", label: "Edit Game", text: "Change the game title and description." },
  { id: "game_host", label: "Host Game", text: "Set the game open, under maintenance or closed." },
  { id: "system", label: "Manage System", text: "Loan length, books per student, registration, site notice, hours.", sensitive: true },
  { id: "reports", label: "Reports", text: "Reports and CSV downloads." },
  { id: "audit", label: "Audit Trail", text: "Read every recorded action.", sensitive: true },
];
const PRESETS: { id: string; label: string; perms: string[] }[] = [
  { id: "none", label: "No extra permissions", perms: [] },
  { id: "game", label: "Game Moderator", perms: ["game_edit", "game_host"] },
  { id: "full", label: "Full access", perms: PERMISSIONS.map((p) => p.id) },
];

export const staff: PanelTab = {
  id: "staff",
  label: "Staff",
  icon: "user",
  adminOnly: true,
  async render(root, query = "") {
    let everyone: Profile[] = [];
    let term = query;
    let status = "";
    const me = current().profile!.id;
    const team = () => everyone.filter((p) => p.role !== "student");

    const draw = () => {
      const t = team();
      mount(root.querySelector<HTMLElement>("#staffTiles")!, html`
        <div class="tile"><span class="tile__label">Staff accounts</span><span class="tile__value">${t.length}</span></div>
        <div class="tile"><span class="tile__label">Active</span><span class="tile__value">${t.filter((p) => p.active).length}</span></div>
        <div class="tile"><span class="tile__label">Disabled</span><span class="tile__value">${t.filter((p) => !p.active).length}</span></div>
        <div class="tile"><span class="tile__label">Administrators</span><span class="tile__value">${t.filter((p) => p.role === "admin").length}</span></div>`);
      const needle = term.toLowerCase();
      const rows = t.filter((p) => (!needle || `${p.username} ${p.full_name} ${p.email}`.toLowerCase().includes(needle)) && (!status || (status === "active" ? p.active : !p.active)));
      mount(root.querySelector<HTMLElement>("[data-body]")!, rows.length ? html`<div class="people-cards">${rows.map((p) => html`
        <article class="person-card card px">
          <span class="avatar">${p.photo_url ? raw(`<img src="${p.photo_url.replace(/"/g, "")}" alt="">`) : initials(p.username)}</span>
          <strong>${p.username}</strong><small>${p.full_name}</small><small class="text-soft">${p.email}</small>
          <div class="cluster cluster--center"><span class="badge ${p.role === "admin" ? "badge--primary" : "badge--secondary"}">${p.role}</span>${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}</div>
          ${p.role === "admin" ? html`<small class="text-soft">All permissions, always</small>` : html`<ul class="chips chips--small">${p.permissions.length ? p.permissions.map((x) => html`<li class="chip">${PERMISSIONS.find((q) => q.id === x)?.label ?? x}</li>`) : html`<li class="text-soft">No extra permissions</li>`}</ul>`}
          ${p.id === me ? html`<small class="text-soft">This is you</small>` : html`<div class="cluster cluster--center">
            ${p.role === "staff" ? html`<button class="btn btn--sm btn--secondary" data-action="perms" data-id="${p.id}">${icon("key")} Permissions</button>` : ""}
            <button class="btn btn--sm btn--quiet" data-action="reset" data-id="${p.id}">Reset password</button>
            <button class="btn btn--sm ${p.active ? "btn--danger" : "btn--secondary"}" data-action="toggle" data-id="${p.id}">${p.active ? "Disable" : "Enable"}</button>
            ${p.role === "staff" ? html`<button class="btn btn--sm btn--quiet" data-action="demote" data-id="${p.id}">Make student</button>` : ""}</div>`}
          <small class="text-soft">Since ${formatDate(p.created_at)}</small>
        </article>`)}</div>` : empty("No staff found", "Add someone with the button above.", "users"));
    };
    const reload = async () => { everyone = await people(); draw(); };
    const attempt = async (work: () => Promise<void>, done: string) => { try { await work(); ok(done); await reload(); } catch (error) { fail(friendly(error)); } };

    const permissionsEditor = (p: Profile) => {
      const modal = openModal(`Permissions for ${p.username}`, html`<p class="text-soft">Changes apply on their next action, and ${p.username} gets a notification.</p>
        <div class="form">${PRESETS.map((r) => html`<button class="chip" type="button" data-preset="${r.id}">${r.label}</button>`)}
          ${PERMISSIONS.map((q) => html`<label class="check"><input class="check__box" type="checkbox" name="perm" value="${q.id}" ${p.permissions.includes(q.id) ? raw("checked") : ""}><span><strong>${q.label}</strong>${q.sensitive ? html` <span class="badge badge--warning">sensitive</span>` : ""}<br><small class="text-soft">${q.text}</small></span></label>`)}</div>`, {
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save>Save permissions</button>`,
      });
      modal.root.querySelectorAll<HTMLElement>("[data-preset]").forEach((b) => b.addEventListener("click", () => {
        const perms = PRESETS.find((r) => r.id === b.dataset.preset)!.perms;
        modal.root.querySelectorAll<HTMLInputElement>("input[name=perm]").forEach((c) => { c.checked = perms.includes(c.value); });
      }));
      modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
        const chosen = [...modal.root.querySelectorAll<HTMLInputElement>("input[name=perm]:checked")].map((c) => c.value);
        modal.close();
        await attempt(() => setPermissions(p.id, chosen), "Permissions saved.");
      });
    };

    // an account must exist already (they register first); the admin then promotes it
    const addStaff = () => {
      const modal = openModal("Add a staff member", html`<p class="text-soft">The person registers on the website first. Search for them here and make them staff.</p>
        <div class="field search"><label class="visually-hidden" for="findPerson">Find a person</label>${icon("search")}<input class="input" id="findPerson" placeholder="Username, name or email" autocomplete="off"></div>
        <div id="foundList" class="list"></div>
        <div class="field"><label class="field__label" for="preset">Permissions</label><select class="select" id="preset">${PRESETS.map((r) => html`<option value="${r.id}">${r.label}</option>`)}</select></div>`, { footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button>` });
      const found = modal.root.querySelector<HTMLElement>("#foundList")!;
      modal.root.querySelector("#findPerson")!.addEventListener("input", debounce((e) => {
        const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
        const hits = q.length < 2 ? [] : everyone.filter((p) => p.role === "student" && `${p.username} ${p.full_name} ${p.email}`.toLowerCase().includes(q)).slice(0, 5);
        mount(found, hits.length ? html`${hits.map((p) => html`<div class="list__item"><div class="list__body"><p class="list__title">${p.username}</p><p class="list__meta">${p.full_name} · ${p.email}</p></div><button class="btn btn--sm" type="button" data-make="${p.id}">Make staff</button></div>`)}` : q.length >= 2 ? html`<p class="text-soft">Nobody found. They need to register first.</p>` : html``);
      }, 200));
      found.addEventListener("click", async (event) => {
        const id = (event.target as Element).closest<HTMLElement>("[data-make]")?.dataset.make;
        if (!id) return;
        const preset = PRESETS.find((r) => r.id === (modal.root.querySelector("#preset") as HTMLSelectElement).value)!;
        modal.close();
        await attempt(async () => { await setRole(id, "staff"); await setPermissions(id, preset.perms); }, "They are staff now.");
      });
    };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Staff</h2><button class="btn" data-action="add">${icon("plus")} Add staff</button></div>
      <div class="tile-grid" id="staffTiles"></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="staffSearch">Search staff</label>${icon("search")}<input class="input" id="staffSearch" type="search" placeholder="Name or email" value="${term}"></div>
        <div class="field"><label class="field__label" for="staffStatus">Status</label><select class="select" id="staffStatus"><option value="">All</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div>
      </div>
      <div data-body>${loading("Loading staff")}</div></div>`);
    root.querySelector("#staffSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    root.querySelector("#staffStatus")!.addEventListener("change", (e) => { status = (e.target as HTMLSelectElement).value; draw(); });
    const person = (el: HTMLElement) => everyone.find((p) => p.id === el.dataset.id)!;
    actions(root, {
      add: addStaff,
      perms: (el) => permissionsEditor(person(el)),
      toggle: (el) => { const p = person(el); return attempt(() => setActive(p.id, !p.active), p.active ? "Account disabled." : "Account enabled."); },
      demote: async (el) => { const p = person(el); if (await confirmBox("Make this person a student again?", `${p.username} loses staff access and all permissions.`, "Make student", true)) await attempt(async () => { await setPermissions(p.id, []); await setRole(p.id, "student"); }, "They are a student now."); },
      reset: async (el) => { const p = person(el); if (await confirmBox("Send a password reset?", `A reset email goes to ${p.email}.`, "Send")) await attempt(() => sendResetEmail(p.email ?? ""), "Reset email sent."); },
    });
    await reload();
  },
};
