// The student's Feedback page: a star rating and a suggestion about the website or the game.
// What they send shows on their profile in the staff panel (Students), and staff and admins get a notification.
import { feedbackOf, sendFeedback } from "../api/feedback";
import { boot } from "../core/boot";
import { busy, html, icon, mount, qs } from "../core/dom";
import { friendly } from "../core/errors";
import { formatDate, relative } from "../core/format";
import { current } from "../core/session";
import { fail, ok } from "../core/toast";
import { clearErrors, empty, loading, setFieldError } from "../ui/components";
import { FEEDBACK_TOPIC as TOPIC, starRow } from "../ui/feedback";
import type { Feedback } from "../types";

const WORDS = ["Tap a star", "Poor", "Fair", "Good", "Very good", "Excellent"];

function list(items: Feedback[]) {
  if (!items.length) return empty("No feedback yet", "What you send shows here, and the library staff can read it.", "star");
  return html`<ul class="list">${items.map((f) => html`
    <li class="list__item fb-item">
      <span class="notice-icon">${icon(f.topic === "game" ? "game" : "book")}</span>
      <div class="list__body">
        <p class="list__title">${TOPIC[f.topic]} ${starRow(f.rating)}</p>
        ${f.suggestion ? html`<p class="fb-item__text">${f.suggestion}</p>` : html`<p class="text-soft">No suggestion written.</p>`}
        <p class="list__meta">${formatDate(f.created_at)} · ${relative(f.created_at)} · ${f.is_read ? html`<span class="badge badge--success">Read by the library</span>` : html`<span class="badge badge--secondary">Not read yet</span>`}</p>
      </div>
    </li>`)}</ul>`;
}

boot(async () => {
  const me = current().profile!;
  const form = qs<HTMLFormElement>("#feedbackForm");
  const box = qs("#myFeedback");
  const stars = [...form.querySelectorAll<HTMLLabelElement>(".fb-star")];
  const word = qs("#starWord");
  const text = qs<HTMLTextAreaElement>("#f-suggestion");
  const counter = qs("#charCount");

  // staff and admins read feedback in Students; this page is for students
  if (me.role !== "student") {
    form.closest("section")!.hidden = true;
    mount(box, html`<div class="alert alert--info px px--info">${icon("info")}<span>Students send feedback here. Read it on each student's profile in <a href="/panel?tab=students">Students</a>.</span></div>`);
    return;
  }

  const chosen = () => Number(form.querySelector<HTMLInputElement>("input[name=rating]:checked")?.value ?? 0);
  const light = (n: number) => {
    stars.forEach((s, i) => s.classList.toggle("is-on", i < n));
    word.textContent = WORDS[n];
  };
  stars.forEach((s, i) => {
    s.addEventListener("mouseenter", () => light(i + 1));
    s.addEventListener("mouseleave", () => light(chosen()));
  });
  form.addEventListener("change", () => { light(chosen()); if (chosen()) setFieldError(form, "rating", ""); });
  text.addEventListener("input", () => { counter.textContent = String(text.value.length); });

  const refresh = async () => mount(box, list(await feedbackOf(me.id)));
  mount(box, loading("Loading your feedback"));
  refresh().catch((error) => mount(box, html`<div class="alert alert--warning px px--warning">${icon("info")}<span>${friendly(error)}</span></div>`));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    const rating = chosen();
    const topic = (form.querySelector<HTMLInputElement>("input[name=topic]:checked")?.value ?? "system") as Feedback["topic"];
    if (!rating) { setFieldError(form, "rating", "Choose from 1 to 5 stars."); stars[0].querySelector("input")?.focus(); return; }
    await busy(qs<HTMLButtonElement>("#sendFeedback"), async () => {
      try {
        await sendFeedback(topic, rating, text.value);
        ok("Thank you! Your feedback was sent to the library.");
        form.reset();
        form.querySelector<HTMLInputElement>("input[name=topic][value=system]")!.checked = true;
        light(0);
        counter.textContent = "0";
        await refresh();
      } catch (error) {
        fail(friendly(error));
      }
    });
  });
});
