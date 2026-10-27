import { deleteNotice, markNoticeRead, markNoticesRead, notices } from "../api/content";
import { boot } from "../core/boot";
import { actions, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { relative } from "../core/format";
import { reveal } from "../core/motion";
import { current } from "../core/session";
import { fail } from "../core/toast";
import { empty, loading } from "../ui/components";
import type { Notice } from "../types";

const ICON: Record<string, string> = { approved: "check", declined: "cross", returned: "download", overdue: "clock", request: "shelf", notice: "mail", permissions: "key" };

let all: Notice[] = [];
let filter: "all" | "unread" = "all";

function draw(): void {
  const unread = all.filter((n) => !n.is_read).length;
  qs("#unreadCount").textContent = String(unread);
  qs("#noticeSummary").textContent = all.length ? `${all.length} in total, ${unread} unread.` : "Nothing yet.";
  (qs("#markAll") as HTMLButtonElement).disabled = unread === 0;
  qs("#noticeTabs").querySelectorAll<HTMLElement>("[data-filter]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.filter === filter)));
  const rows = filter === "unread" ? all.filter((n) => !n.is_read) : all;
  const list = qs("#noticeList");
  mount(list, rows.length
    ? html`<ul class="list">${rows.map((n) => html`
        <li class="list__item ${n.is_read ? "" : "is-unread"}" data-reveal>
          <span class="notice-icon">${icon(ICON[n.type] ?? "bell")}</span>
          <div class="list__body"><p class="list__title">${n.title}</p><p>${n.message}</p><p class="list__meta">${relative(n.created_at)}</p></div>
          <div class="table__actions">
            <button class="btn btn--sm btn--quiet" type="button" data-action="toggle" data-id="${n.id}" aria-label="${n.is_read ? "Mark as unread" : "Mark as read"}">${icon(n.is_read ? "eye" : "check")}</button>
            <button class="btn btn--sm btn--danger" type="button" data-action="remove" data-id="${n.id}" aria-label="Delete">${icon("trash")}</button>
          </div>
        </li>`)}</ul>`
    : empty(filter === "unread" ? "All caught up" : "No notifications", filter === "unread" ? "You have read everything." : "Requests, approvals and library notices will show up here.", "bell"));
  reveal(list);
}

boot(async () => {
  const profile = current().profile!;
  mount(qs("#noticeList"), loading("Opening your notifications"));
  all = await notices(profile.id, 100);
  draw();
  const run = async (work: () => Promise<void>) => {
    try { await work(); all = await notices(profile.id, 100); draw(); } catch (error) { fail(friendly(error)); }
  };
  qs("#markAll").addEventListener("click", () => void run(() => markNoticesRead(profile.id)));
  actions(qs("[data-page-root]"), {
    filter: (el) => { filter = el.dataset.filter as typeof filter; draw(); },
    toggle: (el) => { const n = all.find((x) => x.id === Number(el.dataset.id)); return run(() => markNoticeRead(Number(el.dataset.id), !n?.is_read)); },
    remove: (el) => run(() => deleteNotice(Number(el.dataset.id))),
  });
});
