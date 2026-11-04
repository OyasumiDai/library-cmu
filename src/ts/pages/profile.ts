import { changePassword, updateProfile, type ProfileEdit } from "../api/auth";
import { markRead } from "../api/catalog";
import { courses, publicSettings } from "../api/content";
import { myActivity, myLoans } from "../api/loans";
import { uploadPicture } from "../api/staff";
import { boot } from "../core/boot";
import { actions, busy, formData, html, icon, mount, qs, raw } from "../core/dom";
import { friendly } from "../core/errors";
import { daysUntil, dueLabel, formatDate, initials, plural, relative } from "../core/format";
import { checkPassword, watchPassword } from "../core/password";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { clearErrors, cover, empty, field, selectField, setFieldError, statCard } from "../ui/components";
import type { Activity, Course, Loan } from "../types";

const PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;
const VERBS: Record<string, string> = {
  request: "Requested", cancel: "Cancelled a request for", checkout: "Borrowed", decline: "Was declined for", return: "Returned", read: "Marked as read:",
  signin: "Signed in", profile: "Updated the profile", password: "Changed the password", notice: "Received a library notice",
};
const ATTEMPTS = "cmu-password-attempts";

// "5 tries every 15 minutes" for the current-password check
function attemptsLeft(): number {
  try {
    const stamps = (JSON.parse(localStorage.getItem(ATTEMPTS) ?? "[]") as number[]).filter((t) => Date.now() - t < 15 * 60_000);
    return Math.max(0, 5 - stamps.length);
  } catch { return 5; }
}
function noteAttempt(): void {
  try {
    const stamps = (JSON.parse(localStorage.getItem(ATTEMPTS) ?? "[]") as number[]).filter((t) => Date.now() - t < 15 * 60_000);
    stamps.push(Date.now());
    localStorage.setItem(ATTEMPTS, JSON.stringify(stamps));
  } catch { /* private mode */ }
}

