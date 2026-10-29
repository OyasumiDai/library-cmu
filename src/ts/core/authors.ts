// A book's authors: kept as a list (books.authors) and as one line (books.author) that every page already shows.

// the list, from the saved list or, for books saved before there was one, from the line ("A; B")
export function authorsOf(book: { author?: string | null; authors?: string[] | null }): string[] {
  if (book.authors?.length) return book.authors;
  return (book.author ?? "").split(";").map((name) => name.trim()).filter(Boolean);
}

// ["A"] -> "A", ["A", "B"] -> "A and B", ["A", "B", "C"] -> "A, B and C"
export function joinAuthors(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
