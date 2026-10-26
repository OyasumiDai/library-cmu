import {
  empty,
  loading
} from "./chunks/chunk-YFDTB4J4.js";
import {
  announcements,
  boot,
  formatDate,
  html,
  icon,
  mount,
  qs
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/announcements.ts
boot(async () => {
  const list = qs("#newsList");
  mount(list, loading("Reading the notice board"));
  const items = await announcements();
  mount(list, items.length ? html`${items.map((n) => html`
        <article class="card px" data-reveal>
          <h2 class="card__title">${icon("news")} ${n.title}</h2>
          <p class="card__meta">${icon("calendar", "icon--sm")} ${formatDate(n.created_at)}</p>
          <p>${n.body}</p>
        </article>`)}` : empty("Nothing posted yet", "Check back soon."));
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL2Fubm91bmNlbWVudHMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGFubm91bmNlbWVudHMgfSBmcm9tIFwiLi4vYXBpL2NvbnRlbnRcIjtcbmltcG9ydCB7IGJvb3QgfSBmcm9tIFwiLi4vY29yZS9ib290XCI7XG5pbXBvcnQgeyBodG1sLCBpY29uLCBtb3VudCwgcXMgfSBmcm9tIFwiLi4vY29yZS9kb21cIjtcbmltcG9ydCB7IGZvcm1hdERhdGUgfSBmcm9tIFwiLi4vY29yZS9mb3JtYXRcIjtcbmltcG9ydCB7IGVtcHR5LCBsb2FkaW5nIH0gZnJvbSBcIi4uL3VpL2NvbXBvbmVudHNcIjtcblxuYm9vdChhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGxpc3QgPSBxcyhcIiNuZXdzTGlzdFwiKTtcbiAgbW91bnQobGlzdCwgbG9hZGluZyhcIlJlYWRpbmcgdGhlIG5vdGljZSBib2FyZFwiKSk7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgYW5ub3VuY2VtZW50cygpO1xuICBtb3VudChsaXN0LCBpdGVtcy5sZW5ndGhcbiAgICA/IGh0bWxgJHtpdGVtcy5tYXAoKG4pID0+IGh0bWxgXG4gICAgICAgIDxhcnRpY2xlIGNsYXNzPVwiY2FyZCBweFwiIGRhdGEtcmV2ZWFsPlxuICAgICAgICAgIDxoMiBjbGFzcz1cImNhcmRfX3RpdGxlXCI+JHtpY29uKFwibmV3c1wiKX0gJHtuLnRpdGxlfTwvaDI+XG4gICAgICAgICAgPHAgY2xhc3M9XCJjYXJkX19tZXRhXCI+JHtpY29uKFwiY2FsZW5kYXJcIiwgXCJpY29uLS1zbVwiKX0gJHtmb3JtYXREYXRlKG4uY3JlYXRlZF9hdCl9PC9wPlxuICAgICAgICAgIDxwPiR7bi5ib2R5fTwvcD5cbiAgICAgICAgPC9hcnRpY2xlPmApfWBcbiAgICA6IGVtcHR5KFwiTm90aGluZyBwb3N0ZWQgeWV0XCIsIFwiQ2hlY2sgYmFjayBzb29uLlwiKSk7XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7OztBQU1BLEtBQUssWUFBWTtBQUNmLFFBQU0sT0FBTyxHQUFHLFdBQVc7QUFDM0IsUUFBTSxNQUFNLFFBQVEsMEJBQTBCLENBQUM7QUFDL0MsUUFBTSxRQUFRLE1BQU0sY0FBYztBQUNsQyxRQUFNLE1BQU0sTUFBTSxTQUNkLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTTtBQUFBO0FBQUEsb0NBRU0sS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUs7QUFBQSxrQ0FDekIsS0FBSyxZQUFZLFVBQVUsQ0FBQyxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUM7QUFBQSxlQUMzRSxFQUFFLElBQUk7QUFBQSxtQkFDRixDQUFDLEtBQ2QsTUFBTSxzQkFBc0Isa0JBQWtCLENBQUM7QUFDckQsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
