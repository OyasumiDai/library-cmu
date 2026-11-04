// The wait before "Resend code" works again. It grows with each resend (1, 2, 5, then 10 minutes),
// is remembered per email in this browser so a page refresh does not reset it, and starts over after an hour of quiet.
// Supabase has its own limit too; when it says "after N seconds", the button waits that long.
const WAITS = [60, 120, 300, 600];
const QUIET_RESET = 60 * 60 * 1000;

interface Record { sends: number; until: number; last: number }

const keyFor = (purpose: string, email: string) => `cmu-resend:${purpose}:${email.trim().toLowerCase()}`;

function read(key: string): Record {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Record | null;
    if (saved && Date.now() - saved.last < QUIET_RESET) return saved;
  } catch { /* storage blocked: the timer still works for this page */ }
  return { sends: 0, until: 0, last: 0 };
}

function write(key: string, record: Record): void {
  try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* ignore */ }
}

// seconds Supabase asked us to wait, from "For security purposes, you can only request this after 42 seconds."
export function serverWait(error: unknown): number {
  const text = String((error as Error)?.message ?? error);
  const seconds = text.match(/after (\d+) seconds?/i)?.[1];
  if (seconds) return Number(seconds);
  return /rate limit|too many/i.test(text) ? WAITS[WAITS.length - 1] : 0;
}

export interface Cooldown {
  /** seconds left before another code may be asked for */
  left(): number;
  /** a code was just sent (or the server asked us to wait `seconds`): start the countdown */
  sent(seconds?: number): void;
  /** runs `send` only when the wait is over, with the button locked meanwhile; true when it went through */
  run(send: () => Promise<void>): Promise<boolean>;
  stop(): void;
}

export function resendCooldown(button: HTMLButtonElement, purpose: string, email: string, label = "Resend code"): Cooldown {
  const key = keyFor(purpose, email);
  let timer: ReturnType<typeof setInterval> | undefined;
  let sending = false;
  const left = () => Math.max(0, Math.ceil((read(key).until - Date.now()) / 1000));
  const clock = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

  const tick = () => {
    const s = left();
    button.disabled = sending || s > 0;
    button.textContent = sending ? "Sending..." : s > 0 ? `${label} (${clock(s)})` : label;
    if (s <= 0 && !sending) clearInterval(timer);
  };
  const show = () => { clearInterval(timer); tick(); timer = setInterval(tick, 1000); };

  const sent = (seconds?: number) => {
    const record = read(key);
    const wait = seconds ?? WAITS[Math.min(record.sends, WAITS.length - 1)];
    write(key, { sends: record.sends + 1, until: Date.now() + wait * 1000, last: Date.now() });
    show();
  };

  show(); // a wait still running from before a refresh shows straight away
  return {
    left,
    sent,
    stop: () => clearInterval(timer),
    async run(send) {
      if (sending || left() > 0) return false;
      sending = true;
      tick();
      try {
        await send();
        sending = false;
        sent();
        return true;
      } catch (error) {
        sending = false;
        const wait = serverWait(error);
        if (wait) sent(wait); else tick();
        throw error;
      }
    },
  };
}
