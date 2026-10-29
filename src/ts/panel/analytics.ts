import { allBooks } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, html, icon, mount, raw } from "../core/dom";
import { reveal } from "../core/motion";
import { chartCard, chartToggle, columns, dataTable, donut, kpi, percentChange, ranking, type Datum } from "../ui/charts";
import { loading } from "../ui/components";
import type { Book, Loan } from "../types";
import type { PanelTab } from "./tab";

type Range = "30d" | "90d" | "12m" | "all";
const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "30d", label: "30 days", days: 30 }, { id: "90d", label: "90 days", days: 90 }, { id: "12m", label: "12 months", days: 365 }, { id: "all", label: "All time", days: 0 },
];
const DAY = 86400000;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const weekday = (iso: string) => new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "Asia/Manila" }).format(new Date(iso));

// the label and sort key of the bucket a date falls into: days for 30 days, weeks for 90 days, months otherwise
function bucket(range: Range, d: Date): { key: string; label: string } {
  if (range === "30d") { const k = d.toISOString().slice(5, 10); return { key: d.toISOString().slice(0, 10), label: k }; }
  if (range === "90d") { const monday = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY); return { key: monday.toISOString().slice(0, 10), label: `wk ${monday.toISOString().slice(5, 10)}` }; }
  return { key: monthKey(d), label: d.toLocaleString("en-PH", { month: "short", year: "2-digit" }) };
}

const trendOf = (change: string): "up" | "down" | "" => (change.startsWith("-") ? "down" : change.startsWith("+") || change === "new" ? "up" : "");

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
      const studentsBefore = new Set(before.map((l) => l.user_id)).size;
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

      // demand by subject
      const cat = new Map<string, number>();
      if (metric === "requests") for (const l of current) cat.set(l.book?.category || "Other", (cat.get(l.book?.category || "Other") ?? 0) + 1);
      else for (const b of active as Book[]) cat.set(b.category || "Other", (cat.get(b.category || "Other") ?? 0) + (metric === "titles" ? 1 : b.copies));
      const categories: Datum[] = [...cat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

      // insights: how long books stay out, how many come back on time, the busiest day, the shelf nobody asks for
      const returned = current.filter((l) => l.status === "returned" && l.borrowed_at && l.returned_at);
      const avgDays = returned.length ? returned.reduce((s, l) => s + (new Date(l.returned_at!).getTime() - new Date(l.borrowed_at!).getTime()) / DAY, 0) / returned.length : 0;
      const dated = returned.filter((l) => l.due_at);
      const onTime = dated.filter((l) => new Date(l.returned_at!).getTime() <= new Date(l.due_at!).getTime()).length;
      const byDay = new Map<string, number>();
      for (const l of current) byDay.set(weekday(l.requested_at), (byDay.get(weekday(l.requested_at)) ?? 0) + 1);
      const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
      const asked = new Set(current.map((l) => l.book_id));
      const unasked = active.filter((b) => !asked.has(b.id)).length;
      const insights: [string, string, string][] = [
        ["clock", "Average loan length", returned.length ? `${avgDays.toFixed(1)} days` : "-"],
        ["check", "Returned on time", dated.length ? `${Math.round((onTime / dated.length) * 100)}% (${onTime} of ${dated.length})` : "-"],
        ["calendar", "Busiest day for requests", busiest ? `${busiest[0]} (${busiest[1]})` : "-"],
        ["book", "Titles nobody requested", `${unasked} of ${active.length}`],
      ];

      const select = (id: string, label: string, value: string, options: [string, string][]) => html`<label class="visually-hidden" for="${id}">${label}</label><select class="select select--small" id="${id}">${options.map(([v, l]) => html`<option value="${v}" ${v === value ? raw("selected") : ""}>${l}</option>`)}</select>`;
      const change = days ? percentChange(current.length, before.length) : "";
      const studentChange = days ? percentChange(students, studentsBefore) : "";
      const periodLabel = RANGES.find((r) => r.id === range)!.label.toLowerCase();
      mount(root, html`
        <div class="panel__tab dash">
          <header class="dash-hero dash-hero--slim card px">
            <div class="dash-hero__text"><span class="eyebrow">Analytics</span><h2>How the library is used</h2>
              <p class="text-soft">${range === "all" ? "Every loan request on record." : `The last ${periodLabel}, compared with the ${periodLabel} before.`}</p></div>
            <div class="seg seg--scroll" role="tablist" aria-label="Period">${RANGES.map((r) => html`<button class="seg__btn" role="tab" type="button" data-action="range" data-range="${r.id}" aria-pressed="${r.id === range}" aria-selected="${r.id === range}">${r.label}</button>`)}</div>
          </header>

          <div class="kpi-grid">
            ${kpi({ label: "Loan requests", value: current.length, icon: "bell", tone: 2, note: change ? `${change} vs before` : "all time", trend: trendOf(change) })}
            ${kpi({ label: "Students borrowing", value: students, icon: "users", tone: 5, note: studentChange ? `${studentChange} vs before` : "all time", trend: trendOf(studentChange) })}
            ${kpi({ label: "On loan now", value: onLoan.length, icon: "shelf", tone: 1, note: "right now" })}
            ${kpi({ label: "Overdue now", value: overdue.length, icon: "clock", tone: 4, note: overdue.length ? "needs follow-up" : "all on time", trend: overdue.length ? "down" : "up" })}
            ${kpi({ label: "Catalog", value: active.length, icon: "book", tone: 3, note: `${active.reduce((s, b) => s + b.copies, 0)} copies` })}
          </div>

          ${chartCard("chartTime", "Requests over time", series.length ? columns(series) : html`<p class="text-soft">No requests in this period.</p>`, dataTable(["Period", "Requests"], series.map((d) => [d.label, d.value])))}

          <div class="ana-grid">
            ${chartCard("chartStatus", "Loan status", donut(parts), dataTable(["Status", "Loans"], parts.map((p) => [p.label, p.value])))}
            <section class="card px" data-reveal>
              <h3>${icon("sparkle")} Insights</h3>
              <ul class="insights">${insights.map(([ic, label, value]) => html`<li class="insights__item"><span class="insights__icon">${icon(ic)}</span><span class="insights__label">${label}</span><strong>${value}</strong></li>`)}</ul>
            </section>
            ${chartCard("chartTop", `Most requested titles`, ranking(top), dataTable(["Title", "Requests"], top.map((d) => [d.label, d.value])), select("topN", "How many titles", String(topN), [["5", "Top 5"], ["10", "Top 10"]]))}
            ${chartCard("chartCategory", "Demand by subject", ranking(categories), dataTable(["Subject", metric === "requests" ? "Requests" : metric === "titles" ? "Titles" : "Copies"], categories.map((d) => [d.label, d.value])), select("metric", "Measure", metric, [["requests", "By requests"], ["titles", "By titles"], ["copies", "By copies"]]))}
          </div>
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
