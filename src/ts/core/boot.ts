// Every page script is `boot(async (page) => { ... })`. Boot does the shared work in one order:
// session -> access check -> header/footer behaviour -> your page -> reveal animations.
import { publicSettings, settingText } from "../api/content";
import { acceptTerms } from "../api/auth";
import { html, icon, mount, qs, maybe } from "./dom";
import { friendly } from "./errors";
import { initLayout } from "./layout";
import { reveal, watchReveal } from "./motion";
import { openModal } from "./modal";
import { fail } from "./toast";
import { current, homeFor, initSession, isMember, isStaff, type SessionState } from "./session";
import { isConfigured } from "./supabase";
import { LOGIN } from "./config";
import { initAssistant } from "./assistant";
import { fillFooter } from "../ui/footer";

export type Access = "all" | "member" | "guest" | "staff";

export interface PageContext {
  main: HTMLElement;
  state: SessionState;
  params: URLSearchParams;
}

function redirect(to: string): void {
  location.replace(to);
}

function allowed(access: Access): boolean {
  if (access === "member") return isMember();
  if (access === "staff") return isStaff();
  if (access === "guest") return !isMember();
  return true;
}

async function showNotice(main: HTMLElement): Promise<void> {
  const settings = await publicSettings();
  const message = settingText(settings, "site_notice");
  if (!message) return;
  const tone = settingText(settings, "site_notice_tone", "info");
  let dismissed = "";
  try { dismissed = sessionStorage.getItem("cmu-notice-dismissed") ?? ""; } catch { /* ignore */ }
  if (dismissed === message) return;
  const box = document.createElement("div");
  box.className = "container";
  box.innerHTML = html`<div class="site-notice alert alert--${tone} px px--${tone}" role="status"><span class="grow">${message}</span><button class="modal__close" type="button" data-dismiss aria-label="Dismiss this notice">${icon("cross")}</button></div>`.value;
  box.querySelector("[data-dismiss]")?.addEventListener("click", () => {
    try { sessionStorage.setItem("cmu-notice-dismissed", message); } catch { /* ignore */ }
    box.remove();
  });
  main.prepend(box);
}

async function askForTerms(): Promise<void> {
  const profile = current().profile;
  if (!profile) return;
  const wanted = settingText(await publicSettings(), "terms_version");
  if (!wanted || profile.terms_version === wanted) return;
  const modal = openModal("Our terms were updated", html`
    <p>Please read the <a href="/terms" target="_blank" rel="noopener">terms</a> and <a href="/privacy" target="_blank" rel="noopener">privacy notice</a> (version ${wanted}) and accept them to keep borrowing.</p>`, {
    footer: html`<button class="btn px" type="button" data-accept>I accept</button>`,
  });
  modal.root.querySelector("[data-accept]")?.addEventListener("click", async () => {
    await acceptTerms(wanted);
    modal.close();
  });
}

// Supabase sends people back with #error=...&error_code=otp_expired when an email link is old or was already opened
// (mail apps often open links once to scan them). Say what to do instead of leaving a strange address in the bar.
function explainLinkError(): void {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const code = hash.get("error_code");
  if (!code) return;
  history.replaceState(null, "", location.pathname + location.search);
  fail(code === "otp_expired"
    ? "That email link expired or was already used. Sign in, or choose Forgot your password for a fresh 6-digit code."
    : "That email link did not work. Please sign in, or ask for a new one.");
}

export async function boot(run: (page: PageContext) => Promise<void> | void): Promise<void> {
  const access = (document.body.dataset.access ?? "all") as Access;
  const main = qs("#main");
  document.body.classList.add("is-ready");
  try {
    const state = await initSession();
    if (!allowed(access)) {
      const next = encodeURIComponent(location.pathname + location.search);
      if (access === "guest") return redirect(homeFor(state.profile));
      if (access === "staff" && isMember()) return redirect("/catalog");
      return redirect(`${LOGIN}?next=${next}`);
    }
    initLayout();
    watchReveal();
    explainLinkError();
    if (!isConfigured()) {
      main.prepend(Object.assign(document.createElement("div"), {
        className: "container",
        innerHTML: html`<div class="alert alert--warning px px--warning" role="alert">The library database is not connected yet. Set SUPABASE_URL and SUPABASE_ANON_KEY, then rebuild.</div>`.value,
      }));
    }
    if (isConfigured()) void showNotice(main).catch(() => undefined);
    if (isConfigured() && maybe("#footerInfo")) void publicSettings().then(fillFooter).catch(() => undefined);
    await run({ main, state, params: new URLSearchParams(location.search) });
    if (isMember()) void askForTerms().catch(() => undefined);
    if (isMember() && document.body.classList.contains("app")) void initAssistant().catch(() => undefined);
  } catch (error) {
    console.error(error);
    const holder = maybe("[data-page-root]") ?? main;
    mount(holder, html`<div class="container"><div class="alert alert--danger px px--danger" role="alert">${friendly(error)}</div></div>`);
  } finally {
    reveal();
  }
}
