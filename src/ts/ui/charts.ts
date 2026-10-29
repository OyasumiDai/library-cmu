// Small charts drawn with HTML and CSS (no chart library), each with a Chart / Table switch.
import { escapeHtml, html, raw, type Safe } from "../core/dom";

export interface Datum {
  label: string;
  value: number;
  tone?: 1 | 2 | 3 | 4 | 5;
}

// vertical columns, for things over time
export function columns(data: Datum[]): Safe {
  const top = Math.max(1, ...data.map((d) => d.value));
  return html`<ul class="columns" role="list">${data.map((d) => html`
    <li class="columns__item" tabindex="0" title="${d.label}: ${d.value}" aria-label="${d.label}: ${d.value}">
      <span class="columns__value">${d.value}</span>
      <span class="columns__bar" style="--h:${Math.round((d.value / top) * 100)}%"></span>
      <span class="columns__label">${d.label}</span>
    </li>`)}</ul>`;
}

// horizontal ranking, for "most requested"
export function ranking(data: Datum[]): Safe {
  const top = Math.max(1, ...data.map((d) => d.value));
  return data.length
    ? html`<ol class="ranking">${data.map((d, i) => html`
        <li class="ranking__row" tabindex="0" title="${d.label}: ${d.value}">
          <span class="ranking__rank">${i + 1}</span><span class="ranking__label">${d.label}</span>
          <span class="ranking__track"><span class="ranking__bar" style="--w:${Math.round((d.value / top) * 100)}%"></span></span>
          <strong>${d.value}</strong>
        </li>`)}</ol>`
    : html`<p class="text-soft">Nothing to show yet.</p>`;
}

// a ring split into parts, with its legend
export function donut(parts: Datum[]): Safe {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  let angle = 0;
  const stops = parts.filter((p) => p.value > 0).map((p) => {
    const from = angle;
    angle += (p.value / (total || 1)) * 360;
    return `var(--chart-${p.tone ?? 1}) ${from}deg ${angle}deg`;
  });
  return html`
    <div class="donut-wrap">
      <div class="donut" role="img" aria-label="${parts.map((p) => `${p.label} ${p.value}`).join(", ")}" style="--ring:${raw(stops.length ? `conic-gradient(${stops.join(", ")})` : "var(--surface-3)")}"><span>${total}</span></div>
      <ul class="legend">${parts.map((p) => html`<li><i style="--c:var(--chart-${p.tone ?? 1})"></i>${p.label} <strong>${p.value}</strong></li>`)}</ul>
    </div>`;
}

// a headline number: coloured icon, the number, what it counts, and a note (green when good, red when not).
// With a tab it is a button that opens that tab.
export function kpi(o: { label: string; value: number | string; icon: string; note?: string; trend?: "up" | "down" | ""; tone?: 1 | 2 | 3 | 4 | 5; tab?: string }): Safe {
  const tag = o.tab ? "button" : "div";
  const icon = `<svg class="icon" aria-hidden="true"><use href="/assets/icons/icons.svg#${escapeHtml(o.icon)}"/></svg>`;
  return html`<${raw(tag)} class="kpi" style="--kpi:var(--chart-${o.tone ?? 1})" ${o.tab ? raw(`type="button" data-action="open" data-tab="${escapeHtml(o.tab)}"`) : ""}>
    <span class="kpi__icon">${raw(icon)}</span>
    <span class="kpi__body"><span class="kpi__value">${o.value}</span><span class="kpi__label">${o.label}</span>
      ${o.note ? html`<span class="kpi__note ${o.trend ? `kpi__note--${o.trend}` : ""}">${o.note}</span>` : ""}</span>
  </${raw(tag)}>`;
}

export function dataTable(headers: string[], rows: (string | number)[][]): Safe {
  return html`<div class="table-wrap"><table class="table"><thead><tr>${headers.map((h) => html`<th>${h}</th>`)}</tr></thead>
    <tbody>${rows.map((r) => html`<tr>${r.map((c) => html`<td>${c}</td>`)}</tr>`)}</tbody></table></div>`;
}

// a card holding a chart and the same numbers as a table; the button flips between them
export function chartCard(id: string, title: string, chart: Safe, table: Safe, controls: Safe | string = ""): Safe {
  return html`
    <section class="card px chart-card" id="${id}" data-view="chart" data-reveal>
      <header class="chart-card__head">
        <h3>${title}</h3>
        <div class="cluster">${typeof controls === "string" ? raw(controls) : controls}
          <div class="seg" role="group" aria-label="View as">
            <button class="seg__btn" type="button" data-action="chartView" data-card="${id}" data-mode="chart" aria-pressed="true">Chart</button>
            <button class="seg__btn" type="button" data-action="chartView" data-card="${id}" data-mode="table" aria-pressed="false">Table</button>
          </div>
        </div>
      </header>
      <div class="chart-card__chart">${chart}</div>
      <div class="chart-card__table" hidden>${table}</div>
    </section>`;
}

// call once per tab: flips a card between chart and table
export function chartToggle(root: Element): void {
  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-action="chartView"]');
    if (!button) return;
    const card = document.getElementById(button.dataset.card ?? "");
    if (!card) return;
    const table = button.dataset.mode === "table";
    card.dataset.view = button.dataset.mode ?? "chart";
    card.querySelector<HTMLElement>(".chart-card__chart")!.hidden = table;
    card.querySelector<HTMLElement>(".chart-card__table")!.hidden = !table;
    card.querySelectorAll<HTMLElement>(".seg__btn").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  });
}

export const percentChange = (now: number, before: number): string => {
  if (before === 0) return now === 0 ? "no change" : "new";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
};

export { escapeHtml };
