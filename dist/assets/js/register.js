import {
  checkPassword,
  watchPassword
} from "./chunks/chunk-CPZZQ3RM.js";
import {
  clearErrors,
  setFieldError
} from "./chunks/chunk-YFDTB4J4.js";
import {
  boot,
  busy,
  confirmSignupCode,
  courses,
  debounce,
  fail,
  formData,
  friendly,
  html,
  icon,
  mount,
  ok,
  publicSettings,
  qs,
  register,
  registrationInfo,
  resendSignupCode,
  settingText,
  usernameAvailable
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/register.ts
var USERNAME = /^[A-Za-z0-9][A-Za-z0-9_ .-]{2,15}$/;
var PH_MOBILE = /^(?:\+?63|0)9\d{9}$/;
var RESEND_SECONDS = 60;
function showConfirm(email) {
  qs("#registerNotice").innerHTML = html`
    <form class="form" id="confirmForm" novalidate>
      <div class="alert alert--success px px--success" role="status">${icon("mail")}<span>We sent a 6-digit code to <strong>${email}</strong>. It can take a minute. Check your spam folder too.</span></div>
      <div class="field" data-field="code"><label class="field__label" for="f-confirm-code">6-digit code</label><input class="input input--code" id="f-confirm-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" required><span class="field__error"></span></div>
      <button class="btn btn--block" type="submit">Confirm my email</button>
      <div class="cluster cluster--between"><button class="link-button" type="button" id="resendConfirm" disabled>Resend code</button><a class="link-button" href="/login">I already confirmed</a></div>
    </form>`.value;
  const confirmForm = qs("#confirmForm");
  const input = qs("#f-confirm-code");
  const resend = qs("#resendConfirm");
  input.focus();
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    input.value = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
  });
  let timer;
  const startTimer = () => {
    let left = RESEND_SECONDS;
    clearInterval(timer);
    const tick = () => {
      resend.textContent = left > 0 ? `Resend code (${left}s)` : "Resend code";
      resend.disabled = left > 0;
      if (left-- <= 0) clearInterval(timer);
    };
    tick();
    timer = setInterval(tick, 1e3);
  };
  startTimer();
  resend.addEventListener("click", async () => {
    try {
      await resendSignupCode(email);
      ok("A new code was sent.");
      startTimer();
    } catch (error) {
      fail(friendly(error));
    }
  });
  confirmForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(confirmForm);
    if (input.value.length !== 6) return setFieldError(confirmForm, "code", "Type the 6 digits from the email.");
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
  const form = qs("#registerForm");
  const info = await registrationInfo();
  if (!info.open) {
    mount(qs("#registerNotice"), html`<div class="alert alert--warning px px--warning">Registration is closed right now. Please check back later or ask the library.</div>`);
    form.hidden = true;
    return;
  }
  const domains = info.domains ?? [];
  const email = qs("#f-email");
  if (domains.length) qs("#emailHint").textContent = `Use your school email (${domains.map((d) => `@${d}`).join(" or ")}).`;
  const settings = await publicSettings();
  const catalog = await courses();
  const course = qs("#f-course");
  const major = qs("#f-major");
  const year = qs("#f-year_level");
  for (const level of settings.year_levels ?? []) year.append(new Option(level, level));
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
  const username = qs("#f-username");
  const password = qs("#f-password");
  const confirm = qs("#f-confirm");
  const verdict = watchPassword(password, "pwMeter", () => [username.value, email.value.split("@")[0] ?? ""]);
  const hint = qs("#usernameHint");
  let nameFree = false;
  const checkName = debounce(async () => {
    const value = username.value.trim();
    if (!USERNAME.test(value)) {
      nameFree = false;
      return;
    }
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
  password.addEventListener("blur", () => {
    const v = verdict();
    setFieldError(form, "password", password.value && v.problems.length ? v.problems[0] : "");
  });
  const matchCheck = () => {
    const hintEl = qs("#confirmHint");
    if (!confirm.value) {
      hintEl.textContent = "Type it again so we know it is right.";
      return setFieldError(form, "confirm", "");
    }
    const same = confirm.value === password.value;
    hintEl.textContent = same ? "Matches." : "";
    setFieldError(form, "confirm", same ? "" : "The passwords do not match yet.");
  };
  confirm.addEventListener("input", matchCheck);
  password.addEventListener("input", () => confirm.value && matchCheck());
  qs("#f-phone").addEventListener("blur", (e) => {
    const value = e.target.value.replace(/[\s-]/g, "");
    setFieldError(form, "phone", !value || PH_MOBILE.test(value) ? "" : "Use a Philippine mobile number, like 09171234567.");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    const data = formData(form);
    const pw = password.value;
    const problems = [];
    if (!USERNAME.test(data.username ?? "")) problems.push(["username", "Use 3 to 16 letters, numbers, dots, dashes or underscores."]);
    else if (!nameFree && !await usernameAvailable(data.username)) problems.push(["username", "That username is taken."]);
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
    if (!form.elements.namedItem("terms").checked) problems.push(["terms", "Please accept the terms to continue."]);
    problems.forEach(([name, message]) => setFieldError(form, name, message));
    if (problems.length) {
      form.querySelector(".is-invalid input, .is-invalid select")?.focus();
      return;
    }
    const chosen = catalog.find((c) => c.code === data.course);
    await busy(form.querySelector("button[type=submit]"), async () => {
      try {
        const ready = await register({
          email: data.email,
          password: pw,
          username: data.username,
          full_name: data.full_name,
          student_id: data.student_id,
          gender: data.gender,
          course: chosen?.program ?? "",
          major: data.major ?? "",
          college: chosen?.college ?? "",
          year_level: data.year_level ?? "",
          phone,
          terms_version: info.terms_version || settingText(settings, "terms_version", "1.0")
        });
        if (ready) {
          location.href = "/catalog";
          return;
        }
        form.hidden = true;
        showConfirm(data.email);
      } catch (error) {
        fail(friendly(error));
      }
    });
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL3JlZ2lzdGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBjb25maXJtU2lnbnVwQ29kZSwgcmVnaXN0ZXIsIHJlc2VuZFNpZ251cENvZGUsIHVzZXJuYW1lQXZhaWxhYmxlIH0gZnJvbSBcIi4uL2FwaS9hdXRoXCI7XHJcbmltcG9ydCB7IGNvdXJzZXMsIHB1YmxpY1NldHRpbmdzLCByZWdpc3RyYXRpb25JbmZvLCBzZXR0aW5nVGV4dCB9IGZyb20gXCIuLi9hcGkvY29udGVudFwiO1xyXG5pbXBvcnQgeyBib290IH0gZnJvbSBcIi4uL2NvcmUvYm9vdFwiO1xyXG5pbXBvcnQgeyBidXN5LCBkZWJvdW5jZSwgZm9ybURhdGEsIGh0bWwsIGljb24sIG1vdW50LCBxcyB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xyXG5pbXBvcnQgeyBmcmllbmRseSB9IGZyb20gXCIuLi9jb3JlL2Vycm9yc1wiO1xyXG5pbXBvcnQgeyBjaGVja1Bhc3N3b3JkLCB3YXRjaFBhc3N3b3JkIH0gZnJvbSBcIi4uL2NvcmUvcGFzc3dvcmRcIjtcclxuaW1wb3J0IHsgZmFpbCwgb2sgfSBmcm9tIFwiLi4vY29yZS90b2FzdFwiO1xyXG5pbXBvcnQgeyBjbGVhckVycm9ycywgc2V0RmllbGRFcnJvciB9IGZyb20gXCIuLi91aS9jb21wb25lbnRzXCI7XHJcbmltcG9ydCB0eXBlIHsgQ291cnNlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG5jb25zdCBVU0VSTkFNRSA9IC9eW0EtWmEtejAtOV1bQS1aYS16MC05XyAuLV17MiwxNX0kLztcclxuY29uc3QgUEhfTU9CSUxFID0gL14oPzpcXCs/NjN8MCk5XFxkezl9JC87XHJcblxyXG5jb25zdCBSRVNFTkRfU0VDT05EUyA9IDYwO1xyXG5cclxuLy8gc3RlcCAyIG9mIGpvaW5pbmc6IHRoZSA2LWRpZ2l0IGNvZGUgdGhhdCB3YXMgZW1haWxlZFxyXG5mdW5jdGlvbiBzaG93Q29uZmlybShlbWFpbDogc3RyaW5nKTogdm9pZCB7XHJcbiAgcXMoXCIjcmVnaXN0ZXJOb3RpY2VcIikuaW5uZXJIVE1MID0gaHRtbGBcclxuICAgIDxmb3JtIGNsYXNzPVwiZm9ybVwiIGlkPVwiY29uZmlybUZvcm1cIiBub3ZhbGlkYXRlPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtLXN1Y2Nlc3MgcHggcHgtLXN1Y2Nlc3NcIiByb2xlPVwic3RhdHVzXCI+JHtpY29uKFwibWFpbFwiKX08c3Bhbj5XZSBzZW50IGEgNi1kaWdpdCBjb2RlIHRvIDxzdHJvbmc+JHtlbWFpbH08L3N0cm9uZz4uIEl0IGNhbiB0YWtlIGEgbWludXRlLiBDaGVjayB5b3VyIHNwYW0gZm9sZGVyIHRvby48L3NwYW4+PC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiIGRhdGEtZmllbGQ9XCJjb2RlXCI+PGxhYmVsIGNsYXNzPVwiZmllbGRfX2xhYmVsXCIgZm9yPVwiZi1jb25maXJtLWNvZGVcIj42LWRpZ2l0IGNvZGU8L2xhYmVsPjxpbnB1dCBjbGFzcz1cImlucHV0IGlucHV0LS1jb2RlXCIgaWQ9XCJmLWNvbmZpcm0tY29kZVwiIG5hbWU9XCJjb2RlXCIgaW5wdXRtb2RlPVwibnVtZXJpY1wiIGF1dG9jb21wbGV0ZT1cIm9uZS10aW1lLWNvZGVcIiBtYXhsZW5ndGg9XCI2XCIgcGxhY2Vob2xkZXI9XCIwMDAwMDBcIiByZXF1aXJlZD48c3BhbiBjbGFzcz1cImZpZWxkX19lcnJvclwiPjwvc3Bhbj48L2Rpdj5cclxuICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLWJsb2NrXCIgdHlwZT1cInN1Ym1pdFwiPkNvbmZpcm0gbXkgZW1haWw8L2J1dHRvbj5cclxuICAgICAgPGRpdiBjbGFzcz1cImNsdXN0ZXIgY2x1c3Rlci0tYmV0d2VlblwiPjxidXR0b24gY2xhc3M9XCJsaW5rLWJ1dHRvblwiIHR5cGU9XCJidXR0b25cIiBpZD1cInJlc2VuZENvbmZpcm1cIiBkaXNhYmxlZD5SZXNlbmQgY29kZTwvYnV0dG9uPjxhIGNsYXNzPVwibGluay1idXR0b25cIiBocmVmPVwiL2xvZ2luXCI+SSBhbHJlYWR5IGNvbmZpcm1lZDwvYT48L2Rpdj5cclxuICAgIDwvZm9ybT5gLnZhbHVlO1xyXG4gIGNvbnN0IGNvbmZpcm1Gb3JtID0gcXM8SFRNTEZvcm1FbGVtZW50PihcIiNjb25maXJtRm9ybVwiKTtcclxuICBjb25zdCBpbnB1dCA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtY29uZmlybS1jb2RlXCIpO1xyXG4gIGNvbnN0IHJlc2VuZCA9IHFzPEhUTUxCdXR0b25FbGVtZW50PihcIiNyZXNlbmRDb25maXJtXCIpO1xyXG4gIGlucHV0LmZvY3VzKCk7XHJcbiAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHsgaW5wdXQudmFsdWUgPSBpbnB1dC52YWx1ZS5yZXBsYWNlKC9cXEQvZywgXCJcIikuc2xpY2UoMCwgNik7IH0pO1xyXG4gIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJwYXN0ZVwiLCAoZXZlbnQpID0+IHsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgaW5wdXQudmFsdWUgPSAoZXZlbnQuY2xpcGJvYXJkRGF0YT8uZ2V0RGF0YShcInRleHRcIikgPz8gXCJcIikucmVwbGFjZSgvXFxEL2csIFwiXCIpLnNsaWNlKDAsIDYpOyB9KTtcclxuXHJcbiAgbGV0IHRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCB1bmRlZmluZWQ7XHJcbiAgY29uc3Qgc3RhcnRUaW1lciA9ICgpID0+IHtcclxuICAgIGxldCBsZWZ0ID0gUkVTRU5EX1NFQ09ORFM7XHJcbiAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7IHJlc2VuZC50ZXh0Q29udGVudCA9IGxlZnQgPiAwID8gYFJlc2VuZCBjb2RlICgke2xlZnR9cylgIDogXCJSZXNlbmQgY29kZVwiOyByZXNlbmQuZGlzYWJsZWQgPSBsZWZ0ID4gMDsgaWYgKGxlZnQtLSA8PSAwKSBjbGVhckludGVydmFsKHRpbWVyKTsgfTtcclxuICAgIHRpY2soKTtcclxuICAgIHRpbWVyID0gc2V0SW50ZXJ2YWwodGljaywgMTAwMCk7XHJcbiAgfTtcclxuICBzdGFydFRpbWVyKCk7XHJcbiAgcmVzZW5kLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICB0cnkgeyBhd2FpdCByZXNlbmRTaWdudXBDb2RlKGVtYWlsKTsgb2soXCJBIG5ldyBjb2RlIHdhcyBzZW50LlwiKTsgc3RhcnRUaW1lcigpOyB9IGNhdGNoIChlcnJvcikgeyBmYWlsKGZyaWVuZGx5KGVycm9yKSk7IH1cclxuICB9KTtcclxuXHJcbiAgY29uZmlybUZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBjbGVhckVycm9ycyhjb25maXJtRm9ybSk7XHJcbiAgICBpZiAoaW5wdXQudmFsdWUubGVuZ3RoICE9PSA2KSByZXR1cm4gc2V0RmllbGRFcnJvcihjb25maXJtRm9ybSwgXCJjb2RlXCIsIFwiVHlwZSB0aGUgNiBkaWdpdHMgZnJvbSB0aGUgZW1haWwuXCIpO1xyXG4gICAgYXdhaXQgYnVzeShjb25maXJtRm9ybS5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uW3R5cGU9c3VibWl0XVwiKSwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGNvbmZpcm1TaWdudXBDb2RlKGVtYWlsLCBpbnB1dC52YWx1ZSk7XHJcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IFwiL2NhdGFsb2dcIjtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBzZXRGaWVsZEVycm9yKGNvbmZpcm1Gb3JtLCBcImNvZGVcIiwgL2V4cGlyZWR8aW52YWxpZHx0b2tlbi9pLnRlc3QoZnJpZW5kbHkoZXJyb3IpKSA/IFwiVGhhdCBjb2RlIGlzIHdyb25nIG9yIGhhcyBleHBpcmVkLiBDaGVjayBpdCBvciBhc2sgZm9yIGEgbmV3IG9uZS5cIiA6IGZyaWVuZGx5KGVycm9yKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5ib290KGFzeW5jICgpID0+IHtcclxuICBjb25zdCBmb3JtID0gcXM8SFRNTEZvcm1FbGVtZW50PihcIiNyZWdpc3RlckZvcm1cIik7XHJcbiAgY29uc3QgaW5mbyA9IGF3YWl0IHJlZ2lzdHJhdGlvbkluZm8oKTtcclxuICBpZiAoIWluZm8ub3Blbikge1xyXG4gICAgbW91bnQocXMoXCIjcmVnaXN0ZXJOb3RpY2VcIiksIGh0bWxgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LS13YXJuaW5nIHB4IHB4LS13YXJuaW5nXCI+UmVnaXN0cmF0aW9uIGlzIGNsb3NlZCByaWdodCBub3cuIFBsZWFzZSBjaGVjayBiYWNrIGxhdGVyIG9yIGFzayB0aGUgbGlicmFyeS48L2Rpdj5gKTtcclxuICAgIGZvcm0uaGlkZGVuID0gdHJ1ZTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY29uc3QgZG9tYWlucyA9IGluZm8uZG9tYWlucyA/PyBbXTtcclxuICBjb25zdCBlbWFpbCA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtZW1haWxcIik7XHJcbiAgaWYgKGRvbWFpbnMubGVuZ3RoKSBxcyhcIiNlbWFpbEhpbnRcIikudGV4dENvbnRlbnQgPSBgVXNlIHlvdXIgc2Nob29sIGVtYWlsICgke2RvbWFpbnMubWFwKChkKSA9PiBgQCR7ZH1gKS5qb2luKFwiIG9yIFwiKX0pLmA7XHJcblxyXG4gIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgcHVibGljU2V0dGluZ3MoKTtcclxuICBjb25zdCBjYXRhbG9nOiBDb3Vyc2VbXSA9IGF3YWl0IGNvdXJzZXMoKTtcclxuICBjb25zdCBjb3Vyc2UgPSBxczxIVE1MU2VsZWN0RWxlbWVudD4oXCIjZi1jb3Vyc2VcIik7XHJcbiAgY29uc3QgbWFqb3IgPSBxczxIVE1MU2VsZWN0RWxlbWVudD4oXCIjZi1tYWpvclwiKTtcclxuICBjb25zdCB5ZWFyID0gcXM8SFRNTFNlbGVjdEVsZW1lbnQ+KFwiI2YteWVhcl9sZXZlbFwiKTtcclxuICBmb3IgKGNvbnN0IGxldmVsIG9mIChzZXR0aW5ncy55ZWFyX2xldmVscyBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPz8gW10pIHllYXIuYXBwZW5kKG5ldyBPcHRpb24obGV2ZWwsIGxldmVsKSk7XHJcbiAgZm9yIChjb25zdCBjb2xsZWdlIG9mIFsuLi5uZXcgU2V0KGNhdGFsb2cubWFwKChjKSA9PiBjLmNvbGxlZ2UpKV0pIHtcclxuICAgIGNvbnN0IGdyb3VwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGdyb3VwXCIpO1xyXG4gICAgZ3JvdXAubGFiZWwgPSBjb2xsZWdlO1xyXG4gICAgZm9yIChjb25zdCBjIG9mIGNhdGFsb2cuZmlsdGVyKCh4KSA9PiB4LmNvbGxlZ2UgPT09IGNvbGxlZ2UpKSBncm91cC5hcHBlbmQobmV3IE9wdGlvbihjLnByb2dyYW0sIGMuY29kZSkpO1xyXG4gICAgY291cnNlLmFwcGVuZChncm91cCk7XHJcbiAgfVxyXG4gIGNvdXJzZS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgIGNvbnN0IGNob3NlbiA9IGNhdGFsb2cuZmluZCgoYykgPT4gYy5jb2RlID09PSBjb3Vyc2UudmFsdWUpO1xyXG4gICAgbWFqb3IucmVwbGFjZUNoaWxkcmVuKG5ldyBPcHRpb24oIWNob3NlbiA/IFwiQ2hvb3NlIGEgY291cnNlIGZpcnN0XCIgOiBjaG9zZW4ubWFqb3JzLmxlbmd0aCA/IFwiQ2hvb3NlLi4uXCIgOiBcIk5vIG1ham9yIGZvciB0aGlzIGNvdXJzZVwiLCBcIlwiKSk7XHJcbiAgICBtYWpvci5kaXNhYmxlZCA9ICEhY2hvc2VuICYmIGNob3Nlbi5tYWpvcnMubGVuZ3RoID09PSAwO1xyXG4gICAgZm9yIChjb25zdCBtIG9mIGNob3Nlbj8ubWFqb3JzID8/IFtdKSBtYWpvci5hcHBlbmQobmV3IE9wdGlvbihtLCBtKSk7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IHVzZXJuYW1lID0gcXM8SFRNTElucHV0RWxlbWVudD4oXCIjZi11c2VybmFtZVwiKTtcclxuICBjb25zdCBwYXNzd29yZCA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtcGFzc3dvcmRcIik7XHJcbiAgY29uc3QgY29uZmlybSA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtY29uZmlybVwiKTtcclxuICBjb25zdCB2ZXJkaWN0ID0gd2F0Y2hQYXNzd29yZChwYXNzd29yZCwgXCJwd01ldGVyXCIsICgpID0+IFt1c2VybmFtZS52YWx1ZSwgZW1haWwudmFsdWUuc3BsaXQoXCJAXCIpWzBdID8/IFwiXCJdKTtcclxuXHJcbiAgLy8gZWFjaCBmaWVsZCBzYXlzIHdoYXQgaXMgd3JvbmcgYXMgc29vbiBhcyB0aGUgcGVyc29uIGxlYXZlcyBpdFxyXG4gIGNvbnN0IGhpbnQgPSBxcyhcIiN1c2VybmFtZUhpbnRcIik7XHJcbiAgbGV0IG5hbWVGcmVlID0gZmFsc2U7XHJcbiAgY29uc3QgY2hlY2tOYW1lID0gZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgdmFsdWUgPSB1c2VybmFtZS52YWx1ZS50cmltKCk7XHJcbiAgICBpZiAoIVVTRVJOQU1FLnRlc3QodmFsdWUpKSB7IG5hbWVGcmVlID0gZmFsc2U7IHJldHVybjsgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgbmFtZUZyZWUgPSBhd2FpdCB1c2VybmFtZUF2YWlsYWJsZSh2YWx1ZSk7XHJcbiAgICAgIGhpbnQudGV4dENvbnRlbnQgPSBuYW1lRnJlZSA/IFwiTmljZSwgdGhhdCBuYW1lIGlzIGZyZWUuXCIgOiBcIlNvcnJ5LCBzb21lb25lIGFscmVhZHkgaGFzIHRoYXQgbmFtZS5cIjtcclxuICAgICAgc2V0RmllbGRFcnJvcihmb3JtLCBcInVzZXJuYW1lXCIsIG5hbWVGcmVlID8gXCJcIiA6IFwiVGhhdCB1c2VybmFtZSBpcyB0YWtlbi5cIik7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgaGludC50ZXh0Q29udGVudCA9IFwiQ291bGQgbm90IGNoZWNrIHRoZSBuYW1lIHJpZ2h0IG5vdy5cIjtcclxuICAgIH1cclxuICB9KTtcclxuICB1c2VybmFtZS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgY2hlY2tOYW1lKTtcclxuICB1c2VybmFtZS5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiBzZXRGaWVsZEVycm9yKGZvcm0sIFwidXNlcm5hbWVcIiwgVVNFUk5BTUUudGVzdCh1c2VybmFtZS52YWx1ZS50cmltKCkpIHx8ICF1c2VybmFtZS52YWx1ZSA/IFwiXCIgOiBcIlVzZSAzIHRvIDE2IGxldHRlcnMsIG51bWJlcnMsIGRvdHMsIGRhc2hlcyBvciB1bmRlcnNjb3Jlcy5cIikpO1xyXG4gIGVtYWlsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHtcclxuICAgIGNvbnN0IHZhbHVlID0gZW1haWwudmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAoIXZhbHVlKSByZXR1cm4gc2V0RmllbGRFcnJvcihmb3JtLCBcImVtYWlsXCIsIFwiXCIpO1xyXG4gICAgaWYgKCEvXlxcUytAXFxTK1xcLlxcUyskLy50ZXN0KHZhbHVlKSkgcmV0dXJuIHNldEZpZWxkRXJyb3IoZm9ybSwgXCJlbWFpbFwiLCBcIkVudGVyIGEgdmFsaWQgZW1haWwuXCIpO1xyXG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoICYmICFkb21haW5zLnNvbWUoKGQpID0+IHZhbHVlLmVuZHNXaXRoKGBAJHtkLnRvTG93ZXJDYXNlKCl9YCkpKSByZXR1cm4gc2V0RmllbGRFcnJvcihmb3JtLCBcImVtYWlsXCIsIGBQbGVhc2UgdXNlIHlvdXIgc2Nob29sIGVtYWlsICgke2RvbWFpbnMubWFwKChkKSA9PiBgQCR7ZH1gKS5qb2luKFwiIG9yIFwiKX0pLmApO1xyXG4gICAgc2V0RmllbGRFcnJvcihmb3JtLCBcImVtYWlsXCIsIFwiXCIpO1xyXG4gIH0pO1xyXG4gIHBhc3N3b3JkLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHsgY29uc3QgdiA9IHZlcmRpY3QoKTsgc2V0RmllbGRFcnJvcihmb3JtLCBcInBhc3N3b3JkXCIsIHBhc3N3b3JkLnZhbHVlICYmIHYucHJvYmxlbXMubGVuZ3RoID8gdi5wcm9ibGVtc1swXSA6IFwiXCIpOyB9KTtcclxuICBjb25zdCBtYXRjaENoZWNrID0gKCkgPT4ge1xyXG4gICAgY29uc3QgaGludEVsID0gcXMoXCIjY29uZmlybUhpbnRcIik7XHJcbiAgICBpZiAoIWNvbmZpcm0udmFsdWUpIHsgaGludEVsLnRleHRDb250ZW50ID0gXCJUeXBlIGl0IGFnYWluIHNvIHdlIGtub3cgaXQgaXMgcmlnaHQuXCI7IHJldHVybiBzZXRGaWVsZEVycm9yKGZvcm0sIFwiY29uZmlybVwiLCBcIlwiKTsgfVxyXG4gICAgY29uc3Qgc2FtZSA9IGNvbmZpcm0udmFsdWUgPT09IHBhc3N3b3JkLnZhbHVlO1xyXG4gICAgaGludEVsLnRleHRDb250ZW50ID0gc2FtZSA/IFwiTWF0Y2hlcy5cIiA6IFwiXCI7XHJcbiAgICBzZXRGaWVsZEVycm9yKGZvcm0sIFwiY29uZmlybVwiLCBzYW1lID8gXCJcIiA6IFwiVGhlIHBhc3N3b3JkcyBkbyBub3QgbWF0Y2ggeWV0LlwiKTtcclxuICB9O1xyXG4gIGNvbmZpcm0uYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIG1hdGNoQ2hlY2spO1xyXG4gIHBhc3N3b3JkLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiBjb25maXJtLnZhbHVlICYmIG1hdGNoQ2hlY2soKSk7XHJcbiAgcXM8SFRNTElucHV0RWxlbWVudD4oXCIjZi1waG9uZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoZSkgPT4ge1xyXG4gICAgY29uc3QgdmFsdWUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUucmVwbGFjZSgvW1xccy1dL2csIFwiXCIpO1xyXG4gICAgc2V0RmllbGRFcnJvcihmb3JtLCBcInBob25lXCIsICF2YWx1ZSB8fCBQSF9NT0JJTEUudGVzdCh2YWx1ZSkgPyBcIlwiIDogXCJVc2UgYSBQaGlsaXBwaW5lIG1vYmlsZSBudW1iZXIsIGxpa2UgMDkxNzEyMzQ1NjcuXCIpO1xyXG4gIH0pO1xyXG5cclxuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgY2xlYXJFcnJvcnMoZm9ybSk7XHJcbiAgICBjb25zdCBkYXRhID0gZm9ybURhdGEoZm9ybSk7XHJcbiAgICBjb25zdCBwdyA9IHBhc3N3b3JkLnZhbHVlO1xyXG4gICAgY29uc3QgcHJvYmxlbXM6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdO1xyXG4gICAgaWYgKCFVU0VSTkFNRS50ZXN0KGRhdGEudXNlcm5hbWUgPz8gXCJcIikpIHByb2JsZW1zLnB1c2goW1widXNlcm5hbWVcIiwgXCJVc2UgMyB0byAxNiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCBkYXNoZXMgb3IgdW5kZXJzY29yZXMuXCJdKTtcclxuICAgIGVsc2UgaWYgKCFuYW1lRnJlZSAmJiAhKGF3YWl0IHVzZXJuYW1lQXZhaWxhYmxlKGRhdGEudXNlcm5hbWUpKSkgcHJvYmxlbXMucHVzaChbXCJ1c2VybmFtZVwiLCBcIlRoYXQgdXNlcm5hbWUgaXMgdGFrZW4uXCJdKTtcclxuICAgIGlmICghL15cXFMrQFxcUytcXC5cXFMrJC8udGVzdChkYXRhLmVtYWlsID8/IFwiXCIpKSBwcm9ibGVtcy5wdXNoKFtcImVtYWlsXCIsIFwiRW50ZXIgYSB2YWxpZCBlbWFpbC5cIl0pO1xyXG4gICAgZWxzZSBpZiAoZG9tYWlucy5sZW5ndGggJiYgIWRvbWFpbnMuc29tZSgoZCkgPT4gZGF0YS5lbWFpbC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKGBAJHtkLnRvTG93ZXJDYXNlKCl9YCkpKSBwcm9ibGVtcy5wdXNoKFtcImVtYWlsXCIsIGBQbGVhc2UgdXNlIHlvdXIgc2Nob29sIGVtYWlsICgke2RvbWFpbnMubWFwKChkKSA9PiBgQCR7ZH1gKS5qb2luKFwiIG9yIFwiKX0pLmBdKTtcclxuICAgIGNvbnN0IHN0cmVuZ3RoID0gY2hlY2tQYXNzd29yZChwdywgZGF0YS51c2VybmFtZSA/PyBcIlwiLCAoZGF0YS5lbWFpbCA/PyBcIlwiKS5zcGxpdChcIkBcIilbMF0pO1xyXG4gICAgaWYgKHN0cmVuZ3RoLnByb2JsZW1zLmxlbmd0aCkgcHJvYmxlbXMucHVzaChbXCJwYXNzd29yZFwiLCBzdHJlbmd0aC5wcm9ibGVtc1swXV0pO1xyXG4gICAgaWYgKHB3ICE9PSBjb25maXJtLnZhbHVlKSBwcm9ibGVtcy5wdXNoKFtcImNvbmZpcm1cIiwgXCJUaGUgcGFzc3dvcmRzIGRvIG5vdCBtYXRjaC5cIl0pO1xyXG4gICAgaWYgKCFkYXRhLmZ1bGxfbmFtZSkgcHJvYmxlbXMucHVzaChbXCJmdWxsX25hbWVcIiwgXCJFbnRlciB5b3VyIGZ1bGwgbmFtZS5cIl0pO1xyXG4gICAgaWYgKCFkYXRhLnN0dWRlbnRfaWQpIHByb2JsZW1zLnB1c2goW1wic3R1ZGVudF9pZFwiLCBcIkVudGVyIHlvdXIgc3R1ZGVudCBJRC5cIl0pO1xyXG4gICAgaWYgKCFkYXRhLmdlbmRlcikgcHJvYmxlbXMucHVzaChbXCJnZW5kZXJcIiwgXCJDaG9vc2Ugb25lLlwiXSk7XHJcbiAgICBjb25zdCBwaG9uZSA9IChkYXRhLnBob25lID8/IFwiXCIpLnJlcGxhY2UoL1tcXHMtXS9nLCBcIlwiKTtcclxuICAgIGlmIChwaG9uZSAmJiAhUEhfTU9CSUxFLnRlc3QocGhvbmUpKSBwcm9ibGVtcy5wdXNoKFtcInBob25lXCIsIFwiVXNlIGEgUGhpbGlwcGluZSBtb2JpbGUgbnVtYmVyLCBsaWtlIDA5MTcxMjM0NTY3LlwiXSk7XHJcbiAgICBpZiAoIShmb3JtLmVsZW1lbnRzLm5hbWVkSXRlbShcInRlcm1zXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNoZWNrZWQpIHByb2JsZW1zLnB1c2goW1widGVybXNcIiwgXCJQbGVhc2UgYWNjZXB0IHRoZSB0ZXJtcyB0byBjb250aW51ZS5cIl0pO1xyXG4gICAgcHJvYmxlbXMuZm9yRWFjaCgoW25hbWUsIG1lc3NhZ2VdKSA9PiBzZXRGaWVsZEVycm9yKGZvcm0sIG5hbWUsIG1lc3NhZ2UpKTtcclxuICAgIGlmIChwcm9ibGVtcy5sZW5ndGgpIHsgZm9ybS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi5pcy1pbnZhbGlkIGlucHV0LCAuaXMtaW52YWxpZCBzZWxlY3RcIik/LmZvY3VzKCk7IHJldHVybjsgfVxyXG5cclxuICAgIGNvbnN0IGNob3NlbiA9IGNhdGFsb2cuZmluZCgoYykgPT4gYy5jb2RlID09PSBkYXRhLmNvdXJzZSk7XHJcbiAgICBhd2FpdCBidXN5KGZvcm0ucXVlcnlTZWxlY3RvcihcImJ1dHRvblt0eXBlPXN1Ym1pdF1cIiksIGFzeW5jICgpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZWFkeSA9IGF3YWl0IHJlZ2lzdGVyKHtcclxuICAgICAgICAgIGVtYWlsOiBkYXRhLmVtYWlsLCBwYXNzd29yZDogcHcsIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lLCBmdWxsX25hbWU6IGRhdGEuZnVsbF9uYW1lLCBzdHVkZW50X2lkOiBkYXRhLnN0dWRlbnRfaWQsXHJcbiAgICAgICAgICBnZW5kZXI6IGRhdGEuZ2VuZGVyLCBjb3Vyc2U6IGNob3Nlbj8ucHJvZ3JhbSA/PyBcIlwiLCBtYWpvcjogZGF0YS5tYWpvciA/PyBcIlwiLCBjb2xsZWdlOiBjaG9zZW4/LmNvbGxlZ2UgPz8gXCJcIixcclxuICAgICAgICAgIHllYXJfbGV2ZWw6IGRhdGEueWVhcl9sZXZlbCA/PyBcIlwiLCBwaG9uZSwgdGVybXNfdmVyc2lvbjogaW5mby50ZXJtc192ZXJzaW9uIHx8IHNldHRpbmdUZXh0KHNldHRpbmdzLCBcInRlcm1zX3ZlcnNpb25cIiwgXCIxLjBcIiksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKHJlYWR5KSB7IGxvY2F0aW9uLmhyZWYgPSBcIi9jYXRhbG9nXCI7IHJldHVybjsgfVxyXG4gICAgICAgIGZvcm0uaGlkZGVuID0gdHJ1ZTtcclxuICAgICAgICBzaG93Q29uZmlybShkYXRhLmVtYWlsKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBmYWlsKGZyaWVuZGx5KGVycm9yKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQU0sV0FBVztBQUNqQixJQUFNLFlBQVk7QUFFbEIsSUFBTSxpQkFBaUI7QUFHdkIsU0FBUyxZQUFZLE9BQXFCO0FBQ3hDLEtBQUcsaUJBQWlCLEVBQUUsWUFBWTtBQUFBO0FBQUEsdUVBRW1DLEtBQUssTUFBTSxDQUFDLDJDQUEyQyxLQUFLO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFJdEg7QUFDWCxRQUFNLGNBQWMsR0FBb0IsY0FBYztBQUN0RCxRQUFNLFFBQVEsR0FBcUIsaUJBQWlCO0FBQ3BELFFBQU0sU0FBUyxHQUFzQixnQkFBZ0I7QUFDckQsUUFBTSxNQUFNO0FBQ1osUUFBTSxpQkFBaUIsU0FBUyxNQUFNO0FBQUUsVUFBTSxRQUFRLE1BQU0sTUFBTSxRQUFRLE9BQU8sRUFBRSxFQUFFLE1BQU0sR0FBRyxDQUFDO0FBQUEsRUFBRyxDQUFDO0FBQ25HLFFBQU0saUJBQWlCLFNBQVMsQ0FBQyxVQUFVO0FBQUUsVUFBTSxlQUFlO0FBQUcsVUFBTSxTQUFTLE1BQU0sZUFBZSxRQUFRLE1BQU0sS0FBSyxJQUFJLFFBQVEsT0FBTyxFQUFFLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFBQSxFQUFHLENBQUM7QUFFakssTUFBSTtBQUNKLFFBQU0sYUFBYSxNQUFNO0FBQ3ZCLFFBQUksT0FBTztBQUNYLGtCQUFjLEtBQUs7QUFD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
