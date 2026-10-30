// The small moving parts of the sign in and join pages: rotating tips, the show-password eye and the Caps Lock warning.

// the tips on the blue side change by themselves (not while hovered or focused, and not at all with reduced motion); the dots pick one
export function heroTips(): void {
  const box = document.querySelector<HTMLElement>("[data-tips]");
  if (!box) return;
  const tips = [...box.querySelectorAll<HTMLElement>(".auth-hero__tip")];
  const dots = [...box.querySelectorAll<HTMLButtonElement>(".auth-hero__dot")];
  let current = 0;
  const show = (n: number) => {
    current = (n + tips.length) % tips.length;
    tips.forEach((t, i) => t.classList.toggle("is-current", i === current));
    dots.forEach((d, i) => { d.classList.toggle("is-current", i === current); d.setAttribute("aria-pressed", String(i === current)); });
  };
  dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let paused = false;
  box.addEventListener("pointerenter", () => { paused = true; });
  box.addEventListener("pointerleave", () => { paused = false; });
  box.addEventListener("focusin", () => { paused = true; });
  box.addEventListener("focusout", () => { paused = false; });
  setInterval(() => { if (!paused && !document.hidden) show(current + 1); }, 5000);
}

// one eye button shows or hides every password field it is given
export function revealToggle(button: HTMLButtonElement, inputs: HTMLInputElement[]): void {
  button.addEventListener("click", () => {
    const show = inputs[0].type === "password";
    inputs.forEach((i) => { i.type = show ? "text" : "password"; });
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
}

// a quiet warning while Caps Lock is on, since a wrong-case password is the most common typo
export function capsLockHint(inputs: HTMLInputElement[], hint: HTMLElement): void {
  const check = (event: KeyboardEvent) => { hint.hidden = !event.getModifierState?.("CapsLock"); };
  for (const input of inputs) {
    input.addEventListener("keydown", check);
    input.addEventListener("keyup", check);
    input.addEventListener("blur", () => { hint.hidden = true; });
  }
}
