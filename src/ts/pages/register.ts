import { confirmSignupCode, register, resendSignupCode, usernameAvailable } from "../api/auth";
import { courses, publicSettings, registrationInfo, settingText } from "../api/content";
import { boot } from "../core/boot";
import { busy, debounce, formData, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { checkPassword, watchPassword } from "../core/password";
import { fail, ok } from "../core/toast";
import { clearErrors, setFieldError } from "../ui/components";
import type { Course } from "../types";

const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_ .-]{2,15}$/;
const PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;

const RESEND_SECONDS = 60;

// step 2 of joining: the 6-digit code that was emailed
function showConfirm(email: string): void {
  qs("#registerNotice").innerHTML = html`
    <form class="form" id="confirmForm" novalidate>
      <div class="alert alert--success px px--success" role="status">${icon("mail")}<span>We sent a code to <strong>${email}</strong>. It can take a minute. Check your spam folder too.</span></div>
      <div class="field" data-field="code"><label class="field__label" for="f-confirm-code">Code from the email</label><input class="input input--code" id="f-confirm-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required><span class="field__error"></span></div>
      <button class="btn btn--block" type="submit">Confirm my email</button>
      <div class="cluster cluster--between"><button class="link-button" type="button" id="resendConfirm" disabled>Resend code</button><a class="link-button" href="/login">I already confirmed</a></div>
    </form>`.value;
  const confirmForm = qs<HTMLFormElement>("#confirmForm");
  const input = qs<HTMLInputElement>("#f-confirm-code");
  const resend = qs<HTMLButtonElement>("#resendConfirm");
  input.focus();
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 10); });
  input.addEventListener("paste", (event) => { event.preventDefault(); input.value = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 10); });

  let timer: ReturnType<typeof setInterval> | undefined;
  const startTimer = () => {
    let left = RESEND_SECONDS;
    clearInterval(timer);
    const tick = () => { resend.textContent = left > 0 ? `Resend code (${left}s)` : "Resend code"; resend.disabled = left > 0; if (left-- <= 0) clearInterval(timer); };
    tick();
    timer = setInterval(tick, 1000);
  };
  startTimer();
  resend.addEventListener("click", async () => {
    try { await resendSignupCode(email); ok("A new code was sent."); startTimer(); } catch (error) { fail(friendly(error)); }
  });

  confirmForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(confirmForm);
    if (input.value.length < 6) return setFieldError(confirmForm, "code", "Type the code from the email (6 to 10 digits).");
    await busy(confirmForm.querySelector("button[type=submit]"), async () => {
      try {
        await confirmSignupCode(email, input.value);
        location.href = "/catalog";
      } catch (error) {
        setFieldError(confirmForm, "code", /expired|invalid|token/i.test(friendly(error)) ? "That code is wrong or has expired. Check it or ask for a new one." : friendly(error));
      }
    });
  });
}

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
        showConfirm(data.email);
      } catch (error) {
        fail(friendly(error));
      }
    });
  });
});
