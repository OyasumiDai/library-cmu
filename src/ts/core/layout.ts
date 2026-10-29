import { signOut } from "../api/auth";
import { markNoticeRead, markNoticesRead, notices } from "../api/content";
import { html, icon, qs, actions, maybe, mount, raw, escapeHtml } from "./dom";
import { fail } from "./toast";
import { initials, relative } from "./format";
import { current, homeFor, onSessionChange } from "./session";
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
const closeMenus = (): void => {
  document.querySelectorAll("#userWidget .menu").forEach((m) => m.remove());
  document.querySelector("#userWidget .bell")?.setAttribute("aria-expanded", "false");
};

// the unread count on the sidebar's Notifications link too (a dot over the icon when the rail is collapsed)
function drawNavBadge(): void {
  const item = maybe<HTMLAnchorElement>('.sidebar__foot a[href="/notifications"]');
  if (!item) return;
  item.querySelector(".nav-link__badge")?.remove();
  if (unread > 0 && current().profile) item.insertAdjacentHTML("beforeend", html`<b class="nav-link__badge" aria-label="${unread} unread">${unread > 9 ? "9+" : unread}</b>`.value);
}

function drawWidget(): void {
  drawNavBadge();
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

// ---------------------------------------------------------------- the bell's panel
// Each notification gets an icon and a colour for its kind, and a page it leads to when clicked.
type NoticeKind = { icon: string; tone: "info" | "success" | "warning" | "danger" | "accent" };
// a book a staff member added, waiting for or back from an admin (tools/book-approval.sql)
const isBookApproval = (n: Notice) => n.type === "approval" || /book (waiting|resubmitted) for approval|book (approved|needs revision)/i.test(n.title);
// the book's title, quoted in the message: Dave added "Dave's Diary". Review it in Books.
const quotedTitle = (n: Notice) => /"([^"]+)"/.exec(n.message)?.[1] ?? "";

function kindOf(n: Notice): NoticeKind {
  const text = `${n.type} ${n.title}`.toLowerCase();
  if (isBookApproval(n)) {
    if (/needs revision/i.test(n.title)) return { icon: "edit", tone: "warning" };
    if (/approved/i.test(n.title)) return { icon: "check", tone: "success" };
    return { icon: "clock", tone: "accent" };
  }
  if (/overdue|fine|late/.test(text)) return { icon: "clock", tone: "danger" };
  if (/reject|declin|cancel/.test(text)) return { icon: "cross", tone: "danger" };
  if (/due|remind/.test(text)) return { icon: "calendar", tone: "warning" };
  if (/approv|ready|pick|borrow|checkout/.test(text)) return { icon: "check", tone: "success" };
  if (/return/.test(text)) return { icon: "refresh", tone: "success" };
  if (/request|reserv/.test(text)) return { icon: "bell", tone: "accent" };
  if (/announce|news/.test(text)) return { icon: "news", tone: "info" };
  return { icon: "mail", tone: "info" };
}
function linkOf(n: Notice): string {
  const text = `${n.type} ${n.title}`.toLowerCase();
  const staff = current().profile?.role !== "student";
  // approvals open the book itself in Books: waiting ones in the review list, with the review (or the fix) window open
  if (isBookApproval(n)) {
    const title = quotedTitle(n);
    const open = /approved/i.test(n.title) ? "" : "&open=1";
    const show = /approved/i.test(n.title) ? "" : "&show=review";
    return `/panel?tab=books${title ? `&q=${encodeURIComponent(title)}` : ""}${show}${open}`;
  }
  if (/announce|news/.test(text)) return "/announcements";
  if (/request|reserv|overdue|due|return|borrow|pick|approv|reject|declin|cancel|checkout|fine/.test(text)) return staff ? "/panel?tab=circulation" : "/borrowing";
  return "/notifications";
}

let bellFilter: "all" | "unread" = "all";

