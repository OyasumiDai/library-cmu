// Shared bits of student feedback: the star row and the topic names (Feedback page and Students in the panel)
import { html, icon } from "../core/dom";

export const FEEDBACK_TOPIC = { system: "Library website", game: "2D-3D game" } as const;

export const starRow = (stars: number) =>
  html`<span class="fb-rating" aria-label="${stars} out of 5 stars">${[1, 2, 3, 4, 5].map((n) => html`<span class="fb-rating__star" data-on="${String(n <= stars)}">${icon("star", "icon--sm")}</span>`)}</span>`;
