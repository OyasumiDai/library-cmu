-- Only people who typed the code from their email become accounts. Run once in Supabase > SQL Editor (safe to run again).
--
-- Supabase writes a sign-in row (auth.users) the moment someone presses "Create my account", and the site's trigger
-- copies it into public.profiles straight away, so unconfirmed sign-ups showed up as students.
-- After this:
--   1. no profile is made while the email is unconfirmed,
--   2. the profile is made the moment the code is confirmed (the site's own trigger runs again at that point),
--   3. unconfirmed sign-ups are removed: the existing ones now, and new ones after 24 hours.

-- 1. hold back the profile until the email is confirmed
create or replace function public.profile_needs_confirmed_email() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (select 1 from auth.users u where u.id = new.id and u.email_confirmed_at is null) then
    return null; -- skip the insert: not an account yet
  end if;
  return new;
end $$;

drop trigger if exists profiles_need_confirmed_email on public.profiles;
create trigger profiles_need_confirmed_email before insert on public.profiles
  for each row execute function public.profile_needs_confirmed_email();

-- 2. run the site's "new user -> profile" trigger function again when the email gets confirmed
do $$
declare
  fn record;
begin
  select pn.nspname, p.proname into fn
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where tg.tgrelid = 'auth.users'::regclass and not tg.tgisinternal
    and tg.tgname <> 'on_auth_user_confirmed' and p.prosrc ilike '%profiles%'
  limit 1;
  if fn is null then
    raise exception 'No trigger on auth.users creates profiles, so nothing was changed. Send this message to the developer.';
  end if;
  execute 'drop trigger if exists on_auth_user_confirmed on auth.users';
  execute format(
    'create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row '
    'when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function %I.%I()',
    fn.nspname, fn.proname);
  raise notice 'Profiles are now made on confirmation by %.%()', fn.nspname, fn.proname;
end $$;

-- a username someone picked but has not confirmed yet is still taken (otherwise two people could claim it,
-- and the second confirmation would fail); the site's own username_available rules still apply
create or replace function public.username_free(p_username text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select public.username_available(p_username)
     and not exists (select 1 from auth.users
                     where email_confirmed_at is null and created_at > now() - interval '24 hours'
                       and lower(raw_user_meta_data ->> 'username') = lower(p_username));
$$;
grant execute on function public.username_free(text) to anon, authenticated;

-- 3. remove sign-ups that never confirmed (their profile first, then the sign-in row)
create or replace function public.purge_unconfirmed(p_older_than interval default interval '24 hours') returns int
language plpgsql security definer set search_path = public, auth as $$
declare
  removed int := 0;
  u record;
begin
  for u in select id from auth.users where email_confirmed_at is null and created_at < now() - p_older_than loop
    begin
      delete from public.profiles where id = u.id;
      delete from auth.users where id = u.id;
      removed := removed + 1;
    exception when others then
      raise notice 'Kept % (it is linked to other records): %', u.id, sqlerrm;
    end;
  end loop;
  return removed;
end $$;

revoke all on function public.purge_unconfirmed(interval) from public, anon, authenticated;

-- the ones waiting right now: anything unconfirmed for over an hour (the email code lasts an hour, so nobody mid-sign-up is cut off)
select public.purge_unconfirmed(interval '1 hour') as unconfirmed_signups_removed;

-- from now on, every hour, if the pg_cron extension is on (Database > Extensions > pg_cron)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-unconfirmed-signups';
    perform cron.schedule('purge-unconfirmed-signups', '17 * * * *', 'select public.purge_unconfirmed()');
    raise notice 'Hourly clean-up scheduled.';
  else
    raise notice 'pg_cron is off: turn it on and run this file again to remove old unconfirmed sign-ups automatically.';
  end if;
end $$;