function bellPanelBody(): string {
  const shown = bellFilter === "unread" ? list.filter((n) => !n.is_read) : list;
  const today = new Date().toDateString();
  const groups: [string, Notice[]][] = [["Today", shown.filter((n) => new Date(n.created_at).toDateString() === today)], ["Earlier", shown.filter((n) => new Date(n.created_at).toDateString() !== today)]];
  const item = (n: Notice) => {
    const kind = kindOf(n);
    return html`<li class="notice ${n.is_read ? "" : "is-unread"}" data-id="${n.id}">
      <a class="notice__link" href="${linkOf(n)}" data-action="open-notice" data-id="${n.id}">
        <span class="notice__icon notice__icon--${kind.tone}">${icon(kind.icon)}</span>
        <span class="notice__body"><strong class="notice__title">${n.title}</strong><span class="notice__text">${n.message}</span><span class="notice__time">${relative(n.created_at)}</span></span>
      </a>
      <button class="notice__toggle" type="button" data-action="toggle-notice" data-id="${n.id}" title="${n.is_read ? "Mark as unread" : "Mark as read"}" aria-label="${n.is_read ? "Mark as unread" : "Mark as read"}">${n.is_read ? html`<span class="notice__ring"></span>` : html`<span class="notice__dot"></span>`}</button>
    </li>`;
  };
  return html`
    <div class="bell__head">
      <div><strong>Notifications</strong>${unread ? html`<span class="bell__new">${unread} new</span>` : ""}</div>
      <button class="link-button" type="button" data-action="read-all" ${unread ? "" : raw("disabled")}>${icon("check")} Mark all read</button>
    </div>
    <div class="bell__tabs" role="tablist">
      <button type="button" role="tab" data-action="bell-filter" data-filter="all" aria-selected="${String(bellFilter === "all")}">All</button>
      <button type="button" role="tab" data-action="bell-filter" data-filter="unread" aria-selected="${String(bellFilter === "unread")}">Unread${unread ? ` (${unread})` : ""}</button>
    </div>
    <div class="bell__list">${shown.length
      ? html`${groups.filter(([, items]) => items.length).map(([label, items]) => html`<p class="bell__group">${label}</p><ul class="bell__items">${items.map(item)}</ul>`)}`
      : html`<div class="bell__empty">${icon(bellFilter === "unread" ? "check" : "bell", "icon--lg")}<p>${bellFilter === "unread" ? "You are all caught up." : "No notifications yet. Nice and quiet."}</p></div>`}</div>
    <a class="bell__foot" href="/notifications">See all notifications ${icon("chevron-right", "icon--sm")}</a>`.value;
}

function redrawBell(): void {
  const panel = maybe("#userWidget .bell__panel");
  if (panel) {
    const scroll = panel.querySelector(".bell__list")?.scrollTop ?? 0;
    panel.innerHTML = bellPanelBody();
    const listBox = panel.querySelector(".bell__list");
    if (listBox) listBox.scrollTop = scroll;
  }
  drawNavBadge();
  const count = maybe(".bell__count", widget() ?? document);
  if (!unread) count?.remove();
  else if (count) count.textContent = unread > 9 ? "9+" : String(unread);
}

// read or unread, here and in the database (put back if the database says no)
async function setRead(id: number, read: boolean): Promise<void> {
  const notice = list.find((n) => n.id === id);
  if (!notice || notice.is_read === read) return;
  notice.is_read = read;
  unread += read ? -1 : 1;
  redrawBell();
  try { await markNoticeRead(id, read); } catch { notice.is_read = !read; unread += read ? 1 : -1; redrawBell(); }
}

