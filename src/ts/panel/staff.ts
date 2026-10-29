// Admins: who works at the library and what each person may do.
import { sendResetEmail } from "../api/auth";
import { people, setActive, setPermissions, setRole } from "../api/staff";
import { actions, debounce, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate, initials, plural } from "../core/format";
import { confirmBox, openModal } from "../core/modal";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { kpi } from "../ui/charts";
import { empty, loading } from "../ui/components";
import type { Profile } from "../types";
import type { PanelTab } from "./tab";

export const PERMISSIONS: { id: string; label: string; text: string; icon: string; sensitive?: boolean }[] = [
  { id: "students", label: "Student Profiles", icon: "users", text: "Student list and profiles, send notices, disable accounts.", sensitive: true },
  { id: "game_edit", label: "Edit Game", icon: "edit", text: "Change the game title, description and the About the game page." },
  { id: "game_host", label: "Host Game", icon: "game", text: "Set the game open, under maintenance or closed." },
  { id: "system", label: "Manage System", icon: "settings", text: "Loan rules, fines, holidays, registration, site notice, hours.", sensitive: true },
  { id: "reports", label: "Reports", icon: "download", text: "Reports and CSV downloads." },
  { id: "audit", label: "Audit Trail", icon: "archive", text: "Read every recorded action.", sensitive: true },
];
const PRESETS: { id: string; label: string; perms: string[] }[] = [
  { id: "none", label: "Desk only", perms: [] },
  { id: "game", label: "Game moderator", perms: ["game_edit", "game_host"] },
  { id: "office", label: "Library office", perms: ["students", "reports"] },
  { id: "full", label: "Full access", perms: PERMISSIONS.map((p) => p.id) },
];

type Filter = "all" | "admin" | "staff" | "disabled";

const avatar = (p: Profile, size = "") => html`<span class="avatar ${size} team-avatar team-avatar--${p.role}">${p.photo_url ? html`<img src="${p.photo_url}" alt="">` : initials(p.full_name || p.username)}<i class="team-avatar__dot ${p.active ? "is-on" : "is-off"}" title="${p.active ? "Active" : "Disabled"}"></i></span>`;

