// ISBNs: people type them with dashes or spaces; they are stored as bare digits (ISBN-10 may end in X)
// and only accepted when the check digit is right, which catches most typos.

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

// the right shape: 10 digits (the last may be X) or 13 digits. Saving needs only this; the check digit is a soft warning,
// so a book can be added even when its printed number does not pass the checksum.
export function isIsbnShape(value: string): boolean {
  return /^(\d{9}[\dX]|\d{13})$/.test(normalizeIsbn(value));
}

export function isValidIsbn(value: string): boolean {
  const isbn = normalizeIsbn(value);
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + Number(ch) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  return false;
}

// full hyphenation depends on the publisher, so ISBN-13s are shown with just the prefix split off: 978-0306406157
export function formatIsbn(value: string | null | undefined): string {
  const isbn = normalizeIsbn(value ?? "");
  return isbn.length === 13 ? `${isbn.slice(0, 3)}-${isbn.slice(3)}` : isbn;
}
