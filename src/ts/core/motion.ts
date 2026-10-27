// Behaviour half of the animations; the keyframes themselves live in styles/motion.css.
const reduced = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let observer: IntersectionObserver | null = null;

// elements with [data-reveal] rise into place the first time they scroll into view;
// data-count="123" numbers count up from zero at the same moment
export function reveal(root: ParentNode = document): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
  if (!items.length) return;
  items.forEach((el, i) => el.style.setProperty("--i", String(i % 8)));
  if (reduced() || !("IntersectionObserver" in window)) {
    items.forEach(show);
    return;
  }
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target as HTMLElement);
      observer?.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((el) => observer?.observe(el));
}

// Anything added to the page later (lists, tabs, tiles drawn after loading) is revealed too, so a [data-reveal]
// element can never stay invisible and leave an empty gap.
let watching = false;
export function watchReveal(): void {
  if (watching || !("MutationObserver" in window)) return;
  watching = true;
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; reveal(); });
  }).observe(document.body, { childList: true, subtree: true });
}

function show(el: HTMLElement): void {
  el.classList.add("is-in");
  el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
  if (el.matches("[data-count]")) countUp(el);
}

export function countUp(el: HTMLElement, ms = 900): void {
  const target = Number(el.dataset.count ?? 0);
  if (!Number.isFinite(target) || el.dataset.counted) return;
  el.dataset.counted = "1";
  if (reduced() || target === 0) {
    el.textContent = String(target);
    return;
  }
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// types text out one letter at a time (home hero tagline)
export function typewriter(el: HTMLElement, text: string, speed = 38): void {
  if (reduced()) {
    el.textContent = text;
    return;
  }
  el.textContent = "";
  el.classList.add("is-typing");
  let i = 0;
  const step = () => {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(step, speed);
    else el.classList.remove("is-typing");
  };
  step();
}
