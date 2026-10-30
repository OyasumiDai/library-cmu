// The student list and profile panel. Needs the "Student Profiles" permission (the database enforces it too).
import { loansByStatus } from "../api/loans";
import { people, sendNotice, setActive, userActivity } from "../api/staff";
import { actions, debounce, formData, html, icon, mount, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { daysUntil, dueLabel, formatDate, initials, relative } from "../core/format";
import { openModal } from "../core/modal";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { empty, loading } from "../ui/components";
import type { Loan, Profile } from "../types";
import type { PanelTab } from "./tab";

type Tile = "all" | "active" | "disabled" | "incomplete" | "new";
const NOTICE_KINDS = [["overdue", "Overdue notice"], ["due_soon", "Due date reminder"], ["general", "General reminder"]] as const;
const complete = (p: Profile) => !!(p.course && p.year_level && p.phone);

export const students: PanelTab = {
  id: "students",
  label: "Students",
  icon: "users",
  need: "students",
  async render(root, query = "") {
    let everyone: Profile[] = [];
    let loans: Loan[] = [];
    let tile: Tile = "all";
    let term = query;
    let college = "";
    let course = "";
    let year = "";
    let registered = "";
    let sort: "name" | "newest" | "oldest" = "name";
    let cards = false;
    let list: Profile[] = [];
    const me = current().profile!.id;

    const base = () => everyone.filter((p) => p.role === "student");
    const apply = () => {
      const needle = term.toLowerCase();
      const now = Date.now();
      list = base().filter((p) =>
        (tile === "all" || (tile === "active" ? p.active : tile === "disabled" ? !p.active : tile === "incomplete" ? !complete(p) : now - new Date(p.created_at).getTime() < 7 * 86400000)) &&
        (!needle || `${p.username} ${p.full_name} ${p.email} ${p.student_id}`.toLowerCase().includes(needle)) &&
        (!college || p.college === college) && (!course || p.course === course) && (!year || p.year_level === year) &&
        (!registered || now - new Date(p.created_at).getTime() < Number(registered) * 86400000));
      list.sort((a, b) => sort === "name" ? a.username.localeCompare(b.username) : sort === "newest" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at));
    };

    const draw = () => {
      apply();
      const all = base();
      const tiles: [Tile, string, number][] = [["all", "All students", all.length], ["active", "Active", all.filter((p) => p.active).length], ["disabled", "Disabled", all.filter((p) => !p.active).length], ["incomplete", "Profile incomplete", all.filter((p) => !complete(p)).length], ["new", "New this week", all.filter((p) => Date.now() - new Date(p.created_at).getTime() < 7 * 86400000).length]];
      mount(root.querySelector<HTMLElement>("#studentTiles")!, html`${tiles.map(([id, label, n]) => html`<button class="tile" type="button" data-action="tile" data-tile="${id}" aria-pressed="${String(id === tile)}"><span class="tile__label">${label}</span><span class="tile__value">${n}</span></button>`)}`);
      const colleges = [...new Set(all.map((p) => p.college).filter(Boolean))] as string[];
      const courseList = [...new Set(all.filter((p) => !college || p.college === college).map((p) => p.course).filter(Boolean))] as string[];
      const years = [...new Set(all.map((p) => p.year_level).filter(Boolean))] as string[];
      const opts = (id: string, label: string, values: string[], value: string) => { const el = root.querySelector<HTMLSelectElement>(id)!; el.replaceChildren(new Option(label, ""), ...values.sort().map((v) => new Option(v, v))); el.value = value; };
      opts("#stCollege", "All colleges", colleges, college); opts("#stCourse", "All courses", courseList, course); opts("#stYear", "All years", years, year);
      const body = root.querySelector<HTMLElement>("[data-body]")!;
      if (!list.length) { mount(body, empty("Nobody found", "Try another filter.", "users")); return; }
      const avatar = (p: Profile) => html`<span class="avatar avatar--sm">${p.photo_url ? raw(`<img src="${p.photo_url.replace(/"/g, "")}" alt="">`) : initials(p.username)}</span>`;
      const shown = list.slice(0, 80);
      mount(body, cards
        ? html`<div class="people-cards">${shown.map((p) => html`<button class="person-card card px" type="button" data-action="open" data-id="${p.id}">${avatar(p)}<strong>${p.username}</strong><small>${p.full_name}</small><small class="text-soft">${p.course ?? "No course yet"}</small>${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}</button>`)}</div>`
        : html`<div class="table-wrap"><table class="table table--stack"><thead><tr><th>Student</th><th>Course</th><th>Year</th><th>Joined</th><th></th></tr></thead><tbody>
          ${shown.map((p) => html`<tr><td><div class="cluster">${avatar(p)}<div><span class="table__title">${p.username}</span> ${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}${complete(p) ? "" : html`<span class="badge badge--warning">incomplete</span>`}<br><span class="table__sub">${p.full_name} · ${p.student_id ?? "no ID"}</span></div></div></td>
            <td data-label="Course">${p.course ?? "-"}<br><span class="table__sub">${p.college ?? ""}</span></td><td data-label="Year">${p.year_level ?? "-"}</td><td data-label="Joined">${formatDate(p.created_at)}</td>
            <td><div class="table__actions"><button class="btn btn--sm btn--quiet" data-action="open" data-id="${p.id}">Open</button></div></td></tr>`)}</tbody></table></div>`);
      if (list.length > 80) body.append(Object.assign(document.createElement("p"), { className: "result-count", textContent: `Showing 80 of ${list.length}. Use the filters to narrow it down.` }));
      root.querySelector<HTMLElement>("#stCount")!.textContent = `${list.length} of ${all.length} students`;
    };

    // ---- the profile panel: next and previous student, counts, four tabs
    const open = (start: Profile) => {
      let index = list.findIndex((p) => p.id === start.id);
      let tab: "overview" | "loans" | "read" | "activity" = "overview";
      const modal = openModal("Student", html`<div id="profileBody"></div>`, { wide: true, footer: html`<button class="btn btn--quiet" type="button" data-prev>Previous</button><button class="btn btn--quiet" type="button" data-next>Next</button><button class="btn" type="button" data-close>Close</button>` });
      const paint = async () => {
        const p = list[index];
        const mine = loans.filter((l) => l.user_id === p.id);
        const out = mine.filter((l) => l.status === "borrowed");
        const counts = { current: mine.filter((l) => ["requested", "borrowed"].includes(l.status)).length, soon: out.filter((l) => l.due_at && daysUntil(l.due_at) >= 0 && daysUntil(l.due_at) <= 2).length, late: out.filter((l) => l.due_at && daysUntil(l.due_at) < 0).length, returned: mine.filter((l) => l.status === "returned").length };
        const acts = await userActivity(p.id, 40);
        const readIds = new Set(acts.filter((a) => a.type === "read").map((a) => a.book_id));
        const body = modal.root.querySelector<HTMLElement>("#profileBody")!;
        mount(body, html`
          <div class="student-head"><span class="avatar avatar--lg">${p.photo_url ? raw(`<img src="${p.photo_url.replace(/"/g, "")}" alt="">`) : initials(p.username)}</span>
            <div><h3>${p.username} ${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}</h3><p class="text-soft">${p.full_name} · ${index + 1} of ${list.length}</p>
              <div class="cluster"><button class="btn btn--sm btn--secondary" type="button" data-notice>${icon("mail")} Send notice</button><button class="btn btn--sm ${p.active ? "btn--danger" : "btn--secondary"}" type="button" data-toggle>${p.active ? "Disable account" : "Enable account"}</button></div></div></div>
          <div class="tile-grid tile-grid--small"><div class="tile"><span class="tile__label">Current</span><span class="tile__value">${counts.current}</span></div><div class="tile"><span class="tile__label">Due soon</span><span class="tile__value">${counts.soon}</span></div><div class="tile"><span class="tile__label">Overdue</span><span class="tile__value">${counts.late}</span></div><div class="tile"><span class="tile__label">Returned</span><span class="tile__value">${counts.returned}</span></div><div class="tile"><span class="tile__label">Read</span><span class="tile__value">${readIds.size}</span></div></div>
          <div class="tabs">${(["overview", "loans", "read", "activity"] as const).map((t) => html`<button class="tab" type="button" data-tabs="${t}" aria-selected="${String(t === tab)}">${{ overview: "Overview", loans: "Loans", read: "Books read", activity: "Activity" }[t]}</button>`)}</div>
          ${tab === "overview" ? html`<dl class="book-detail__facts"><dt>Email</dt><dd>${p.email}</dd><dt>Student ID</dt><dd>${p.student_id ?? "-"}</dd><dt>Gender</dt><dd>${p.gender ?? "-"}</dd><dt>Phone</dt><dd>${p.phone ?? "-"}</dd><dt>College</dt><dd>${p.college ?? "-"}</dd><dt>Course</dt><dd>${p.course ?? "-"}</dd><dt>Major</dt><dd>${p.major ?? "-"}</dd><dt>Year</dt><dd>${p.year_level ?? "-"}</dd><dt>Joined</dt><dd>${formatDate(p.created_at)}</dd><dt>Terms</dt><dd>${p.terms_version ? `v${p.terms_version}, ${formatDate(p.terms_accepted_at)}` : "not accepted"}</dd></dl>`
            : tab === "loans" ? (mine.length ? html`<div class="table-wrap"><table class="table"><tbody>${mine.map((l) => html`<tr><td>${l.book?.title}</td><td>${l.status === "borrowed" ? dueLabel(l.due_at).text : l.status}</td><td>${formatDate(l.requested_at)}</td></tr>`)}</tbody></table></div>` : empty("No loans", "This student has not borrowed yet.", "shelf"))
            : tab === "read" ? (readIds.size ? html`<ul class="list">${[...readIds].map((id) => html`<li class="list__item">${mine.find((l) => l.book_id === id)?.book?.title ?? id}</li>`)}</ul>` : empty("Nothing read yet", "Marked-as-read books show here.", "book"))
            : (acts.length ? html`<ol class="timeline">${acts.map((a) => html`<li class="timeline__item"><strong>${a.type}</strong> ${a.book?.title ?? ""}<br><small class="text-soft">${relative(a.created_at)}</small></li>`)}</ol>` : empty("No activity", "", "clock"))}`);
        body.querySelectorAll<HTMLElement>("[data-tabs]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tabs as typeof tab; void paint(); }));
        body.querySelector("[data-toggle]")?.addEventListener("click", async () => {
          try { await setActive(p.id, !p.active); p.active = !p.active; ok(p.active ? "Account enabled." : "Account disabled."); draw(); void paint(); } catch (error) { fail(friendly(error)); }
        });
        body.querySelector("[data-notice]")?.addEventListener("click", () => notice(p));
      };
      modal.root.querySelector("[data-prev]")?.addEventListener("click", () => { index = (index - 1 + list.length) % list.length; void paint(); });
      modal.root.querySelector("[data-next]")?.addEventListener("click", () => { index = (index + 1) % list.length; void paint(); });
      void paint();
    };

    // ---- send a formal notice by email, with a live preview of the letter
    const notice = (p: Profile) => {
      const preview = (kind: string, text: string) => {
        const titles = loans.filter((l) => l.user_id === p.id && l.status === "borrowed").map((l) => `${l.book?.title} (due ${formatDate(l.due_at)})`);
        const lead = kind === "overdue" ? "Our records show the following book(s) are overdue." : kind === "due_soon" ? "This is a friendly reminder that your book(s) are due soon." : text || "This is a message from the library.";
        return `Dear ${p.full_name || p.username},\n\n${lead}\n${kind !== "general" && titles.length ? "\n" + titles.map((t) => `  - ${t}`).join("\n") + "\n" : ""}\nPlease visit the library at your earliest convenience.\n\nSincerely,\nCMU Library`;
      };
      const modal = openModal(`Send a notice to ${p.username}`, html`<form class="form" id="noticeForm"><div class="field"><label class="field__label" for="nk">Type</label><select class="select" id="nk" name="kind">${NOTICE_KINDS.map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select></div>
        <div class="field" id="nmWrap" hidden><label class="field__label" for="nm">Your message</label><textarea class="textarea" id="nm" name="message" rows="4" maxlength="600"></textarea></div>
        <div class="field"><span class="field__label">Preview of the email</span><pre class="letter" id="letter"></pre></div></form>`, {
        footer: html`<button class="btn btn--quiet" type="button" data-close>Cancel</button><button class="btn" type="button" data-send>${icon("mail")} Send</button>`,
      });
      const form = modal.root.querySelector<HTMLFormElement>("#noticeForm")!;
      const update = () => { const d = formData(form); modal.root.querySelector<HTMLElement>("#nmWrap")!.hidden = d.kind !== "general"; modal.root.querySelector("#letter")!.textContent = preview(d.kind, d.message ?? ""); };
      form.addEventListener("input", update); update();
      modal.root.querySelector("[data-send]")?.addEventListener("click", async () => {
        const d = formData(form);
        if (d.kind === "general" && !d.message) return fail("Write the message first.");
        try { await sendNotice({ kind: d.kind as "overdue" | "due_soon" | "general", user_id: p.id, message: d.message }); ok(`Notice sent to ${p.email}.`); modal.close(); } catch (error) { fail(friendly(error)); }
      });
    };

    mount(root, html`<div class="panel__tab">
      <div class="panel__heading"><h2>Students</h2><span class="text-soft" id="stCount"></span></div>
      <div class="tile-grid" id="studentTiles"></div>
      <div class="toolbar toolbar--wide px px--soft">
        <div class="field search"><label class="visually-hidden" for="stSearch">Search students</label>${icon("search")}<input class="input" id="stSearch" type="search" placeholder="Name, email or student ID" value="${term}"></div>
        <div class="field"><label class="field__label" for="stCollege">College</label><select class="select" id="stCollege"></select></div>
        <div class="field"><label class="field__label" for="stCourse">Course</label><select class="select" id="stCourse"></select></div>
        <div class="field"><label class="field__label" for="stYear">Year level</label><select class="select" id="stYear"></select></div>
        <div class="field"><label class="field__label" for="stReg">Registered</label><select class="select" id="stReg"><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="365">Last year</option></select></div>
        <div class="field"><label class="field__label" for="stSort">Sort</label><select class="select" id="stSort"><option value="name">Name</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select></div>
        <div class="seg" role="group" aria-label="View as"><button class="seg__btn" type="button" data-action="view" data-cards="0" aria-pressed="true">Table</button><button class="seg__btn" type="button" data-action="view" data-cards="1" aria-pressed="false">Cards</button></div>
      </div>
      <div class="card px card--flush" data-body>${loading("Loading students")}</div></div>`);
    root.querySelector("#stSearch")!.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    const bind = (id: string, set: (v: string) => void) => root.querySelector(id)!.addEventListener("change", (e) => { set((e.target as HTMLSelectElement).value); draw(); });
    bind("#stCollege", (v) => { college = v; course = ""; }); bind("#stCourse", (v) => (course = v)); bind("#stYear", (v) => (year = v)); bind("#stReg", (v) => (registered = v)); bind("#stSort", (v) => (sort = v as typeof sort));
    actions(root, {
      tile: (el) => { tile = el.dataset.tile as Tile; draw(); },
      view: (el) => { cards = el.dataset.cards === "1"; root.querySelectorAll<HTMLElement>("[data-cards]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      open: (el) => { const p = everyone.find((x) => x.id === el.dataset.id); if (p) open(p); },
    });
    [everyone, loans] = await Promise.all([people(), loansByStatus(["requested", "borrowed", "returned", "rejected", "cancelled"], 3000)]);
    void me;
    draw();
  },
};
