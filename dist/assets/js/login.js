import {
  MAX_TRIES,
  clearFailures,
  countdown,
  recordFailure,
  secondsLocked,
  triesLeft
} from "./chunks/chunk-SDS6BPQN.js";
import {
  clearErrors,
  setFieldError
} from "./chunks/chunk-YFDTB4J4.js";
import {
  boot,
  busy,
  fail,
  formData,
  friendly,
  homeFor,
  html,
  mount,
  qs,
  signIn
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/login.ts
var REMEMBER = "cmu-remember-email";
var safeNext = (value, fallback) => value && /^\/[A-Za-z0-9/_-]*(\?.*)?$/.test(value) && !value.startsWith("//") ? value : fallback;
boot(({ params }) => {
  const form = qs("#loginForm");
  const emailInput = qs("#f-email");
  const password = qs("#f-password");
  const remember = qs("#remember");
  const submit = form.querySelector("button[type=submit]");
  const notice = qs("#loginNotice");
  try {
    const saved = localStorage.getItem(REMEMBER);
    if (saved) {
      emailInput.value = saved;
      remember.checked = true;
    }
  } catch {
  }
  if (params.get("reset") === "done") mount(notice, html`<div class="alert alert--success px px--success">Password changed. Sign in with the new one.</div>`);
  else if (params.get("expired")) mount(notice, html`<div class="alert alert--warning px px--warning" role="alert">Your session ended to keep your account safe. Please sign in again.</div>`);
  else if (params.get("next")) mount(notice, html`<div class="alert px">Please sign in to continue. You will go back to where you were.</div>`);
  qs("#showPassword").addEventListener("click", () => {
    password.type = password.type === "password" ? "text" : "password";
  });
  let timer;
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
    if (secondsLocked(emailInput.value) > 0) timer = setInterval(showLock, 1e3);
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
        } catch {
        }
        location.href = safeNext(params.get("next"), homeFor(profile));
      } catch (error) {
        if (/Invalid login credentials/i.test(error.message ?? "")) {
          if (recordFailure(data.email) > 0) return startLock();
          const left = triesLeft(data.email);
          return fail(`That email and password do not match. ${left} ${left === 1 ? "try" : "tries"} left of ${MAX_TRIES}.`);
        }
        fail(friendly(error));
      }
    });
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL2xvZ2luLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBzaWduSW4gfSBmcm9tIFwiLi4vYXBpL2F1dGhcIjtcclxuaW1wb3J0IHsgYm9vdCB9IGZyb20gXCIuLi9jb3JlL2Jvb3RcIjtcclxuaW1wb3J0IHsgYnVzeSwgZm9ybURhdGEsIGh0bWwsIG1vdW50LCBxcyB9IGZyb20gXCIuLi9jb3JlL2RvbVwiO1xyXG5pbXBvcnQgeyBmcmllbmRseSB9IGZyb20gXCIuLi9jb3JlL2Vycm9yc1wiO1xyXG5pbXBvcnQgeyBjbGVhckZhaWx1cmVzLCBjb3VudGRvd24sIE1BWF9UUklFUywgcmVjb3JkRmFpbHVyZSwgc2Vjb25kc0xvY2tlZCwgdHJpZXNMZWZ0IH0gZnJvbSBcIi4uL2NvcmUvbG9ja291dFwiO1xyXG5pbXBvcnQgeyBob21lRm9yIH0gZnJvbSBcIi4uL2NvcmUvc2Vzc2lvblwiO1xyXG5pbXBvcnQgeyBmYWlsIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcclxuaW1wb3J0IHsgY2xlYXJFcnJvcnMsIHNldEZpZWxkRXJyb3IgfSBmcm9tIFwiLi4vdWkvY29tcG9uZW50c1wiO1xyXG5cclxuY29uc3QgUkVNRU1CRVIgPSBcImNtdS1yZW1lbWJlci1lbWFpbFwiO1xyXG5cclxuLy8gb25seSBzYW1lLXNpdGUgcGF0aHMgYXJlIGhvbm91cmVkLCBzbyBhIGNyYWZ0ZWQgP25leHQ9IGNhbm5vdCBzZW5kIHBlb3BsZSBlbHNld2hlcmVcclxuY29uc3Qgc2FmZU5leHQgPSAodmFsdWU6IHN0cmluZyB8IG51bGwsIGZhbGxiYWNrOiBzdHJpbmcpOiBzdHJpbmcgPT4gKHZhbHVlICYmIC9eXFwvW0EtWmEtejAtOS9fLV0qKFxcPy4qKT8kLy50ZXN0KHZhbHVlKSAmJiAhdmFsdWUuc3RhcnRzV2l0aChcIi8vXCIpID8gdmFsdWUgOiBmYWxsYmFjayk7XHJcblxyXG5ib290KCh7IHBhcmFtcyB9KSA9PiB7XHJcbiAgY29uc3QgZm9ybSA9IHFzPEhUTUxGb3JtRWxlbWVudD4oXCIjbG9naW5Gb3JtXCIpO1xyXG4gIGNvbnN0IGVtYWlsSW5wdXQgPSBxczxIVE1MSW5wdXRFbGVtZW50PihcIiNmLWVtYWlsXCIpO1xyXG4gIGNvbnN0IHBhc3N3b3JkID0gcXM8SFRNTElucHV0RWxlbWVudD4oXCIjZi1wYXNzd29yZFwiKTtcclxuICBjb25zdCByZW1lbWJlciA9IHFzPEhUTUxJbnB1dEVsZW1lbnQ+KFwiI3JlbWVtYmVyXCIpO1xyXG4gIGNvbnN0IHN1Ym1pdCA9IGZvcm0ucXVlcnlTZWxlY3RvcjxIVE1MQnV0dG9uRWxlbWVudD4oXCJidXR0b25bdHlwZT1zdWJtaXRdXCIpITtcclxuICBjb25zdCBub3RpY2UgPSBxcyhcIiNsb2dpbk5vdGljZVwiKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHNhdmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oUkVNRU1CRVIpO1xyXG4gICAgaWYgKHNhdmVkKSB7IGVtYWlsSW5wdXQudmFsdWUgPSBzYXZlZDsgcmVtZW1iZXIuY2hlY2tlZCA9IHRydWU7IH1cclxuICB9IGNhdGNoIHsgLyogcHJpdmF0ZSBtb2RlICovIH1cclxuXHJcbiAgaWYgKHBhcmFtcy5nZXQoXCJyZXNldFwiKSA9PT0gXCJkb25lXCIpIG1vdW50KG5vdGljZSwgaHRtbGA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtLXN1Y2Nlc3MgcHggcHgtLXN1Y2Nlc3NcIj5QYXNzd29yZCBjaGFuZ2VkLiBTaWduIGluIHdpdGggdGhlIG5ldyBvbmUuPC9kaXY+YCk7XHJcbiAgZWxzZSBpZiAocGFyYW1zLmdldChcImV4cGlyZWRcIikpIG1vdW50KG5vdGljZSwgaHRtbGA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtLXdhcm5pbmcgcHggcHgtLXdhcm5pbmdcIiByb2xlPVwiYWxlcnRcIj5Zb3VyIHNlc3Npb24gZW5kZWQgdG8ga2VlcCB5b3VyIGFjY291bnQgc2FmZS4gUGxlYXNlIHNpZ24gaW4gYWdhaW4uPC9kaXY+YCk7XHJcbiAgZWxzZSBpZiAocGFyYW1zLmdldChcIm5leHRcIikpIG1vdW50KG5vdGljZSwgaHRtbGA8ZGl2IGNsYXNzPVwiYWxlcnQgcHhcIj5QbGVhc2Ugc2lnbiBpbiB0byBjb250aW51ZS4gWW91IHdpbGwgZ28gYmFjayB0byB3aGVyZSB5b3Ugd2VyZS48L2Rpdj5gKTtcclxuXHJcbiAgcXMoXCIjc2hvd1Bhc3N3b3JkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICBwYXNzd29yZC50eXBlID0gcGFzc3dvcmQudHlwZSA9PT0gXCJwYXNzd29yZFwiID8gXCJ0ZXh0XCIgOiBcInBhc3N3b3JkXCI7XHJcbiAgfSk7XHJcblxyXG4gIC8vIHdoaWxlIGxvY2tlZCwgdGhlIGJ1dHRvbiBpcyBvZmYgYW5kIGEgbGl2ZSBjb3VudGRvd24gc2hvd3MgaG93IGxvbmcgaXMgbGVmdFxyXG4gIGxldCB0aW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0SW50ZXJ2YWw+IHwgdW5kZWZpbmVkO1xyXG4gIGNvbnN0IHNob3dMb2NrID0gKCkgPT4ge1xyXG4gICAgY29uc3QgbGVmdCA9IHNlY29uZHNMb2NrZWQoZW1haWxJbnB1dC52YWx1ZSk7XHJcbiAgICBpZiAobGVmdCA8PSAwKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICBzdWJtaXQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgaWYgKG5vdGljZS5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtbG9ja11cIikpIG1vdW50KG5vdGljZSwgaHRtbGBgKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgc3VibWl0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIG1vdW50KG5vdGljZSwgaHRtbGA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtLWRhbmdlciBweCBweC0tZGFuZ2VyXCIgZGF0YS1sb2NrIHJvbGU9XCJhbGVydFwiPjxzcGFuPlRvbyBtYW55IHdyb25nIHBhc3N3b3JkcyBmb3IgdGhpcyBlbWFpbC4gWW91IGNhbiB0cnkgYWdhaW4gaW4gPHN0cm9uZz4ke2NvdW50ZG93bihsZWZ0KX08L3N0cm9uZz4uPC9zcGFuPjwvZGl2PmApO1xyXG4gIH07XHJcbiAgY29uc3Qgc3RhcnRMb2NrID0gKCkgPT4ge1xyXG4gICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICBzaG93TG9jaygpO1xyXG4gICAgaWYgKHNlY29uZHNMb2NrZWQoZW1haWxJbnB1dC52YWx1ZSkgPiAwKSB0aW1lciA9IHNldEludGVydmFsKHNob3dMb2NrLCAxMDAwKTtcclxuICB9O1xyXG4gIGVtYWlsSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIHN0YXJ0TG9jayk7XHJcbiAgc3RhcnRMb2NrKCk7XHJcblxyXG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBpZiAoc2Vjb25kc0xvY2tlZChlbWFpbElucHV0LnZhbHVlKSA+IDApIHJldHVybiBzdGFydExvY2soKTtcclxuICAgIGNsZWFyRXJyb3JzKGZvcm0pO1xyXG4gICAgY29uc3QgZGF0YSA9IGZvcm1EYXRhKGZvcm0pO1xyXG4gICAgaWYgKCEvXlxcUytAXFxTK1xcLlxcUyskLy50ZXN0KGRhdGEuZW1haWwgPz8gXCJcIikpIHJldHVybiBzZXRGaWVsZEVycm9yKGZvcm0sIFwiZW1haWxcIiwgXCJFbnRlciB5b3VyIGVtYWlsLlwiKTtcclxuICAgIGlmICghcGFzc3dvcmQudmFsdWUpIHJldHVybiBzZXRGaWVsZEVycm9yKGZvcm0sIFwicGFzc3dvcmRcIiwgXCJFbnRlciB5b3VyIHBhc3N3b3JkLlwiKTtcclxuICAgIGF3YWl0IGJ1c3koc3VibWl0LCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHNpZ25JbihkYXRhLmVtYWlsLCBwYXNzd29yZC52YWx1ZSk7XHJcbiAgICAgICAgY2xlYXJGYWlsdXJlcyhkYXRhLmVtYWlsKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgaWYgKHJlbWVtYmVyLmNoZWNrZWQpIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFJFTUVNQkVSLCBkYXRhLmVtYWlsKTtcclxuICAgICAgICAgIGVsc2UgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oUkVNRU1CRVIpO1xyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiBwcml2YXRlIG1vZGUgKi8gfVxyXG4gICAgICAgIGxvY2F0aW9uLmhyZWYgPSBzYWZlTmV4dChwYXJhbXMuZ2V0KFwibmV4dFwiKSwgaG9tZUZvcihwcm9maWxlKSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgLy8gb25seSBhIHdyb25nIGVtYWlsIG9yIHBhc3N3b3JkIGNvdW50czsgYSBuZXR3b3JrIHByb2JsZW0gaXMgbm90IHRoZSBwZXJzb24ncyBmYXVsdFxyXG4gICAgICAgIGlmICgvSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy9pLnRlc3QoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlID8/IFwiXCIpKSB7XHJcbiAgICAgICAgICBpZiAocmVjb3JkRmFpbHVyZShkYXRhLmVtYWlsKSA+IDApIHJldHVybiBzdGFydExvY2soKTtcclxuICAgICAgICAgIGNvbnN0IGxlZnQgPSB0cmllc0xlZnQoZGF0YS5lbWFpbCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFpbChgVGhhdCBlbWFpbCBhbmQgcGFzc3dvcmQgZG8gbm90IG1hdGNoLiAke2xlZnR9ICR7bGVmdCA9PT0gMSA/IFwidHJ5XCIgOiBcInRyaWVzXCJ9IGxlZnQgb2YgJHtNQVhfVFJJRVN9LmApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmYWlsKGZyaWVuZGx5KGVycm9yKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTQSxJQUFNLFdBQVc7QUFHakIsSUFBTSxXQUFXLENBQUMsT0FBc0IsYUFBOEIsU0FBUyw2QkFBNkIsS0FBSyxLQUFLLEtBQUssQ0FBQyxNQUFNLFdBQVcsSUFBSSxJQUFJLFFBQVE7QUFFN0osS0FBSyxDQUFDLEVBQUUsT0FBTyxNQUFNO0FBQ25CLFFBQU0sT0FBTyxHQUFvQixZQUFZO0FBQzdDLFFBQU0sYUFBYSxHQUFxQixVQUFVO0FBQ2xELFFBQU0sV0FBVyxHQUFxQixhQUFhO0FBQ25ELFFBQU0sV0FBVyxHQUFxQixXQUFXO0FBQ2pELFFBQU0sU0FBUyxLQUFLLGNBQWlDLHFCQUFxQjtBQUMxRSxRQUFNLFNBQVMsR0FBRyxjQUFjO0FBRWhDLE1BQUk7QUFDRixVQUFNLFFBQVEsYUFBYSxRQUFRLFFBQVE7QUFDM0MsUUFBSSxPQUFPO0FBQUUsaUJBQVcsUUFBUTtBQUFPLGVBQVMsVUFBVTtBQUFBLElBQU07QUFBQSxFQUNsRSxRQUFRO0FBQUEsRUFBcUI7QUFFN0IsTUFBSSxPQUFPLElBQUksT0FBTyxNQUFNLE9BQVEsT0FBTSxRQUFRLHdHQUF3RztBQUFBLFdBQ2pKLE9BQU8sSUFBSSxTQUFTLEVBQUcsT0FBTSxRQUFRLDZJQUE2STtBQUFBLFdBQ2xMLE9BQU8sSUFBSSxNQUFNLEVBQUcsT0FBTSxRQUFRLGlHQUFpRztBQUU1SSxLQUFHLGVBQWUsRUFBRSxpQkFBaUIsU0FBUyxNQUFNO0FBQ2xELGFBQVMsT0FBTyxTQUFTLFNBQVMsYUFBYSxTQUFTO0FBQUEsRUFDMUQsQ0FBQztBQUdELE1BQUk7QUFDSixRQUFNLFdBQVcsTUFBTTtBQUNyQixVQUFNLE9BQU8sY0FBYyxXQUFXLEtBQUs7QUFDM0MsUUFBSSxRQUFRLEdBQUc7QUFDYixvQkFBYyxLQUFLO0FBQ25CLGFBQU8sV0FBVztBQUNsQixVQUFJLE9BQU8sY0FBYyxhQUFhLEVBQUcsT0FBTSxRQUFRLE1BQU07QUFDN0Q7QUFBQSxJQUNGO0FBQ0EsV0FBTyxXQUFXO0FBQ2xCLFVBQU0sUUFBUSx5SkFBeUosVUFBVSxJQUFJLENBQUMseUJBQXlCO0FBQUEsRUFDak47QUFDQSxRQUFNLFlBQVksTUFBTTtBQUN0QixrQkFBYyxLQUFLO0FBQ25CLGFBQVM7QUFDVCxRQUFJLGNBQWMsV0FBVyxLQUFLLElBQUksRUFBRyxTQUFRLFlBQVksVUFBVSxHQUFJO0FBQUEsRUFDN0U7QUFDQSxhQUFXLGlCQUFpQixTQUFTLFNBQVM7QUFDOUMsWUFBVTtBQUVWLE9BQUssaUJBQWlCLFVBQVUsT0FBTyxVQUFVO0FBQy9DLFVBQU0sZUFBZTtBQUNyQixRQUFJLGNBQWMsV0FBVyxLQUFLLElBQUksRUFBRyxRQUFPLFVBQVU7QUFDMUQsZ0JBQVksSUFBSTtBQUNoQixVQUFNLE9BQU8sU0FBUyxJQUFJO0FBQzFCLFFBQUksQ0FBQyxpQkFBaUIsS0FBSyxLQUFLLFNBQVMsRUFBRSxFQUFHLFFBQU8sY0FBYyxNQUFNLFNBQVMsbUJBQW1CO0FBQ3JHLFFBQUksQ0FBQyxTQUFTLE1BQU8sUUFBTyxjQUFjLE1BQU0sWUFBWSxzQkFBc0I7QUFDbEYsVUFBTSxLQUFLLFFBQVEsWUFBWTtBQUM3QixVQUFJO0FBQ0YsY0FBTSxVQUFVLE1BQU0sT0FBTyxLQUFLLE9BQU8sU0FBUyxLQUFLO0FBQ3ZELHNCQUFjLEtBQUssS0FBSztBQUN4QixZQUFJO0FBQ0YsY0FBSSxTQUFTLFFBQVMsY0FBYSxRQUFRLFVBQVUsS0FBSyxLQUFLO0FBQUEsY0FDMUQsY0FBYSxXQUFXLFFBQVE7QUFBQSxRQUN2QyxRQUFRO0FBQUEsUUFBcUI7QUFDN0IsaUJBQVMsT0FBTyxTQUFTLE9BQU8sSUFBSSxNQUFNLEdBQUcsUUFBUSxPQUFPLENBQUM7QUFBQSxNQUMvRCxTQUFTLE9BQU87QUFFZCxZQUFJLDZCQUE2QixLQUFNLE1BQWdCLFdBQVcsRUFBRSxHQUFHO0FBQ3JFLGNBQUksY0FBYyxLQUFLLEtBQUssSUFBSSxFQUFHLFFBQU8sVUFBVTtBQUNwRCxnQkFBTSxPQUFPLFVBQVUsS0FBSyxLQUFLO0FBQ2pDLGlCQUFPLEtBQUsseUNBQXlDLElBQUksSUFBSSxTQUFTLElBQUksUUFBUSxPQUFPLFlBQVksU0FBUyxHQUFHO0FBQUEsUUFDbkg7QUFDQSxhQUFLLFNBQVMsS0FBSyxDQUFDO0FBQUEsTUFDdEI7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNILENBQUM7QUFDSCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