function openBellPanel(): void {
  const wasOpen = maybe("#userWidget .bell__panel");
  closeMenus();
  if (wasOpen) return;
  const panel = document.createElement("div");
  panel.className = "menu bell__panel px";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Notifications");
  panel.innerHTML = bellPanelBody();
  widget()?.appendChild(panel);
  maybe<HTMLButtonElement>(".bell", widget() ?? document)?.setAttribute("aria-expanded", "true");
  // the list may have changed since the page opened: update the panel in place (drawWidget would close it)
  const profile = current().profile;
  if (profile) void notices(profile.id, 15).then((fresh) => { list = fresh; unread = fresh.filter((n) => !n.is_read).length; redrawBell(); }).catch(() => undefined);

  panel.addEventListener("click", async (event) => {
    event.stopPropagation();
    const el = (event.target as Element).closest<HTMLElement>("[data-action]");
    if (!el) return;
    const id = Number(el.dataset.id);
    switch (el.dataset.action) {
      case "bell-filter":
        bellFilter = el.dataset.filter === "unread" ? "unread" : "all";
        redrawBell();
        break;
      case "toggle-notice": {
        const notice = list.find((n) => n.id === id);
        if (notice) await setRead(id, !notice.is_read);
        break;
      }
      case "read-all": {
        const profile = current().profile;
        if (!profile || !unread) break;
        const before = list.map((n) => n.is_read);
        list = list.map((n) => ({ ...n, is_read: true }));
        unread = 0;
        redrawBell();
        try { await markNoticesRead(profile.id); } catch { list = list.map((n, i) => ({ ...n, is_read: before[i] })); unread = list.filter((n) => !n.is_read).length; redrawBell(); }
        break;
      }
      case "open-notice": {
        // mark it read first, then follow the link
        event.preventDefault();
        const href = (el as HTMLAnchorElement).href;
        await setRead(id, true).catch(() => undefined);
        location.href = href;
        break;
      }
    }
  });
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
  toggle.addEventListener("click", () => set(!sidebar.classList.contains("is-open")));

  // wide screens: the button beside the logo folds the sidebar to an icon rail (theme-init.js restores it before paint)
  const fold = maybe<HTMLButtonElement>("#sidebarFold");
  if (fold) {
    const show = (collapsed: boolean) => {
      const label = collapsed ? "Expand the sidebar" : "Collapse the sidebar";
      fold.setAttribute("aria-expanded", String(!collapsed));
      fold.setAttribute("aria-label", label);
      fold.title = label;
    };
    show(document.documentElement.classList.contains("sidebar-collapsed"));
    fold.addEventListener("click", () => {
      const collapsed = document.documentElement.classList.toggle("sidebar-collapsed");
      closeFlyouts();
      show(collapsed);
      try { localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0"); } catch { /* private mode: it just will not be remembered */ }
    });
  }
  scrim.addEventListener("click", () => set(false));
  sidebar.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) {
      set(false);
      closeFlyouts();
    }
  });
  initFlyouts(sidebar);
}

// collapsed rail: a dropdown's summary opens its links as a menu beside the rail instead of inside it
const railCollapsed = () => document.documentElement.classList.contains("sidebar-collapsed") && window.matchMedia("(min-width: 62.01rem)").matches;
function closeFlyouts(): void {
  document.querySelectorAll<HTMLDetailsElement>(".nav-group--fold[data-flyout]").forEach((group) => {
    delete group.dataset.flyout;
    group.open = group.dataset.wasOpen === "true" || !!group.querySelector(".nav-link.is-active");
  });
}
function initFlyouts(sidebar: HTMLElement): void {
  sidebar.querySelectorAll<HTMLDetailsElement>(".nav-group--fold").forEach((group) => {
    const summary = group.querySelector<HTMLElement>(".nav-group__toggle");
    summary?.addEventListener("click", (event) => {
      if (!railCollapsed()) return;
      event.preventDefault();
      const opening = !group.dataset.flyout;
      closeFlyouts();
      if (!opening) return;
      group.dataset.wasOpen = String(group.open);
      group.style.setProperty("--flyout-top", `${summary.getBoundingClientRect().top}px`);
      group.dataset.flyout = "true";
      group.open = true;
    });
  });
  document.addEventListener("click", (event) => {
    if (!(event.target as Element).closest(".nav-group--fold[data-flyout]")) closeFlyouts();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFlyouts();
  });
  sidebar.addEventListener("scroll", closeFlyouts, { passive: true });
  sidebar.querySelector(".sidebar__nav")?.addEventListener("scroll", closeFlyouts, { passive: true });
  window.addEventListener("resize", closeFlyouts);
}

export function initLayout(): void {
  initThemePicker();
  initSidebar();
  if (current().profile) watchIdle();
  // the sidebar logo leads home: the dashboard for staff and admins, the catalog for students
  const logo = maybe<HTMLAnchorElement>(".sidebar .brand");
  if (logo && current().profile) logo.href = homeFor(current().profile);
  // public pages: the back button leads staff and admins to their panel, students to their library
  const back = maybe<HTMLAnchorElement>("[data-back-home]");
  if (back && current().profile) {
    back.href = homeFor(current().profile);
    if (current().profile!.role !== "student") back.querySelector("span")!.textContent = "Back to my panel";
  }

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
  hideEmptyNavGroups();
  onSessionChange(() => {
    drawWidget();
    hideEmptyNavGroups();
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
    const group = link.closest<HTMLDetailsElement>("details.nav-group--fold");
    if (active && group) group.open = true;
  });
}

// a dropdown whose links are all hidden for this person (permissions the admin did not grant) is hidden too
function hideEmptyNavGroups(): void {
  document.querySelectorAll<HTMLElement>(".nav-group--fold").forEach((group) => {
    group.hidden = false;
    group.hidden = [...group.querySelectorAll(".nav-link")].every((link) => getComputedStyle(link).display === "none");
  });
}

export { qs };