function meCard() {
  const p = current().profile!;
  const role = p.role === "student" ? "Student" : p.role === "admin" ? "Administrator" : "Library staff";
  return html`
    <span class="avatar avatar--lg">${p.photo_url ? raw(`<img src="${p.photo_url.replace(/"/g, "")}" alt="">`) : initials(p.username)}</span>
    <div><h2>${p.username}</h2><span class="badge badge--secondary">${role}</span></div>
    <div class="cluster cluster--center">
      <label class="btn btn--sm btn--secondary" for="photoFile">${icon("upload")} ${p.photo_url ? "Change" : "Add photo"}</label>
      ${p.photo_url ? html`<button class="btn btn--sm btn--danger" type="button" data-action="removePhoto">${icon("trash")} Remove</button>` : ""}
    </div>
    <input class="visually-hidden" id="photoFile" type="file" accept="image/png,image/jpeg,image/webp">
    <dl class="profile__facts"><dt>Email</dt><dd>${p.email ?? ""}</dd><dt>Joined</dt><dd>${formatDate(p.created_at)}</dd>${p.student_id ? html`<dt>Student ID</dt><dd>${p.student_id}</dd>` : ""}</dl>`;
}

function detailsForm(catalog: Course[], levels: string[]) {
  const p = current().profile!;
  const chosen = catalog.find((c) => c.program === p.course);
  return html`
    <div class="form__row">${field("full_name", "Display name", { value: p.full_name, required: true })}${selectField("gender", "Gender", [{ value: "Female" }, { value: "Male" }], p.gender ?? "", false, "Prefer not to say")}</div>
    <div class="form__row">${field("phone", "Phone", { value: p.phone ?? "", type: "tel", placeholder: "09XX XXX XXXX", hint: "Philippine mobile number" })}${field("student_id", "Student ID", { value: p.student_id ?? "" })}</div>
    <div class="form__row">
      <div class="field" data-field="course"><label class="field__label" for="f-course">Course</label>
        <input class="input" id="f-course" name="course" list="courseList" value="${p.course ?? ""}" placeholder="Type to search your program" autocomplete="off">
        <datalist id="courseList">${catalog.map((c) => html`<option value="${c.program}">${c.college}</option>`)}</datalist><span class="field__error"></span></div>
      <div class="field" data-field="major"><label class="field__label" for="f-major">Major</label>
        <select class="select" id="f-major" name="major" ${chosen && chosen.majors.length ? "" : raw("disabled")}>
          <option value="">${chosen ? (chosen.majors.length ? "Choose..." : "No major for this course") : "Choose a course first"}</option>
          ${(chosen?.majors ?? []).map((m) => html`<option ${m === p.major ? raw("selected") : ""}>${m}</option>`)}
        </select><span class="field__error"></span></div>
    </div>
    <div class="form__row">${selectField("year_level", "Year level", levels.map((value) => ({ value })), p.year_level ?? "")}</div>
    <p class="field__hint">Your username and email are fixed. Ask library staff if they need changing.</p>
    <div class="form__actions"><button class="btn" type="submit">Save changes</button></div>`;
}

const LOAN_STATUSES = ["requested", "borrowed"];

function bookRow(loan: Loan, kind: string, readIds: Set<string>) {
  const due = loan.status === "borrowed" ? dueLabel(loan.due_at) : null;
  return html`
    <div class="list__item">
      <div class="profile__cover">${loan.book ? cover({ id: loan.book.id, title: loan.book.title, cover_url: loan.book.cover_url }) : ""}</div>
      <div class="list__body"><p class="list__title">${loan.book?.title ?? "Removed book"}</p><p class="list__meta">${loan.book?.author ?? ""}</p>
        <p class="list__meta">${kind === "returned" ? `Returned ${formatDate(loan.returned_at)}` : `Requested ${formatDate(loan.requested_at)}`}</p>
        ${due ? html`<span class="badge badge--${due.tone}">${due.text}</span>` : ""}${kind === "borrowed" && loan.status === "requested" ? html`<span class="badge badge--warning">waiting for staff</span>` : ""}</div>
      ${kind === "returned" ? (readIds.has(loan.book_id) ? html`<span class="badge badge--success">${icon("check", "icon--sm")} Read</span>` : html`<button class="btn btn--sm btn--secondary" type="button" data-action="markRead" data-id="${loan.book_id}">Mark as read</button>`) : ""}
    </div>`;
}

boot(async () => {
  const profile = current().profile!;
  const [catalog, settings] = await Promise.all([courses(), publicSettings()]);
  const levels = (settings.year_levels as string[] | undefined) ?? [];
  let loans: Loan[] = [];
  let activity: Activity[] = [];
  let booksTab: "borrowed" | "returned" | "read" = "borrowed";

  const root = qs("[data-page-root]");
  const drawMe = () => mount(qs("#meCard"), meCard());

  const drawCompleteness = () => {
    const p = current().profile!;
    const missing = [!p.course && "course", !p.year_level && "year level", !p.phone && "phone number"].filter(Boolean) as string[];
    mount(qs("#completeness"), missing.length ? html`<div class="alert alert--warning px px--warning" role="status">${icon("info")}<span>Your profile is almost ready. Please add your <strong>${missing.join(", ")}</strong>.</span></div>` : html``);
  };

  const readIds = () => new Set(activity.filter((a) => a.type === "read" && a.book_id).map((a) => a.book_id as string));

  const drawActivity = () => {
    const open = loans.filter((l) => LOAN_STATUSES.includes(l.status));
    const out = loans.filter((l) => l.status === "borrowed");
    const soon = out.filter((l) => l.due_at && daysUntil(l.due_at) >= 0 && daysUntil(l.due_at) <= 2).length;
    const late = out.filter((l) => l.due_at && daysUntil(l.due_at) < 0).length;
    const returned = loans.filter((l) => l.status === "returned");
    const read = readIds();
    mount(qs("#activityStats"), html`${statCard("Current", open.length, "shelf")}${statCard("Due soon", soon, "clock")}${statCard("Overdue", late, "bell")}${statCard("Returned", returned.length, "check")}${statCard("Books read", read.size, "book")}`);
    const list = booksTab === "borrowed" ? open : booksTab === "returned" ? returned : [];
    const readBooks = [...read].map((id) => loans.find((l) => l.book_id === id)).filter(Boolean) as Loan[];
    const rows = booksTab === "read" ? readBooks : list;
    mount(qs("#bookList"), rows.length ? html`<div class="list">${rows.map((l) => bookRow(l, booksTab, read))}</div>` : empty("Nothing here yet", booksTab === "borrowed" ? "Books you request or borrow show up here." : booksTab === "returned" ? "Returned books show up here." : "Mark returned books as read and they collect here."));
    qs("#bookTabs").querySelectorAll<HTMLElement>("[data-books]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.books === booksTab)));
    mount(qs("#activity"), activity.length ? html`<ol class="timeline">${activity.map((a) => html`<li class="timeline__item"><strong>${VERBS[a.type] ?? a.type}</strong> ${a.book?.title ?? ""}<br><small class="text-soft">${relative(a.created_at)}</small></li>`)}</ol>` : empty("No activity yet", "Request a book and it will show up here."));
  };

  const reload = async () => {
    [loans, activity] = await Promise.all([myLoans(profile.id), myActivity(profile.id, 60)]);
    drawActivity();
  };

  drawMe();
  drawCompleteness();
  mount(qs("#detailsForm"), detailsForm(catalog, levels));
  void reload().catch((e) => fail(friendly(e)));

  // ---------------------------------------------------------------- tabs
  const showTab = (name: string) => {
    document.querySelectorAll<HTMLElement>("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    qs("#profileTabs").querySelectorAll<HTMLElement>("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  };
  showTab(new URLSearchParams(location.search).get("tab") === "activity" ? "activity" : "details");

  actions(root, {
    tab: (el) => showTab(el.dataset.tab ?? "details"),
    books: (el) => { booksTab = el.dataset.books as typeof booksTab; drawActivity(); },
    markRead: async (el) => {
      try { await markRead(el.dataset.id ?? ""); ok("Added to your books read."); await reload(); } catch (error) { fail(friendly(error)); }
    },
    removePhoto: async () => {
      try { await updateProfile(profile.id, { photo_url: null }); drawMe(); ok("Photo removed."); } catch (error) { fail(friendly(error)); }
    },
  });

  // ---------------------------------------------------------------- details
  const form = qs<HTMLFormElement>("#detailsForm");
  const courseInput = () => form.elements.namedItem("course") as HTMLInputElement;
  form.addEventListener("input", (event) => {
    if ((event.target as HTMLElement).id !== "f-course") return;
    const chosen = catalog.find((c) => c.program === courseInput().value);
    const major = form.elements.namedItem("major") as HTMLSelectElement;
    major.replaceChildren(new Option(chosen ? (chosen.majors.length ? "Choose..." : "No major for this course") : "Choose a course first", ""));
    for (const m of chosen?.majors ?? []) major.append(new Option(m, m));
    major.disabled = !chosen || chosen.majors.length === 0;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    const d = formData(form);
    const phone = (d.phone ?? "").replace(/[\s-]/g, "");
    const chosen = catalog.find((c) => c.program === d.course);
    if (!d.full_name) return setFieldError(form, "full_name", "Enter your display name.");
    if (phone && !PH_MOBILE.test(phone)) return setFieldError(form, "phone", "Use a Philippine mobile number, like 09171234567.");
    if (d.course && !chosen) return setFieldError(form, "course", "Pick a program from the list.");
    const edit: ProfileEdit = {
      full_name: d.full_name, student_id: d.student_id || null, course: chosen?.program ?? null, college: chosen?.college ?? null,
      major: chosen && chosen.majors.length ? d.major || null : null, year_level: d.year_level || null, gender: (d.gender as ProfileEdit["gender"]) || null, phone: phone || null,
    };
    await busy(form.querySelector("button[type=submit]"), async () => {
      try { await updateProfile(profile.id, edit); drawCompleteness(); drawMe(); ok("Profile saved."); } catch (error) { fail(friendly(error)); }
    });
  });

  qs("#meCard").addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (input.id !== "photoFile" || !file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return fail("Please choose a JPG, PNG or WEBP picture.");
    if (file.size > 3_000_000) return fail("Please choose a picture under 3 MB.");
    try {
      const url = await uploadPicture(`profiles/${profile.id}`, file);
      await updateProfile(profile.id, { photo_url: url });
      drawMe();
      ok("Photo updated.");
    } catch (error) { fail(friendly(error)); }
  });

  // ---------------------------------------------------------------- password
  const pw = qs<HTMLFormElement>("#passwordForm");
  const newPw = qs<HTMLInputElement>("#f-pw");
  watchPassword(newPw, "pwMeter", () => [profile.username, (profile.email ?? "").split("@")[0]]);
  pw.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(pw);
    const current_ = (pw.elements.namedItem("current") as HTMLInputElement).value;
    const next = newPw.value;
    const confirm = (pw.elements.namedItem("confirm") as HTMLInputElement).value;
    if (!current_) return setFieldError(pw, "current", "Enter your current password.");
    const strength = checkPassword(next, profile.username, (profile.email ?? "").split("@")[0]);
    if (strength.problems.length) return setFieldError(pw, "password", strength.problems[0]);
    if (next !== confirm) return setFieldError(pw, "confirm", "The passwords do not match.");
    if (next === current_) return setFieldError(pw, "password", "Choose a different password from the current one.");
    if (attemptsLeft() <= 0) return setFieldError(pw, "current", "Too many tries. Please wait 15 minutes and try again.");
    await busy(pw.querySelector("button[type=submit]"), async () => {
      try {
        noteAttempt();
        await changePassword(profile.email ?? "", current_, next);
        pw.reset();
        qs("#pwMeter").dataset.level = "0";
        ok("Password updated.");
      } catch (error) {
        const left = attemptsLeft();
        if (/current password/i.test((error as Error).message)) setFieldError(pw, "current", `That is not your current password. ${left} ${left === 1 ? "try" : "tries"} left.`);
        else fail(friendly(error));
      }
    });
  });
  void plural;
});
