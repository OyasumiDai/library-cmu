// Password rules shared by Join, Reset and Profile: a strength meter, plus a refusal of common passwords.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123",
  "qwertyuiop", "11111111", "00000000", "iloveyou", "iloveyou1", "admin123", "welcome1", "welcome123", "letmein1", "abc12345", "abcd1234",
  "monkey123", "dragon123", "football1", "baseball1", "superman1", "princess1", "sunshine1", "trustno1", "whatever1", "student123", "library123",
  "malabon123", "cmu12345", "cmulibrary", "123123123", "987654321", "asdfghjk", "zxcvbnm1", "1q2w3e4r", "1qaz2wsx", "pass1234", "test1234",
]);

export interface Strength {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  problems: string[];
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export function checkPassword(password: string, ...personal: string[]): Strength {
  const problems: string[] = [];
  if (password.length < 8) problems.push("Use at least 8 characters.");
  if (COMMON.has(password.toLowerCase())) problems.push("That password is too common. Pick something less guessable.");
  const lower = password.toLowerCase();
  for (const word of personal) if (word.length >= 4 && lower.includes(word.toLowerCase())) { problems.push("Do not put your name or email in your password."); break; }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/^(.)\1+$/.test(password) || /^(0123|1234|abcd|qwer)/i.test(password)) score = Math.min(score, 1);
  let level = Math.min(4, Math.max(0, score - (password.length >= 8 ? 0 : 1))) as Strength["level"];
  if (problems.length) level = Math.min(level, 1) as Strength["level"];
  if (!password) level = 0;
  return { level, label: password ? LABELS[level] : "", problems };
}

export const meterHtml = (id: string): string =>
  `<div class="meter" id="${id}" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="meter__label" id="${id}Label" aria-live="polite"></span>`;

// keeps a meter in step with a password input; returns a function that gives the current verdict
export function watchPassword(input: HTMLInputElement, meterId: string, personal: () => string[]): () => Strength {
  const meter = document.getElementById(meterId);
  const label = document.getElementById(`${meterId}Label`);
  const run = () => {
    const verdict = checkPassword(input.value, ...personal());
    if (meter) meter.dataset.level = String(verdict.level);
    if (label) label.textContent = verdict.label;
    return verdict;
  };
  input.addEventListener("input", run);
  return run;
}
