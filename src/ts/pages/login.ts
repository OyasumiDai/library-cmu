import { signIn } from "../api/auth";
import { boot } from "../core/boot";
import { busy, formData, html, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { clearFailures, countdown, MAX_TRIES, recordFailure, secondsLocked, triesLeft } from "../core/lockout";
import { homeFor } from "../core/session";
import { fail } from "../core/toast";
import { clearErrors, setFieldError } from "../ui/components";

const REMEMBER = "cmu-remember-email";

// only same-site paths are honoured, so a crafted ?next= cannot send people elsewhere
const safeNext = (value: string | null, fallback: string): string => (value && /^\/[A-Za-z0-9/_-]*(\?.*)?$/.test(value) && !value.startsWith("//") ? value : fallback);

boot(({ params }) => {
  const form = qs<HTMLFormElement>("#loginForm");
  const emailInput = qs<HTMLInputElement>("#f-email");
  const password = qs<HTMLInputElement>("#f-password");
  const remember = qs<HTMLInputElement>("#remember");
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const notice = qs("#loginNotice");

  try {
    const saved = localStorage.getItem(REMEMBER);
    if (saved) { emailInput.value = saved; remember.checked = true; }
  } catch { /* private mode */ }

  if (params.get("reset") === "done") mount(notice, html`<div class="alert alert--success px px--success">Password changed. Sign in with the new one.</div>`);
  else if (params.get("expired")) mount(notice, html`<div class="alert alert--warning px px--warning" role="alert">Your session ended to keep your account safe. Please sign in again.</div>`);
  else if (params.get("next")) mount(notice, html`<div class="alert px">Please sign in to continue. You will go back to where you were.</div>`);

  qs("#showPassword").addEventListener("click", () => {
    password.type = password.type === "password" ? "text" : "password";
  });

  // while locked, the button is off and a live countdown shows how long is left
  let timer: ReturnType<typeof setInterval> | undefined;
  const showLock = () => {
    const left = secondsLocked(emailInput.value);
    if (left <= 0) {
      clearInterval(timer);
      submit.disabled = false;
      if (notice.querySelector("[data-lock]")) mount(notice, html``);
      return;
    }
    submit.disabled = true;
    mount(notice, html`<div class="alert alert--danger px px--danger" data-lock role="alert"><span>Too many wrong passwords for this email. You can try again in <strong>${countdown(left)}</strong>.</span></div>`);
  };
  const startLock = () => {
    clearInterval(timer);
    showLock();
    if (secondsLocked(emailInput.value) > 0) timer = setInterval(showLock, 1000);
  };
  emailInput.addEventListener("input", startLock);
  startLock();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (secondsLocked(emailInput.value) > 0) return startLock();
    clearErrors(form);
    const data = formData(form);
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) return setFieldError(form, "email", "Enter your email.");
    if (!password.value) return setFieldError(form, "password", "Enter your password.");
    await busy(submit, async () => {
      try {
        const profile = await signIn(data.email, password.value);
        clearFailures(data.email);
        try {
          if (remember.checked) localStorage.setItem(REMEMBER, data.email);
          else localStorage.removeItem(REMEMBER);
        } catch { /* private mode */ }
        // staff go to their dashboard even when the way back points at the student catalog
        const next = profile && profile.role !== "student" && /^\/catalog\/?$/.test(params.get("next") ?? "") ? null : params.get("next");
        location.href = safeNext(next, homeFor(profile));
      } catch (error) {
        // only a wrong email or password counts; a network problem is not the person's fault
        if (/Invalid login credentials/i.test((error as Error).message ?? "")) {
          if (recordFailure(data.email) > 0) return startLock();
          const left = triesLeft(data.email);
          return fail(`That email and password do not match. ${left} ${left === 1 ? "try" : "tries"} left of ${MAX_TRIES}.`);
        }
        fail(friendly(error));
      }
    });
  });
});
