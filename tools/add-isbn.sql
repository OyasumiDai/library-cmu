-- Adds an ISBN to every book. Run once in Supabase > SQL Editor (safe to run again).
-- The book's own id stays as it is: loans, requests and reading history point to it, so it must never change.
-- The ISBN is what staff see and type; it is stored as bare digits (an ISBN-10 may end in X) and must be unique.
alter table public.books add column if not exists isbn text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'books_isbn_format') then
    alter table public.books add constraint books_isbn_format check (isbn is null or isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$');
  end if;
end $$;

create unique index if not exists books_isbn_unique on public.books (isbn) where isbn is not null;

-- ask PostgREST to see the new column right away
notify pgrst, 'reload schema';
