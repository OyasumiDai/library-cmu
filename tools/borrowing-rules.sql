-- Borrowing rules from the Library Operational Manual (2024 edition). Run in Supabase > SQL Editor (safe to run again).
--
--   Material                  Loan period   Overdue fine
--   Circulation / Reserve     3 days        Php 20.00 per day (excluding weekends and holidays)
--   Fiction                   5 days        Php 10.00 per day (excluding weekends and holidays)
--
-- What this adds:
--   1. books.material: 'circulation' or 'fiction' (set once from the genre; staff change it in Edit book)
--   2. at pickup the database sets the due date from the material (moved off weekends and holidays)
--   3. loan_fines(): the fine of any loan, counted every weekday after the due date until the book is returned
--   4. requests not picked up within 2 days are cancelled (note: "Not picked up within 2 days"); the student is emailed
--   5. settings: loan_rules, pickup_hours, holidays (all editable in the panel under Settings > Borrowing)

-- ---------------------------------------------------------------- 1. material of each book
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'books' and column_name = 'material') then
    alter table public.books add column material text not null default 'circulation';
    alter table public.books add constraint books_material_check check (material in ('circulation', 'fiction'));
    -- first time only: novels and stories are Fiction; plays, poetry, memoirs and the rest stay Circulation
    update public.books set material = 'fiction'
      where genre ~* '(fiction|novel|fantasy|romance|mystery|horror|gothic|satire|saga|dystopian|magical realism|bildungsroman|coming-of-age|adventure|detective|crime|allegory|folktale)'
        and genre !~* '^\s*(poetry|drama|memoir|epic poetry,\s*religious)';
  end if;
end $$;

-- ---------------------------------------------------------------- 5. the settings (kept if they already exist)
insert into public.site_settings (key, value) values
  ('loan_rules', '{"circulation": {"label": "Circulation / Reserve", "days": 3, "fine": 20}, "fiction": {"label": "Fiction", "days": 5, "fine": 10}}'::jsonb),
  ('pickup_hours', '48'::jsonb),
  -- Philippine regular holidays and special non-working days (Proclamation dates; add or remove in Settings)
  ('holidays', '["2026-11-01","2026-11-02","2026-11-30","2026-12-08","2026-12-24","2026-12-25","2026-12-30","2026-12-31",
                 "2027-01-01","2027-03-25","2027-03-26","2027-03-27","2027-04-09","2027-05-01","2027-06-12","2027-08-21","2027-08-30",
                 "2027-11-01","2027-11-02","2027-11-30","2027-12-08","2027-12-24","2027-12-25","2027-12-30","2027-12-31"]'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------- 2. due date at pickup
-- a weekend or a listed holiday (dates in Philippine time)
create or replace function public.library_day_off(p_day date) returns boolean
language sql stable set search_path = public as $$
  select extract(isodow from p_day) in (6, 7)
      or exists (select 1 from public.site_settings s
                 where s.key = 'holidays' and jsonb_typeof(s.value) = 'array' and s.value ? p_day::text);
$$;

-- the end of the library day, N days after pickup, moved forward past weekends and holidays
create or replace function public.library_due_at(p_from timestamptz, p_days int) returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  d date := (p_from at time zone 'Asia/Manila')::date + greatest(p_days, 1);
begin
  while public.library_day_off(d) loop d := d + 1; end loop;
  return (d + time '23:59:59') at time zone 'Asia/Manila';
end $$;

create or replace function public.loan_rule(p_material text) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(
    (select s.value -> coalesce(p_material, 'circulation') from public.site_settings s where s.key = 'loan_rules'),
    case when p_material = 'fiction' then '{"label": "Fiction", "days": 5, "fine": 10}'::jsonb
         else '{"label": "Circulation / Reserve", "days": 3, "fine": 20}'::jsonb end);
$$;

-- whatever hands the book over (website, scanner, game), the due date follows the book's material
create or replace function public.loan_due_by_material() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rule jsonb;
begin
  if new.status = 'borrowed' and (tg_op = 'INSERT' or old.status is distinct from 'borrowed') then
    select public.loan_rule(b.material) into rule from public.books b where b.id = new.book_id;
    new.due_at := public.library_due_at(coalesce(new.borrowed_at, now()), coalesce((rule ->> 'days')::int, 3));
  end if;
  return new;
end $$;

drop trigger if exists loans_due_by_material on public.loans;
create trigger loans_due_by_material before insert or update of status on public.loans
  for each row execute function public.loan_due_by_material();

-- ---------------------------------------------------------------- 3. fines
-- weekdays (not holidays) after the due date, up to and including p_until's day
create or replace function public.library_fine_days(p_due timestamptz, p_until timestamptz) returns int
language sql stable set search_path = public as $$
  select count(*)::int
  from generate_series((p_due at time zone 'Asia/Manila')::date + 1, (p_until at time zone 'Asia/Manila')::date, interval '1 day') g(day)
  where not public.library_day_off(g.day::date);
$$;

-- the fine of each loan: the student sees their own, staff see everyone's
create or replace function public.loan_fines(p_ids bigint[])
returns table (loan_id bigint, material text, label text, loan_days int, rate numeric, fine_days int, amount numeric, pickup_by timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id::bigint, b.material, r.rule ->> 'label', (r.rule ->> 'days')::int, (r.rule ->> 'fine')::numeric, f.days, f.days * (r.rule ->> 'fine')::numeric,
         case when l.status = 'requested' then l.requested_at + make_interval(hours => coalesce((select (s.value #>> '{}')::int from public.site_settings s where s.key = 'pickup_hours'), 48)) end
  from public.loans l
  join public.books b on b.id = l.book_id
  cross join lateral (select public.loan_rule(b.material) as rule) r
  cross join lateral (select case when l.due_at is null or l.status not in ('borrowed', 'returned') then 0
                                  else public.library_fine_days(l.due_at, coalesce(l.returned_at, now())) end as days) f
  where l.id = any(p_ids)
    and (l.user_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin') and p.active));
$$;
grant execute on function public.loan_fines(bigint[]) to authenticated;

-- ---------------------------------------------------------------- 4. requests not picked up in time
-- cancels them and returns which ones, so whoever ran it can email the students (the mail hook also emails, if it is set up).
-- A student only gets their own back; staff get all of them.
create or replace function public.expire_unclaimed_requests() returns table (loan_id bigint, user_id uuid)
language plpgsql volatile security definer set search_path = public as $$
declare
  staff boolean := exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin') and p.active);
begin
  return query
  with gone as (
    update public.loans l
       set status = 'cancelled', note = 'Not picked up within 2 days'
     where l.status = 'requested'
       and l.requested_at < now() - make_interval(hours => coalesce((select (s.value #>> '{}')::int from public.site_settings s where s.key = 'pickup_hours'), 48))
    returning l.id, l.user_id)
  select g.id::bigint, g.user_id from gone g
  where staff or auth.uid() is null or g.user_id = auth.uid();
end $$;
revoke all on function public.expire_unclaimed_requests() from public, anon;
grant execute on function public.expire_unclaimed_requests() to authenticated;

-- every 15 minutes, if pg_cron is on (Database > Extensions > pg_cron); the website also runs it whenever staff or students open their pages
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'expire-unclaimed-requests';
    perform cron.schedule('expire-unclaimed-requests', '*/15 * * * *', 'select count(*) from public.expire_unclaimed_requests()');
  end if;
end $$;

notify pgrst, 'reload schema';

-- how the books were sorted
select material, count(*) as books from public.books group by material order by material;
