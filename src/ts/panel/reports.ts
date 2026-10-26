// Four reports with filters, a preview and CSV downloads. Needs the "Reports" permission.
import { allBooks, logReportDownload, movements } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { daysUntil, downloadCsv, formatDate, formatDateTime } from "../core/format";
import { fail, ok } from "../core/toast";
import { dataTable } from "../ui/charts";
import { loading } from "../ui/components";
import type { PanelTab } from "./tab";

interface Report {
  id: string;
  title: string;
  text: string;
  filters: "none" | "dates" | "loans";
  build(f: { from: string; to: string; status: string }): Promise<{ header: string[]; rows: (string | number)[][] }>;
}

const within = (iso: string | null, from: string, to: string) => {
  if (!iso) return !from && !to;
  const day = iso.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
};

const REPORTS: Report[] = [
  {
    id: "catalog", title: "Catalog and availability", text: "Every title with copies, what is on loan and what is free.", filters: "none",
    async build() {
      const [books, loans] = await Promise.all([allBooks(), loansByStatus(["requested", "borrowed"], 5000)]);
      const out = new Map<string, number>(); const held = new Map<string, number>();
      for (const l of loans) (l.status === "borrowed" ? out : held).set(l.book_id, ((l.status === "borrowed" ? out : held).get(l.book_id) ?? 0) + 1);
      return { header: ["ID", "Title", "Author", "Subject", "Shelf", "Copies", "On loan", "Reserved", "Free", "Archived"], rows: books.map((b) => [b.id, b.title, b.author, b.category, b.shelf, b.copies, out.get(b.id) ?? 0, held.get(b.id) ?? 0, Math.max(b.copies - (out.get(b.id) ?? 0) - (held.get(b.id) ?? 0), 0), b.archived ? "yes" : "no"]) };
    },
  },
  {
    id: "loans", title: "Loans", text: "Requests, checkouts and returns with dates. Filter by request date and status.", filters: "loans",
    async build(f) {
      const loans = await loansByStatus(f.status ? [f.status as "requested"] : ["requested", "borrowed", "returned", "rejected", "cancelled"], 5000);
      return { header: ["Loan", "Book", "Author", "Username", "Student ID", "Status", "Requested", "Borrowed", "Due", "Returned"], rows: loans.filter((l) => within(l.requested_at, f.from, f.to)).map((l) => [l.id, l.book?.title ?? "", l.book?.author ?? "", l.profile?.username ?? "", l.profile?.student_id ?? "", l.status, formatDate(l.requested_at), formatDate(l.borrowed_at), formatDate(l.due_at), formatDate(l.returned_at)]) };
    },
  },
  {
    id: "overdue", title: "Overdue follow-up", text: "Borrowed books past their due date, longest overdue first.", filters: "none",
    async build() {
      const loans = (await loansByStatus(["borrowed"], 5000)).filter((l) => l.due_at && daysUntil(l.due_at) < 0).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
      return { header: ["Student", "Student ID", "Book", "Due", "Days overdue"], rows: loans.map((l) => [`${l.profile?.full_name} (${l.profile?.username})`, l.profile?.student_id ?? "", l.book?.title ?? "", formatDate(l.due_at), -daysUntil(l.due_at!)]) };
    },
  },
  {
    id: "movements", title: "Book movements", text: "Checkouts, returns, new titles and copy changes. Filter by date.", filters: "dates",
    async build(f) {
      const rows = await movements({ from: f.from, to: f.to, limit: 2000 });
      return { header: ["When", "Type", "Book", "Quantity", "By", "Remarks"], rows: rows.map((m) => [formatDateTime(m.created_at), m.action, m.title, m.quantity, m.actor ?? "", m.remarks ?? ""]) };
    },
  },
];

export const reports: PanelTab = {
  id: "reports",
  label: "Reports",
  icon: "download",
  need: "reports",
  render(root) {
    let active = REPORTS[0];
    let result: Awaited<ReturnType<Report["build"]>> | null = null;
    let saved = { from: "", to: "", status: "" };
    const filterValues = () => ({ from: (root.querySelector("#rpFrom") as HTMLInputElement | null)?.value ?? "", to: (root.querySelector("#rpTo") as HTMLInputElement | null)?.value ?? "", status: (root.querySelector("#rpStatus") as HTMLSelectElement | null)?.value ?? "" });

    const draw = () => {
      mount(root, html`<div class="panel__tab">
        <div class="panel__heading"><h2>Reports</h2></div>
        <div class="tabs" role="tablist">${REPORTS.map((r) => html`<button class="tab" role="tab" type="button" data-action="pick" data-id="${r.id}" aria-selected="${r.id === active.id}">${r.title}</button>`)}</div>
        <section class="card px">
          <h3>${active.title}</h3><p class="text-soft">${active.text}</p>
          <div class="toolbar toolbar--wide">${active.filters !== "none" ? html`
            <div class="field"><label class="field__label" for="rpFrom">From</label><input class="input" id="rpFrom" type="date" value="${saved.from}"></div>
            <div class="field"><label class="field__label" for="rpTo">To</label><input class="input" id="rpTo" type="date" value="${saved.to}"></div>` : ""}
            ${active.filters === "loans" ? html`<div class="field"><label class="field__label" for="rpStatus">Status</label><select class="select" id="rpStatus">${["", "requested", "borrowed", "returned", "rejected", "cancelled"].map((v) => html`<option value="${v}" ${v === saved.status ? raw("selected") : ""}>${v || "All"}</option>`)}</select></div>` : ""}
            <button class="btn" type="button" data-action="preview">Preview</button>
            <button class="btn btn--secondary" type="button" data-action="download" ${result ? "" : html`disabled`}>${icon("download")} Download CSV</button></div>
          <div id="rpResult">${result ? html`<p class="result-count">${result.rows.length} rows${result.rows.length > 20 ? " (showing the first 20)" : ""}</p>${dataTable(result.header, result.rows.slice(0, 20))}` : html`<p class="text-soft">Press Preview to see the report before you download it.</p>`}</div>
        </section></div>`);
    };

    actions(root, {
      pick: (el) => { active = REPORTS.find((r) => r.id === el.dataset.id)!; result = null; saved = { from: "", to: "", status: "" }; draw(); },
      preview: async () => {
        const target = root.querySelector<HTMLElement>("#rpResult")!;
        mount(target, loading("Building the report"));
        try { saved = filterValues(); result = await active.build(saved); draw(); } catch (error) { fail(friendly(error)); draw(); }
      },
      download: () => {
        if (!result) return;
        downloadCsv(`${active.id}-${new Date().toISOString().slice(0, 10)}.csv`, result.header, result.rows);
        void logReportDownload();
        ok("Downloaded.");
      },
    });
    draw();
  },
};
