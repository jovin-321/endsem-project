-- =========================================================
-- SpendWise – database setup for Supabase
-- Run this once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again (it will not delete any data).
-- =========================================================

-- One row per saved item, per user (e.g. 'spendwise.family.members').
create table if not exists public.app_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row Level Security: the database itself makes sure a logged-in user can
-- only ever see or change THEIR OWN rows – even though the app talks to the
-- database straight from the browser.
alter table public.app_state enable row level security;

drop policy if exists "own rows - select" on public.app_state;
drop policy if exists "own rows - insert" on public.app_state;
drop policy if exists "own rows - update" on public.app_state;
drop policy if exists "own rows - delete" on public.app_state;

create policy "own rows - select" on public.app_state
  for select to authenticated
  using (auth.uid() = user_id);

create policy "own rows - insert" on public.app_state
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "own rows - update" on public.app_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own rows - delete" on public.app_state
  for delete to authenticated
  using (auth.uid() = user_id);