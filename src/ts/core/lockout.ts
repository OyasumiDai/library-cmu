// Sign-in lockout. 3 wrong passwords in a row for the same email lock sign-in for that email:
// 1 minute, then 3, 5, 10, 15, 30 and 60 minutes for each repeated lockout. A correct sign-in clears it.
// This protects people from guessing on this device. The real backstop against attacks from elsewhere is
// the rate limit Supabase applies on its servers (Authentication > Rate Limits), so keep that enabled.
const KEY = "cmu-login-lockout";
export const MAX_TRIES = 3;
export const STEPS_MINUTES = [1, 3, 5, 10, 15, 30, 60];

interface Entry {
  fails: number;
  rounds: number;
  until: number;
}
type Book = Record<string, Entry>;

const keyOf = (email: string): string => email.trim().toLowerCase();

function read(): Book {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Book;
  } catch {
    return {};
  }
}

function write(book: Book): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(book));
  } catch {
    /* private mode: the lock then lasts only for this page */
  }
}

const entry = (book: Book, email: string): Entry => book[keyOf(email)] ?? { fails: 0, rounds: 0, until: 0 };

// seconds left on the lock for this email (0 when sign-in is free)
export function secondsLocked(email: string, now = Date.now()): number {
  if (!email.trim()) return 0;
  return Math.max(0, Math.ceil((entry(read(), email).until - now) / 1000));
}

export function triesLeft(email: string): number {
  return Math.max(0, MAX_TRIES - entry(read(), email).fails);
}

// call after a wrong password; returns the new lock in seconds (0 when still under the limit)
export function recordFailure(email: string, now = Date.now()): number {
  const book = read();
  const record = entry(book, email);
  record.fails += 1;
  let seconds = 0;
  if (record.fails >= MAX_TRIES) {
    seconds = STEPS_MINUTES[Math.min(record.rounds, STEPS_MINUTES.length - 1)] * 60;
    record.rounds += 1;
    record.fails = 0;
    record.until = now + seconds * 1000;
  }
  book[keyOf(email)] = record;
  write(book);
  return seconds;
}

export function clearFailures(email: string): void {
  const book = read();
  delete book[keyOf(email)];
  write(book);
}

export function countdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
