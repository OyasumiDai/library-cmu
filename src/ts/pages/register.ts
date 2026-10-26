import { register, usernameAvailable } from "../api/auth";
import { courses, publicSettings, registrationInfo, settingText } from "../api/content";
import { boot } from "../core/boot";
import { busy, debounce, formData, html, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { checkPassword, watchPassword } from "../core/password";
import { fail } from "../core/toast";
import { clearErrors, setFieldError } from "../ui/components";
import type { Course } from "../types";

const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_ .-]{2,15}$/;
const PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;

boot(async () => {
  const form = qs<HTMLFormElement>("#registerForm");
  const info = await registrationInfo();
  if (!info.open) {
    mount(qs("#registerNotice"), html`<div class="alert alert--warning px px--warning">Registration is closed right now. Please check back later or ask the library.</div>`);
    form.hidden = true;
    return;
  }
  const domains = info.domains ?? [];
  const email = qs<HTMLInputElement>("#f-email");
  if (domains.length) qs("#emailHint").textContent = `Use your school email (${domains.map((d) => `@${d}`).join(" or ")}).`;

  const settings = await publicSettings();
  const catalog: Course[] = await courses();
  const course = qs<HTMLSelectElement>("#f-course");
  const major = qs<HTMLSelectElement>("#f-major");
  const year = qs<HTMLSelectElement>("#f-year_level");
  for (const level of (settings.year_levels as string[] | undefined) ?? []) year.append(new Option(level, level));
  for (const college of [...new Set(catalog.map((c) => c.college))]) {
    const group = document.createElement("optgroup");
    group.label = college;
    for (const c of catalog.filter((x) => x.college === college)) group.append(new Option(c.program, c.code));
    course.append(group);
  }
  course.addEventListener("change", () => {
    const chosen = catalog.find((c) => c.code === course.value);
    major.replaceChildren(new Option(!chosen ? "Choose a course first" : chosen.majors.length ? "Choose..." : "No major for this course", ""));
    major.disabled = !!chosen && chosen.majors.length === 0;
    for (const m of chosen?.majors ?? []) major.append(new Option(m, m));
  });

  const username = qs<HTMLInputElement>("#f-username");
  const password = qs<HTMLInputElement>("#f-password");
  const confirm = qs<HTMLInputElement>("#f-confirm");
  const verdict = watchPassword(password, "pwMeter", () => [username.value, email.value.split("@")[0] ?? ""]);

  // each field says what is wrong as soon as the person leaves it
  const hint = qs("#usernameHint");
  let nameFree = false;
  const checkName = debounce(async () => {
    const value = username.value.trim();
    if (!USERNAME.test(value)) { nameFree = false; return; }
    try {
      nameFree = await usernameAvailable(value);
      hint.textContent = nameFree ? "Nice, that name is free." : "Sorry, someone already has that name.";
      setFieldError(form, "username", nameFree ? "" : "That username is taken.");
    } catch {
      hint.textContent = "Could not check the name right now.";
    }
  });
  username.addEventListener("input", checkName);
  username.addEventListener("blur", () => setFieldError(form, "username", USERNAME.test(username.value.trim()) || !username.value ? "" : "Use 3 to 16 letters, numbers, dots, dashes or underscores."));
  email.addEventListener("blur", () => {
    const value = email.value.trim().toLowerCase();
    if (!value) return setFieldError(form, "email", "");
    if (!/^\S+@\S+\.\S+$/.test(value)) return setFieldError(form, "email", "Enter a valid email.");
    if (domains.length && !domains.some((d) => value.endsWith(`@${d.toLowerCase()}`))) return setFieldError(form, "email", `Please use your school email (${domains.map((d) => `@${d}`).join(" or ")}).`);
    setFieldError(form, "email", "");
  });
  password.addEventListener("blur", () => { const v = verdict(); setFieldError(form, "password", password.value && v.problems.length ? v.problems[0] : ""); });
  const matchCheck = () => {
    const hintEl = qs("#confirmHint");
    if (!confirm.value) { hintEl.textContent = "Type it again so we know it is right."; return setFieldError(form, "confirm", ""); }
    const same = confirm.value === password.value;
    hintEl.textContent = same ? "Matches." : "";
    setFieldError(form, "confirm", same ? "" : "The passwords do not match yet.");
  };
  confirm.addEventListener("input", matchCheck);
  password.addEventListener("input", () => confirm.value && matchCheck());
  qs<HTMLInputElement>("#f-phone").addEventListener("blur", (e) => {
    const value = (e.target as HTMLInputElement).value.replace(/[\s-]/g, "");
    setFieldError(form, "phone", !value || PH_MOBILE.test(value) ? "" : "Use a Philippine mobile number, like 09171234567.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    const data = formData(form);
    const pw = password.value;
    const problems: [string, string][] = [];
    if (!USERNAME.test(data.username ?? "")) problems.push(["username", "Use 3 to 16 letters, numbers, dots, dashes or underscores."]);
    else if (!nameFree && !(await usernameAvailable(data.username))) problems.push(["username", "That username is taken."]);
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) problems.push(["email", "Enter a valid email."]);
    else if (domains.length && !domains.some((d) => data.email.toLowerCase().endsWith(`@${d.toLowerCase()}`))) problems.push(["email", `Please use your school email (${domains.map((d) => `@${d}`).join(" or ")}).`]);
    const strength = checkPassword(pw, data.username ?? "", (data.email ?? "").split("@")[0]);
    if (strength.problems.length) problems.push(["password", strength.problems[0]]);
    if (pw !== confirm.value) problems.push(["confirm", "The passwords do not match."]);
    if (!data.full_name) problems.push(["full_name", "Enter your full name."]);
    if (!data.student_id) problems.push(["student_id", "Enter your student ID."]);
    if (!data.gender) problems.push(["gender", "Choose one."]);
    const phone = (data.phone ?? "").replace(/[\s-]/g, "");
    if (phone && !PH_MOBILE.test(phone)) problems.push(["phone", "Use a Philippine mobile number, like 09171234567."]);
    if (!(form.elements.namedItem("terms") as HTMLInputElement).checked) problems.push(["terms", "Please accept the terms to continue."]);
    problems.forEach(([name, message]) => setFieldError(form, name, message));
    if (problems.length) { form.querySelector<HTMLElement>(".is-invalid input, .is-invalid select")?.focus(); return; }

    const chosen = catalog.find((c) => c.code === data.course);
    await busy(form.querySelector("button[type=submit]"), async () => {
      try {
        const ready = await register({
          email: data.email, password: pw, username: data.username, full_name: data.full_name, student_id: data.student_id,
          gender: data.gender, course: chosen?.program ?? "", major: data.major ?? "", college: chosen?.college ?? "",
          year_level: data.year_level ?? "", phone, terms_version: info.terms_version || settingText(settings, "terms_version", "1.0"),
        });
        if (ready) { location.href = "/catalog"; return; }
        form.hidden = true;
        mount(qs("#registerNotice"), html`<div class="alert alert--success px px--success">Almost there! Check <strong>${data.email}</strong> for a confirmation link, then sign in.</div>`);
      } catch (error) {
        fail(friendly(error));
      }
    });
  });
});
