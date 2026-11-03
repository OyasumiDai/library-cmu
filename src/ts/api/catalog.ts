import { db } from "../core/supabase";
import { mailLoan } from "./loans";
import type { Book, CatalogBook, CatalogPage } from "../types";

export interface CatalogQuery {
  query: string;
  category: string;
  availability: "all" | "available" | "unavailable";
  page: number;
  pageSize: number;
}

export async function searchCatalog(q: CatalogQuery): Promise<CatalogPage> {
  const { data, error } = await db().rpc("catalog_search", {
    p_query: q.query,
    p_category: q.category,
    p_availability: q.availability,
    p_limit: q.pageSize,
    p_offset: (q.page - 1) * q.pageSize,
  });
  if (error) throw error;
  const rows = ((data ?? []) as (CatalogBook & { total_count: number })[]).map((r) => ({ ...r, borrowed: Number(r.borrowed ?? 0), reserved: Number(r.reserved ?? 0) }));
  return { books: rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export async function categories(): Promise<{ category: string; total: number }[]> {
  const { data, error } = await db().rpc("catalog_categories");
  if (error) throw error;
  return ((data ?? []) as { category: string; total: number }[]).map((row) => ({ category: row.category, total: Number(row.total) }));
}

export async function featuredBooks(limit = 6): Promise<Book[]> {
  const { data, error } = await db().from("books").select("*").eq("archived", false).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function requestBook(bookId: string): Promise<void> {
  const { data, error } = await db().rpc("request_book", { p_book_id: bookId });
  if (error) throw error;
  void mailLoan(Number(data), "requested");
}

export async function markRead(bookId: string): Promise<void> {
  const { error } = await db().rpc("mark_read", { p_book_id: bookId });
  if (error) throw error;
}
