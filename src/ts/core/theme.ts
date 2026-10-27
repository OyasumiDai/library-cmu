const KEY = "cmu-library-theme";
export const THEMES = ["blue", "cozy", "night"] as const;
export type Theme = (typeof THEMES)[number];

export function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  return (THEMES as readonly string[]).includes(set ?? "") ? (set as Theme) : "blue";
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue("--header-bg").trim() || meta.content;
  setTimeout(() => root.classList.remove("theme-fade"), 600);
}

export function initThemePicker(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]"));
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === currentTheme())));
  buttons.forEach((b) => b.addEventListener("click", () => {
    setTheme(b.dataset.themeChoice as Theme);
    sync();
  }));
  sync();
}

// "Reduce motion" setting: stored on this device, applied as a class so CSS can calm every animation at once
const MOTION_KEY = "cmu-library-motion";

export function motionReduced(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === "reduced";
  } catch {
    return false;
  }
}

export function applyMotionPreference(): void {
  document.documentElement.classList.toggle("reduce-motion", motionReduced());
}

export function setMotionReduced(reduced: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, reduced ? "reduced" : "full");
  } catch {
    /* private mode */
  }
  applyMotionPreference();
}