export const staff: PanelTab = {
  id: "staff",
  label: "Staff",
  icon: "user",
  adminOnly: true,
  async render(root, query = "") {
    let everyone: Profile[] = [];
    let term = query;
    let filter: Filter = "all";
    let view: "cards" | "table" = "cards";
    const me = current().profile!.id;
    const team = () => everyone.filter((p) => p.role !== "student");
    const can = (p: Profile, perm: string) => p.role === "admin" || p.permissions.includes(perm);

    const card = (p: Profile) => {
      const mine = p.id === me;
      return html`
        <article class="team-card card px ${p.active ? "" : "is-disabled"} ${mine ? "is-me" : ""}" data-reveal>
          <header class="team-card__head">
            ${avatar(p, "avatar--lg")}
            <div class="team-card__who">
              <strong>${p.full_name || p.username}</strong>
              <span class="text-soft">@${p.username}</span>
              <span class="team-card__email">${icon("mail")} ${p.email ?? "no email"}</span>
            </div>
            <div class="team-card__badges">
              <span class="badge ${p.role === "admin" ? "badge--primary" : "badge--info"}">${p.role === "admin" ? icon("key") : icon("user")} ${p.role}</span>
              ${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}
              ${mine ? html`<span class="badge badge--accent">you</span>` : ""}
            </div>
          </header>
          <div class="team-card__perms">
            <span class="team-card__label">${p.role === "admin" ? "All permissions, always" : `${p.permissions.length} of ${PERMISSIONS.length} permissions`}</span>
            <ul class="perm-icons">${PERMISSIONS.map((q) => html`<li class="perm-icon ${can(p, q.id) ? "is-on" : ""}" title="${q.label}${can(p, q.id) ? "" : " (not allowed)"}">${icon(q.icon)}<span class="visually-hidden">${q.label}: ${can(p, q.id) ? "yes" : "no"}</span></li>`)}</ul>
          </div>
          <footer class="team-card__foot">
            <small class="text-soft">${icon("calendar")} since ${formatDate(p.created_at)}</small>
            ${mine ? html`<small class="text-soft">You cannot change your own access</small>` : html`<div class="cluster">
              ${p.role === "staff" ? html`<button class="btn btn--sm" type="button" data-action="perms" data-id="${p.id}">${icon("key")} Permissions</button>` : ""}
              <details class="more">
                <summary class="btn btn--sm btn--quiet" aria-label="More actions for ${p.username}">•••</summary>
                <div class="more__menu menu px">
                  <button class="menu__item" type="button" data-action="reset" data-id="${p.id}">${icon("mail")} Send password reset</button>
                  <button class="menu__item" type="button" data-action="toggle" data-id="${p.id}">${icon(p.active ? "lock" : "check")} ${p.active ? "Disable account" : "Enable account"}</button>
                  ${p.role === "staff" ? html`<hr class="menu__sep"><button class="menu__item menu__item--danger" type="button" data-action="demote" data-id="${p.id}">${icon("user")} Make student again</button>` : ""}
                </div>
              </details></div>`}
          </footer>
        </article>`;
    };

    // everyone against every permission: who can do what, at a glance
    const table = (rows: Profile[]) => html`<div class="card px card--flush"><div class="table-wrap"><table class="table access-table">
      <thead><tr><th>Person</th>${PERMISSIONS.map((q) => html`<th title="${q.text}"><span class="access-table__head">${icon(q.icon)}${q.label}</span></th>`)}<th></th></tr></thead>
      <tbody>${rows.map((p) => html`<tr class="${p.active ? "" : "is-disabled"}">
        <td><div class="access-table__who">${avatar(p, "avatar--sm")}<span><strong>${p.full_name || p.username}</strong><br><span class="table__sub">${p.role}${p.active ? "" : " · disabled"}${p.id === me ? " · you" : ""}</span></span></div></td>
        ${PERMISSIONS.map((q) => html`<td class="access-table__cell">${can(p, q.id) ? html`<span class="access-yes" title="Allowed">${icon("check")}</span>` : html`<span class="access-no" title="Not allowed">–</span>`}</td>`)}
        <td>${p.role === "staff" && p.id !== me ? html`<button class="btn btn--sm btn--quiet" type="button" data-action="perms" data-id="${p.id}">${icon("edit")} Edit</button>` : ""}</td></tr>`)}</tbody></table></div></div>`;

    const draw = () => {
      const t = team();
      const counts: Record<Filter, number> = { all: t.length, admin: t.filter((p) => p.role === "admin").length, staff: t.filter((p) => p.role === "staff").length, disabled: t.filter((p) => !p.active).length };
      mount(root.querySelector<HTMLElement>("#staffTiles")!, html`
        ${kpi({ label: "Team members", value: t.length, icon: "users", tone: 1, note: `${counts.staff} staff, ${counts.admin} admin${counts.admin === 1 ? "" : "s"}` })}
        ${kpi({ label: "Active", value: t.filter((p) => p.active).length, icon: "check", tone: 3, note: "can sign in" })}
        ${kpi({ label: "Disabled", value: counts.disabled, icon: "lock", tone: 4, note: counts.disabled ? "cannot sign in" : "none", trend: counts.disabled ? "down" : "" })}
        ${kpi({ label: "Sensitive access", value: t.filter((p) => p.role === "admin" || p.permissions.some((x) => PERMISSIONS.find((q) => q.id === x)?.sensitive)).length, icon: "key", tone: 2, note: "students, system or audit" })}`);
      root.querySelectorAll<HTMLElement>("[data-filter]").forEach((b) => {
        const f = b.dataset.filter as Filter;
        b.setAttribute("aria-pressed", String(f === filter));
        b.querySelector("[data-n]")!.textContent = String(counts[f]);
      });
      const needle = term.toLowerCase();
      const rows = t
        .filter((p) => !needle || `${p.username} ${p.full_name} ${p.email}`.toLowerCase().includes(needle))
        .filter((p) => filter === "all" || (filter === "disabled" ? !p.active : p.role === filter))
        .sort((a, b) => Number(b.id === me) - Number(a.id === me) || Number(b.role === "admin") - Number(a.role === "admin") || (a.full_name || a.username).localeCompare(b.full_name || b.username));
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      mount(body, !rows.length ? empty("Nobody here", term ? "Try another name or email." : "Add someone with the Add staff button.", "users")
        : view === "cards" ? html`<div class="team-grid">${rows.map(card)}</div>` : table(rows));
      body.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
    };
    const reload = async () => { everyone = await people(); draw(); };
    const attempt = async (work: () => Promise<void>, done: string) => { try { await work(); ok(done); await reload(); } catch (error) { fail(friendly(error)); } };

    const permissionsEditor = (p: Profile) => {
      const modal = openModal(`What can ${p.full_name || p.username} do?`, html`
        <div class="perm-editor">
          <div class="perm-editor__who">${avatar(p)}<div><strong>${p.full_name || p.username}</strong><br><span class="text-soft">@${p.username} · staff. Every staff member can use the desk: books, circulation, scan pickup and announcements.</span></div></div>
          <div class="perm-editor__presets"><span class="field__label">Start from</span><div class="cluster">${PRESETS.map((r) => html`<button class="chip" type="button" data-preset="${r.id}">${r.label}</button>`)}</div></div>
          <div class="perm-grid">${PERMISSIONS.map((q) => html`<label class="perm-option">
            <input class="visually-hidden" type="checkbox" name="perm" value="${q.id}" ${p.permissions.includes(q.id) ? raw("checked") : ""}>
            <span class="perm-option__icon">${icon(q.icon)}</span>
            <span class="perm-option__text"><strong>${q.label}</strong>${q.sensitive ? html` <span class="badge badge--warning">sensitive</span>` : ""}<small class="text-soft">${q.text}</small></span>
            <span class="perm-switch" aria-hidden="true"><i></i></span></label>`)}</div>
          <p class="perm-editor__count text-soft" id="permCount"></p>
        </div>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save>${icon("check")} Save permissions</button>`,
      });
      const boxes = () => [...modal.root.querySelectorAll<HTMLInputElement>("input[name=perm]")];
      const count = () => {
        const on = boxes().filter((c) => c.checked);
        const sensitive = on.filter((c) => PERMISSIONS.find((q) => q.id === c.value)?.sensitive).length;
        modal.root.querySelector("#permCount")!.textContent = `${on.length} of ${PERMISSIONS.length} permissions on${sensitive ? `, ${plural(sensitive, "sensitive one")}` : ""}. ${p.username} gets a notification when you save.`;
        modal.root.querySelectorAll<HTMLElement>("[data-preset]").forEach((b) => {
          const perms = PRESETS.find((r) => r.id === b.dataset.preset)!.perms;
          b.classList.toggle("is-on", on.length === perms.length && on.every((c) => perms.includes(c.value)));
        });
      };
      modal.root.addEventListener("change", count);
      modal.root.querySelectorAll<HTMLElement>("[data-preset]").forEach((b) => b.addEventListener("click", () => {
        const perms = PRESETS.find((r) => r.id === b.dataset.preset)!.perms;
        boxes().forEach((c) => { c.checked = perms.includes(c.value); });
        count();
      }));
      count();
      modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
        const chosen = boxes().filter((c) => c.checked).map((c) => c.value);
        modal.close();
        await attempt(() => setPermissions(p.id, chosen), "Permissions saved.");
      });
    };

    // an account must exist already (they register first); the admin then promotes it
    const addStaff = () => {
      const modal = openModal("Add a staff member", html`
        <ol class="add-steps"><li>The person signs up on the website as a student.</li><li>Find them below and choose what they may do.</li><li>They become staff straight away and get a notification.</li></ol>
        <div class="field search"><label class="visually-hidden" for="findPerson">Find a person</label>${icon("search")}<input class="input" id="findPerson" placeholder="Username, name, email or student ID" autocomplete="off"></div>
        <div id="foundList" class="found-list"></div>
        <div class="field"><label class="field__label" for="preset">Start them with</label><select class="select" id="preset">${PRESETS.map((r) => html`<option value="${r.id}">${r.label}${r.perms.length ? ` (${r.perms.map((x) => PERMISSIONS.find((q) => q.id === x)!.label).join(", ")})` : " (no extra permissions)"}</option>`)}</select>
          <span class="field__hint">You can fine-tune their permissions afterwards.</span></div>`, { footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button>` });
      const found = modal.root.querySelector<HTMLElement>("#foundList")!;
      modal.root.querySelector("#findPerson")!.addEventListener("input", debounce((e) => {
        const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
        const hits = q.length < 2 ? [] : everyone.filter((p) => p.role === "student" && `${p.username} ${p.full_name} ${p.email} ${p.student_id ?? ""}`.toLowerCase().includes(q)).slice(0, 6);
        mount(found, hits.length ? html`${hits.map((p) => html`<div class="found-row">${avatar(p, "avatar--sm")}<div class="found-row__who"><strong>${p.full_name || p.username}</strong><span class="text-soft">@${p.username} · ${p.email}${p.student_id ? ` · ${p.student_id}` : ""}</span></div><button class="btn btn--sm" type="button" data-make="${p.id}">${icon("plus")} Make staff</button></div>`)}`
          : q.length >= 2 ? html`<p class="text-soft found-list__none">Nobody found. They need to sign up on the website first.</p>` : html``);
      }, 200));
      found.addEventListener("click", async (event) => {
        const id = (event.target as Element).closest<HTMLElement>("[data-make]")?.dataset.make;
        if (!id) return;
        const who = everyone.find((p) => p.id === id)!;
        const preset = PRESETS.find((r) => r.id === (modal.root.querySelector("#preset") as HTMLSelectElement).value)!;
        if (!(await confirmBox("Make this person staff?", `${who.full_name || who.username} gets staff access to the panel${preset.perms.length ? ` with: ${preset.perms.map((x) => PERMISSIONS.find((q) => q.id === x)!.label).join(", ")}` : ""}.`, "Make staff"))) return;
        modal.close();
        await attempt(async () => { await setRole(id, "staff"); await setPermissions(id, preset.perms); }, `${who.full_name || who.username} is staff now.`);
      });
    };

    mount(root, html`<div class="panel__tab dash">
      <header class="dash-hero card px">
        <div class="dash-hero__text"><span class="eyebrow">Administration</span><h2>Library team</h2>
          <p class="text-soft">Who works in the panel and what each person may do. Staff can always use the desk; admins have every permission.</p></div>
        <div class="dash-hero__actions"><button class="btn" type="button" data-action="add">${icon("plus")} Add staff</button></div>
      </header>
      <div class="kpi-grid" id="staffTiles"></div>
      <div class="team-toolbar">
        <div class="field search"><label class="visually-hidden" for="staffSearch">Search the team</label>${icon("search")}<input class="input" id="staffSearch" type="search" placeholder="Name, username or email" value="${term}"></div>
        <div class="seg seg--scroll" role="group" aria-label="Show">${([["all", "All"], ["admin", "Admins"], ["staff", "Staff"], ["disabled", "Disabled"]] as [Filter, string][]).map(([id, label]) => html`<button class="seg__btn" type="button" data-action="filter" data-filter="${id}" aria-pressed="${String(id === filter)}">${label} <span class="seg__n" data-n>0</span></button>`)}</div>
        <div class="seg" role="group" aria-label="View as"><button class="seg__btn" type="button" data-action="view" data-view="cards" aria-pressed="true">${icon("users")} Cards</button><button class="seg__btn" type="button" data-action="view" data-view="table" aria-pressed="false">${icon("key")} Access table</button></div>
      </div>
      <div data-body>${loading("Loading the team")}</div></div>`);
    root.querySelector("#staffSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    // one ••• menu open at a time; a click elsewhere closes it
    root.addEventListener("toggle", (event) => {
      const opened = event.target as HTMLDetailsElement;
      if (opened.open) root.querySelectorAll<HTMLDetailsElement>("details.more[open]").forEach((d) => { if (d !== opened) d.open = false; });
    }, true);
    document.addEventListener("click", (event) => {
      if (!root.isConnected || (event.target as Element).closest("details.more")) return;
      root.querySelectorAll<HTMLDetailsElement>("details.more[open]").forEach((d) => { d.open = false; });
    });
    const person = (el: HTMLElement) => everyone.find((p) => p.id === el.dataset.id)!;
    actions(root, {
      add: addStaff,
      filter: (el) => { filter = el.dataset.filter as Filter; draw(); },
      view: (el) => { view = el.dataset.view as typeof view; root.querySelectorAll<HTMLElement>("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      perms: (el) => permissionsEditor(person(el)),
      toggle: async (el) => {
        const p = person(el);
        if (p.active && !(await confirmBox("Disable this account?", `${p.full_name || p.username} will not be able to sign in until you enable it again.`, "Disable", true))) return;
        await attempt(() => setActive(p.id, !p.active), p.active ? "Account disabled." : "Account enabled.");
      },
      demote: async (el) => { const p = person(el); if (await confirmBox("Make this person a student again?", `${p.username} loses staff access and all permissions.`, "Make student", true)) await attempt(async () => { await setPermissions(p.id, []); await setRole(p.id, "student"); }, "They are a student now."); },
      reset: async (el) => { const p = person(el); if (await confirmBox("Send a password reset?", `A reset email goes to ${p.email}.`, "Send")) await attempt(() => sendResetEmail(p.email ?? ""), "Reset email sent."); },
    });
    await reload();
  },
};
