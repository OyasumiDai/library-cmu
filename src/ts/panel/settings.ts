// System settings. Staff with the "Manage System" permission see the library settings; admins also edit page text and courses.
import { courses } from "../api/content";
import { allPages, deleteCourse, saveCourse, savePage, saveSetting } from "../api/staff";
import { actions, formData, html, icon, mount } from "../core/dom";
import { friendly } from "../core/errors";
import { confirmBox, openModal } from "../core/modal";
import { isAdmin } from "../core/session";
import { db } from "../core/supabase";
import { fail, ok } from "../core/toast";
import { field, selectField } from "../ui/components";
import type { Course } from "../types";
import type { PanelTab } from "./tab";

type Pick = (value: string) => unknown;
const asText: Pick = (v) => v;
const asNumber: Pick = (v) => Number(v) || 0;
const asBool: Pick = (v) => v === "true";
const FIELDS: { key: string; pick: Pick }[] = [
  { key: "library_name", pick: asText }, { key: "loan_days", pick: asNumber }, { key: "max_loans", pick: asNumber }, { key: "registration_open", pick: asBool },
  { key: "registration_domains", pick: asText }, { key: "terms_version", pick: asText }, { key: "site_notice", pick: asText }, { key: "site_notice_tone", pick: asText },
  { key: "library_hours", pick: asText }, { key: "library_contact", pick: asText },
];

