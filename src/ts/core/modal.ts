import { html, icon, Safe, escapeHtml } from "./dom";

export interface ModalHandle {
  root: HTMLElement;
  close: () => void;
}

export function openModal(title: string, body: Safe | string, options: { wide?: boolean; footer?: Safe | string } = {}): ModalHandle {
  const previous = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const bodyHtml = body instanceof Safe ? body.value : escapeHtml(body);
  const footer = options.footer instanceof Safe ? options.footer.value : options.footer ? escapeHtml(options.footer) : "";
  backdrop.innerHTML = html`
    <div class="modal px ${options.wide ? "modal--wide" : ""}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal__head">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" type="button" data-close aria-label="Close">${icon("cross", "icon--lg")}</button>
      </div>
      <div class="modal__body">${new Safe(bodyHtml)}</div>
      ${footer ? new Safe(`<div class="modal__foot">${footer}</div>`) : ""}
    </div>`.value;
  document.body.appendChild(backdrop);
  document.body.classList.add("has-modal");

  const close = () => {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
    if (!document.querySelector(".modal-backdrop")) document.body.classList.remove("has-modal");
    previous?.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target === backdrop || target.closest("[data-close]")) close();
  });
  backdrop.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
  return { root: backdrop, close };
}

// resolves true when the person presses the confirm button
export function confirmBox(title: string, message: string, confirmLabel = "Yes", danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = openModal(title, html`<p>${message}</p>`, {
      footer: html`<button class="btn btn--quiet px" type="button" data-close>Cancel</button>
        <button class="btn ${danger ? "btn--danger" : ""} px" type="button" data-yes>${confirmLabel}</button>`,
    });
    let answered = false;
    modal.root.querySelector("[data-yes]")?.addEventListener("click", () => {
      answered = true;
      modal.close();
      resolve(true);
    });
    new MutationObserver((_, observer) => {
      if (!modal.root.isConnected) {
        observer.disconnect();
        if (!answered) resolve(false);
      }
    }).observe(document.body, { childList: true });
  });
}
