-- Obsolete year and archive location for books. Run in Supabase > SQL Editor (safe to run again).
--   books.obsolete_year     the year the book becomes obsolete (from 1 January of that year)
--   books.archive_location  where an archived book is kept ("Archive Room", "Storage Room A", "Donated"...)
--   books.archived_at, books.archive_reason ('obsolete' or 'manual')
-- When a book's obsolete year arrives it is archived by itself; staff then choose where it is kept (the panel asks).
-- A book with copies still out on loan or reserved waits until they are back.
alter table public.books add column if not exists obsolete_year int;
alter table public.books add column if not exists archive_location text;
alter table public.books add column if not exists archived_at timestamptz;
alter table public.books add column if not exists archive_reason text;

-- the books already in the catalog: obsolete 5 years after they were added
update public.books
   set obsolete_year = extract(year from coalesce(created_at, now()) at time zone 'Asia/Manila')::int + 5
 where obsolete_year is null;

-- the places staff pick from (they can also type a new one; edit the list in Settings)
insert into public.site_settings (key, value)
values ('archive_locations', '["Archive Room", "Storage Room A", "Storage Room B", "Donated", "Disposed"]'::jsonb)
on conflict (key) do nothing;

-- archives every book whose obsolete year has come (and that has nothing out on loan or reserved), and says which
create or replace function public.archive_obsolete_books() returns table (id text, title text)
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is not null and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin') and p.active) then
    return; -- students and visitors cannot run it
  end if;
  return query
  update public.books b
     set archived = true, archived_at = now(), archive_reason = 'obsolete', archive_location = null
   where coalesce(b.archived, false) = false
     and b.obsolete_year is not null
     and b.obsolete_year <= extract(year from now() at time zone 'Asia/Manila')::int
     and not exists (select 1 from public.loans l where l.book_id = b.id and l.status in ('requested', 'borrowed'))
  returning b.id::text, b.title;
end $$;
revoke all on function public.archive_obsolete_books() from public, anon;
grant execute on function public.archive_obsolete_books() to authenticated;

-- every day at 00:05 Philippine time (16:05 UTC), if pg_cron is on; the Books page also runs it when staff open it
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'archive-obsolete-books';
    perform cron.schedule('archive-obsolete-books', '5 16 * * *', 'select count(*) from public.archive_obsolete_books()');
  end if;
end $$;

notify pgrst, 'reload schema';

select obsolete_year, count(*) as books from public.books group by obsolete_year order by obsolete_year;
