-- Several authors per book, and the book's edition or version. Run in Supabase > SQL Editor (safe to run again).
--   books.authors  text[]  every author, in order (the panel's Add a book form fills it)
--   books.edition  text    for example "2nd edition", "Revised edition, 2015", "Anvil Classics"
-- books.author stays as the one-line name list ("A, B and C") that the catalog, emails, reports and the game already show.
alter table public.books add column if not exists authors text[];
alter table public.books add column if not exists edition text;

-- existing books: their author line becomes the first list (names written as "A; B" are split)
update public.books
   set authors = array(select btrim(x) from unnest(string_to_array(author, ';')) x where btrim(x) <> '')
 where authors is null and coalesce(btrim(author), '') <> '';

notify pgrst, 'reload schema';
