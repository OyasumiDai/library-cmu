-- Admin approval for books added by staff. Run in Supabase > SQL Editor (safe to run again).
--   A book a STAFF member adds is "pending": it stays out of the catalog (kept archived) until an admin decides.
--   The admin approves it (it goes live) or asks for a revision with a note; the staff member edits it, which sends it back.
--   Books added by an ADMIN, and every book already in the catalog, are approved.
-- The rules are enforced here, so a staff member cannot approve or publish their own book from anywhere.
alter table public.books add column if not exists approval_status text not null default 'approved';
alter table public.books add column if not exists review_note text;
alter table public.books add column if not exists submitted_by uuid references public.profiles (id) on delete set null;
alter table public.books add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.books add column if not exists reviewed_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'books_approval_status_check') then
    alter table public.books add constraint books_approval_status_check check (approval_status in ('approved', 'pending', 'revision'));
  end if;
end $$;

create or replace function public.is_active_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.active);
$$;

-- every insert and update of a book passes here
create or replace function public.book_approval_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_active_admin();
begin
  if auth.uid() is null then return new; end if; -- the SQL Editor, scheduled jobs and the server itself
  if tg_op = 'INSERT' then
    new.submitted_by := auth.uid();
    if admin then
      new.approval_status := 'approved'; new.reviewed_by := auth.uid(); new.reviewed_at := now(); new.review_note := null;
    else
      new.approval_status := 'pending'; new.archived := true; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
    end if;
  elsif not admin then
    -- staff never change the decision; a book still waiting stays out of the catalog, and an edit to it is a resubmission
    new.submitted_by := old.submitted_by; new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at; new.review_note := old.review_note;
    if old.approval_status in ('pending', 'revision') then
      new.approval_status := 'pending';
      new.archived := true;
    else
      new.approval_status := old.approval_status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists books_approval_guard on public.books;
create trigger books_approval_guard before insert or update on public.books
  for each row execute function public.book_approval_guard();

-- tell every admin when a book starts (or goes back to) waiting
create or replace function public.book_approval_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who text := coalesce((select coalesce(nullif(p.full_name, ''), p.username) from public.profiles p where p.id = new.submitted_by), 'A staff member');
begin
  if new.approval_status = 'pending' and (tg_op = 'INSERT' or old.approval_status is distinct from 'pending') then
    insert into public.notifications (user_id, title, message, type)
    select p.id,
           case when tg_op = 'INSERT' then 'Book waiting for approval' else 'Book resubmitted for approval' end,
           format('%s %s "%s". Review it in Books.', who, case when tg_op = 'INSERT' then 'added' else 'revised' end, new.title),
           'approval'
      from public.profiles p where p.role = 'admin' and p.active;
  end if;
  return null;
end $$;

drop trigger if exists books_approval_notify on public.books;
create trigger books_approval_notify after insert or update on public.books
  for each row execute function public.book_approval_notify();

-- the admin's decision: 'approve' publishes the book, 'revise' sends it back with a note; the staff member is told either way
create or replace function public.review_book(p_book_id text, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.books;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_active_admin() then raise exception 'Only an admin can approve books.'; end if;
  select * into b from public.books where id = p_book_id;
  if not found then raise exception 'That book no longer exists.'; end if;
  if b.approval_status = 'approved' then raise exception 'That book is already approved.'; end if;
  if p_decision = 'approve' then
    update public.books set approval_status = 'approved', archived = false, review_note = note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_book_id;
  elsif p_decision = 'revise' then
    if note is null then raise exception 'Say what needs to change, so the staff member knows what to fix.'; end if;
    update public.books set approval_status = 'revision', review_note = note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_book_id;
  else
    raise exception 'Choose approve or revise.';
  end if;
  if b.submitted_by is not null and b.submitted_by <> auth.uid() then
    insert into public.notifications (user_id, title, message, type)
    values (b.submitted_by,
            case when p_decision = 'approve' then 'Book approved' else 'Book needs revision' end,
            case when p_decision = 'approve' then format('"%s" was approved and is now in the catalog.%s', b.title, coalesce(' Note: ' || note, ''))
                 else format('"%s" needs changes before it can go in the catalog: %s', b.title, note) end,
            'approval');
  end if;
end $$;
revoke all on function public.review_book(text, text, text) from public, anon;
grant execute on function public.review_book(text, text, text) to authenticated;

notify pgrst, 'reload schema';

select approval_status, count(*) as books from public.books group by approval_status;
