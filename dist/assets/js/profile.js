import {
  uploadPicture
} from "./chunks/chunk-Y2FOSE3G.js";
import {
  checkPassword,
  watchPassword
} from "./chunks/chunk-CPZZQ3RM.js";
import {
  markRead
} from "./chunks/chunk-BJZOPE75.js";
import {
  myActivity,
  myLoans
} from "./chunks/chunk-OAO6RVBP.js";
import {
  clearErrors,
  cover,
  empty,
  field,
  selectField,
  setFieldError,
  statCard
} from "./chunks/chunk-YFDTB4J4.js";
import {
  actions,
  boot,
  busy,
  changePassword,
  courses,
  current,
  daysUntil,
  dueLabel,
  fail,
  formData,
  formatDate,
  friendly,
  html,
  icon,
  initials,
  mount,
  ok,
  plural,
  publicSettings,
  qs,
  raw,
  relative,
  updateProfile
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/profile.ts
var PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;
var VERBS = {
  request: "Requested",
  cancel: "Cancelled a request for",
  checkout: "Borrowed",
  decline: "Was declined for",
  return: "Returned",
  read: "Marked as read:",
  signin: "Signed in",
  profile: "Updated the profile",
  password: "Changed the password",
  notice: "Received a library notice"
};
var ATTEMPTS = "cmu-password-attempts";
function attemptsLeft() {
  try {
    const stamps = JSON.parse(localStorage.getItem(ATTEMPTS) ?? "[]").filter((t) => Date.now() - t < 15 * 6e4);
    return Math.max(0, 5 - stamps.length);
  } catch {
    return 5;
  }
}
function noteAttempt() {
  try {
    const stamps = JSON.parse(localStorage.getItem(ATTEMPTS) ?? "[]").filter((t) => Date.now() - t < 15 * 6e4);
    stamps.push(Date.now());
    localStorage.setItem(ATTEMPTS, JSON.stringify(stamps));
  } catch {
  }
}
function meCard() {
  const p = current().profile;
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
function detailsForm(catalog, levels) {
  const p = current().profile;
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
          <option value="">${chosen ? chosen.majors.length ? "Choose..." : "No major for this course" : "Choose a course first"}</option>
          ${(chosen?.majors ?? []).map((m) => html`<option ${m === p.major ? raw("selected") : ""}>${m}</option>`)}
        </select><span class="field__error"></span></div>
    </div>
    <div class="form__row">${selectField("year_level", "Year level", levels.map((value) => ({ value })), p.year_level ?? "")}</div>
    <p class="field__hint">Your username and email are fixed. Ask library staff if they need changing.</p>
    <div class="form__actions"><button class="btn" type="submit">Save changes</button></div>`;
}
var LOAN_STATUSES = ["requested", "borrowed"];
function bookRow(loan, kind, readIds) {
  const due = loan.status === "borrowed" ? dueLabel(loan.due_at) : null;
  return html`
    <div class="list__item">
      <div class="profile__cover">${loan.book ? cover({ id: loan.book.id, title: loan.book.title, cover_url: loan.book.cover_url }) : ""}</div>
      <div class="list__body"><p class="list__title">${loan.book?.title ?? "Removed book"}</p><p class="list__meta">${loan.book?.author ?? ""}</p>
        <p class="list__meta">${kind === "returned" ? `Returned ${formatDate(loan.returned_at)}` : `Requested ${formatDate(loan.requested_at)}`}</p>
        ${due ? html`<span class="badge badge--${due.tone}">${due.text}</span>` : ""}${kind === "borrowed" && loan.status === "requested" ? html`<span class="badge badge--warning">waiting for staff</span>` : ""}</div>
      ${kind === "returned" ? readIds.has(loan.book_id) ? html`<span class="badge badge--success">${icon("check", "icon--sm")} Read</span>` : html`<button class="btn btn--sm btn--secondary" type="button" data-action="markRead" data-id="${loan.book_id}">Mark as read</button>` : ""}
    </div>`;
}
boot(async () => {
  const profile = current().profile;
  const [catalog, settings] = await Promise.all([courses(), publicSettings()]);
  const levels = settings.year_levels ?? [];
  let loans = [];
  let activity = [];
  let booksTab = "borrowed";
  const root = qs("[data-page-root]");
  const drawMe = () => mount(qs("#meCard"), meCard());
  const drawCompleteness = () => {
    const p = current().profile;
    const missing = [!p.course && "course", !p.year_level && "year level", !p.phone && "phone number"].filter(Boolean);
    mount(qs("#completeness"), missing.length ? html`<div class="alert alert--warning px px--warning" role="status">${icon("info")}<span>Your profile is almost ready. Please add your <strong>${missing.join(", ")}</strong>.</span></div>` : html``);
  };
  const readIds = () => new Set(activity.filter((a) => a.type === "read" && a.book_id).map((a) => a.book_id));
  const drawActivity = () => {
    const open = loans.filter((l) => LOAN_STATUSES.includes(l.status));
    const out = loans.filter((l) => l.status === "borrowed");
    const soon = out.filter((l) => l.due_at && daysUntil(l.due_at) >= 0 && daysUntil(l.due_at) <= 2).length;
    const late = out.filter((l) => l.due_at && daysUntil(l.due_at) < 0).length;
    const returned = loans.filter((l) => l.status === "returned");
    const read = readIds();
    mount(qs("#activityStats"), html`${statCard("Current", open.length, "shelf")}${statCard("Due soon", soon, "clock")}${statCard("Overdue", late, "bell")}${statCard("Returned", returned.length, "check")}${statCard("Books read", read.size, "book")}`);
    const list = booksTab === "borrowed" ? open : booksTab === "returned" ? returned : [];
    const readBooks = [...read].map((id) => loans.find((l) => l.book_id === id)).filter(Boolean);
    const rows = booksTab === "read" ? readBooks : list;
    mount(qs("#bookList"), rows.length ? html`<div class="list">${rows.map((l) => bookRow(l, booksTab, read))}</div>` : empty("Nothing here yet", booksTab === "borrowed" ? "Books you request or borrow show up here." : booksTab === "returned" ? "Returned books show up here." : "Mark returned books as read and they collect here."));
    qs("#bookTabs").querySelectorAll("[data-books]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.books === booksTab)));
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
  const showTab = (name) => {
    document.querySelectorAll("[data-panel]").forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
    qs("#profileTabs").querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  };
  showTab(new URLSearchParams(location.search).get("tab") === "activity" ? "activity" : "details");
  actions(root, {
    tab: (el) => showTab(el.dataset.tab ?? "details"),
    books: (el) => {
      booksTab = el.dataset.books;
      drawActivity();
    },
    markRead: async (el) => {
      try {
        await markRead(el.dataset.id ?? "");
        ok("Added to your books read.");
        await reload();
      } catch (error) {
        fail(friendly(error));
      }
    },
    removePhoto: async () => {
      try {
        await updateProfile(profile.id, { photo_url: null });
        drawMe();
        ok("Photo removed.");
      } catch (error) {
        fail(friendly(error));
      }
    }
  });
  const form = qs("#detailsForm");
  const courseInput = () => form.elements.namedItem("course");
  form.addEventListener("input", (event) => {
    if (event.target.id !== "f-course") return;
    const chosen = catalog.find((c) => c.program === courseInput().value);
    const major = form.elements.namedItem("major");
    major.replaceChildren(new Option(chosen ? chosen.majors.length ? "Choose..." : "No major for this course" : "Choose a course first", ""));
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
    const edit = {
      full_name: d.full_name,
      student_id: d.student_id || null,
      course: chosen?.program ?? null,
      college: chosen?.college ?? null,
      major: chosen && chosen.majors.length ? d.major || null : null,
      year_level: d.year_level || null,
      gender: d.gender || null,
      phone: phone || null
    };
    await busy(form.querySelector("button[type=submit]"), async () => {
      try {
        await updateProfile(profile.id, edit);
        drawCompleteness();
        drawMe();
        ok("Profile saved.");
      } catch (error) {
        fail(friendly(error));
      }
    });
  });
  qs("#meCard").addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (input.id !== "photoFile" || !file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return fail("Please choose a JPG, PNG or WEBP picture.");
    if (file.size > 3e6) return fail("Please choose a picture under 3 MB.");
    try {
      const url = await uploadPicture(`profiles/${profile.id}`, file);
      await updateProfile(profile.id, { photo_url: url });
      drawMe();
      ok("Photo updated.");
    } catch (error) {
      fail(friendly(error));
    }
  });
  const pw = qs("#passwordForm");
  const newPw = qs("#f-pw");
  watchPassword(newPw, "pwMeter", () => [profile.username, (profile.email ?? "").split("@")[0]]);
  pw.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(pw);
    const current_ = pw.elements.namedItem("current").value;
    const next = newPw.value;
    const confirm = pw.elements.namedItem("confirm").value;
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
        if (/current password/i.test(error.message)) setFieldError(pw, "current", `That is not your current password. ${left} ${left === 1 ? "try" : "tries"} left.`);
        else fail(friendly(error));
      }
    });
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL3Byb2ZpbGUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNoYW5nZVBhc3N3b3JkLCB1cGRhdGVQcm9maWxlLCB0eXBlIFByb2ZpbGVFZGl0IH0gZnJvbSBcIi4uL2FwaS9hdXRoXCI7XG5pbXBvcnQgeyBtYXJrUmVhZCB9IGZyb20gXCIuLi9hcGkvY2F0YWxvZ1wiO1xuaW1wb3J0IHsgY291cnNlcywgcHVibGljU2V0dGluZ3MgfSBmcm9tIFwiLi4vYXBpL2NvbnRlbnRcIjtcbmltcG9ydCB7IG15QWN0aXZpdHksIG15TG9hbnMgfSBmcm9tIFwiLi4vYXBpL2xvYW5zXCI7XG5pbXBvcnQgeyB1cGxvYWRQaWN0dXJlIH0gZnJvbSBcIi4uL2FwaS9zdGFmZlwiO1xuaW1wb3J0IHsgYm9vdCB9IGZyb20gXCIuLi9jb3JlL2Jvb3RcIjtcbmltcG9ydCB7IGFjdGlvbnMsIGJ1c3ksIGZvcm1EYXRhLCBodG1sLCBpY29uLCBtb3VudCwgcXMsIHJhdyB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xuaW1wb3J0IHsgZnJpZW5kbHkgfSBmcm9tIFwiLi4vY29yZS9lcnJvcnNcIjtcbmltcG9ydCB7IGRheXNVbnRpbCwgZHVlTGFiZWwsIGZvcm1hdERhdGUsIGluaXRpYWxzLCBwbHVyYWwsIHJlbGF0aXZlIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XG5pbXBvcnQgeyBjaGVja1Bhc3N3b3JkLCB3YXRjaFBhc3N3b3JkIH0gZnJvbSBcIi4uL2NvcmUvcGFzc3dvcmRcIjtcbmltcG9ydCB7IGN1cnJlbnQgfSBmcm9tIFwiLi4vY29yZS9zZXNzaW9uXCI7XG5pbXBvcnQgeyBmYWlsLCBvayB9IGZyb20gXCIuLi9jb3JlL3RvYXN0XCI7XG5pbXBvcnQgeyBjbGVhckVycm9ycywgY292ZXIsIGVtcHR5LCBmaWVsZCwgc2VsZWN0RmllbGQsIHNldEZpZWxkRXJyb3IsIHN0YXRDYXJkIH0gZnJvbSBcIi4uL3VpL2NvbXBvbmVudHNcIjtcbmltcG9ydCB0eXBlIHsgQWN0aXZpdHksIENvdXJzZSwgTG9hbiB9IGZyb20gXCIuLi90eXBlc1wiO1xuXG5jb25zdCBQSF9NT0JJTEUgPSAvXig/OlxcKz82M3wwKTlcXGR7OX0kLztcbmNvbnN0IFZFUkJTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICByZXF1ZXN0OiBcIlJlcXVlc3RlZFwiLCBjYW5jZWw6IFwiQ2FuY2VsbGVkIGEgcmVxdWVzdCBmb3JcIiwgY2hlY2tvdXQ6IFwiQm9ycm93ZWRcIiwgZGVjbGluZTogXCJXYXMgZGVjbGluZWQgZm9yXCIsIHJldHVybjogXCJSZXR1cm5lZFwiLCByZWFkOiBcIk1hcmtlZCBhcyByZWFkOlwiLFxuICBzaWduaW46IFwiU2lnbmVkIGluXCIsIHByb2ZpbGU6IFwiVXBkYXRlZCB0aGUgcHJvZmlsZVwiLCBwYXNzd29yZDogXCJDaGFuZ2VkIHRoZSBwYXNzd29yZFwiLCBub3RpY2U6IFwiUmVjZWl2ZWQgYSBsaWJyYXJ5IG5vdGljZVwiLFxufTtcbmNvbnN0IEFUVEVNUFRTID0gXCJjbXUtcGFzc3dvcmQtYXR0ZW1wdHNcIjtcblxuLy8gXCI1IHRyaWVzIGV2ZXJ5IDE1IG1pbnV0ZXNcIiBmb3IgdGhlIGN1cnJlbnQtcGFzc3dvcmQgY2hlY2tcbmZ1bmN0aW9uIGF0dGVtcHRzTGVmdCgpOiBudW1iZXIge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YW1wcyA9IChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKEFUVEVNUFRTKSA/PyBcIltdXCIpIGFzIG51bWJlcltdKS5maWx0ZXIoKHQpID0+IERhdGUubm93KCkgLSB0IDwgMTUgKiA2MF8wMDApO1xuICAgIHJldHVybiBNYXRoLm1heCgwLCA1IC0gc3RhbXBzLmxlbmd0aCk7XG4gIH0gY2F0Y2ggeyByZXR1cm4gNTsgfVxufVxuZnVuY3Rpb24gbm90ZUF0dGVtcHQoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhbXBzID0gKEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oQVRURU1QVFMpID8/IFwiW11cIikgYXMgbnVtYmVyW10pLmZpbHRlcigodCkgPT4gRGF0ZS5ub3coKSAtIHQgPCAxNSAqIDYwXzAwMCk7XG4gICAgc3RhbXBzLnB1c2goRGF0ZS5ub3coKSk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oQVRURU1QVFMsIEpTT04uc3RyaW5naWZ5KHN0YW1wcykpO1xuICB9IGNhdGNoIHsgLyogcHJpdmF0ZSBtb2RlICovIH1cbn1cblxuZnVuY3Rpb24gbWVDYXJkKCkge1xuICBjb25zdCBwID0gY3VycmVudCgpLnByb2ZpbGUhO1xuICBjb25zdCByb2xlID0gcC5yb2xlID09PSBcInN0dWRlbnRcIiA/IFwiU3R1ZGVudFwiIDogcC5yb2xlID09PSBcImFkbWluXCIgPyBcIkFkbWluaXN0cmF0b3JcIiA6IFwiTGlicmFyeSBzdGFmZlwiO1xuICByZXR1cm4gaHRtbGBcbiAgICA8c3BhbiBjbGFzcz1cImF2YXRhciBhdmF0YXItLWxnXCI+JHtwLnBob3RvX3VybCA/IHJhdyhgPGltZyBzcmM9XCIke3AucGhvdG9fdXJsLnJlcGxhY2UoL1wiL2csIFwiXCIpfVwiIGFsdD1cIlwiPmApIDogaW5pdGlhbHMocC51c2VybmFtZSl9PC9zcGFuPlxuICAgIDxkaXY+PGgyPiR7cC51c2VybmFtZX08L2gyPjxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLXNlY29uZGFyeVwiPiR7cm9sZX08L3NwYW4+PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImNsdXN0ZXIgY2x1c3Rlci0tY2VudGVyXCI+XG4gICAgICA8bGFiZWwgY2xhc3M9XCJidG4gYnRuLS1zbSBidG4tLXNlY29uZGFyeVwiIGZvcj1cInBob3RvRmlsZVwiPiR7aWNvbihcInVwbG9hZFwiKX0gJHtwLnBob3RvX3VybCA/IFwiQ2hhbmdlXCIgOiBcIkFkZCBwaG90b1wifTwvbGFiZWw+XG4gICAgICAke3AucGhvdG9fdXJsID8gaHRtbGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi0tc20gYnRuLS1kYW5nZXJcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJyZW1vdmVQaG90b1wiPiR7aWNvbihcInRyYXNoXCIpfSBSZW1vdmU8L2J1dHRvbj5gIDogXCJcIn1cbiAgICA8L2Rpdj5cbiAgICA8aW5wdXQgY2xhc3M9XCJ2aXN1YWxseS1oaWRkZW5cIiBpZD1cInBob3RvRmlsZVwiIHR5cGU9XCJmaWxlXCIgYWNjZXB0PVwiaW1hZ2UvcG5nLGltYWdlL2pwZWcsaW1hZ2Uvd2VicFwiPlxuICAgIDxkbCBjbGFzcz1cInByb2ZpbGVfX2ZhY3RzXCI+PGR0PkVtYWlsPC9kdD48ZGQ+JHtwLmVtYWlsID8/IFwiXCJ9PC9kZD48ZHQ+Sm9pbmVkPC9kdD48ZGQ+JHtmb3JtYXREYXRlKHAuY3JlYXRlZF9hdCl9PC9kZD4ke3Auc3R1ZGVudF9pZCA/IGh0bWxgPGR0PlN0dWRlbnQgSUQ8L2R0PjxkZD4ke3Auc3R1ZGVudF9pZH08L2RkPmAgOiBcIlwifTwvZGw+YDtcbn1cblxuZnVuY3Rpb24gZGV0YWlsc0Zvcm0oY2F0YWxvZzogQ291cnNlW10sIGxldmVsczogc3RyaW5nW10pIHtcbiAgY29uc3QgcCA9IGN1cnJlbnQoKS5wcm9maWxlITtcbiAgY29uc3QgY2hvc2VuID0gY2F0YWxvZy5maW5kKChjKSA9PiBjLnByb2dyYW0gPT09IHAuY291cnNlKTtcbiAgcmV0dXJuIGh0bWxgXG4gICAgPGRpdiBjbGFzcz1cImZvcm1fX3Jvd1wiPiR7ZmllbGQoXCJmdWxsX25hbWVcIiwgXCJEaXNwbGF5IG5hbWVcIiwgeyB2YWx1ZTogcC5mdWxsX25hbWUsIHJlcXVpcmVkOiB0cnVlIH0pfSR7c2VsZWN0RmllbGQoXCJnZW5kZXJcIiwgXCJHZW5kZXJcIiwgW3sgdmFsdWU6IFwiRmVtYWxlXCIgfSwgeyB2YWx1ZTogXCJNYWxlXCIgfV0sIHAuZ2VuZGVyID8/IFwiXCIsIGZhbHNlLCBcIlByZWZlciBub3QgdG8gc2F5XCIpfTwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJmb3JtX19yb3dcIj4ke2ZpZWxkKFwicGhvbmVcIiwgXCJQaG9uZVwiLCB7IHZhbHVlOiBwLnBob25lID8/IFwiXCIsIHR5cGU6IFwidGVsXCIsIHBsYWNlaG9sZGVyOiBcIjA5WFggWFhYIFhYWFhcIiwgaGludDogXCJQaGlsaXBwaW5lIG1vYmlsZSBudW1iZXJcIiB9KX0ke2ZpZWxkKFwic3R1ZGVudF9pZFwiLCBcIlN0dWRlbnQgSURcIiwgeyB2YWx1ZTogcC5zdHVkZW50X2lkID8/IFwiXCIgfSl9PC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImZvcm1fX3Jvd1wiPlxuICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCIgZGF0YS1maWVsZD1cImNvdXJzZVwiPjxsYWJlbCBjbGFzcz1cImZpZWxkX19sYWJlbFwiIGZvcj1cImYtY291cnNlXCI+Q291cnNlPC9sYWJlbD5cbiAgICAgICAgPGlucHV0IGNsYXNzPVwiaW5wdXRcIiBpZD1cImYtY291cnNlXCIgbmFtZT1cImNvdXJzZVwiIGxpc3Q9XCJjb3Vyc2VMaXN0XCIgdmFsdWU9XCIke3AuY291cnNlID8/IFwiXCJ9XCIgcGxhY2Vob2xkZXI9XCJUeXBlIHRvIHNlYXJjaCB5b3VyIHByb2dyYW1cIiBhdXRvY29tcGxldGU9XCJvZmZcIj5cbiAgICAgICAgPGRhdGFsaXN0IGlkPVwiY291cnNlTGlzdFwiPiR7Y2F0YWxvZy5tYXAoKGMpID0+IGh0bWxgPG9wdGlvbiB2YWx1ZT1cIiR7Yy5wcm9ncmFtfVwiPiR7Yy5jb2xsZWdlfTwvb3B0aW9uPmApfTwvZGF0YWxpc3Q+PHNwYW4gY2xhc3M9XCJmaWVsZF9fZXJyb3JcIj48L3NwYW4+PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIiBkYXRhLWZpZWxkPVwibWFqb3JcIj48bGFiZWwgY2xhc3M9XCJmaWVsZF9fbGFiZWxcIiBmb3I9XCJmLW1ham9yXCI+TWFqb3I8L2xhYmVsPlxuICAgICAgICA8c2VsZWN0IGNsYXNzPVwic2VsZWN0XCIgaWQ9XCJmLW1ham9yXCIgbmFtZT1cIm1ham9yXCIgJHtjaG9zZW4gJiYgY2hvc2VuLm1ham9ycy5sZW5ndGggPyBcIlwiIDogcmF3KFwiZGlzYWJsZWRcIil9PlxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj4ke2Nob3NlbiA/IChjaG9zZW4ubWFqb3JzLmxlbmd0aCA/IFwiQ2hvb3NlLi4uXCIgOiBcIk5vIG1ham9yIGZvciB0aGlzIGNvdXJzZVwiKSA6IFwiQ2hvb3NlIGEgY291cnNlIGZpcnN0XCJ9PC9vcHRpb24+XG4gICAgICAgICAgJHsoY2hvc2VuPy5tYWpvcnMgPz8gW10pLm1hcCgobSkgPT4gaHRtbGA8b3B0aW9uICR7bSA9PT0gcC5tYWpvciA/IHJhdyhcInNlbGVjdGVkXCIpIDogXCJcIn0+JHttfTwvb3B0aW9uPmApfVxuICAgICAgICA8L3NlbGVjdD48c3BhbiBjbGFzcz1cImZpZWxkX19lcnJvclwiPjwvc3Bhbj48L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiZm9ybV9fcm93XCI+JHtzZWxlY3RGaWVsZChcInllYXJfbGV2ZWxcIiwgXCJZZWFyIGxldmVsXCIsIGxldmVscy5tYXAoKHZhbHVlKSA9PiAoeyB2YWx1ZSB9KSksIHAueWVhcl9sZXZlbCA/PyBcIlwiKX08L2Rpdj5cbiAgICA8cCBjbGFzcz1cImZpZWxkX19oaW50XCI+WW91ciB1c2VybmFtZSBhbmQgZW1haWwgYXJlIGZpeGVkLiBBc2sgbGlicmFyeSBzdGFmZiBpZiB0aGV5IG5lZWQgY2hhbmdpbmcuPC9wPlxuICAgIDxkaXYgY2xhc3M9XCJmb3JtX19hY3Rpb25zXCI+PGJ1dHRvbiBjbGFzcz1cImJ0blwiIHR5cGU9XCJzdWJtaXRcIj5TYXZlIGNoYW5nZXM8L2J1dHRvbj48L2Rpdj5gO1xufVxuXG5jb25zdCBMT0FOX1NUQVRVU0VTID0gW1wicmVxdWVzdGVkXCIsIFwiYm9ycm93ZWRcIl07XG5cbmZ1bmN0aW9uIGJvb2tSb3cobG9hbjogTG9hbiwga2luZDogc3RyaW5nLCByZWFkSWRzOiBTZXQ8c3RyaW5nPikge1xuICBjb25zdCBkdWUgPSBsb2FuLnN0YXR1cyA9PT0gXCJib3Jyb3dlZFwiID8gZHVlTGFiZWwobG9hbi5kdWVfYXQpIDogbnVsbDtcbiAgcmV0dXJuIGh0bWxgXG4gICAgPGRpdiBjbGFzcz1cImxpc3RfX2l0ZW1cIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJwcm9maWxlX19jb3ZlclwiPiR7bG9hbi5ib29rID8gY292ZXIoeyBpZDogbG9hbi5ib29rLmlkLCB0aXRsZTogbG9hbi5ib29rLnRpdGxlLCBjb3Zlcl91cmw6IGxvYW4uYm9vay5jb3Zlcl91cmwgfSkgOiBcIlwifTwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImxpc3RfX2JvZHlcIj48cCBjbGFzcz1cImxpc3RfX3RpdGxlXCI+JHtsb2FuLmJvb2s/LnRpdGxlID8/IFwiUmVtb3ZlZCBib29rXCJ9PC9wPjxwIGNsYXNzPVwibGlzdF9fbWV0YVwiPiR7bG9hbi5ib29rPy5hdXRob3IgPz8gXCJcIn08L3A+XG4gICAgICAgIDxwIGNsYXNzPVwibGlzdF9fbWV0YVwiPiR7a2luZCA9PT0gXCJyZXR1cm5lZFwiID8gYFJldHVybmVkICR7Zm9ybWF0RGF0ZShsb2FuLnJldHVybmVkX2F0KX1gIDogYFJlcXVlc3RlZCAke2Zvcm1hdERhdGUobG9hbi5yZXF1ZXN0ZWRfYXQpfWB9PC9wPlxuICAgICAgICAke2R1ZSA/IGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tJHtkdWUudG9uZX1cIj4ke2R1ZS50ZXh0fTwvc3Bhbj5gIDogXCJcIn0ke2tpbmQgPT09IFwiYm9ycm93ZWRcIiAmJiBsb2FuLnN0YXR1cyA9PT0gXCJyZXF1ZXN0ZWRcIiA/IGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0td2FybmluZ1wiPndhaXRpbmcgZm9yIHN0YWZmPC9zcGFuPmAgOiBcIlwifTwvZGl2PlxuICAgICAgJHtraW5kID09PSBcInJldHVybmVkXCIgPyAocmVhZElkcy5oYXMobG9hbi5ib29rX2lkKSA/IGh0bWxgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tc3VjY2Vzc1wiPiR7aWNvbihcImNoZWNrXCIsIFwiaWNvbi0tc21cIil9IFJlYWQ8L3NwYW4+YCA6IGh0bWxgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXNtIGJ0bi0tc2Vjb25kYXJ5XCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwibWFya1JlYWRcIiBkYXRhLWlkPVwiJHtsb2FuLmJvb2tfaWR9XCI+TWFyayBhcyByZWFkPC9idXR0b24+YCkgOiBcIlwifVxuICAgIDwvZGl2PmA7XG59XG5cbmJvb3QoYXN5bmMgKCkgPT4ge1xuICBjb25zdCBwcm9maWxlID0gY3VycmVudCgpLnByb2ZpbGUhO1xuICBjb25zdCBbY2F0YWxvZywgc2V0dGluZ3NdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2NvdXJzZXMoKSwgcHVibGljU2V0dGluZ3MoKV0pO1xuICBjb25zdCBsZXZlbHMgPSAoc2V0dGluZ3MueWVhcl9sZXZlbHMgYXMgc3RyaW5nW10gfCB1bmRlZmluZWQpID8/IFtdO1xuICBsZXQgbG9hbnM6IExvYW5bXSA9IFtdO1xuICBsZXQgYWN0aXZpdHk6IEFjdGl2aXR5W10gPSBbXTtcbiAgbGV0IGJvb2tzVGFiOiBcImJvcnJvd2VkXCIgfCBcInJldHVybmVkXCIgfCBcInJlYWRcIiA9IFwiYm9ycm93ZWRcIjtcblxuICBjb25zdCByb290ID0gcXMoXCJbZGF0YS1wYWdlLXJvb3RdXCIpO1xuICBjb25zdCBkcmF3TWUgPSAoKSA9PiBtb3VudChxcyhcIiNtZUNhcmRcIiksIG1lQ2FyZCgpKTtcblxuICBjb25zdCBkcmF3Q29tcGxldGVuZXNzID0gKCkgPT4ge1xuICAgIGNvbnN0IHAgPSBjdXJyZW50KCkucHJvZmlsZSE7XG4gICAgY29uc3QgbWlzc2luZyA9IFshcC5jb3Vyc2UgJiYgXCJjb3Vyc2VcIiwgIXAueWVhcl9sZXZlbCAmJiBcInllYXIgbGV2ZWxcIiwgIXAucGhvbmUgJiYgXCJwaG9uZSBudW1iZXJcIl0uZmlsdGVyKEJvb2xlYW4pIGFzIHN0cmluZ1tdO1xuICAgIG1vdW50KHFzKFwiI2NvbXBsZXRlbmVzc1wiKSwgbWlzc2luZy5sZW5ndGggPyBodG1sYDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC0td2FybmluZyBweCBweC0td2FybmluZ1wiIHJvbGU9XCJzdGF0dXNcIj4ke2ljb24oXCJpbmZvXCIpfTxzcGFuPllvdXIgcHJvZmlsZSBpcyBhbG1vc3QgcmVhZHkuIFBsZWFzZSBhZGQgeW91ciA8c3Ryb25nPiR7bWlzc2luZy5qb2luKFwiLCBcIil9PC9zdHJvbmc+Ljwvc3Bhbj48L2Rpdj5gIDogaHRtbGBgKTtcbiAgfTtcblxuICBjb25zdCByZWFkSWRzID0gKCkgPT4gbmV3IFNldChhY3Rpdml0eS5maWx0ZXIoKGEpID0+IGEudHlwZSA9PT0gXCJyZWFkXCIgJiYgYS5ib29rX2lkKS5tYXAoKGEpID0+IGEuYm9va19pZCBhcyBzdHJpbmcpKTtcblxuICBjb25zdCBkcmF3QWN0aXZpdHkgPSAoKSA9PiB7XG4gICAgY29uc3Qgb3BlbiA9IGxvYW5zLmZpbHRlcigobCkgPT4gTE9BTl9TVEFUVVNFUy5pbmNsdWRlcyhsLnN0YXR1cykpO1xuICAgIGNvbnN0IG91dCA9IGxvYW5zLmZpbHRlcigobCkgPT4gbC5zdGF0dXMgPT09IFwiYm9ycm93ZWRcIik7XG4gICAgY29uc3Qgc29vbiA9IG91dC5maWx0ZXIoKGwpID0+IGwuZHVlX2F0ICYmIGRheXNVbnRpbChsLmR1ZV9hdCkgPj0gMCAmJiBkYXlzVW50aWwobC5kdWVfYXQpIDw9IDIpLmxlbmd0aDtcbiAgICBjb25zdCBsYXRlID0gb3V0LmZpbHRlcigobCkgPT4gbC5kdWVfYXQgJiYgZGF5c1VudGlsKGwuZHVlX2F0KSA8IDApLmxlbmd0aDtcbiAgICBjb25zdCByZXR1cm5lZCA9IGxvYW5zLmZpbHRlcigobCkgPT4gbC5zdGF0dXMgPT09IFwicmV0dXJuZWRcIik7XG4gICAgY29uc3QgcmVhZCA9IHJlYWRJZHMoKTtcbiAgICBtb3VudChxcyhcIiNhY3Rpdml0eVN0YXRzXCIpLCBodG1sYCR7c3RhdENhcmQoXCJDdXJyZW50XCIsIG9wZW4ubGVuZ3RoLCBcInNoZWxmXCIpfSR7c3RhdENhcmQoXCJEdWUgc29vblwiLCBzb29uLCBcImNsb2NrXCIpfSR7c3RhdENhcmQoXCJPdmVyZHVlXCIsIGxhdGUsIFwiYmVsbFwiKX0ke3N0YXRDYXJkKFwiUmV0dXJuZWRcIiwgcmV0dXJuZWQubGVuZ3RoLCBcImNoZWNrXCIpfSR7c3RhdENhcmQoXCJCb29rcyByZWFkXCIsIHJlYWQuc2l6ZSwgXCJib29rXCIpfWApO1xuICAgIGNvbnN0IGxpc3QgPSBib29rc1RhYiA9PT0gXCJib3Jyb3dlZFwiID8gb3BlbiA6IGJvb2tzVGFiID09PSBcInJldHVybmVkXCIgPyByZXR1cm5lZCA6IFtdO1xuICAgIGNvbnN0IHJlYWRCb29rcyA9IFsuLi5yZWFkXS5tYXAoKGlkKSA9PiBsb2Fucy5maW5kKChsKSA9PiBsLmJvb2tfaWQgPT09IGlkKSkuZmlsdGVyKEJvb2xlYW4pIGFzIExvYW5bXTtcbiAgICBjb25zdCByb3dzID0gYm9va3NUYWIgPT09IFwicmVhZFwiID8gcmVhZEJvb2tzIDogbGlzdDtcbiAgICBtb3VudChxcyhcIiNib29rTGlzdFwiKSwgcm93cy5sZW5ndGggPyBodG1sYDxkaXYgY2xhc3M9XCJsaXN0XCI+JHtyb3dzLm1hcCgobCkgPT4gYm9va1JvdyhsLCBib29rc1RhYiwgcmVhZCkpfTwvZGl2PmAgOiBlbXB0eShcIk5vdGhpbmcgaGVyZSB5ZXRcIiwgYm9va3NUYWIgPT09IFwiYm9ycm93ZWRcIiA/IFwiQm9va3MgeW91IHJlcXVlc3Qgb3IgYm9ycm93IHNob3cgdXAgaGVyZS5cIiA6IGJvb2tzVGFiID09PSBcInJldHVybmVkXCIgPyBcIlJldHVybmVkIGJvb2tzIHNob3cgdXAgaGVyZS5cIiA6IFwiTWFyayByZXR1cm5lZCBib29rcyBhcyByZWFkIGFuZCB0aGV5IGNvbGxlY3QgaGVyZS5cIikpO1xuICAgIHFzKFwiI2Jvb2tUYWJzXCIpLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtYm9va3NdXCIpLmZvckVhY2goKGIpID0+IGIuc2V0QXR0cmlidXRlKFwiYXJpYS1zZWxlY3RlZFwiLCBTdHJpbmcoYi5kYXRhc2V0LmJvb2tzID09PSBib29rc1RhYikpKTtcbiAgICBtb3VudChxcyhcIiNhY3Rpdml0eVwiKSwgYWN0aXZpdHkubGVuZ3RoID8gaHRtbGA8b2wgY2xhc3M9XCJ0aW1lbGluZVwiPiR7YWN0aXZpdHkubWFwKChhKSA9PiBodG1sYDxsaSBjbGFzcz1cInRpbWVsaW5lX19pdGVtXCI+PHN0cm9uZz4ke1ZFUkJTW2EudHlwZV0gPz8gYS50eXBlfTwvc3Ryb25nPiAke2EuYm9vaz8udGl0bGUgPz8gXCJcIn08YnI+PHNtYWxsIGNsYXNzPVwidGV4dC1zb2Z0XCI+JHtyZWxhdGl2ZShhLmNyZWF0ZWRfYXQpfTwvc21hbGw+PC9saT5gKX08L29sPmAgOiBlbXB0eShcIk5vIGFjdGl2aXR5IHlldFwiLCBcIlJlcXVlc3QgYSBib29rIGFuZCBpdCB3aWxsIHNob3cgdXAgaGVyZS5cIikpO1xuICB9O1xuXG4gIGNvbnN0IHJlbG9hZCA9IGFzeW5jICgpID0+IHtcbiAgICBbbG9hbnMsIGFjdGl2aXR5XSA9IGF3YWl0IFByb21pc2UuYWxsKFtteUxvYW5zKHByb2ZpbGUuaWQpLCBteUFjdGl2aXR5KHByb2ZpbGUuaWQsIDYwKV0pO1xuICAgIGRyYXdBY3Rpdml0eSgpO1xuICB9O1xuXG4gIGRyYXdNZSgpO1xuICBkcmF3Q29tcGxldGVuZXNzKCk7XG4gIG1vdW50KHFzKFwiI2RldGFpbHNGb3JtXCIpLCBkZXRhaWxzRm9ybShjYXRhbG9nLCBsZXZlbHMpKTtcbiAgdm9pZCByZWxvYWQoKS5jYXRjaCgoZSkgPT4gZmFpbChmcmllbmRseShlKSkpO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gdGFic1xuICBjb25zdCBzaG93VGFiID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtcGFuZWxdXCIpLmZvckVhY2goKHApID0+IHsgcC5oaWRkZW4gPSBwLmRhdGFzZXQucGFuZWwgIT09IG5hbWU7IH0pO1xuICAgIHFzKFwiI3Byb2ZpbGVUYWJzXCIpLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtdGFiXVwiKS5mb3JFYWNoKCh0KSA9PiB0LnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgU3RyaW5nKHQuZGF0YXNldC50YWIgPT09IG5hbWUpKSk7XG4gIH07XG4gIHNob3dUYWIobmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpLmdldChcInRhYlwiKSA9PT0gXCJhY3Rpdml0eVwiID8gXCJhY3Rpdml0eVwiIDogXCJkZXRhaWxzXCIpO1xuXG4gIGFjdGlvbnMocm9vdCwge1xuICAgIHRhYjogKGVsKSA9PiBzaG93VGFiKGVsLmRhdGFzZXQudGFiID8/IFwiZGV0YWlsc1wiKSxcbiAgICBib29rczogKGVsKSA9PiB7IGJvb2tzVGFiID0gZWwuZGF0YXNldC5ib29rcyBhcyB0eXBlb2YgYm9va3NUYWI7IGRyYXdBY3Rpdml0eSgpOyB9LFxuICAgIG1hcmtSZWFkOiBhc3luYyAoZWwpID0+IHtcbiAgICAgIHRyeSB7IGF3YWl0IG1hcmtSZWFkKGVsLmRhdGFzZXQuaWQgPz8gXCJcIik7IG9rKFwiQWRkZWQgdG8geW91ciBib29rcyByZWFkLlwiKTsgYXdhaXQgcmVsb2FkKCk7IH0gY2F0Y2ggKGVycm9yKSB7IGZhaWwoZnJpZW5kbHkoZXJyb3IpKTsgfVxuICAgIH0sXG4gICAgcmVtb3ZlUGhvdG86IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7IGF3YWl0IHVwZGF0ZVByb2ZpbGUocHJvZmlsZS5pZCwgeyBwaG90b191cmw6IG51bGwgfSk7IGRyYXdNZSgpOyBvayhcIlBob3RvIHJlbW92ZWQuXCIpOyB9IGNhdGNoIChlcnJvcikgeyBmYWlsKGZyaWVuZGx5KGVycm9yKSk7IH1cbiAgICB9LFxuICB9KTtcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGRldGFpbHNcbiAgY29uc3QgZm9ybSA9IHFzPEhUTUxGb3JtRWxlbWVudD4oXCIjZGV0YWlsc0Zvcm1cIik7XG4gIGNvbnN0IGNvdXJzZUlucHV0ID0gKCkgPT4gZm9ybS5lbGVtZW50cy5uYW1lZEl0ZW0oXCJjb3Vyc2VcIikgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKGV2ZW50KSA9PiB7XG4gICAgaWYgKChldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmlkICE9PSBcImYtY291cnNlXCIpIHJldHVybjtcbiAgICBjb25zdCBjaG9zZW4gPSBjYXRhbG9nLmZpbmQoKGMpID0+IGMucHJvZ3JhbSA9PT0gY291cnNlSW5wdXQoKS52YWx1ZSk7XG4gICAgY29uc3QgbWFqb3IgPSBmb3JtLmVsZW1lbnRzLm5hbWVkSXRlbShcIm1ham9yXCIpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xuICAgIG1ham9yLnJlcGxhY2VDaGlsZHJlbihuZXcgT3B0aW9uKGNob3NlbiA/IChjaG9zZW4ubWFqb3JzLmxlbmd0aCA/IFwiQ2hvb3NlLi4uXCIgOiBcIk5vIG1ham9yIGZvciB0aGlzIGNvdXJzZVwiKSA6IFwiQ2hvb3NlIGEgY291cnNlIGZpcnN0XCIsIFwiXCIpKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgY2hvc2VuPy5tYWpvcnMgPz8gW10pIG1ham9yLmFwcGVuZChuZXcgT3B0aW9uKG0sIG0pKTtcbiAgICBtYWpvci5kaXNhYmxlZCA9ICFjaG9zZW4gfHwgY2hvc2VuLm1ham9ycy5sZW5ndGggPT09IDA7XG4gIH0pO1xuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjbGVhckVycm9ycyhmb3JtKTtcbiAgICBjb25zdCBkID0gZm9ybURhdGEoZm9ybSk7XG4gICAgY29uc3QgcGhvbmUgPSAoZC5waG9uZSA/PyBcIlwiKS5yZXBsYWNlKC9bXFxzLV0vZywgXCJcIik7XG4gICAgY29uc3QgY2hvc2VuID0gY2F0YWxvZy5maW5kKChjKSA9PiBjLnByb2dyYW0gPT09IGQuY291cnNlKTtcbiAgICBpZiAoIWQuZnVsbF9uYW1lKSByZXR1cm4gc2V0RmllbGRFcnJvcihmb3JtLCBcImZ1bGxfbmFtZVwiLCBcIkVudGVyIHlvdXIgZGlzcGxheSBuYW1lLlwiKTtcbiAgICBpZiAocGhvbmUgJiYgIVBIX01PQklMRS50ZXN0KHBob25lKSkgcmV0dXJuIHNldEZpZWxkRXJyb3IoZm9ybSwgXCJwaG9uZVwiLCBcIlVzZSBhIFBoaWxpcHBpbmUgbW9iaWxlIG51bWJlciwgbGlrZSAwOTE3MTIzNDU2Ny5cIik7XG4gICAgaWYgKGQuY291cnNlICYmICFjaG9zZW4pIHJldHVybiBzZXRGaWVsZEVycm9yKGZvcm0sIFwiY291cnNlXCIsIFwiUGljayBhIHByb2dyYW0gZnJvbSB0aGUgbGlzdC5cIik7XG4gICAgY29uc3QgZWRpdDogUHJvZmlsZUVkaXQgPSB7XG4gICAgICBmdWxsX25hbWU6IGQuZnVsbF9uYW1lLCBzdHVkZW50X2lkOiBkLnN0dWRlbnRfaWQgfHwgbnVsbCwgY291cnNlOiBjaG9zZW4/LnByb2dyYW0gPz8gbnVsbCwgY29sbGVnZTogY2hvc2VuPy5jb2xsZWdlID8/IG51bGwsXG4gICAgICBtYWpvcjogY2hvc2VuICYmIGNob3Nlbi5tYWpvcnMubGVuZ3RoID8gZC5tYWpvciB8fCBudWxsIDogbnVsbCwgeWVhcl9sZXZlbDogZC55ZWFyX2xldmVsIHx8IG51bGwsIGdlbmRlcjogKGQuZ2VuZGVyIGFzIFByb2ZpbGVFZGl0W1wiZ2VuZGVyXCJdKSB8fCBudWxsLCBwaG9uZTogcGhvbmUgfHwgbnVsbCxcbiAgICB9O1xuICAgIGF3YWl0IGJ1c3koZm9ybS5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uW3R5cGU9c3VibWl0XVwiKSwgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHsgYXdhaXQgdXBkYXRlUHJvZmlsZShwcm9maWxlLmlkLCBlZGl0KTsgZHJhd0NvbXBsZXRlbmVzcygpOyBkcmF3TWUoKTsgb2soXCJQcm9maWxlIHNhdmVkLlwiKTsgfSBjYXRjaCAoZXJyb3IpIHsgZmFpbChmcmllbmRseShlcnJvcikpOyB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIHFzKFwiI21lQ2FyZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgY29uc3QgZmlsZSA9IGlucHV0LmZpbGVzPy5bMF07XG4gICAgaWYgKGlucHV0LmlkICE9PSBcInBob3RvRmlsZVwiIHx8ICFmaWxlKSByZXR1cm47XG4gICAgaWYgKCEvXmltYWdlXFwvKHBuZ3xqcGVnfHdlYnApJC8udGVzdChmaWxlLnR5cGUpKSByZXR1cm4gZmFpbChcIlBsZWFzZSBjaG9vc2UgYSBKUEcsIFBORyBvciBXRUJQIHBpY3R1cmUuXCIpO1xuICAgIGlmIChmaWxlLnNpemUgPiAzXzAwMF8wMDApIHJldHVybiBmYWlsKFwiUGxlYXNlIGNob29zZSBhIHBpY3R1cmUgdW5kZXIgMyBNQi5cIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVybCA9IGF3YWl0IHVwbG9hZFBpY3R1cmUoYHByb2ZpbGVzLyR7cHJvZmlsZS5pZH1gLCBmaWxlKTtcbiAgICAgIGF3YWl0IHVwZGF0ZVByb2ZpbGUocHJvZmlsZS5pZCwgeyBwaG90b191cmw6IHVybCB9KTtcbiAgICAgIGRyYXdNZSgpO1xuICAgICAgb2soXCJQaG90byB1cGRhdGVkLlwiKTtcbiAgICB9IGNhdGNoIChlcnJvcikgeyBmYWlsKGZyaWVuZGx5KGVycm9yKSk7IH1cbiAgfSk7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBwYXNzd29yZFxuICBjb25zdCBwdyA9IHFzPEhUTUxGb3JtRWxlbWVudD4oXCIjcGFzc3dvcmRGb3JtXCIpO1xuICBjb25zdCBuZXdQdyA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtcHdcIik7XG4gIHdhdGNoUGFzc3dvcmQobmV3UHcsIFwicHdNZXRlclwiLCAoKSA9PiBbcHJvZmlsZS51c2VybmFtZSwgKHByb2ZpbGUuZW1haWwgPz8gXCJcIikuc3BsaXQoXCJAXCIpWzBdXSk7XG4gIHB3LmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjbGVhckVycm9ycyhwdyk7XG4gICAgY29uc3QgY3VycmVudF8gPSAocHcuZWxlbWVudHMubmFtZWRJdGVtKFwiY3VycmVudFwiKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICBjb25zdCBuZXh0ID0gbmV3UHcudmFsdWU7XG4gICAgY29uc3QgY29uZmlybSA9IChwdy5lbGVtZW50cy5uYW1lZEl0ZW0oXCJjb25maXJtXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgIGlmICghY3VycmVudF8pIHJldHVybiBzZXRGaWVsZEVycm9yKHB3LCBcImN1cnJlbnRcIiwgXCJFbnRlciB5b3VyIGN1cnJlbnQgcGFzc3dvcmQuXCIpO1xuICAgIGNvbnN0IHN0cmVuZ3RoID0gY2hlY2tQYXNzd29yZChuZXh0LCBwcm9maWxlLnVzZXJuYW1lLCAocHJvZmlsZS5lbWFpbCA/PyBcIlwiKS5zcGxpdChcIkBcIilbMF0pO1xuICAgIGlmIChzdHJlbmd0aC5wcm9ibGVtcy5sZW5ndGgpIHJldHVybiBzZXRGaWVsZEVycm9yKHB3LCBcInBhc3N3b3JkXCIsIHN0cmVuZ3RoLnByb2JsZW1zWzBdKTtcbiAgICBpZiAobmV4dCAhPT0gY29uZmlybSkgcmV0dXJuIHNldEZpZWxkRXJyb3IocHcsIFwiY29uZmlybVwiLCBcIlRoZSBwYXNzd29yZHMgZG8gbm90IG1hdGNoLlwiKTtcbiAgICBpZiAobmV4dCA9PT0gY3VycmVudF8pIHJldHVybiBzZXRGaWVsZEVycm9yKHB3LCBcInBhc3N3b3JkXCIsIFwiQ2hvb3NlIGEgZGlmZmVyZW50IHBhc3N3b3JkIGZyb20gdGhlIGN1cnJlbnQgb25lLlwiKTtcbiAgICBpZiAoYXR0ZW1wdHNMZWZ0KCkgPD0gMCkgcmV0dXJuIHNldEZpZWxkRXJyb3IocHcsIFwiY3VycmVudFwiLCBcIlRvbyBtYW55IHRyaWVzLiBQbGVhc2Ugd2FpdCAxNSBtaW51dGVzIGFuZCB0cnkgYWdhaW4uXCIpO1xuICAgIGF3YWl0IGJ1c3kocHcucXVlcnlTZWxlY3RvcihcImJ1dHRvblt0eXBlPXN1Ym1pdF1cIiksIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5vdGVBdHRlbXB0KCk7XG4gICAgICAgIGF3YWl0IGNoYW5nZVBhc3N3b3JkKHByb2ZpbGUuZW1haWwgPz8gXCJcIiwgY3VycmVudF8sIG5leHQpO1xuICAgICAgICBwdy5yZXNldCgpO1xuICAgICAgICBxcyhcIiNwd01ldGVyXCIpLmRhdGFzZXQubGV2ZWwgPSBcIjBcIjtcbiAgICAgICAgb2soXCJQYXNzd29yZCB1cGRhdGVkLlwiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGxlZnQgPSBhdHRlbXB0c0xlZnQoKTtcbiAgICAgICAgaWYgKC9jdXJyZW50IHBhc3N3b3JkL2kudGVzdCgoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpKSBzZXRGaWVsZEVycm9yKHB3LCBcImN1cnJlbnRcIiwgYFRoYXQgaXMgbm90IHlvdXIgY3VycmVudCBwYXNzd29yZC4gJHtsZWZ0fSAke2xlZnQgPT09IDEgPyBcInRyeVwiIDogXCJ0cmllc1wifSBsZWZ0LmApO1xuICAgICAgICBlbHNlIGZhaWwoZnJpZW5kbHkoZXJyb3IpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHZvaWQgcGx1cmFsO1xufSk7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
