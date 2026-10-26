// Sessions end after 30 minutes without activity, or 8 hours in total, whichever comes first.
// Activity is shared between tabs through localStorage, so using one tab keeps the others alive.
import { signOut } from "../api/auth";

const IDLE_MS = 30 * 60 * 1000;
const TOTAL_MS = 8 * 60 * 60 * 1000;
const ACTIVE = "cmu-last-active";
const STARTED = "cmu-session-start";

const get = (key: string): number => {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
};
const put = (key: string, value: number): void => {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode */ }
};

export function markSessionStart(now = Date.now()): void {
  put(STARTED, now);
  put(ACTIVE, now);
}

// decides whether a session should have ended already (also used by tests)
export function expiredReason(now: number, lastActive: number, started: number): "idle" | "total" | null {
  if (started && now - started > TOTAL_MS) return "total";
  if (lastActive && now - lastActive > IDLE_MS) return "idle";
  return null;
}

export function watchIdle(): void {
  if (!get(STARTED)) markSessionStart();
  let lastWrite = 0;
  const touch = () => {
    const now = Date.now();
    if (now - lastWrite > 15_000) { lastWrite = now; put(ACTIVE, now); }
  };
  for (const event of ["pointerdown", "keydown", "scroll", "touchstart"]) window.addEventListener(event, touch, { passive: true });
  const check = async () => {
    if (!expiredReason(Date.now(), get(ACTIVE), get(STARTED))) return;
    try { await signOut(); } catch { /* sign out anyway */ }
    put(STARTED, 0);
    location.href = "/login?expired=1";
  };
  setInterval(() => void check(), 30_000);
  void check();
}
