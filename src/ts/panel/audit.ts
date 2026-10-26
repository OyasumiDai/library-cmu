import { auditTrail, type AuditEntry } from "../api/staff";
import { actions, debounce, html, icon, mount } from "../core/dom";
import { downloadCsv, formatDateTime } from "../core/format";
import { empty, loading } from "../ui/components";
import type { PanelTab } from "./tab";

const MODULES = ["", "books", "announcements", "team_members", "courses", "site_settings", "content_pages", "loans", "profiles", "notices", "auth"];

export const audit: PanelTab = {
  id: "audit",
  label: "Audit trail",
  icon: "archive",
  need: "audit",
  async render(root, query = "") {
    let rows: AuditEntry[] = [];
    let search = query;
    let module = "";
    let from = "";
    let to = "";

    const draw = () => mount(root.querySelector<HTMLElement>("[data-body]")!, rows.length
      ? html`<div class="table-wrap"><table class="table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Where</th><th>What</th></tr></thead><tbody>
        ${rows.map((r) => html`<tr><td>${formatDateTime(r.created_at)}</td><td>${r.actor}</td><td><span class="badge">${r.action}</span></td><td>${r.module}</td><td class="audit-details">${r.details}</td></tr>`)}</tbody></table></div>`
      : empty("Nothing recorded", "Try other filters. Changes made in the panel appear here.", "archive"));
    const load = async () => { mount(root.querySelector<HTMLElement>("[data-body]")!, loading("Reading the log")); rows = await auditTrail({ search, module, from, to, limit: 400 }); draw(); };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Audit trail</h2><button class="btn btn--secondary" data-action="csv">${icon("download")} Export CSV</button></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="auSearch">Search</label>${icon("search")}<input class="input" id="auSearch" type="search" placeholder="Person, action or details" value="${search}"></div>
        <div class="field"><label class="field__label" for="auModule">Module</label><select class="select" id="auModule">${MODULES.map((m) => html`<option value="${m}">${m || "All"}</option>`)}</select></div>
        <div class="field"><label class="field__label" for="auFrom">From</label><input class="input" id="auFrom" type="date"></div>
        <div class="field"><label class="field__label" for="auTo">To</label><input class="input" id="auTo" type="date"></div>
      </div>
      <div class="card px card--flush" data-body></div></div>`);
    root.querySelector("#auSearch")!.addEventListener("input", debounce((e) => { search = (e.target as HTMLInputElement).value.trim(); void load(); }, 300));
    root.querySelector(".toolbar")!.addEventListener("change", () => {
      module = (root.querySelector("#auModule") as HTMLSelectElement).value;
      from = (root.querySelector("#auFrom") as HTMLInputElement).value;
      to = (root.querySelector("#auTo") as HTMLInputElement).value;
      void load();
    });
    actions(root, { csv: () => downloadCsv(`audit-${new Date().toISOString().slice(0, 10)}.csv`, ["When", "Who", "Action", "Module", "Details"], rows.map((r) => [formatDateTime(r.created_at), r.actor, r.action, r.module, r.details])) });
    await load();
  },
};
