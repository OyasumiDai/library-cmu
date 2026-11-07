-- Student feedback: a star rating (1 to 5) and a suggestion about the website or the 2D-3D game.
-- Run in Supabase > SQL Editor (safe to run again).
--   Students send it from the Feedback page and see their own; staff with the "Student Profiles" permission and admins
--   read it on the student's profile in Students, and get a notification when new feedback arrives.
create table if not exists public.feedback (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  topic text not null check (topic in ('system', 'game')),
  rating int not null check (rating between 1 and 5),
  suggestion text not null default '' check (char_length(suggestion) <= 1000),
  is_read boolean not null default false, -- a staff member or admin has opened it
  read_by uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists feedback_user on public.feedback (user_id, created_at desc);
create index if not exists feedback_unread on public.feedback (is_read) where not is_read;

alter table public.feedback enable row level security;

-- a signed-in, active student sends feedback as themselves (at most 5 in a day, so nobody floods the list)
drop policy if exists "students send feedback" on public.feedback;
create policy "students send feedback" on public.feedback for insert to authenticated
  with check (
    user_id = auth.uid() and not is_read and read_by is null and read_at is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student' and p.active)
    and (select count(*) from public.feedback f where f.user_id = auth.uid() and f.created_at > now() - interval '1 day') < 5
  );

-- students read their own; staff with the Student Profiles permission and admins read everyone's
drop policy if exists "read feedback" on public.feedback;
create policy "read feedback" on public.feedback for select to authenticated
  using (user_id = auth.uid() or public.has_permission('students'));

-- staff mark it as read (they cannot change what the student wrote: see the guard below)
drop policy if exists "staff mark feedback read" on public.feedback;
create policy "staff mark feedback read" on public.feedback for update to authenticated
  using (public.has_permission('students')) with check (public.has_permission('students'));

create or replace function public.feedback_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    -- only the read mark changes; the rating and the words stay as the student sent them
    new.user_id := old.user_id; new.topic := old.topic; new.rating := old.rating; new.suggestion := old.suggestion; new.created_at := old.created_at;
    if new.is_read and not old.is_read then new.read_by := auth.uid(); new.read_at := now(); end if;
    if not new.is_read then new.read_by := null; new.read_at := null; end if;
  else
    new.suggestion := btrim(coalesce(new.suggestion, ''));
    new.created_at := now();
  end if;
  return new;
end $$;
drop trigger if exists feedback_guard on public.feedback;
create trigger feedback_guard before insert or update on public.feedback
  for each row execute function public.feedback_guard();

-- tell the admins and the staff who can see student profiles that new feedback came in
create or replace function public.feedback_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who text := coalesce((select coalesce(nullif(p.full_name, ''), p.username) from public.profiles p where p.id = new.user_id), 'A student');
begin
  insert into public.notifications (user_id, title, message, type)
  select p.id, 'New student feedback',
         format('%s rated the %s %s out of 5. Read it on their profile in Students.', who,
                case when new.topic = 'game' then '2D-3D game' else 'library website' end, new.rating),
         'feedback'
    from public.profiles p
   where p.active and (p.role = 'admin' or (p.role = 'staff' and 'students' = any (p.permissions)));
  return null;
end $$;
drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify after insert on public.feedback
  for each row execute function public.feedback_notify();

grant select, insert, update on public.feedback to authenticated;
grant usage on sequence public.feedback_id_seq to authenticated;

notify pgrst, 'reload schema';
