import { boot } from "../core/boot";
import { html, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { markPanelTab } from "../core/layout";
import { reveal } from "../core/motion";
import { hasPerm, isAdmin } from "../core/session";
import { analytics } from "../panel/analytics";
import { announcementsTab } from "../panel/announcements";
import { audit } from "../panel/audit";
import { books } from "../panel/books";
import { circulation } from "../panel/circulation";
import { dashboard } from "../panel/dashboard";
import { gameTab } from "../panel/game";
import { reports } from "../panel/reports";
import { settingsTab } from "../panel/settings";
import { staff } from "../panel/staff";
import { students } from "../panel/students";
import type { PanelTab } from "../panel/tab";

const ALL: PanelTab[] = [dashboard, analytics, circulation, books, announcementsTab, students, staff, reports, gameTab, settingsTab, audit];

// a section is open to admins, or to staff when the admin granted the permission it needs
const allowed = (t: PanelTab): boolean => (t.adminOnly ? isAdmin() : t.need ? (t.need === "game" ? hasPerm("game_edit") || hasPerm("game_host") : hasPerm(t.need)) : true);

// The sections are chosen from the sidebar (links like /panel?tab=books); this page just shows the chosen one.
boot(async ({ params }) => {
  const tabs = ALL.filter(allowed);
  const main = qs("#panelMain");

  const open = async (id: string, query = "") => {
    const tab = tabs.find((t) => t.id === id) ?? tabs[0];
    history.replaceState(null, "", `?tab=${tab.id}`);
    markPanelTab(tab.id);
    const fresh = document.createElement("div");
    main.replaceChildren(fresh);
    try {
      await tab.render(fresh, query);
    } catch (error) {
      mount(fresh, html`<div class="alert alert--danger px px--danger">${friendly(error)}</div>`);
    }
    reveal(fresh);
  };

  // switch sections without reloading the page
  document.querySelectorAll<HTMLAnchorElement>(".nav-link[data-tab]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    void open(link.dataset.tab ?? "");
  }));
  await open(params.get("tab") ?? tabs[0].id, params.get("q") ?? "");
});
