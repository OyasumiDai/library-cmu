// Four reports with filters, a preview and CSV downloads. Needs the "Reports" permission.
import { allBooks, logReportDownload, movements } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { csvDateTime, daysUntil, downloadCsv } from "../core/format";
import { formatIsbn } from "../core/isbn";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { dataTable } from "../ui/charts";
import { loading } from "../ui/components";
import type { Book } from "../types";
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

// ISBN by book id, for the reports that list loans
const isbnOf = (books: Book[]) => new Map(books.map((b) => [b.id, b.isbn ? formatIsbn(b.isbn) : ""]));
const overdueDays = (due: string | null) => (due && daysUntil(due) < 0 ? -daysUntil(due) : "");

const REPORTS: Report[] = [
  {
    id: "catalog", title: "Catalog and availability", text: "Every title with its ISBN, copies, what is on loan and what is free, and the date it was added.", filters: "none",
    async build() {
      const [books, loans] = await Promise.all([allBooks(), loansByStatus(["requested", "borrowed"], 5000)]);
      const out = new Map<string, number>(); const held = new Map<string, number>();
      for (const l of loans) (l.status === "borrowed" ? out : held).set(l.book_id, ((l.status === "borrowed" ? out : held).get(l.book_id) ?? 0) + 1);
      return {
        header: ["ISBN", "Title", "Author", "Subject", "Shelf", "First published", "Copies", "On loan", "Reserved", "Free", "Status", "Date added"],
        rows: books.map((b) => [b.isbn ? formatIsbn(b.isbn) : "(none)", b.title, b.author, b.category, b.shelf, b.published, b.copies, out.get(b.id) ?? 0, held.get(b.id) ?? 0,
          Math.max(b.copies - (out.get(b.id) ?? 0) - (held.get(b.id) ?? 0), 0), b.archived ? "Archived" : "Active", csvDateTime(b.created_at)]),
      };
    },
  },
  {
    id: "loans", title: "Loans", text: "Requests, checkouts and returns with the date and time of each step. Filter by request date and status.", filters: "loans",
    async build(f) {
      const [loans, books] = await Promise.all([loansByStatus(f.status ? [f.status as "requested"] : ["requested", "borrowed", "returned", "rejected", "cancelled"], 5000), allBooks()]);
      const isbn = isbnOf(books);
      return {
        header: ["Loan no.", "ISBN", "Book", "Author", "Student", "Username", "Student ID", "Status", "Requested", "Borrowed", "Due", "Returned", "Days overdue"],
        rows: loans.filter((l) => within(l.requested_at, f.from, f.to)).map((l) => [l.id, isbn.get(l.book_id) ?? "", l.book?.title ?? "", l.book?.author ?? "", l.profile?.full_name ?? "", l.profile?.username ?? "",
          l.profile?.student_id ?? "", l.status, csvDateTime(l.requested_at), csvDateTime(l.borrowed_at), csvDateTime(l.due_at), csvDateTime(l.returned_at), l.status === "borrowed" ? overdueDays(l.due_at) : ""]),
      };
    },
  },
  {
    id: "overdue", title: "Overdue follow-up", text: "Borrowed books past their due date, longest overdue first.", filters: "none",
    async build() {
      const [all, books] = await Promise.all([loansByStatus(["borrowed"], 5000), allBooks()]);
      const isbn = isbnOf(books);
      const loans = all.filter((l) => l.due_at && daysUntil(l.due_at) < 0).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
      return {
        header: ["Student", "Username", "Student ID", "ISBN", "Book", "Borrowed", "Due", "Days overdue"],
        rows: loans.map((l) => [l.profile?.full_name ?? "", l.profile?.username ?? "", l.profile?.student_id ?? "", isbn.get(l.book_id) ?? "", l.book?.title ?? "", csvDateTime(l.borrowed_at), csvDateTime(l.due_at), overdueDays(l.due_at)]),
      };
    },
  },
  {
    id: "movements", title: "Book movements", text: "Checkouts, returns, new titles and copy changes, with the date and time of each. Filter by date.", filters: "dates",
    async build(f) {
      const [rows, books] = await Promise.all([movements({ from: f.from, to: f.to, limit: 2000 }), allBooks()]);
      const isbn = isbnOf(books);
      return { header: ["Date and time", "Type", "ISBN", "Book", "Quantity", "By", "Remarks"], rows: rows.map((m) => [csvDateTime(m.created_at), m.action, isbn.get(m.book_id) ?? "", m.title, m.quantity, m.actor ?? "", m.remarks ?? ""]) };
    },
  },
];

// the name printed on a downloaded report
export const who = (): string => { const p = current().profile; return p ? `${p.full_name || p.username} (${p.username}, ${p.role})` : ""; };

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
        downloadCsv({ title: active.title, file: active.id, header: result.header, rows: result.rows, by: who(),
          filters: [["From", saved.from], ["To", saved.to], ["Status", saved.status]] });
        void logReportDownload();
        ok("Downloaded.");
      },
    });
    draw();
  },
};
