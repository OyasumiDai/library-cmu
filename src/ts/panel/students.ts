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

    const PAGE = 80;
    let limit = PAGE;
    let seen = "";
    let filtersOpen = false;
    // what each student has with the library right now, shown as badges on the row
    const loanStats = new Map<string, { out: number; late: number; ask: number }>();
    const REGISTERED: Record<string, string> = { "7": "Last 7 days", "30": "Last 30 days", "365": "Last year" };

    const draw = () => {
      apply();
      // a new search or filter starts again from the first page of rows
      const sig = JSON.stringify([tile, term, college, course, year, registered, sort]);
      if (sig !== seen) { seen = sig; limit = PAGE; }
      const all = base();
      const week = (p: Profile) => Date.now() - new Date(p.created_at).getTime() < 7 * 86400000;
      const n = { all: all.length, active: all.filter((p) => p.active).length, disabled: all.filter((p) => !p.active).length, incomplete: all.filter((p) => !complete(p)).length, new: all.filter(week).length };
      const tiles: [Tile, string, string, string, string][] = [
        ["all", "All students", "users", "", "registered"], ["active", "Active", "check", "success", "can sign in"], ["disabled", "Disabled", "lock", "danger", n.disabled ? "cannot sign in" : "none"],
        ["incomplete", "Profile incomplete", "edit", "warning", "course, year or phone missing"], ["new", "New this week", "sparkle", "", "joined in the last 7 days"],
      ];
      mount(root.querySelector<HTMLElement>("#studentTiles")!, html`${tiles.map(([id, label, iconName, tone, note]) => html`<button class="tile book-tile" type="button" data-action="tile" data-tile="${id}" data-tone="${tone}" aria-pressed="${String(id === tile)}">
        <span class="book-tile__icon">${icon(iconName)}</span><span class="tile__label">${label}</span><span class="tile__value">${n[id]}</span><span class="tile__note">${note}</span></button>`)}`);

      // the filters in use, each one removable with a click
      const chips: [string, string][] = [];
      if (tile !== "all") chips.push(["tile", tiles.find((t) => t[0] === tile)![1]]);
      if (college) chips.push(["college", `College: ${college}`]);
      if (course) chips.push(["course", `Course: ${course}`]);
      if (year) chips.push(["year", `Year: ${year}`]);
      if (registered) chips.push(["registered", `Registered: ${REGISTERED[registered]}`]);
      mount(root.querySelector<HTMLElement>("#stChips")!, chips.length ? html`${chips.map(([key, label]) => html`<button class="chip" type="button" data-action="unfilter" data-key="${key}" aria-label="Remove filter: ${label}">${label} ${icon("cross")}</button>`)}<button class="link-button" type="button" data-action="clear">Clear all</button>` : html``);
      const inPanel = [college, course, year, registered].filter(Boolean).length;
      const badge = root.querySelector<HTMLElement>("#stFilterCount")!;
      badge.hidden = !inPanel;
      badge.textContent = String(inPanel);
      root.querySelector<HTMLElement>("#stCount")!.textContent = `${list.length} of ${all.length} students`;

      const colleges = [...new Set(all.map((p) => p.college).filter(Boolean))] as string[];
      const courseList = [...new Set(all.filter((p) => !college || p.college === college).map((p) => p.course).filter(Boolean))] as string[];
      const years = [...new Set(all.map((p) => p.year_level).filter(Boolean))] as string[];
      const opts = (id: string, label: string, values: string[], value: string) => { const el = root.querySelector<HTMLSelectElement>(id)!; el.replaceChildren(new Option(label, ""), ...values.sort().map((v) => new Option(v, v))); el.value = value; };
      opts("#stCollege", "All colleges", colleges, college); opts("#stCourse", "All courses", courseList, course); opts("#stYear", "All years", years, year);

      const body = root.querySelector<HTMLElement>("[data-body]")!;
      if (!list.length) {
        mount(body, html`<div class="st-empty">${empty("Nobody found", all.length ? "No student matches this search and these filters." : "No students have registered yet.", "users")}${all.length ? html`<button class="btn btn--sm btn--secondary" type="button" data-action="reset">Clear search and filters</button>` : ""}</div>`);
        return;
      }
      const avatar = (p: Profile) => html`<span class="avatar">${p.photo_url ? raw(`<img src="${p.photo_url.replace(/"/g, "")}" alt="">`) : initials(p.username)}</span>`;
      const badges = (p: Profile) => {
        const s = loanStats.get(p.id);
        return html`${p.active ? "" : html`<span class="badge badge--danger">disabled</span>`}${complete(p) ? "" : html`<span class="badge badge--warning">incomplete</span>`}${s?.late ? html`<span class="badge badge--danger">${s.late} overdue</span>` : ""}${s?.out ? html`<span class="badge badge--info">${s.out} on loan</span>` : ""}${s?.ask ? html`<span class="badge badge--secondary">${s.ask} requested</span>` : ""}`;
      };
      const shown = list.slice(0, limit);
      const more = list.length > limit ? html`<div class="st-more"><button class="btn btn--quiet" type="button" data-action="more">Show ${Math.min(PAGE, list.length - limit)} more <span class="text-soft">(${list.length - limit} left)</span></button></div>` : "";
      mount(body, cards
        ? html`<div class="people-cards">${shown.map((p) => html`<button class="person-card card px" type="button" data-action="open" data-id="${p.id}">${avatar(p)}<strong>${p.username}</strong><small>${p.full_name}</small><small class="text-soft">${p.course ?? "No course yet"}</small><span class="st-badges">${badges(p)}</span></button>`)}</div>${more}`
        : html`<div class="table-wrap"><table class="table table--stack"><thead><tr><th>Student</th><th>Course</th><th>Year</th><th>Joined</th><th></th></tr></thead><tbody>
          ${shown.map((p) => html`<tr class="st-row" tabindex="0" data-action="open" data-id="${p.id}"><td><div class="st-name">${avatar(p)}<div><span class="table__title">${p.username}</span><span class="st-badges">${badges(p)}</span><br><span class="table__sub">${p.full_name} · ${p.student_id ?? "no ID"}</span></div></div></td>
            <td data-label="Course">${p.course ?? "-"}<br><span class="table__sub">${p.college ?? ""}</span></td><td data-label="Year">${p.year_level ?? "-"}</td><td data-label="Joined">${formatDate(p.created_at)}${relative(p.created_at) !== formatDate(p.created_at) ? html`<br><span class="table__sub">${relative(p.created_at)}</span>` : ""}</td>
            <td><div class="table__actions"><button class="btn btn--sm btn--quiet" type="button" data-action="open" data-id="${p.id}">Open</button></div></td></tr>`)}</tbody></table></div>${more}`);
    };

    // ---- the profile panel: next and previous student, counts, four tabs
    const open = (start: Profile) => {
      let index = list.findIndex((p) => p.id === start.id);
      let tab: "overview" | "loans" | "read" | "activity" = "overview";
      const modal = openModal("Student", html`<div id="profileBody"></div>`, { wide: true, footer: html`<span class="text-soft modal__hint">Use the left and right arrow keys to switch student</span><button class="btn btn--quiet" type="button" data-prev>Previous</button><button class="btn btn--quiet" type="button" data-next>Next</button><button class="btn" type="button" data-close>Close</button>` });
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
              <div class="cluster"><button class="btn btn--sm btn--secondary" type="button" data-notice>${icon("mail")} Send notice</button><button class="btn btn--sm btn--quiet" type="button" data-copy>${icon("mail")} Copy email</button><button class="btn btn--sm ${p.active ? "btn--danger" : "btn--secondary"}" type="button" data-toggle>${p.active ? "Disable account" : "Enable account"}</button></div></div></div>
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
        body.querySelector("[data-copy]")?.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(p.email ?? ""); ok("Email copied."); } catch { fail("Could not copy. Select the email under Overview instead."); }
        });
      };
      modal.root.querySelector("[data-prev]")?.addEventListener("click", () => { index = (index - 1 + list.length) % list.length; void paint(); });
      modal.root.querySelector("[data-next]")?.addEventListener("click", () => { index = (index + 1) % list.length; void paint(); });
      modal.root.addEventListener("keydown", (event) => {
        if ((event.target as Element).closest("input, textarea, select")) return;
        if (event.key === "ArrowRight") modal.root.querySelector<HTMLElement>("[data-next]")?.click();
        if (event.key === "ArrowLeft") modal.root.querySelector<HTMLElement>("[data-prev]")?.click();
      });
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
      <div class="tile-grid book-tiles" id="studentTiles"></div>
      <div class="st-bar px px--soft">
        <div class="st-bar__row">
          <div class="field search st-bar__search"><label class="visually-hidden" for="stSearch">Search students</label>${icon("search")}<input class="input" id="stSearch" type="search" placeholder="Search by name, email or student ID" value="${term}"></div>
          <div class="field st-bar__sort"><label class="visually-hidden" for="stSort">Sort by</label><select class="select" id="stSort"><option value="name">Sort: Name</option><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option></select></div>
          <button class="btn btn--quiet" type="button" data-action="filters" id="stFilterBtn" aria-expanded="false" aria-controls="stFilters">${icon("filter")} Filters <span class="badge badge--primary" id="stFilterCount" hidden></span></button>
          <div class="seg" role="group" aria-label="View as"><button class="seg__btn" type="button" data-action="view" data-cards="0" aria-pressed="true">Table</button><button class="seg__btn" type="button" data-action="view" data-cards="1" aria-pressed="false">Cards</button></div>
        </div>
        <div class="st-bar__filters" id="stFilters" hidden>
          <div class="field"><label class="field__label" for="stCollege">College</label><select class="select" id="stCollege"></select></div>
          <div class="field"><label class="field__label" for="stCourse">Course</label><select class="select" id="stCourse"></select></div>
          <div class="field"><label class="field__label" for="stYear">Year level</label><select class="select" id="stYear"></select></div>
          <div class="field"><label class="field__label" for="stReg">Registered</label><select class="select" id="stReg"><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="365">Last year</option></select></div>
        </div>
        <div class="st-bar__chips" id="stChips"></div>
      </div>
      <div class="card px card--flush" data-body>${loading("Loading students")}</div></div>`);
    const search = root.querySelector<HTMLInputElement>("#stSearch")!;
    search.addEventListener("input", debounce((e) => { term = (e.target as HTMLInputElement).value.trim(); draw(); }, 200));
    const bind = (id: string, set: (v: string) => void) => root.querySelector(id)!.addEventListener("change", (e) => { set((e.target as HTMLSelectElement).value); draw(); });
    bind("#stCollege", (v) => { college = v; course = ""; }); bind("#stCourse", (v) => (course = v)); bind("#stYear", (v) => (year = v)); bind("#stReg", (v) => (registered = v)); bind("#stSort", (v) => (sort = v as typeof sort));
    root.querySelector<HTMLSelectElement>("#stReg")!.value = registered;
    // a row is a big button: Enter or Space opens it from the keyboard
    root.addEventListener("keydown", (event) => {
      const row = (event.target as Element).closest<HTMLElement>(".st-row");
      if (row && event.target === row && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); row.click(); }
    });
    actions(root, {
      tile: (el) => { tile = tile === el.dataset.tile ? "all" : (el.dataset.tile as Tile); draw(); },
      filters: (el) => {
        filtersOpen = !filtersOpen;
        root.querySelector<HTMLElement>("#stFilters")!.hidden = !filtersOpen;
        el.setAttribute("aria-expanded", String(filtersOpen));
      },
      unfilter: (el) => {
        const key = el.dataset.key;
        if (key === "tile") tile = "all"; else if (key === "college") college = ""; else if (key === "course") course = ""; else if (key === "year") year = ""; else if (key === "registered") registered = "";
        root.querySelector<HTMLSelectElement>("#stReg")!.value = registered;
        draw();
      },
      clear: () => { tile = "all"; college = ""; course = ""; year = ""; registered = ""; root.querySelector<HTMLSelectElement>("#stReg")!.value = ""; draw(); },
      reset: () => { term = ""; search.value = ""; tile = "all"; college = ""; course = ""; year = ""; registered = ""; root.querySelector<HTMLSelectElement>("#stReg")!.value = ""; draw(); },
      more: () => { limit += PAGE; draw(); },
      view: (el) => { cards = el.dataset.cards === "1"; root.querySelectorAll<HTMLElement>("[data-cards]").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); draw(); },
      open: (el) => { const p = everyone.find((x) => x.id === el.dataset.id); if (p) open(p); },
    });
    [everyone, loans] = await Promise.all([people(), loansByStatus(["requested", "borrowed", "returned", "rejected", "cancelled"], 3000)]);
    void me;
    const now = Date.now();
    for (const l of loans) {
      const row = loanStats.get(l.user_id) ?? { out: 0, late: 0, ask: 0 };
      if (l.status === "requested") row.ask++;
      if (l.status === "borrowed") { row.out++; if (l.due_at && new Date(l.due_at).getTime() < now) row.late++; }
      loanStats.set(l.user_id, row);
    }
    draw();
  },
};
