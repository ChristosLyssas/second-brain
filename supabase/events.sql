-- Run once in Supabase → SQL Editor.
-- Calendar events (concerts, appointments, birthdays…) that aren't goals.

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  all_day     boolean not null default true,
  start_time  time,
  end_time    time,
  location    text,
  notes       text,
  color       text,
  repeat      text not null default 'none' check (repeat in ('none','weekly','monthly','yearly')),
  created_at  timestamptz not null default now()
);

create index if not exists events_user_date_idx on public.events (user_id, event_date);

-- Row Level Security: everyone sees and edits only their own events
alter table public.events enable row level security;

drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

create policy "events_select_own" on public.events for select to authenticated using (user_id = auth.uid());
create policy "events_insert_own" on public.events for insert to authenticated with check (user_id = auth.uid());
create policy "events_update_own" on public.events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "events_delete_own" on public.events for delete to authenticated using (user_id = auth.uid());
