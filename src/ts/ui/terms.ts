// The Terms and Conditions (src/data/terms.json), shown on /terms and in the window people must agree to
// before their account is created or when the terms change.
import terms from "../../data/terms.json";
import { publicSettings, settingText } from "../api/content";
import { html, type Safe } from "../core/dom";
import { openModal } from "../core/modal";

type Section = { title: string; paragraphs: string[]; list?: string[]; after?: string[]; facts?: string[][] };

const paragraphs = (list: string[] = []) => html`${list.map((p) => html`<p>${p}</p>`)}`;

// the library's contact email (Settings > library contact); the terms point people to it
async function contactEmail(): Promise<string> {
  const text = settingText(await publicSettings().catch(() => ({})), "library_contact");
  return text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0] ?? "the official contact details on this website";
}

export async function termsBody(): Promise<Safe> {
  const contact = await contactEmail();
  return html`
    <p class="text-soft"><strong>${terms.platform}</strong> · Effective ${terms.effective}</p>
    ${paragraphs(terms.intro)}
    ${(terms.sections as Section[]).map((s) => html`
      <h2>${s.title}</h2>
      ${paragraphs(s.paragraphs)}
      ${s.list ? html`<ul>${s.list.map((item) => html`<li>${item}</li>`)}</ul>` : ""}
      ${paragraphs(s.after)}
      ${s.facts ? html`<dl class="book-detail__facts">${s.facts.map(([k, v]) => html`<dt>${k}</dt><dd>${v.replace("{contact}", contact)}</dd>`)}</dl>` : ""}`)}`;
}

// Resolves true only after the person scrolled to the end, ticked "I agree" and pressed the button.
export async function agreeToTerms(button = "I agree"): Promise<boolean> {
  const body = await termsBody();
  return new Promise((resolve) => {
    let agreed = false;
    const modal = openModal(terms.title, html`<div class="prose">${body}</div>`, {
      wide: true,
      footer: html`
        <label class="check grow"><input class="check__box" type="checkbox" data-agree disabled><span>I agree to the Terms and Conditions</span></label>
        <button class="btn btn--quiet" type="button" data-close>Cancel</button>
        <button class="btn" type="button" data-accept disabled>${button}</button>`,
    });
    const box = modal.root.querySelector<HTMLInputElement>("[data-agree]")!;
    const accept = modal.root.querySelector<HTMLButtonElement>("[data-accept]")!;
    const scroller = modal.root.querySelector<HTMLElement>(".modal__body")!;
    box.parentElement!.title = "Scroll to the end of the terms first";
    // the checkbox unlocks once the last line has been reached
    const reachedEnd = () => {
      if (scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 24) return;
      box.disabled = false;
      box.parentElement!.title = "";
      scroller.removeEventListener("scroll", reachedEnd);
    };
    scroller.addEventListener("scroll", reachedEnd);
    requestAnimationFrame(reachedEnd);
    box.addEventListener("change", () => { accept.disabled = !box.checked; });
    accept.addEventListener("click", () => { agreed = true; modal.close(); });
    // closing the window any other way (Cancel, the X, Escape, clicking outside) counts as not agreeing
    new MutationObserver((_, watcher) => {
      if (modal.root.isConnected) return;
      watcher.disconnect();
      resolve(agreed);
    }).observe(document.body, { childList: true });
  });
}
