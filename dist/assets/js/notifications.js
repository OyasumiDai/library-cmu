import {
  empty,
  loading
} from "./chunks/chunk-YFDTB4J4.js";
import {
  actions,
  boot,
  current,
  deleteNotice,
  fail,
  friendly,
  html,
  icon,
  markNoticeRead,
  markNoticesRead,
  mount,
  notices,
  qs,
  relative,
  reveal
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/notifications.ts
var ICON = { approved: "check", declined: "cross", returned: "download", overdue: "clock", request: "shelf", notice: "mail", permissions: "key" };
var all = [];
var filter = "all";
function draw() {
  const unread = all.filter((n) => !n.is_read).length;
  qs("#unreadCount").textContent = String(unread);
  qs("#noticeSummary").textContent = all.length ? `${all.length} in total, ${unread} unread.` : "Nothing yet.";
  qs("#markAll").disabled = unread === 0;
  qs("#noticeTabs").querySelectorAll("[data-filter]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.filter === filter)));
  const rows = filter === "unread" ? all.filter((n) => !n.is_read) : all;
  const list = qs("#noticeList");
  mount(list, rows.length ? html`<ul class="list">${rows.map((n) => html`
        <li class="list__item ${n.is_read ? "" : "is-unread"}" data-reveal>
          <span class="notice-icon">${icon(ICON[n.type] ?? "bell")}</span>
          <div class="list__body"><p class="list__title">${n.title}</p><p>${n.message}</p><p class="list__meta">${relative(n.created_at)}</p></div>
          <div class="table__actions">
            <button class="btn btn--sm btn--quiet" type="button" data-action="toggle" data-id="${n.id}" aria-label="${n.is_read ? "Mark as unread" : "Mark as read"}">${icon(n.is_read ? "eye" : "check")}</button>
            <button class="btn btn--sm btn--danger" type="button" data-action="remove" data-id="${n.id}" aria-label="Delete">${icon("trash")}</button>
          </div>
        </li>`)}</ul>` : empty(filter === "unread" ? "All caught up" : "No notifications", filter === "unread" ? "You have read everything." : "Requests, approvals and library notices will show up here.", "bell"));
  reveal(list);
}
boot(async () => {
  const profile = current().profile;
  mount(qs("#noticeList"), loading("Opening your notifications"));
  all = await notices(profile.id, 100);
  draw();
  const run = async (work) => {
    try {
      await work();
      all = await notices(profile.id, 100);
      draw();
    } catch (error) {
      fail(friendly(error));
    }
  };
  qs("#markAll").addEventListener("click", () => void run(() => markNoticesRead(profile.id)));
  actions(qs("[data-page-root]"), {
    filter: (el) => {
      filter = el.dataset.filter;
      draw();
    },
    toggle: (el) => {
      const n = all.find((x) => x.id === Number(el.dataset.id));
      return run(() => markNoticeRead(Number(el.dataset.id), !n?.is_read));
    },
    remove: (el) => run(() => deleteNotice(Number(el.dataset.id)))
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL25vdGlmaWNhdGlvbnMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGRlbGV0ZU5vdGljZSwgbWFya05vdGljZVJlYWQsIG1hcmtOb3RpY2VzUmVhZCwgbm90aWNlcyB9IGZyb20gXCIuLi9hcGkvY29udGVudFwiO1xuaW1wb3J0IHsgYm9vdCB9IGZyb20gXCIuLi9jb3JlL2Jvb3RcIjtcbmltcG9ydCB7IGFjdGlvbnMsIGh0bWwsIGljb24sIG1vdW50LCBxcyB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xuaW1wb3J0IHsgZnJpZW5kbHkgfSBmcm9tIFwiLi4vY29yZS9lcnJvcnNcIjtcbmltcG9ydCB7IHJlbGF0aXZlIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XG5pbXBvcnQgeyByZXZlYWwgfSBmcm9tIFwiLi4vY29yZS9tb3Rpb25cIjtcbmltcG9ydCB7IGN1cnJlbnQgfSBmcm9tIFwiLi4vY29yZS9zZXNzaW9uXCI7XG5pbXBvcnQgeyBmYWlsIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcbmltcG9ydCB7IGVtcHR5LCBsb2FkaW5nIH0gZnJvbSBcIi4uL3VpL2NvbXBvbmVudHNcIjtcbmltcG9ydCB0eXBlIHsgTm90aWNlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5cbmNvbnN0IElDT046IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IGFwcHJvdmVkOiBcImNoZWNrXCIsIGRlY2xpbmVkOiBcImNyb3NzXCIsIHJldHVybmVkOiBcImRvd25sb2FkXCIsIG92ZXJkdWU6IFwiY2xvY2tcIiwgcmVxdWVzdDogXCJzaGVsZlwiLCBub3RpY2U6IFwibWFpbFwiLCBwZXJtaXNzaW9uczogXCJrZXlcIiB9O1xuXG5sZXQgYWxsOiBOb3RpY2VbXSA9IFtdO1xubGV0IGZpbHRlcjogXCJhbGxcIiB8IFwidW5yZWFkXCIgPSBcImFsbFwiO1xuXG5mdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xuICBjb25zdCB1bnJlYWQgPSBhbGwuZmlsdGVyKChuKSA9PiAhbi5pc19yZWFkKS5sZW5ndGg7XG4gIHFzKFwiI3VucmVhZENvdW50XCIpLnRleHRDb250ZW50ID0gU3RyaW5nKHVucmVhZCk7XG4gIHFzKFwiI25vdGljZVN1bW1hcnlcIikudGV4dENvbnRlbnQgPSBhbGwubGVuZ3RoID8gYCR7YWxsLmxlbmd0aH0gaW4gdG90YWwsICR7dW5yZWFkfSB1bnJlYWQuYCA6IFwiTm90aGluZyB5ZXQuXCI7XG4gIChxcyhcIiNtYXJrQWxsXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50KS5kaXNhYmxlZCA9IHVucmVhZCA9PT0gMDtcbiAgcXMoXCIjbm90aWNlVGFic1wiKS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIltkYXRhLWZpbHRlcl1cIikuZm9yRWFjaCgodCkgPT4gdC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIFN0cmluZyh0LmRhdGFzZXQuZmlsdGVyID09PSBmaWx0ZXIpKSk7XG4gIGNvbnN0IHJvd3MgPSBmaWx0ZXIgPT09IFwidW5yZWFkXCIgPyBhbGwuZmlsdGVyKChuKSA9PiAhbi5pc19yZWFkKSA6IGFsbDtcbiAgY29uc3QgbGlzdCA9IHFzKFwiI25vdGljZUxpc3RcIik7XG4gIG1vdW50KGxpc3QsIHJvd3MubGVuZ3RoXG4gICAgPyBodG1sYDx1bCBjbGFzcz1cImxpc3RcIj4ke3Jvd3MubWFwKChuKSA9PiBodG1sYFxuICAgICAgICA8bGkgY2xhc3M9XCJsaXN0X19pdGVtICR7bi5pc19yZWFkID8gXCJcIiA6IFwiaXMtdW5yZWFkXCJ9XCIgZGF0YS1yZXZlYWw+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJub3RpY2UtaWNvblwiPiR7aWNvbihJQ09OW24udHlwZV0gPz8gXCJiZWxsXCIpfTwvc3Bhbj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibGlzdF9fYm9keVwiPjxwIGNsYXNzPVwibGlzdF9fdGl0bGVcIj4ke24udGl0bGV9PC9wPjxwPiR7bi5tZXNzYWdlfTwvcD48cCBjbGFzcz1cImxpc3RfX21ldGFcIj4ke3JlbGF0aXZlKG4uY3JlYXRlZF9hdCl9PC9wPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0YWJsZV9fYWN0aW9uc1wiPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXNtIGJ0bi0tcXVpZXRcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJ0b2dnbGVcIiBkYXRhLWlkPVwiJHtuLmlkfVwiIGFyaWEtbGFiZWw9XCIke24uaXNfcmVhZCA/IFwiTWFyayBhcyB1bnJlYWRcIiA6IFwiTWFyayBhcyByZWFkXCJ9XCI+JHtpY29uKG4uaXNfcmVhZCA/IFwiZXllXCIgOiBcImNoZWNrXCIpfTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXNtIGJ0bi0tZGFuZ2VyXCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwicmVtb3ZlXCIgZGF0YS1pZD1cIiR7bi5pZH1cIiBhcmlhLWxhYmVsPVwiRGVsZXRlXCI+JHtpY29uKFwidHJhc2hcIil9PC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvbGk+YCl9PC91bD5gXG4gICAgOiBlbXB0eShmaWx0ZXIgPT09IFwidW5yZWFkXCIgPyBcIkFsbCBjYXVnaHQgdXBcIiA6IFwiTm8gbm90aWZpY2F0aW9uc1wiLCBmaWx0ZXIgPT09IFwidW5yZWFkXCIgPyBcIllvdSBoYXZlIHJlYWQgZXZlcnl0aGluZy5cIiA6IFwiUmVxdWVzdHMsIGFwcHJvdmFscyBhbmQgbGlicmFyeSBub3RpY2VzIHdpbGwgc2hvdyB1cCBoZXJlLlwiLCBcImJlbGxcIikpO1xuICByZXZlYWwobGlzdCk7XG59XG5cbmJvb3QoYXN5bmMgKCkgPT4ge1xuICBjb25zdCBwcm9maWxlID0gY3VycmVudCgpLnByb2ZpbGUhO1xuICBtb3VudChxcyhcIiNub3RpY2VMaXN0XCIpLCBsb2FkaW5nKFwiT3BlbmluZyB5b3VyIG5vdGlmaWNhdGlvbnNcIikpO1xuICBhbGwgPSBhd2FpdCBub3RpY2VzKHByb2ZpbGUuaWQsIDEwMCk7XG4gIGRyYXcoKTtcbiAgY29uc3QgcnVuID0gYXN5bmMgKHdvcms6ICgpID0+IFByb21pc2U8dm9pZD4pID0+IHtcbiAgICB0cnkgeyBhd2FpdCB3b3JrKCk7IGFsbCA9IGF3YWl0IG5vdGljZXMocHJvZmlsZS5pZCwgMTAwKTsgZHJhdygpOyB9IGNhdGNoIChlcnJvcikgeyBmYWlsKGZyaWVuZGx5KGVycm9yKSk7IH1cbiAgfTtcbiAgcXMoXCIjbWFya0FsbFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdm9pZCBydW4oKCkgPT4gbWFya05vdGljZXNSZWFkKHByb2ZpbGUuaWQpKSk7XG4gIGFjdGlvbnMocXMoXCJbZGF0YS1wYWdlLXJvb3RdXCIpLCB7XG4gICAgZmlsdGVyOiAoZWwpID0+IHsgZmlsdGVyID0gZWwuZGF0YXNldC5maWx0ZXIgYXMgdHlwZW9mIGZpbHRlcjsgZHJhdygpOyB9LFxuICAgIHRvZ2dsZTogKGVsKSA9PiB7IGNvbnN0IG4gPSBhbGwuZmluZCgoeCkgPT4geC5pZCA9PT0gTnVtYmVyKGVsLmRhdGFzZXQuaWQpKTsgcmV0dXJuIHJ1bigoKSA9PiBtYXJrTm90aWNlUmVhZChOdW1iZXIoZWwuZGF0YXNldC5pZCksICFuPy5pc19yZWFkKSk7IH0sXG4gICAgcmVtb3ZlOiAoZWwpID0+IHJ1bigoKSA9PiBkZWxldGVOb3RpY2UoTnVtYmVyKGVsLmRhdGFzZXQuaWQpKSksXG4gIH0pO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVdBLElBQU0sT0FBK0IsRUFBRSxVQUFVLFNBQVMsVUFBVSxTQUFTLFVBQVUsWUFBWSxTQUFTLFNBQVMsU0FBUyxTQUFTLFFBQVEsUUFBUSxhQUFhLE1BQU07QUFFMUssSUFBSSxNQUFnQixDQUFDO0FBQ3JCLElBQUksU0FBMkI7QUFFL0IsU0FBUyxPQUFhO0FBQ3BCLFFBQU0sU0FBUyxJ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
