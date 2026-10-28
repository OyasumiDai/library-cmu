import { signOut } from "../api/auth";
import { markNoticesRead, notices } from "../api/content";
import { html, icon, qs, actions, maybe, mount, raw, escapeHtml } from "./dom";
import { fail } from "./toast";
import { initials, relative } from "./format";
import { current, onSessionChange } from "./session";
import { initThemePicker } from "./theme";
import { watchIdle } from "./idle";
import type { Notice } from "../types";

// ---------------------------------------------------------------- top bar: bell + account
function avatar(): string {
  const profile = current().profile;
  if (!profile) return "";
  const inner = profile.photo_url ? `<img src="${escapeHtml(profile.photo_url)}" alt="">` : escapeHtml(initials(profile.username));
  return `<span class="avatar avatar--sm">${inner}</span>`;
}

function memberWidget(unread: number) {
  const profile = current().profile!;
  return html`
    <button class="bell" type="button" data-action="bell" aria-label="Notifications">
      ${icon("bell", "icon--lg")}${unread > 0 ? html`<span class="bell__count">${unread > 9 ? "9+" : unread}</span>` : ""}
    </button>
    <button class="user-chip" type="button" data-action="account" aria-haspopup="menu">
      ${raw(avatar())}
      <span class="user-chip__name">${profile.username}</span>
      ${icon("chevron-down", "icon--sm")}
    </button>`;
}

let unread = 0;
let list: Notice[] = [];

async function refreshNotices(): Promise<void> {
  const profile = current().profile;
  if (!profile) return;
  try {
    list = await notices(profile.id, 15);
    unread = list.filter((n) => !n.is_read).length;
    drawWidget();
  } catch {
    /* the bell is a nicety; stay quiet if it fails */
  }
}

const widget = (): HTMLElement | null => maybe("#userWidget");
const closeMenus = (): void => document.querySelectorAll("#userWidget .menu").forEach((m) => m.remove());

function drawWidget(): void {
  const el = widget();
  if (!el) return;
  el.dataset.state = current().profile ? "member" : "guest";
  mount(el, current().profile ? memberWidget(unread) : "");
}

function openAccountMenu(): void {
  const wasOpen = maybe("#userWidget .menu");
  closeMenus();
  if (wasOpen) return;
  const menu = document.createElement("div");
  menu.className = "menu px";
  menu.setAttribute("role", "menu");
  menu.innerHTML = html`
    <div class="menu__head">Signed in as ${current().profile?.username}</div>
    <a class="menu__item" href="/profile" role="menuitem">${icon("user")} My profile</a>
    <a class="menu__item" href="/settings" role="menuitem">${icon("sparkle")} Settings</a>
    <hr class="menu__sep">
    <button class="menu__item" type="button" data-action="logout" role="menuitem">${icon("logout")} Sign out</button>`.value;
  widget()?.appendChild(menu);
}

function openBellPanel(): void {
  const wasOpen = maybe("#userWidget .bell__panel");
  closeMenus();
  if (wasOpen) return;
  const panel = document.createElement("div");
  panel.className = "menu bell__panel px";
  panel.innerHTML = (list.length
    ? html`<ul class="list">${list.map((n) => html`
        <li class="list__item ${n.is_read ? "" : "is-unread"}">
          <div class="list__body"><p class="list__title">${n.title}</p><p class="list__meta">${n.message}</p><p class="list__meta">${relative(n.created_at)}</p></div>
        </li>`)}</ul>`
    : html`<div class="empty"><p>No news yet. Nice and quiet.</p></div>`).value;
  widget()?.appendChild(panel);
  const profile = current().profile;
  if (profile && unread > 0) {
    void markNoticesRead(profile.id).then(() => {
      list = list.map((n) => ({ ...n, is_read: true }));
      unread = 0;
      maybe(".bell__count", widget() ?? document)?.remove();
    });
  }
}

// ---------------------------------------------------------------- sidebar (phones: slides in over the page)
function initSidebar(): void {
  const toggle = maybe<HTMLButtonElement>("#navToggle");
  const sidebar = maybe("#sidebar");
  const scrim = maybe("#scrim");
  if (!toggle || !sidebar || !scrim) return;
  const set = (open: boolean) => {
    sidebar.classList.toggle("is-open", open);
    scrim.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  // wide screens: the same button folds the sidebar down to an icon rail, and the choice is remembered
  const wide = window.matchMedia("(min-width: 62.01rem)");
  const fold = (collapsed: boolean) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand the sidebar" : "Collapse the sidebar");
  };
  const stored = (): boolean => { try { return localStorage.getItem("sidebar-collapsed") === "1"; } catch { return false; } };
  const sync = () => {
    if (wide.matches) fold(stored());
    else {
      document.body.classList.remove("sidebar-collapsed");
      toggle.setAttribute("aria-label", "Open the menu");
      set(false);
    }
  };
  sync();
  wide.addEventListener("change", sync);
  toggle.addEventListener("click", () => {
    if (wide.matches) {
      const next = !document.body.classList.contains("sidebar-collapsed");
      fold(next);
      try { localStorage.setItem("sidebar-collapsed", next ? "1" : "0"); } catch { /* private mode: it just will not be remembered */ }
      return;
    }
    set(!sidebar.classList.contains("is-open"));
  });
  scrim.addEventListener("click", () => set(false));
  sidebar.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) set(false);
  });
}

export function initLayout(): void {
  initThemePicker();
  initSidebar();
  if (current().profile) watchIdle();

  const el = widget();
  if (el) {
    actions(el, {
      bell: () => openBellPanel(),
      account: () => openAccountMenu(),
      logout: async () => {
        try {
          await signOut();
          location.href = "/";
        } catch (error) {
          fail((error as Error).message);
        }
      },
    });
    document.addEventListener("click", (event) => {
      if (!(event.target as Element).closest("#userWidget")) closeMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenus();
    });
  }

  drawWidget();
  onSessionChange(() => {
    drawWidget();
    void refreshNotices();
  });
  void refreshNotices();
  window.addEventListener("focus", () => void refreshNotices());
}

// the sidebar marks the open staff section; the panel calls this when it switches tabs
export function markPanelTab(tab: string): void {
  document.querySelectorAll<HTMLElement>(".nav-link[data-tab]").forEach((link) => {
    const active = link.dataset.tab === tab;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

export { qs };
