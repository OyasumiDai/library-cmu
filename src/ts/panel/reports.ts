// Four reports on one page, each with its own filters and a short live view. "Preview" opens the CSV exactly as it
// will download (title block, every row, file name); the download is logged. Needs the "Reports" permission.
import { allBooks, logReportDownload, movements } from "../api/staff";
import { loansByStatus } from "../api/loans";
import { actions, debounce, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { csvDateTime, csvSheet, daysUntil, downloadCsv, plural, type CsvReport } from "../core/format";
import { formatIsbn } from "../core/isbn";
import { openModal } from "../core/modal";
import { current } from "../core/session";
import { ok } from "../core/toast";
import { dataTable } from "../ui/charts";
import { empty, loading } from "../ui/components";
import type { Book, Loan, LoanStatus } from "../types";
import type { PanelTab } from "./tab";

type Filters = { from: string; to: string; status: string };
type Result = { header: string[]; rows: (string | number)[][] };

// the books and loans are fetched once and shared by the four reports
interface Data {
  books(): Promise<Book[]>;
  loans(statuses: LoanStatus[]): Promise<Loan[]>;
}

interface Report {
  id: string;
  title: string;
  text: string;
  icon: string;
  filters: "none" | "dates" | "loans";
  build(f: Filters, data: Data): Promise<Result>;
}

const ALL_STATUSES: LoanStatus[] = ["requested", "borrowed", "returned", "rejected", "cancelled"];
const PEEK_ROWS = 5;
const PREVIEW_ROWS = 300;

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
    id: "catalog", title: "Catalog and availability", icon: "book", filters: "none",
    text: "Every title with its ISBN, copies, what is on loan and what is free, and the date it was added.",
    async build(_f, data) {
      const [books, loans] = await Promise.all([data.books(), data.loans(ALL_STATUSES)]);
      const out = new Map<string, number>(); const held = new Map<string, number>();
      for (const l of loans) {
        if (l.status === "borrowed") out.set(l.book_id, (out.get(l.book_id) ?? 0) + 1);
        if (l.status === "requested") held.set(l.book_id, (held.get(l.book_id) ?? 0) + 1);
      }
      return {
        header: ["ISBN", "Title", "Author", "Subject", "Shelf", "First published", "Copies", "On loan", "Reserved", "Free", "Status", "Date added"],
        rows: books.map((b) => [b.isbn ? formatIsbn(b.isbn) : "(none)", b.title, b.author, b.category, b.shelf, b.published, b.copies, out.get(b.id) ?? 0, held.get(b.id) ?? 0,
          Math.max(b.copies - (out.get(b.id) ?? 0) - (held.get(b.id) ?? 0), 0), b.archived ? "Archived" : "Active", csvDateTime(b.created_at)]),
      };
    },
  },
  {
    id: "loans", title: "Loans", icon: "shelf", filters: "loans",
    text: "Requests, checkouts and returns with the date and time of each step. Filter by request date and status.",
    async build(f, data) {
      const [loans, books] = await Promise.all([data.loans(ALL_STATUSES), data.books()]);
      const isbn = isbnOf(books);
      return {
        header: ["Loan no.", "ISBN", "Book", "Author", "Student", "Username", "Student ID", "Status", "Requested", "Borrowed", "Due", "Returned", "Days overdue"],
        rows: loans.filter((l) => (!f.status || l.status === f.status) && within(l.requested_at, f.from, f.to)).map((l) => [l.id, isbn.get(l.book_id) ?? "", l.book?.title ?? "", l.book?.author ?? "",
          l.profile?.full_name ?? "", l.profile?.username ?? "", l.profile?.student_id ?? "", l.status, csvDateTime(l.requested_at), csvDateTime(l.borrowed_at), csvDateTime(l.due_at),
          csvDateTime(l.returned_at), l.status === "borrowed" ? overdueDays(l.due_at) : ""]),
      };
    },
  },
  {
    id: "overdue", title: "Overdue follow-up", icon: "clock", filters: "none",
    text: "Borrowed books past their due date, longest overdue first.",
    async build(_f, data) {
      const [all, books] = await Promise.all([data.loans(ALL_STATUSES), data.books()]);
      const isbn = isbnOf(books);
      const loans = all.filter((l) => l.status === "borrowed" && l.due_at && daysUntil(l.due_at) < 0).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
      return {
        header: ["Student", "Username", "Student ID", "ISBN", "Book", "Borrowed", "Due", "Days overdue"],
        rows: loans.map((l) => [l.profile?.full_name ?? "", l.profile?.username ?? "", l.profile?.student_id ?? "", isbn.get(l.book_id) ?? "", l.book?.title ?? "", csvDateTime(l.borrowed_at), csvDateTime(l.due_at), overdueDays(l.due_at)]),
      };
    },
  },
  {
    id: "movements", title: "Book movements", icon: "refresh", filters: "dates",
    text: "Checkouts, returns, new titles and copy changes, with the date and time of each. Filter by date.",
    async build(f, data) {
      const [rows, books] = await Promise.all([movements({ from: f.from, to: f.to, limit: 2000 }), data.books()]);
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
    let shared: { books?: Promise<Book[]>; loans?: Promise<Loan[]> } = {};
    const data: Data = {
      books: () => (shared.books ??= allBooks()),
      loans: () => (shared.loans ??= loansByStatus(ALL_STATUSES, 5000)),
    };
    const filters = new Map<string, Filters>(REPORTS.map((r) => [r.id, { from: "", to: "", status: "" }]));
    const results = new Map<string, Result>();

    const sheetFor = (r: Report): CsvReport => {
      const f = filters.get(r.id)!;
      const result = results.get(r.id)!;
      return { title: r.title, file: r.id, header: result.header, rows: result.rows, by: who(), filters: [["From", f.from], ["To", f.to], ["Status", f.status]] };
    };

    const download = (r: Report, at?: string) => {
      if (!results.has(r.id)) return;
      downloadCsv(sheetFor(r), at);
      void logReportDownload();
      ok(`Downloaded "${r.title}".`);
    };

    // one report: build it and show its count and first rows
    const load = async (r: Report) => {
      const body = root.querySelector<HTMLElement>(`[data-report="${r.id}"] [data-peek]`)!;
      const buttons = root.querySelectorAll<HTMLButtonElement>(`[data-report="${r.id}"] [data-needs-result]`);
      buttons.forEach((b) => { b.disabled = true; });
      mount(body, loading("Building the report"));
      try {
        const result = await r.build(filters.get(r.id)!, data);
        results.set(r.id, result);
        buttons.forEach((b) => { b.disabled = false; });
        mount(body, result.rows.length
          ? html`<p class="result-count">${plural(result.rows.length, "row")}${result.rows.length > PEEK_ROWS ? ` · showing the first ${PEEK_ROWS}` : ""}</p>${dataTable(result.header, result.rows.slice(0, PEEK_ROWS))}`
          : html`<p class="result-count">0 rows</p>${empty("Nothing to report", "Change the filters, or check back later.", r.icon)}`);
      } catch (error) {
        results.delete(r.id);
        mount(body, html`<div class="alert alert--danger px px--danger">${friendly(error)}</div>`);
      }
    };

    // the CSV as it will download: the title block, the file name, every row, the end line
    const preview = (r: Report) => {
      const result = results.get(r.id);
      if (!result) return;
      const at = new Date().toISOString();
      const sheet = csvSheet(sheetFor(r), at);
      const modal = openModal(`CSV preview: ${r.title}`, html`
        <p class="text-soft">${icon("download")} <strong>${sheet.name}</strong></p>
        <dl class="book-detail__facts">${sheet.meta.slice(1).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
        ${result.rows.length ? dataTable(result.header, result.rows.slice(0, PREVIEW_ROWS)) : empty("No rows", "The file will hold only the title block.", r.icon)}
        ${result.rows.length > PREVIEW_ROWS ? html`<p class="result-count">Showing the first ${PREVIEW_ROWS} of ${result.rows.length} rows here. The download has all of them.</p>` : ""}
        <p class="text-soft">${sheet.end}</p>`, {
        wide: true,
        footer: html`<button class="btn btn--quiet" type="button" data-close>Close</button><button class="btn" type="button" data-download>${icon("download")} Download CSV</button>`,
      });
      modal.root.querySelector(".modal")?.classList.add("modal--xl");
      modal.root.querySelector("[data-download]")!.addEventListener("click", () => { download(r, at); modal.close(); });
    };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Reports</h2><button class="btn btn--secondary" type="button" data-action="refresh">${icon("refresh")} Refresh all</button></div>
      <p class="text-soft">Each report updates as you change its filters. Preview shows the CSV exactly as it will download.</p>
      ${REPORTS.map((r) => html`
        <section class="card px" data-report="${r.id}">
          <div class="panel__heading"><h3>${icon(r.icon)} ${r.title}</h3>
            <div class="cluster">
              <button class="btn" type="button" data-action="preview" data-id="${r.id}" data-needs-result disabled>${icon("eye")} Preview</button>
              <button class="btn btn--secondary" type="button" data-action="download" data-id="${r.id}" data-needs-result disabled>${icon("download")} Download CSV</button>
            </div></div>
          <p class="text-soft">${r.text}</p>
          ${r.filters !== "none" ? html`<div class="toolbar toolbar--wide" data-filters="${r.id}">
            <div class="field"><label class="field__label" for="rp-${r.id}-from">From</label><input class="input" id="rp-${r.id}-from" name="from" type="date"></div>
            <div class="field"><label class="field__label" for="rp-${r.id}-to">To</label><input class="input" id="rp-${r.id}-to" name="to" type="date"></div>
            ${r.filters === "loans" ? html`<div class="field"><label class="field__label" for="rp-${r.id}-status">Status</label><select class="select" id="rp-${r.id}-status" name="status">${["", ...ALL_STATUSES].map((v) => html`<option value="${v}" ${v ? "" : raw("selected")}>${v || "All"}</option>`)}</select></div>` : ""}
          </div>` : ""}
          <div data-peek></div>
        </section>`)}
    </div>`);

    root.querySelectorAll<HTMLElement>("[data-filters]").forEach((bar) => {
      const r = REPORTS.find((x) => x.id === bar.dataset.filters)!;
      bar.addEventListener("change", debounce(() => {
        const value = (name: string) => bar.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";
        filters.set(r.id, { from: value("from"), to: value("to"), status: value("status") });
        void load(r);
      }, 200));
    });

    const byId = (el: HTMLElement) => REPORTS.find((r) => r.id === el.dataset.id)!;
    actions(root, {
      preview: (el) => preview(byId(el)),
      download: (el) => download(byId(el)),
      refresh: () => { shared = {}; REPORTS.forEach((r) => void load(r)); },
    });
    REPORTS.forEach((r) => void load(r));
  },
};
