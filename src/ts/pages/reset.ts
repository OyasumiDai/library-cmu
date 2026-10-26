// Forgot password, in three steps inside one card:
//   1. email  ->  2. the 6-digit code from the email + a new password  ->  3. done.
// Supabase sends the code (its "Reset password" email template must show {{ .Token }}, see the README).
// The reply is the same whether or not the email has an account, so this cannot be used to find registered emails.
import { sendResetEmail, setPassword, verifyResetCode } from "../api/auth";
import { boot } from "../core/boot";
import { busy, formData, html, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { checkPassword, watchPassword } from "../core/password";
import { db } from "../core/supabase";
import { fail } from "../core/toast";
import { clearErrors, setFieldError } from "../ui/components";
import { clearFailures } from "../core/lockout";

const RESEND_SECONDS = 60;

const TEXT: Record<number, [string, string]> = {
  1: ["Forgot your password?", "Enter your email and we will send you a 6-digit code."],
  2: ["Check your email", "Type the 6-digit code and choose a new password. The code works for 15 minutes."],
  3: ["All done", "You can sign in with your new password."],
};

boot(({ params }) => {
  const stepEmail = qs<HTMLFormElement>("#stepEmail");
  const stepCode = qs<HTMLFormElement>("#stepCode");
  const stepDone = qs("#stepDone");
  const emailInput = qs<HTMLInputElement>("#f-email");
  const codeInput = qs<HTMLInputElement>("#f-code");
  const resend = qs<HTMLButtonElement>("#resend");
  const newPassword = qs<HTMLInputElement>("#f-new");
  const verdict = watchPassword(newPassword, "pwMeter", () => [emailInput.value.split("@")[0] ?? ""]);
  let email = "";
  let recovered = false; // came from an email link: already verified, no code needed

  const show = (step: 1 | 2 | 3) => {
    stepEmail.hidden = step !== 1;
    stepCode.hidden = step !== 2;
    stepDone.hidden = step !== 3;
    qs("#resetTitle").textContent = TEXT[step][0];
    qs("#resetLead").textContent = TEXT[step][1];
    document.querySelectorAll<HTMLElement>(".steps-dots li").forEach((dot) => {
      const n = Number(dot.dataset.step);
      dot.classList.toggle("is-current", n === step);
      dot.classList.toggle("is-done", n < step);
    });
    mount(qs("#resetNotice"), html``);
  };

  // "Resend code" waits 60 seconds
  let timer: ReturnType<typeof setInterval> | undefined;
  const startResendTimer = () => {
    let left = RESEND_SECONDS;
    clearInterval(timer);
    resend.disabled = true;
    const tick = () => {
      resend.textContent = left > 0 ? `Resend code (${left}s)` : "Resend code";
      resend.disabled = left > 0;
      if (left-- <= 0) clearInterval(timer);
    };
    tick();
    timer = setInterval(tick, 1000);
  };

  const sendCode = async (): Promise<boolean> => {
    try {
      await sendResetEmail(email);
      return true;
    } catch (error) {
      fail(friendly(error));
      return false;
    }
  };

  stepEmail.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(stepEmail);
    const data = formData(stepEmail);
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) return setFieldError(stepEmail, "email", "Enter your email.");
    email = data.email.toLowerCase();
    await busy(stepEmail.querySelector("button[type=submit]"), async () => {
      if (!(await sendCode())) return;
      show(2);
      qs("#codeHint").textContent = `If ${email} has an account, a code is on its way.`;
      startResendTimer();
      codeInput.focus();
    });
  });

  // the code box takes digits only, including a pasted code
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6); });
  codeInput.addEventListener("paste", (event) => {
    event.preventDefault();
    codeInput.value = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
  });

  resend.addEventListener("click", async () => {
    if (await sendCode()) { startResendTimer(); qs("#codeHint").textContent = "A new code was sent."; }
  });
  qs("#otherEmail").addEventListener("click", () => { recovered = false; show(1); emailInput.focus(); });

  stepCode.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(stepCode);
    const password = newPassword.value;
    const confirm = (stepCode.elements.namedItem("confirm") as HTMLInputElement).value;
    if (!recovered && codeInput.value.length !== 6) return setFieldError(stepCode, "code", "Type the 6 digits from the email.");
    const strength = checkPassword(password, email.split("@")[0]);
    if (strength.problems.length) return setFieldError(stepCode, "password", strength.problems[0]);
    if (password !== confirm) return setFieldError(stepCode, "confirm", "The passwords do not match.");
    await busy(stepCode.querySelector("button[type=submit]"), async () => {
      try {
        if (!recovered) await verifyResetCode(email, codeInput.value);
        await setPassword(password);
        await db().auth.signOut({ scope: "global" }); // other devices sign out too
        if (email) clearFailures(email); // a reset also lifts any sign-in lock
        show(3);
      } catch (error) {
        const message = String((error as Error).message ?? "");
        if (/expired|invalid|token/i.test(message)) setFieldError(stepCode, "code", "That code is wrong or has expired. Check it or ask for a new one.");
        else fail(friendly(error));
      }
    });
  });
  void verdict;

  // someone who clicked the link in the email lands here already verified: skip straight to the new password
  db().auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recovered = true;
      show(2);
      stepCode.querySelector<HTMLElement>('[data-field="code"]')!.hidden = true;
      resend.hidden = true;
    }
  });
  if (/type=recovery/.test(location.hash) || params.get("code")) recovered = true;
});
