-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Each row holds one workout/run as JSON, owned by the signed-in user.

create table if not exists public.workouts (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.runs (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.workouts enable row level security;
alter table public.runs enable row level security;

-- Users can only see and change their own rows.
create policy "own workouts" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own runs" on public.runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
