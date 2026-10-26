import {
  checkPassword,
  watchPassword
} from "./chunks/chunk-CPZZQ3RM.js";
import {
  clearFailures
} from "./chunks/chunk-SDS6BPQN.js";
import {
  clearErrors,
  setFieldError
} from "./chunks/chunk-YFDTB4J4.js";
import {
  boot,
  busy,
  db,
  fail,
  formData,
  friendly,
  html,
  mount,
  qs,
  sendResetEmail,
  setPassword,
  verifyResetCode
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/reset.ts
var RESEND_SECONDS = 60;
var TEXT = {
  1: ["Forgot your password?", "Enter your email and we will send you a 6-digit code."],
  2: ["Check your email", "Type the 6-digit code and choose a new password. The code works for 15 minutes."],
  3: ["All done", "You can sign in with your new password."]
};
boot(({ params }) => {
  const stepEmail = qs("#stepEmail");
  const stepCode = qs("#stepCode");
  const stepDone = qs("#stepDone");
  const emailInput = qs("#f-email");
  const codeInput = qs("#f-code");
  const resend = qs("#resend");
  const newPassword = qs("#f-new");
  const verdict = watchPassword(newPassword, "pwMeter", () => [emailInput.value.split("@")[0] ?? ""]);
  let email = "";
  let recovered = false;
  const show = (step) => {
    stepEmail.hidden = step !== 1;
    stepCode.hidden = step !== 2;
    stepDone.hidden = step !== 3;
    qs("#resetTitle").textContent = TEXT[step][0];
    qs("#resetLead").textContent = TEXT[step][1];
    document.querySelectorAll(".steps-dots li").forEach((dot) => {
      const n = Number(dot.dataset.step);
      dot.classList.toggle("is-current", n === step);
      dot.classList.toggle("is-done", n < step);
    });
    mount(qs("#resetNotice"), html``);
  };
  let timer;
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
    timer = setInterval(tick, 1e3);
  };
  const sendCode = async () => {
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
      if (!await sendCode()) return;
      show(2);
      qs("#codeHint").textContent = `If ${email} has an account, a code is on its way.`;
      startResendTimer();
      codeInput.focus();
    });
  });
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
  });
  codeInput.addEventListener("paste", (event) => {
    event.preventDefault();
    codeInput.value = (event.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
  });
  resend.addEventListener("click", async () => {
    if (await sendCode()) {
      startResendTimer();
      qs("#codeHint").textContent = "A new code was sent.";
    }
  });
  qs("#otherEmail").addEventListener("click", () => {
    recovered = false;
    show(1);
    emailInput.focus();
  });
  stepCode.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(stepCode);
    const password = newPassword.value;
    const confirm = stepCode.elements.namedItem("confirm").value;
    if (!recovered && codeInput.value.length !== 6) return setFieldError(stepCode, "code", "Type the 6 digits from the email.");
    const strength = checkPassword(password, email.split("@")[0]);
    if (strength.problems.length) return setFieldError(stepCode, "password", strength.problems[0]);
    if (password !== confirm) return setFieldError(stepCode, "confirm", "The passwords do not match.");
    await busy(stepCode.querySelector("button[type=submit]"), async () => {
      try {
        if (!recovered) await verifyResetCode(email, codeInput.value);
        await setPassword(password);
        await db().auth.signOut({ scope: "global" });
        if (email) clearFailures(email);
        show(3);
      } catch (error) {
        const message = String(error.message ?? "");
        if (/expired|invalid|token/i.test(message)) setFieldError(stepCode, "code", "That code is wrong or has expired. Check it or ask for a new one.");
        else fail(friendly(error));
      }
    });
  });
  db().auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recovered = true;
      show(2);
      stepCode.querySelector('[data-field="code"]').hidden = true;
      resend.hidden = true;
    }
  });
  if (/type=recovery/.test(location.hash) || params.get("code")) recovered = true;
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL3Jlc2V0LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBGb3Jnb3QgcGFzc3dvcmQsIGluIHRocmVlIHN0ZXBzIGluc2lkZSBvbmUgY2FyZDpcbi8vICAgMS4gZW1haWwgIC0+ICAyLiB0aGUgNi1kaWdpdCBjb2RlIGZyb20gdGhlIGVtYWlsICsgYSBuZXcgcGFzc3dvcmQgIC0+ICAzLiBkb25lLlxuLy8gU3VwYWJhc2Ugc2VuZHMgdGhlIGNvZGUgKGl0cyBcIlJlc2V0IHBhc3N3b3JkXCIgZW1haWwgdGVtcGxhdGUgbXVzdCBzaG93IHt7IC5Ub2tlbiB9fSwgc2VlIHRoZSBSRUFETUUpLlxuLy8gVGhlIHJlcGx5IGlzIHRoZSBzYW1lIHdoZXRoZXIgb3Igbm90IHRoZSBlbWFpbCBoYXMgYW4gYWNjb3VudCwgc28gdGhpcyBjYW5ub3QgYmUgdXNlZCB0byBmaW5kIHJlZ2lzdGVyZWQgZW1haWxzLlxuaW1wb3J0IHsgc2VuZFJlc2V0RW1haWwsIHNldFBhc3N3b3JkLCB2ZXJpZnlSZXNldENvZGUgfSBmcm9tIFwiLi4vYXBpL2F1dGhcIjtcbmltcG9ydCB7IGJvb3QgfSBmcm9tIFwiLi4vY29yZS9ib290XCI7XG5pbXBvcnQgeyBidXN5LCBmb3JtRGF0YSwgaHRtbCwgbW91bnQsIHFzIH0gZnJvbSBcIi4uL2NvcmUvZG9tXCI7XG5pbXBvcnQgeyBmcmllbmRseSB9IGZyb20gXCIuLi9jb3JlL2Vycm9yc1wiO1xuaW1wb3J0IHsgY2hlY2tQYXNzd29yZCwgd2F0Y2hQYXNzd29yZCB9IGZyb20gXCIuLi9jb3JlL3Bhc3N3b3JkXCI7XG5pbXBvcnQgeyBkYiB9IGZyb20gXCIuLi9jb3JlL3N1cGFiYXNlXCI7XG5pbXBvcnQgeyBmYWlsIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcbmltcG9ydCB7IGNsZWFyRXJyb3JzLCBzZXRGaWVsZEVycm9yIH0gZnJvbSBcIi4uL3VpL2NvbXBvbmVudHNcIjtcbmltcG9ydCB7IGNsZWFyRmFpbHVyZXMgfSBmcm9tIFwiLi4vY29yZS9sb2Nrb3V0XCI7XG5cbmNvbnN0IFJFU0VORF9TRUNPTkRTID0gNjA7XG5cbmNvbnN0IFRFWFQ6IFJlY29yZDxudW1iZXIsIFtzdHJpbmcsIHN0cmluZ10+ID0ge1xuICAxOiBbXCJGb3Jnb3QgeW91ciBwYXNzd29yZD9cIiwgXCJFbnRlciB5b3VyIGVtYWlsIGFuZCB3ZSB3aWxsIHNlbmQgeW91IGEgNi1kaWdpdCBjb2RlLlwiXSxcbiAgMjogW1wiQ2hlY2sgeW91ciBlbWFpbFwiLCBcIlR5cGUgdGhlIDYtZGlnaXQgY29kZSBhbmQgY2hvb3NlIGEgbmV3IHBhc3N3b3JkLiBUaGUgY29kZSB3b3JrcyBmb3IgMTUgbWludXRlcy5cIl0sXG4gIDM6IFtcIkFsbCBkb25lXCIsIFwiWW91IGNhbiBzaWduIGluIHdpdGggeW91ciBuZXcgcGFzc3dvcmQuXCJdLFxufTtcblxuYm9vdCgoeyBwYXJhbXMgfSkgPT4ge1xuICBjb25zdCBzdGVwRW1haWwgPSBxczxIVE1MRm9ybUVsZW1lbnQ+KFwiI3N0ZXBFbWFpbFwiKTtcbiAgY29uc3Qgc3RlcENvZGUgPSBxczxIVE1MRm9ybUVsZW1lbnQ+KFwiI3N0ZXBDb2RlXCIpO1xuICBjb25zdCBzdGVwRG9uZSA9IHFzKFwiI3N0ZXBEb25lXCIpO1xuICBjb25zdCBlbWFpbElucHV0ID0gcXM8SFRNTElucHV0RWxlbWVudD4oXCIjZi1lbWFpbFwiKTtcbiAgY29uc3QgY29kZUlucHV0ID0gcXM8SFRNTElucHV0RWxlbWVudD4oXCIjZi1jb2RlXCIpO1xuICBjb25zdCByZXNlbmQgPSBxczxIVE1MQnV0dG9uRWxlbWVudD4oXCIjcmVzZW5kXCIpO1xuICBjb25zdCBuZXdQYXNzd29yZCA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI2YtbmV3XCIpO1xuICBjb25zdCB2ZXJkaWN0ID0gd2F0Y2hQYXNzd29yZChuZXdQYXNzd29yZCwgXCJwd01ldGVyXCIsICgpID0+IFtlbWFpbElucHV0LnZhbHVlLnNwbGl0KFwiQFwiKVswXSA/PyBcIlwiXSk7XG4gIGxldCBlbWFpbCA9IFwiXCI7XG4gIGxldCByZWNvdmVyZWQgPSBmYWxzZTsgLy8gY2FtZSBmcm9tIGFuIGVtYWlsIGxpbms6IGFscmVhZHkgdmVyaWZpZWQsIG5vIGNvZGUgbmVlZGVkXG5cbiAgY29uc3Qgc2hvdyA9IChzdGVwOiAxIHwgMiB8IDMpID0+IHtcbiAgICBzdGVwRW1haWwuaGlkZGVuID0gc3RlcCAhPT0gMTtcbiAgICBzdGVwQ29kZS5oaWRkZW4gPSBzdGVwICE9PSAyO1xuICAgIHN0ZXBEb25lLmhpZGRlbiA9IHN0ZXAgIT09IDM7XG4gICAgcXMoXCIjcmVzZXRUaXRsZVwiKS50ZXh0Q29udGVudCA9IFRFWFRbc3RlcF1bMF07XG4gICAgcXMoXCIjcmVzZXRMZWFkXCIpLnRleHRDb250ZW50ID0gVEVYVFtzdGVwXVsxXTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIi5zdGVwcy1kb3RzIGxpXCIpLmZvckVhY2goKGRvdCkgPT4ge1xuICAgICAgY29uc3QgbiA9IE51bWJlcihkb3QuZGF0YXNldC5zdGVwKTtcbiAgICAgIGRvdC5jbGFzc0xpc3QudG9nZ2xlKFwiaXMtY3VycmVudFwiLCBuID09PSBzdGVwKTtcbiAgICAgIGRvdC5jbGFzc0xpc3QudG9nZ2xlKFwiaXMtZG9uZVwiLCBuIDwgc3RlcCk7XG4gICAgfSk7XG4gICAgbW91bnQocXMoXCIjcmVzZXROb3RpY2VcIiksIGh0bWxgYCk7XG4gIH07XG5cbiAgLy8gXCJSZXNlbmQgY29kZVwiIHdhaXRzIDYwIHNlY29uZHNcbiAgbGV0IHRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHN0YXJ0UmVzZW5kVGltZXIgPSAoKSA9PiB7XG4gICAgbGV0IGxlZnQgPSBSRVNFTkRfU0VDT05EUztcbiAgICBjbGVhckludGVydmFsKHRpbWVyKTtcbiAgICByZXNlbmQuZGlzYWJsZWQgPSB0cnVlO1xuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICByZXNlbmQudGV4dENvbnRlbnQgPSBsZWZ0ID4gMCA/IGBSZXNlbmQgY29kZSAoJHtsZWZ0fXMpYCA6IFwiUmVzZW5kIGNvZGVcIjtcbiAgICAgIHJlc2VuZC5kaXNhYmxlZCA9IGxlZnQgPiAwO1xuICAgICAgaWYgKGxlZnQtLSA8PSAwKSBjbGVhckludGVydmFsKHRpbWVyKTtcbiAgICB9O1xuICAgIHRpY2soKTtcbiAgICB0aW1lciA9IHNldEludGVydmFsKHRpY2ssIDEwMDApO1xuICB9O1xuXG4gIGNvbnN0IHNlbmRDb2RlID0gYXN5bmMgKCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kUmVzZXRFbWFpbChlbWFpbCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZmFpbChmcmllbmRseShlcnJvcikpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBzdGVwRW1haWwuYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCBhc3luYyAoZXZlbnQpID0+IHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNsZWFyRXJyb3JzKHN0ZXBFbWFpbCk7XG4gICAgY29uc3QgZGF0YSA9IGZvcm1EYXRhKHN0ZXBFbWFpbCk7XG4gICAgaWYgKCEvXlxcUytAXFxTK1xcLlxcUyskLy50ZXN0KGRhdGEuZW1haWwgPz8gXCJcIikpIHJldHVybiBzZXRGaWVsZEVycm9yKHN0ZXBFbWFpbCwgXCJlbWFpbFwiLCBcIkVudGVyIHlvdXIgZW1haWwuXCIpO1xuICAgIGVtYWlsID0gZGF0YS5lbWFpbC50b0xvd2VyQ2FzZSgpO1xuICAgIGF3YWl0IGJ1c3koc3RlcEVtYWlsLnF1ZXJ5U2VsZWN0b3IoXCJidXR0b25bdHlwZT1zdWJtaXRdXCIpLCBhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIShhd2FpdCBzZW5kQ29kZSgpKSkgcmV0dXJuO1xuICAgICAgc2hvdygyKTtcbiAgICAgIHFzKFwiI2NvZGVIaW50XCIpLnRleHRDb250ZW50ID0gYElmICR7ZW1haWx9IGhhcyBhbiBhY2NvdW50LCBhIGNvZGUgaXMgb24gaXRzIHdheS5gO1xuICAgICAgc3RhcnRSZXNlbmRUaW1lcigpO1xuICAgICAgY29kZUlucHV0LmZvY3VzKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHRoZSBjb2RlIGJveCB0YWtlcyBkaWdpdHMgb25seSwgaW5jbHVkaW5nIGEgcGFzdGVkIGNvZGVcbiAgY29kZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7IGNvZGVJbnB1dC52YWx1ZSA9IGNvZGVJbnB1dC52YWx1ZS5yZXBsYWNlKC9cXEQvZywgXCJcIikuc2xpY2UoMCwgNik7IH0pO1xuICBjb2RlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcInBhc3RlXCIsIChldmVudCkgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29kZUlucHV0LnZhbHVlID0gKGV2ZW50LmNsaXBib2FyZERhdGE/LmdldERhdGEoXCJ0ZXh0XCIpID8/IFwiXCIpLnJlcGxhY2UoL1xcRC9nLCBcIlwiKS5zbGljZSgwLCA2KTtcbiAgfSk7XG5cbiAgcmVzZW5kLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gICAgaWYgKGF3YWl0IHNlbmRDb2RlKCkpIHsgc3RhcnRSZXNlbmRUaW1lcigpOyBxcyhcIiNjb2RlSGludFwiKS50ZXh0Q29udGVudCA9IFwiQSBuZXcgY29kZSB3YXMgc2VudC5cIjsgfVxuICB9KTtcbiAgcXMoXCIjb3RoZXJFbWFpbFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyByZWNvdmVyZWQgPSBmYWxzZTsgc2hvdygxKTsgZW1haWxJbnB1dC5mb2N1cygpOyB9KTtcblxuICBzdGVwQ29kZS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY2xlYXJFcnJvcnMoc3RlcENvZGUpO1xuICAgIGNvbnN0IHBhc3N3b3JkID0gbmV3UGFzc3dvcmQudmFsdWU7XG4gICAgY29uc3QgY29uZmlybSA9IChzdGVwQ29kZS5lbGVtZW50cy5uYW1lZEl0ZW0oXCJjb25maXJtXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgIGlmICghcmVjb3ZlcmVkICYmIGNvZGVJbnB1dC52YWx1ZS5sZW5ndGggIT09IDYpIHJldHVybiBzZXRGaWVsZEVycm9yKHN0ZXBDb2RlLCBcImNvZGVcIiwgXCJUeXBlIHRoZSA2IGRpZ2l0cyBmcm9tIHRoZSBlbWFpbC5cIik7XG4gICAgY29uc3Qgc3RyZW5ndGggPSBjaGVja1Bhc3N3b3JkKHBhc3N3b3JkLCBlbWFpbC5zcGxpdChcIkBcIilbMF0pO1xuICAgIGlmIChzdHJlbmd0aC5wcm9ibGVtcy5sZW5ndGgpIHJldHVybiBzZXRGaWVsZEVycm9yKHN0ZXBDb2RlLCBcInBhc3N3b3JkXCIsIHN0cmVuZ3RoLnByb2JsZW1zWzBdKTtcbiAgICBpZiAocGFzc3dvcmQgIT09IGNvbmZpcm0pIHJldHVybiBzZXRGaWVsZEVycm9yKHN0ZXBDb2RlLCBcImNvbmZpcm1cIiwgXCJUaGUgcGFzc3dvcmRzIGRvIG5vdCBtYXRjaC5cIik7XG4gICAgYXdhaXQgYnVzeShzdGVwQ29kZS5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uW3R5cGU9c3VibWl0XVwiKSwgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFyZWNvdmVyZWQpIGF3YWl0IHZlcmlmeVJlc2V0Q29kZShlbWFpbCwgY29kZUlucHV0LnZhbHVlKTtcbiAgICAgICAgYXdhaXQgc2V0UGFzc3dvcmQocGFzc3dvcmQpO1xuICAgICAgICBhd2FpdCBkYigpLmF1dGguc2lnbk91dCh7IHNjb3BlOiBcImdsb2JhbFwiIH0pOyAvLyBvdGhlciBkZXZpY2VzIHNpZ24gb3V0IHRvb1xuICAgICAgICBpZiAoZW1haWwpIGNsZWFyRmFpbHVyZXMoZW1haWwpOyAvLyBhIHJlc2V0IGFsc28gbGlmdHMgYW55IHNpZ24taW4gbG9ja1xuICAgICAgICBzaG93KDMpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IFN0cmluZygoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgPz8gXCJcIik7XG4gICAgICAgIGlmICgvZXhwaXJlZHxpbnZhbGlkfHRva2VuL2kudGVzdChtZXNzYWdlKSkgc2V0RmllbGRFcnJvcihzdGVwQ29kZSwgXCJjb2RlXCIsIFwiVGhhdCBjb2RlIGlzIHdyb25nIG9yIGhhcyBleHBpcmVkLiBDaGVjayBpdCBvciBhc2sgZm9yIGEgbmV3IG9uZS5cIik7XG4gICAgICAgIGVsc2UgZmFpbChmcmllbmRseShlcnJvcikpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgdm9pZCB2ZXJkaWN0O1xuXG4gIC8vIHNvbWVvbmUgd2hvIGNsaWNrZWQgdGhlIGxpbmsgaW4gdGhlIGVtYWlsIGxhbmRzIGhlcmUgYWxyZWFkeSB2ZXJpZmllZDogc2tpcCBzdHJhaWdodCB0byB0aGUgbmV3IHBhc3N3b3JkXG4gIGRiKCkuYXV0aC5vbkF1dGhTdGF0ZUNoYW5nZSgoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQgPT09IFwiUEFTU1dPUkRfUkVDT1ZFUllcIikge1xuICAgICAgcmVjb3ZlcmVkID0gdHJ1ZTtcbiAgICAgIHNob3coMik7XG4gICAgICBzdGVwQ29kZS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignW2RhdGEtZmllbGQ9XCJjb2RlXCJdJykhLmhpZGRlbiA9IHRydWU7XG4gICAgICByZXNlbmQuaGlkZGVuID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICBpZiAoL3R5cGU9cmVjb3ZlcnkvLnRlc3QobG9jYXRpb24uaGFzaCkgfHwgcGFyYW1zLmdldChcImNvZGVcIikpIHJlY292ZXJlZCA9IHRydWU7XG59KTtcbiJd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
