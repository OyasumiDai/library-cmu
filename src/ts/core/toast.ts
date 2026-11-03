import { escapeHtml, icon } from "./dom";

type Tone = "success" | "error" | "info";
const ICONS: Record<Tone, string> = { success: "check", error: "cross", info: "info" };

export function toast(message: string, tone: Tone = "info", ms = 4200): void {
  const region = document.getElementById("toasts");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast px px--small toast--${tone}`;
  el.innerHTML = `${icon(ICONS[tone]).value}<span class="toast__text">${escapeHtml(message)}</span>`;
  region.appendChild(el);
  const leave = () => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 260);
  };
  el.addEventListener("click", leave);
  setTimeout(leave, ms);
}

export const ok = (message: string): void => toast(message, "success");
export const fail = (message: string): void => toast(message, "error", 6000);
