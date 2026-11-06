-- Run once in Supabase → SQL Editor.
-- Lets a signed-in user delete their own account and all of their data
-- (used by Profile → "Delete account"; required by the Play Store).
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- events: removed by "on delete cascade" (supabase/events.sql); explicit here in case the table is older
  if to_regclass('public.events') is not null then
    execute 'delete from public.events where user_id = $1' using uid;
  end if;
  delete from public.transactions where user_id = uid;
  delete from public.notes        where user_id = uid;
  delete from public.goals        where user_id = uid;
  delete from auth.users          where id = uid;
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
