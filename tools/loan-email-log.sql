-- A log of the reminder and overdue emails staff send about a loan, so Circulation can show "Emailed Nov 9 by Dave (2x)".
-- Run in Supabase > SQL Editor (safe to run again). Only active staff and admins can read or add to it.
create table if not exists public.loan_emails (
  id bigserial primary key,
  loan_id bigint not null references public.loans (id) on delete cascade,
  kind text not null check (kind in ('overdue', 'due_soon', 'general')),
  sent_by uuid references public.profiles (id) on delete set null default auth.uid(),
  sent_at timestamptz not null default now()
);
create index if not exists loan_emails_loan on public.loan_emails (loan_id, sent_at desc);

alter table public.loan_emails enable row level security;
drop policy if exists "staff read loan emails" on public.loan_emails;
create policy "staff read loan emails" on public.loan_emails for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin') and p.active));
drop policy if exists "staff log loan emails" on public.loan_emails;
create policy "staff log loan emails" on public.loan_emails for insert to authenticated
  with check (sent_by = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin') and p.active));
grant select, insert on public.loan_emails to authenticated;
grant usage on sequence public.loan_emails_id_seq to authenticated;

notify pgrst, 'reload schema';
