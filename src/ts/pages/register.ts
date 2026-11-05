import { confirmSignupCode, EmailTakenError, register, resendSignupCode, usernameAvailable } from "../api/auth";
import { courses, publicSettings, registrationInfo, settingText } from "../api/content";
import { boot } from "../core/boot";
import { resendCooldown, serverWait } from "../core/cooldown";
import { busy, debounce, formData, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { checkPassword, watchPassword } from "../core/password";
import { fail, ok } from "../core/toast";
import { capsLockHint, heroTips, revealToggle } from "../ui/authSplit";
import { clearErrors, setFieldError } from "../ui/components";
import { agreeToTerms } from "../ui/terms";
import type { Course } from "../types";

const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_ .-]{2,15}$/;
const PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;
// the fields on the first page of the form; everything else is on "About you"
const STEP_ONE = ["username", "email", "password", "confirm"];

// the progress bar above the form: steps before n are done, n is the one being filled in
function markStep(n: number): void {
  qs("#regSteps").querySelectorAll<HTMLElement>("li").forEach((li) => {
    const step = Number(li.dataset.step);
    li.classList.toggle("is-current", step === n);
    li.classList.toggle("is-done", step < n);
    if (step === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
}

// step 3 of joining: the 6-digit code that was emailed
function showConfirm(email: string): void {
  markStep(3);
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

  // sign-up just sent the first code, so the wait starts now (and grows with each resend)
  const cooldown = resendCooldown(resend, "signup", email);
  if (!cooldown.left()) cooldown.sent();
  resend.addEventListener("click", async () => {
    try {
      if (await cooldown.run(() => resendSignupCode(email))) ok("A new code was sent. Codes can take a minute to arrive.");
    } catch (error) {
      fail(serverWait(error) ? "Too many codes asked for. Please wait for the timer, then try again." : friendly(error));
    }
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
  heroTips();
  const form = qs<HTMLFormElement>("#registerForm");
  const info = await registrationInfo();
  if (!info.open) {
    mount(qs("#registerNotice"), html`<div class="alert alert--warning px px--warning">Registration is closed right now. Please check back later or ask the library.</div>`);
    form.hidden = true;
    qs("#regSteps").hidden = true;
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
  revealToggle(qs<HTMLButtonElement>("#showPassword"), [password, confirm]);
  capsLockHint([password, confirm], qs("#capsHint"));

  // two pages of fields; the second only opens once the first is right
  const panels = [...form.querySelectorAll<HTMLElement>(".auth-step")];
  const back = qs<HTMLButtonElement>("#stepBack");
  const next = qs<HTMLButtonElement>("#stepNext");
  const submit = qs<HTMLButtonElement>("#stepSubmit");
  let step = 1;
  const showStep = (n: number, focus = true) => {
    step = n;
    panels.forEach((p) => { p.hidden = p.dataset.step !== String(n); });
    back.hidden = n === 1;
    next.hidden = n !== 1;
    submit.hidden = n !== 2;
    markStep(n);
    if (focus) panels[n - 1].querySelector<HTMLElement>(".is-invalid input, .is-invalid select, input, select")?.focus();
  };
  back.addEventListener("click", () => showStep(1));

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

  // everything wrong with the form, as [field, message]
  const findProblems = async (data: Record<string, string>): Promise<[string, string][]> => {
    const pw = password.value;
    const problems: [string, string][] = [];
    if (!USERNAME.test(data.username ?? "")) problems.push(["username", "Use 3 to 16 letters, numbers, dots, dashes or underscores."]);
    else if (!nameFree && !(await usernameAvailable(data.username))) problems.push(["username", "That username is taken."]);
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) problems.push(["email", "Enter a valid email."]);
    else if (domains.length && !domains.some((d) => data.email.toLowerCase().endsWith(`@${d.toLowerCase()}`))) problems.push(["email", `Please use your school email (${domains.map((d) => `@${d}`).join(" or ")}).`]);
    const strength = checkPassword(pw, data.username ?? "", (data.email ?? "").split("@")[0]);
    if (strength.problems.length) problems.push(["password", strength.problems[0]]);
    if (pw !== confirm.value) problems.push(["confirm", "The passwords do not match."]);
    // every field must be filled in (spaces alone do not count); major only when the chosen course has majors
    if (!pw) problems.push(["password", "Choose a password."]);
    if (!confirm.value) problems.push(["confirm", "Type your password again."]);
    if (!data.full_name?.trim()) problems.push(["full_name", "Enter your full name."]);
    if (!data.student_id?.trim()) problems.push(["student_id", "Enter your student ID."]);
    if (!data.gender) problems.push(["gender", "Choose one."]);
    const phone = (data.phone ?? "").replace(/[\s-]/g, "");
    if (!phone) problems.push(["phone", "Enter your mobile number."]);
    else if (!PH_MOBILE.test(phone)) problems.push(["phone", "Use a Philippine mobile number, like 09171234567."]);
    const picked = catalog.find((c) => c.code === data.course);
    if (!picked) problems.push(["course", "Choose your course."]);
    else if (picked.majors.length && !data.major) problems.push(["major", "Choose your major."]);
    if (!data.year_level) problems.push(["year_level", "Choose your year level."]);
    return problems;
  };

  const goNext = async () => {
    clearErrors(form);
    const problems = (await busy(next, () => findProblems(formData(form)))).filter(([name]) => STEP_ONE.includes(name));
    problems.forEach(([name, message]) => setFieldError(form, name, message));
    if (problems.length) { form.querySelector<HTMLElement>(".is-invalid input")?.focus(); return; }
    showStep(2);
  };
  next.addEventListener("click", goNext);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Enter on the first page means "next"
    if (step === 1) return goNext();
    clearErrors(form);
    const data = formData(form);
    const pw = password.value;
    const problems = await findProblems(data);
    const picked = catalog.find((c) => c.code === data.course);
    const phone = (data.phone ?? "").replace(/[\s-]/g, "");
    problems.forEach(([name, message]) => setFieldError(form, name, message));
    if (problems.length) {
      // a problem on the first page (a name taken meanwhile, say) takes the person back there
      if (problems.some(([name]) => STEP_ONE.includes(name))) showStep(1, false);
      form.querySelector<HTMLElement>(".auth-step:not([hidden]) .is-invalid input, .auth-step:not([hidden]) .is-invalid select")?.focus();
      return;
    }

    // the form is complete: now the terms must be read to the end and agreed to, or no account is made
    if (!(await agreeToTerms("Agree and create account"))) {
      fail("Your account was not created. You need to agree to the Terms and Conditions first.");
      return;
    }

    const chosen = picked;
    await busy(form.querySelector("button[type=submit]"), async () => {
      try {
        await register({
          email: data.email.trim().toLowerCase(), password: pw, username: data.username, full_name: data.full_name.trim(), student_id: data.student_id.trim(),
          gender: data.gender, course: chosen?.program ?? "", major: data.major ?? "", college: chosen?.college ?? "",
          year_level: data.year_level ?? "", phone, terms_version: info.terms_version || settingText(settings, "terms_version", "1.0"),
        });
        form.hidden = true;
        showConfirm(data.email.trim().toLowerCase());
      } catch (error) {
        // a taken email belongs on the email field, where the person can fix it
        if (error instanceof EmailTakenError) { showStep(1, false); setFieldError(form, "email", error.message); qs<HTMLInputElement>("#f-email").focus(); return; }
        fail(friendly(error));
      }
    });
  });
});
