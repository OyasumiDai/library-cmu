-- Adds an ISBN to every book and a unique code to every physical copy. Run in Supabase > SQL Editor (safe to run again).
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

-- ---------------------------------------------------------------- copies
-- Every copy on the shelf has its own code: the title's ISBN plus the copy number, e.g. 9780306406157-01.
-- The rows follow books.copies and books.isbn by themselves (trigger below), so nobody types them.
create table if not exists public.book_copies (
  code text primary key,
  book_id text not null references public.books (id) on delete cascade,
  copy_no int not null check (copy_no > 0),
  created_at timestamptz not null default now(),
  unique (book_id, copy_no)
);

alter table public.book_copies enable row level security;
drop policy if exists "copies are readable" on public.book_copies;
create policy "copies are readable" on public.book_copies for select using (true);
grant select on public.book_copies to anon, authenticated;

create or replace function public.sync_book_copies() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- books printed before ISBNs existed (1970) have none; their copies are coded from the book id instead
  base text := coalesce(new.isbn, new.id);
begin
  delete from book_copies where book_id = new.id and copy_no > greatest(new.copies, 0);
  update book_copies set code = base || '-' || lpad(copy_no::text, 2, '0')
    where book_id = new.id and code <> base || '-' || lpad(copy_no::text, 2, '0');
  insert into book_copies (code, book_id, copy_no)
    select base || '-' || lpad(n::text, 2, '0'), new.id, n from generate_series(1, greatest(new.copies, 0)) n
    on conflict (book_id, copy_no) do nothing;
  return new;
end $$;

drop trigger if exists books_sync_copies on public.books;
create trigger books_sync_copies after insert or update of isbn, copies on public.books
  for each row execute function public.sync_book_copies();

-- give every existing book its copy codes now
update public.books set copies = copies;

-- ask PostgREST to see the new column and table right away
notify pgrst, 'reload schema';