export const settingsTab: PanelTab = {
  id: "settings",
  label: "Settings",
  icon: "settings",
  need: "system",
  async render(root) {
    // staff may read private settings too, so fetch directly rather than through the public helper
    const { data } = await db().from("site_settings").select("key,value");
    const s: Record<string, unknown> = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const text = (key: string) => String(s[key] ?? "");
    const admin = isAdmin();
    const pages = admin ? await allPages() : [];
    let catalog: Course[] = admin ? await courses() : [];

    const courseList = () => html`<ul class="list">${catalog.map((c) => html`<li class="list__item"><div class="list__body"><p class="list__title">${c.program} (${c.code})</p><p class="list__meta">${c.college}${c.majors.length ? ` · ${c.majors.join(", ")}` : ""}</p></div>
      <button class="btn btn--sm btn--danger" data-action="drop-course" data-id="${c.id}" aria-label="Remove">${icon("trash")}</button></li>`)}</ul>`;

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Settings</h2></div>
      <form class="card px form" id="settingsForm">
        <h3>Library</h3>
        ${field("library_name", "Library name", { value: text("library_name") })}
        <div class="form__row">${field("library_hours", "Opening hours", { value: text("library_hours"), hint: "Shown in the footer of the public pages." })}${field("library_contact", "Contact details", { value: text("library_contact"), hint: "Email or phone, shown in the footer." })}</div>
        <h3>Borrowing</h3>
        <div class="form__row">${field("loan_days", "Loan length (days)", { type: "number", value: text("loan_days"), attrs: 'min="1" max="60"' })}${field("max_loans", "Books per student", { type: "number", value: text("max_loans"), attrs: 'min="1" max="20"' })}</div>
        <h3>Sign up</h3>
        <div class="form__row">${selectField("registration_open", "Registration", [{ value: "true", label: "Open" }, { value: "false", label: "Closed" }], text("registration_open"))}${field("terms_version", "Terms version", { value: text("terms_version"), hint: "Raising it asks everyone to accept the terms again." })}</div>
        ${field("registration_domains", "Allowed email domains", { value: text("registration_domains"), hint: "Comma separated, for example cityofuniversity.edu.ph. Empty means any email." })}
        <h3>Site notice</h3>
        <div class="form__row">${field("site_notice", "Message", { value: text("site_notice"), hint: "Leave empty for none. Visitors can dismiss it." })}${selectField("site_notice_tone", "Style", [{ value: "info", label: "Information" }, { value: "warning", label: "Important" }], text("site_notice_tone") || "info")}</div>
        ${admin ? html`<h3>Assistant</h3>${selectField("assistant_enabled", "Library assistant (bottom right)", [{ value: "true", label: "On" }, { value: "false", label: "Off" }], text("assistant_enabled") || "true")}
        <p class="field__hint">The AI is connected on the server (ASSISTANT_WEBHOOK_URL). Without it the assistant gives built-in quick answers.</p>
        <h3>Loan emails with QR codes</h3>
        <p class="field__hint">The website emails students about their loans (QR code at request, confirmation at pickup). To also cover loans made in the game, let the database call the website: set the address below and press Generate. Leave both empty to rely on the website only.</p>
        ${field("mail_hook_url", "Mail hook address", { value: text("mail_hook_url"), hint: `${location.origin}/api/loan-mail` })}
        <div class="field" data-field="mail_hook_secret"><label class="field__label" for="f-mail_hook_secret">Shared secret</label>
          <div class="input-group"><input class="input" id="f-mail_hook_secret" name="mail_hook_secret" value="${text("mail_hook_secret")}" autocomplete="off"><button class="btn btn--secondary" type="button" data-action="gen-secret">Generate</button></div></div>
        <div class="cluster"><button class="btn btn--secondary" type="button" data-action="test-mail">${icon("mail")} Send me a test email</button><span class="field__hint" id="mailResult">Checks the Gmail login and the database, then emails a sample reserved-books message with a QR code to your account email.</span></div>` : ""}
        <div class="form__actions"><button class="btn" type="submit">Save settings</button></div>
      </form>
      ${admin ? html`<section class="card px"><div class="panel__heading"><h3>Courses</h3><button class="btn btn--sm" data-action="add-course">${icon("plus")} Add</button></div><div id="courseList">${courseList()}</div></section>
      <section class="card px"><h3>Page text</h3><div class="cluster">${pages.map((p) => html`<button class="btn btn--sm btn--quiet" data-action="edit-page" data-slug="${p.slug}">${icon("edit")} ${p.title}</button>`)}</div></section>` : ""}
    </div>`);

    const form = root.querySelector<HTMLFormElement>("#settingsForm")!;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const d = formData(form);
      const keys = admin ? [...FIELDS, { key: "assistant_enabled", pick: asBool }, { key: "mail_hook_url", pick: asText }, { key: "mail_hook_secret", pick: asText }] : FIELDS;
      try {
        for (const f of keys) if (d[f.key] !== undefined) await saveSetting(f.key, f.pick(d[f.key]));
        ok("Settings saved.");
      } catch (error) { fail(friendly(error)); }
    });

    actions(root, {
      "gen-secret": () => {
        const bytes = crypto.getRandomValues(new Uint8Array(24));
        (root.querySelector("#f-mail_hook_secret") as HTMLInputElement).value = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
        const url = root.querySelector("#f-mail_hook_url") as HTMLInputElement;
        if (!url.value) url.value = `${location.origin}/api/loan-mail`;
      },
      "test-mail": async (el) => {
        const out = root.querySelector<HTMLElement>("#mailResult")!;
        (el as HTMLButtonElement).disabled = true;
        out.textContent = "Checking...";
        try {
          const { data } = await db().auth.getSession();
          const reply = await fetch("/api/mail-check", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ send: true }) });
          const result = reply.ok ? await reply.json() : { problems: [reply.status === 404 ? "The email functions are not deployed yet (api/mail-check). Redeploy the site." : `The server answered ${reply.status}.`] };
          if (result.ok && result.sent) { out.textContent = `Sent! Check the inbox of ${result.to} (and spam).`; ok("Test email sent."); }
          else { out.innerHTML = html`<strong>Not working yet:</strong> ${(result.problems ?? ["Unknown problem."]).join(" ")}`.value; fail("The test email was not sent."); }
        } catch { out.textContent = "Could not reach the server."; fail("Could not reach the server."); }
        (el as HTMLButtonElement).disabled = false;
      },
      "add-course": () => {
        const modal = openModal("Add a course", html`<form class="form" id="courseForm">${field("college", "College", { required: true })}${field("program", "Program", { required: true })}${field("code", "Short code", { required: true })}${field("majors", "Majors", { hint: "Comma separated. Leave empty if none." })}</form>`, {
          footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save>Save</button>`,
        });
        modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
          const d = formData(modal.root.querySelector<HTMLFormElement>("#courseForm")!);
          if (!d.college || !d.program || !d.code) return fail("College, program and code are needed.");
          try {
            await saveCourse({ college: d.college, program: d.program, code: d.code, majors: (d.majors ?? "").split(",").map((m) => m.trim()).filter(Boolean), sort: catalog.length + 1 });
            catalog = await courses();
            mount(root.querySelector<HTMLElement>("#courseList")!, courseList());
            modal.close();
            ok("Course added.");
          } catch (error) { fail(friendly(error)); }
        });
      },
      "drop-course": async (el) => {
        if (!(await confirmBox("Remove this course?", "New sign-ups will no longer see it.", "Remove", true))) return;
        try { await deleteCourse(Number(el.dataset.id)); catalog = await courses(); mount(root.querySelector<HTMLElement>("#courseList")!, courseList()); } catch (error) { fail(friendly(error)); }
      },
      "edit-page": (el) => {
        const page = pages.find((p) => p.slug === el.dataset.slug)!;
        const modal = openModal(`Edit ${page.title}`, html`<form class="form" id="pageForm">${field("title", "Title", { value: page.title })}
          <div class="field"><label class="field__label" for="f-json">Content (JSON)</label><textarea class="textarea textarea--code" id="f-json" name="json" rows="14" spellcheck="false">${JSON.stringify(page.body, null, 2)}</textarea>
          <span class="field__hint">Pages use paragraphs, sections (title + paragraphs) or help items (title + body).</span></div></form>`, {
          wide: true,
          footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-save>Save</button>`,
        });
        modal.root.querySelector("[data-save]")?.addEventListener("click", async () => {
          const d = formData(modal.root.querySelector<HTMLFormElement>("#pageForm")!);
          let body;
          try { body = JSON.parse(d.json); } catch { return fail("That content is not valid JSON."); }
          try { await savePage(page.slug, d.title || page.title, body); page.title = d.title || page.title; page.body = body; modal.close(); ok("Page saved."); } catch (error) { fail(friendly(error)); }
        });
      },
    });
  },
};
