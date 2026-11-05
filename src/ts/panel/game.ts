// Manage the game: its details (Edit Game permission) and whether it is open (Host Game permission).
import { settingText } from "../api/content";
import { saveSetting } from "../api/staff";
import { formData, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { hasPerm } from "../core/session";
import { db } from "../core/supabase";
import { fail, ok } from "../core/toast";
import { field, selectField } from "../ui/components";
import { mountGamePageEditor } from "./gamePageEditor";
import type { PanelTab } from "./tab";

const STATES = [{ value: "online", label: "Live" }, { value: "maintenance", label: "Under maintenance" }, { value: "offline", label: "Offline" }];

// the game can only go live when its start file is really there
async function fileIsThere(entry: string): Promise<boolean> {
  try {
    const reply = await fetch(`${entry.replace(/\/?$/, "/")}index.html`, { cache: "no-store" });
    return reply.ok && /godot/i.test(await reply.text());
  } catch { return false; }
}

export const gameTab: PanelTab = {
  id: "game",
  label: "Game",
  icon: "game",
  need: "game",
  async render(root) {
    const { data } = await db().from("site_settings").select("key,value");
    const s: Record<string, unknown> = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const edit = hasPerm("game_edit");
    const host = hasPerm("game_host");
    const title = settingText(s, "game_title", "CMU Virtual Library");

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Game</h2></div>
      <div class="grid grid--2">
        <form class="card px form" id="detailsForm">
          <h3>Details</h3><p class="text-soft">What students read on the Game page.</p>
          ${field("game_title", "Title", { value: title, attrs: edit ? "" : "disabled" })}
          <div class="field" data-field="game_description"><label class="field__label" for="f-game_description">Description</label><textarea class="textarea" id="f-game_description" name="game_description" rows="4" ${edit ? "" : raw("disabled")}>${settingText(s, "game_description")}</textarea></div>
          ${edit ? html`<div class="form__actions"><button class="btn" type="submit">Save details</button></div>` : html`<p class="field__hint">You need the Edit Game permission to change this.</p>`}
        </form>
        <section class="card px"><h3>Student preview</h3>
          <div class="stage px px--soft stage--mini"><div class="stage__bar"><span class="stage__who">Playing as a student</span></div>
            <div class="stage__poster stage__poster--mini"><div class="stage__card"><h2 id="pvTitle">${title}</h2><p id="pvText">${settingText(s, "game_description")}</p></div></div></div></section>
      </div>
      <form class="card px form" id="hostForm">
        <h3>Hosting</h3><p class="text-soft">The game files live in the website under the address below. They are checked before the game can go live.</p>
        <div class="form__row">${selectField("game_status", "Availability", STATES, settingText(s, "game_status", "maintenance"))}${field("game_entry", "Start address", { value: settingText(s, "game_entry", "/play/"), hint: "Usually /play/" })}</div>
        <div class="alert px" id="fileCheck" role="status"><span>Press "Check the game file" to see if it is published.</span></div>
        <div class="form__actions"><button class="btn btn--quiet" type="button" id="check">${icon("refresh")} Check the game file</button>${host ? html`<button class="btn" type="submit">Save hosting</button>` : ""}</div>
        ${host ? "" : html`<p class="field__hint">You need the Host Game permission to change this.</p>`}
      </form>
      <section class="card px gp" id="gamePageEditor"></section></div>`);
    mountGamePageEditor(root.querySelector<HTMLElement>("#gamePageEditor")!, s.game_page, edit);

    const details = root.querySelector<HTMLFormElement>("#detailsForm")!;
    details.addEventListener("input", () => { const d = formData(details); root.querySelector("#pvTitle")!.textContent = d.game_title || "Game"; root.querySelector("#pvText")!.textContent = d.game_description ?? ""; });
    details.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!edit) return;
      const d = formData(details);
      try { await saveSetting("game_title", d.game_title); await saveSetting("game_description", d.game_description ?? ""); ok("Details saved."); } catch (error) { fail(friendly(error)); }
    });

    const hostForm = root.querySelector<HTMLFormElement>("#hostForm")!;
    const report = async () => {
      const there = await fileIsThere(formData(hostForm).game_entry || "/play/");
      const box = root.querySelector<HTMLElement>("#fileCheck")!;
      box.className = `alert px px--${there ? "success" : "warning"}`;
      box.textContent = there ? "The game file is published and ready." : "The game file is not published at that address yet.";
      return there;
    };
    root.querySelector("#check")!.addEventListener("click", () => void report());
    hostForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!host) return;
      const d = formData(hostForm);
      if (d.game_status === "online" && !(await report())) return fail("The game cannot go live until its file is published.");
      try { await saveSetting("game_status", d.game_status); await saveSetting("game_entry", d.game_entry || "/play/"); ok("Hosting saved."); } catch (error) { fail(friendly(error)); }
    });
  },
};
