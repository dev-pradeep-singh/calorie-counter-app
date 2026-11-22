-- Daily AI scan counter, one row per user per UTC day.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Users can read their own count but cannot write it: there are no
-- insert/update/delete policies, so the only way to change a count is
-- use_scan() below, which can only ever add one to the caller's own row.

create table if not exists public.scan_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table public.scan_usage enable row level security;

drop policy if exists "Users read own scan usage" on public.scan_usage;
create policy "Users read own scan usage" on public.scan_usage
  for select using (auth.uid() = user_id);

-- Uses one scan for the signed-in user if they are under p_limit today.
-- Returns the new count, or null when the limit was already reached.
-- Atomic: parallel requests cannot push the count past the limit.
create or replace function public.use_scan(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  n integer;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_limit < 1 then
    return null;
  end if;
  insert into public.scan_usage as s (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set count = s.count + 1
    where s.count < p_limit
  returning s.count into n;
  return n;
end;
$$;

revoke all on function public.use_scan(integer) from public, anon;
grant execute on function public.use_scan(integer) to authenticated;
