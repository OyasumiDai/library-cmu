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
import { searchableSelect } from "../ui/combobox";
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

const CODE_LENGTH = 6;
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

// step 3 of joining: the 6-digit code that was emailed
function showConfirm(email: string): void {
  markStep(3);
  const head = document.querySelector(".auth-panel__head");
  if (head) head.innerHTML = html`<h1 id="authTitle">Check your email</h1><p class="text-soft">One last step and your library account is ready.</p>`.value;
  qs("#registerNotice").innerHTML = html`
    <div class="verify">
      <div class="verify__intro">
        <span class="verify__badge" aria-hidden="true">${icon("mail", "icon--lg")}</span>
        <p class="verify__lead">Enter the ${String(CODE_LENGTH)}-digit code we sent to <strong class="verify__email">${email}</strong></p>
      </div>
      <form class="verify__form" id="confirmForm" novalidate>
        <div class="field" data-field="code">
          <label class="visually-hidden" for="f-confirm-code">Code from the email</label>
          <div class="otp" id="otp">
            <input class="otp__input" id="f-confirm-code" name="code" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="10" required aria-describedby="verifyStatus">
            <div class="otp__slots" id="otpSlots" aria-hidden="true"></div>
          </div>
          <span class="field__error"></span>
        </div>
        <button class="btn btn--block" type="submit" id="confirmBtn">Verify email</button>
        <p class="verify__status" id="verifyStatus" role="status" aria-live="polite">The code works for one hour.</p>
      </form>
      <div class="verify__help">
        <p>${icon("info", "icon--sm")} Not in your inbox? Check spam or promotions. It can take a minute to arrive.</p>
        <div class="cluster cluster--between"><button class="link-button" type="button" id="resendConfirm" disabled>Resend code</button><a class="link-button" href="/login">I already confirmed</a></div>
      </div>
    </div>`.value;

  const confirmForm = qs<HTMLFormElement>("#confirmForm");
  const input = qs<HTMLInputElement>("#f-confirm-code");
  const otp = qs("#otp");
  const slots = qs("#otpSlots");
  const status = qs("#verifyStatus");
  const button = qs<HTMLButtonElement>("#confirmBtn");
  const resend = qs<HTMLButtonElement>("#resendConfirm");
  let verifying = false;
  let lastTried = "";

  // the boxes only mirror the one real input, so paste and the phone's code autofill keep working
  const paint = () => {
    const value = input.value;
    const count = Math.max(CODE_LENGTH, value.length);
    const focused = document.activeElement === input;
    slots.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const slot = document.createElement("span");
      slot.className = "otp__slot";
      slot.style.setProperty("--i", String(i));
      slot.textContent = value[i] ?? "";
      if (value[i]) slot.classList.add("is-filled");
      if (focused && !verifying && i === Math.min(value.length, count - 1)) slot.classList.add("is-active");
      return slot;
    }));
  };
  const clean = (text: string) => text.replace(/\D/g, "").slice(0, 10);
  const toEnd = () => { const n = input.value.length; input.setSelectionRange(n, n); };

  input.addEventListener("input", () => {
    input.value = clean(input.value);
    otp.classList.remove("is-error");
    setFieldError(confirmForm, "code", "");
    paint();
    // a full code checks itself; no need to press the button
    if (input.value.length === CODE_LENGTH && input.value !== lastTried) confirmForm.requestSubmit();
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    if (verifying) return;
    input.value = clean(event.clipboardData?.getData("text") ?? "");
    input.dispatchEvent(new Event("input"));
  });
  input.addEventListener("focus", () => { toEnd(); paint(); });
  input.addEventListener("blur", paint);
  input.addEventListener("click", toEnd);
  input.addEventListener("keyup", toEnd);
  otp.addEventListener("animationend", (event) => { if (event.animationName === "otp-shake") otp.classList.remove("is-error"); });
  paint();
  input.focus();

  // sign-up just sent the first code, so the wait starts now (and grows with each resend)
  const cooldown = resendCooldown(resend, "signup", email);
  if (!cooldown.left()) cooldown.sent();
  resend.addEventListener("click", async () => {
    try {
      if (await cooldown.run(() => resendSignupCode(email))) {
        ok("A new code was sent. Codes can take a minute to arrive.");
        status.textContent = "New code sent. Only the newest code works.";
        input.value = "";
        lastTried = "";
        paint();
        input.focus();
      }
    } catch (error) {
      fail(serverWait(error) ? "Too many codes asked for. Please wait for the timer, then try again." : friendly(error));
    }
  });

  const setBusy = (on: boolean) => {
    verifying = on;
    otp.classList.toggle("is-verifying", on);
    input.readOnly = on;
    button.disabled = on;
    button.classList.toggle("is-loading", on);
    button.textContent = on ? "Verifying" : "Verify email";
    paint();
  };

  confirmForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (verifying) return;
    const code = input.value;
    if (code.length < CODE_LENGTH) {
      otp.classList.add("is-error");
      setFieldError(confirmForm, "code", `Type all ${CODE_LENGTH} digits from the email.`);
      input.focus();
      return;
    }
    lastTried = code;
    setFieldError(confirmForm, "code", "");
    setBusy(true);
    status.textContent = "Checking your code...";
    try {
      // keep the check on screen long enough to see, even when the server answers quickly
      await Promise.all([confirmSignupCode(email, code), wait(700)]);
    } catch (error) {
      setBusy(false);
      otp.classList.add("is-error");
      const message = friendly(error);
      setFieldError(confirmForm, "code", /expired|invalid|token/i.test(message) ? "That code is wrong or has expired. Check it or ask for a new one." : message);
      status.textContent = "Try again, or ask for a new code.";
      input.value = "";
      paint();
      input.focus();
      return;
    }
    // the boxes turn green one by one, then the welcome card takes over
    otp.classList.remove("is-verifying");
    otp.classList.add("is-success");
    button.classList.remove("is-loading");
    button.textContent = "Verified";
    status.textContent = "Code accepted.";
    markStep(4);
    await wait(900);
    showVerified();
  });
}

// the account is ready: a check mark draws itself, then on to the catalog
function showVerified(): void {
  const next = "/catalog";
  const head = document.querySelector(".auth-panel__head");
  if (head) head.innerHTML = html`<h1 id="authTitle">You are all set</h1><p class="text-soft">Welcome to the library.</p>`.value;
  qs("#registerNotice").innerHTML = html`
    <div class="verified" role="status">
      <svg class="verified__check" viewBox="0 0 52 52" aria-hidden="true"><circle class="verified__ring" cx="26" cy="26" r="23"/><path class="verified__tick" d="M15 27l7 7 15-16"/></svg>
      <h2 class="verified__title">Email confirmed</h2>
      <p class="verified__text">Your account is ready. Taking you to the catalog...</p>
      <div class="verified__bar" aria-hidden="true"><span></span></div>
      <a class="btn btn--block" href="${next}">Go to the catalog now</a>
    </div>`.value;
  setTimeout(() => { location.href = next; }, 2600);
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
  // gender, course, major and year level: type to narrow the list instead of scrolling it
  for (const select of [qs<HTMLSelectElement>("#f-gender"), course, major, year]) searchableSelect(select);

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
