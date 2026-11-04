import { TIMEZONE } from "./config";

const dateFormat = new Intl.DateTimeFormat("en-PH", { timeZone: TIMEZONE, year: "numeric", month: "short", day: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-PH", { timeZone: TIMEZONE, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string | null | undefined): string => (iso ? dateFormat.format(new Date(iso)) : "-");
export const formatDateTime = (iso: string | null | undefined): string => (iso ? dateTimeFormat.format(new Date(iso)) : "-");

export function relative(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const steps: [number, string][] = [[60, "second"], [3600, "minute"], [86400, "hour"], [604800, "day"]];
  if (seconds < 45) return "just now";
  let divisor = 1;
  for (const [limit, unit] of steps) {
    if (seconds < limit) {
      const value = Math.max(1, Math.round(seconds / divisor));
      return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
    divisor = limit;
  }
  return formatDate(iso);
}

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

// money in pesos: ₱120.00
export const peso = (amount: number): string => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// whole days from now until the date (negative when it has passed)
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function dueLabel(iso: string | null): { text: string; tone: "danger" | "warning" | "success" } {
  if (!iso) return { text: "No due date", tone: "success" };
  const days = daysUntil(iso);
  if (days < 0) return { text: `Overdue by ${plural(-days, "day")}`, tone: "danger" };
  if (days <= 2) return { text: days === 0 ? "Due today" : `Due in ${plural(days, "day")}`, tone: "warning" };
  return { text: `Due ${formatDate(iso)}`, tone: "success" };
}

export const initials = (name: string): string =>
  name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "?";

// ---------------------------------------------------------------- dates in report downloads
// Dates in reports are written as 2026-10-29 14:30 (Philippine time): spreadsheets sort and filter them as real dates.
const csvParts = (iso: string) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  .formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
export const csvDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const p = csvParts(iso);
  return `${p.year}-${p.month}-${p.day}`;
};
export const csvDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const p = csvParts(iso);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

