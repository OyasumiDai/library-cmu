import { allBooks } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, html, mount, raw } from "../core/dom";
import { reveal } from "../core/motion";
import { chartCard, chartToggle, columns, dataTable, donut, percentChange, ranking, type Datum } from "../ui/charts";
import { loading } from "../ui/components";
import type { Book, Loan } from "../types";
import type { PanelTab } from "./tab";

type Range = "30d" | "90d" | "12m" | "all";
const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "30d", label: "30 days", days: 30 }, { id: "90d", label: "90 days", days: 90 }, { id: "12m", label: "12 months", days: 365 }, { id: "all", label: "All time", days: 0 },
];
const DAY = 86400000;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// the label and sort key of the bucket a date falls into: days for 30 days, weeks for 90 days, months otherwise
function bucket(range: Range, d: Date): { key: string; label: string } {
  if (range === "30d") { const k = d.toISOString().slice(5, 10); return { key: d.toISOString().slice(0, 10), label: k }; }
  if (range === "90d") { const monday = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY); return { key: monday.toISOString().slice(0, 10), label: `wk ${monday.toISOString().slice(5, 10)}` }; }
  return { key: monthKey(d), label: d.toLocaleString("en-PH", { month: "short", year: "2-digit" }) };
}

export const analytics: PanelTab = {
  id: "analytics",
  label: "Analytics",
  icon: "chart",
  async render(root) {
    mount(root, loading("Reading the numbers"));
    const [loans, books] = await Promise.all([loansByStatus(["requested", "borrowed", "returned", "rejected", "cancelled"], 5000), allBooks()]);
    let range: Range = "30d";
    let topN = 5;
    let metric: "requests" | "titles" | "copies" = "requests";

    const draw = () => {
      const days = RANGES.find((r) => r.id === range)!.days;
      const now = Date.now();
      const inRange = (l: Loan, from: number, to: number) => { const t = new Date(l.requested_at).getTime(); return t >= from && t < to; };
      const start = days ? now - days * DAY : 0;
      const current = loans.filter((l) => inRange(l, start, now + 1));
      const before = days ? loans.filter((l) => inRange(l, start - days * DAY, start)) : [];
      const onLoan = loans.filter((l) => l.status === "borrowed");
      const overdue = onLoan.filter((l) => l.due_at && new Date(l.due_at).getTime() < now);
      const students = new Set(current.map((l) => l.user_id)).size;
      const active = books.filter((b) => !b.archived);

      // requests over time
      const counts = new Map<string, { label: string; value: number }>();
      for (const l of current) { const b = bucket(range, new Date(l.requested_at)); const row = counts.get(b.key) ?? { label: b.label, value: 0 }; row.value++; counts.set(b.key, row); }
      const series: Datum[] = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);

      // status split, with overdue as its own part
      const parts: Datum[] = [
        { label: "Waiting", value: current.filter((l) => l.status === "requested").length, tone: 2 },
        { label: "On loan", value: current.filter((l) => l.status === "borrowed" && !overdue.includes(l)).length, tone: 1 },
        { label: "Overdue", value: current.filter((l) => overdue.includes(l)).length, tone: 4 },
        { label: "Returned", value: current.filter((l) => l.status === "returned").length, tone: 3 },
        { label: "Declined or cancelled", value: current.filter((l) => l.status === "rejected" || l.status === "cancelled").length, tone: 5 },
      ];

      // most requested titles
      const byTitle = new Map<string, number>();
      for (const l of current) byTitle.set(l.book?.title ?? "?", (byTitle.get(l.book?.title ?? "?") ?? 0) + 1);
      const top: Datum[] = [...byTitle.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topN).map(([label, value]) => ({ label, value }));

      // demand by category
      const cat = new Map<string, number>();
      if (metric === "requests") for (const l of current) cat.set(l.book?.category || "Other", (cat.get(l.book?.category || "Other") ?? 0) + 1);
      else for (const b of active as Book[]) cat.set(b.category || "Other", (cat.get(b.category || "Other") ?? 0) + (metric === "titles" ? 1 : b.copies));
      const categories: Datum[] = [...cat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

      const select = (id: string, value: string, options: [string, string][]) => html`<label class="visually-hidden" for="${id}">${id}</label><select class="select select--small" id="${id}">${options.map(([v, l]) => html`<option value="${v}" ${v === value ? raw("selected") : ""}>${l}</option>`)}</select>`;
      const change = days ? percentChange(current.length, before.length) : "";
      mount(root, html`
        <div class="panel__tab">
          <div class="panel__heading"><h2>Analytics</h2><div class="tabs" role="tablist" id="rangeTabs">${RANGES.map((r) => html`<button class="tab" role="tab" type="button" data-action="range" data-range="${r.id}" aria-selected="${r.id === range}">${r.label}</button>`)}</div></div>
          <div class="tile-grid">
            <div class="tile"><span class="tile__label">Loan requests</span><span class="tile__value">${current.length}</span>${change ? html`<span class="tile__note ${change.startsWith("-") ? "tile__note--down" : "tile__note--up"}">${change} vs the period before</span>` : ""}</div>
            <div class="tile"><span class="tile__label">Students borrowing</span><span class="tile__value">${students}</span></div>
            <div class="tile"><span class="tile__label">Books on loan now</span><span class="tile__value">${onLoan.length}</span></div>
            <div class="tile"><span class="tile__label">Overdue loans</span><span class="tile__value">${overdue.length}</span></div>
            <div class="tile"><span class="tile__label">Catalog size</span><span class="tile__value">${active.length}</span><span class="tile__note">${active.reduce((s, b) => s + b.copies, 0)} copies</span></div>
          </div>
          ${chartCard("chartTime", "Requests over time", series.length ? columns(series) : html`<p class="text-soft">No requests in this period.</p>`, dataTable(["Period", "Requests"], series.map((d) => [d.label, d.value])))}
          <div class="grid grid--2">
            ${chartCard("chartStatus", "Loan status", donut(parts), dataTable(["Status", "Loans"], parts.map((p) => [p.label, p.value])))}
            ${chartCard("chartTop", `Most requested titles (top ${topN})`, ranking(top), dataTable(["Title", "Requests"], top.map((d) => [d.label, d.value])), select("topN", String(topN), [["5", "Top 5"], ["10", "Top 10"]]))}
          </div>
          ${chartCard("chartCategory", "Demand by category", ranking(categories), dataTable(["Category", metric === "requests" ? "Requests" : metric === "titles" ? "Titles" : "Copies"], categories.map((d) => [d.label, d.value])), select("metric", metric, [["requests", "By requests"], ["titles", "By titles"], ["copies", "By copies"]]))}
        </div>`);
      root.querySelector<HTMLSelectElement>("#topN")?.addEventListener("change", (e) => { topN = Number((e.target as HTMLSelectElement).value); draw(); });
      root.querySelector<HTMLSelectElement>("#metric")?.addEventListener("change", (e) => { metric = (e.target as HTMLSelectElement).value as typeof metric; draw(); });
      reveal(root);
    };
    actions(root, { range: (el) => { range = el.dataset.range as Range; draw(); } });
    chartToggle(root);
    draw();
  },
};
