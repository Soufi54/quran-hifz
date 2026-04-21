-- Fix RLS recursion : les policies qui sous-queryent madrasa_members declenchent
-- elles-memes la policy sur madrasa_members => infinite loop => HTTP 500.
-- Solution : une fonction SECURITY DEFINER qui bypasse RLS.

create or replace function public.my_madrasa_ids() returns setof uuid
language sql security definer stable set search_path = public as $$
  select madrasa_id from madrasa_members
  where user_id = auth.uid() and left_at is null;
$$;

grant execute on function public.my_madrasa_ids() to authenticated;

-- Reecrire les policies impactees
drop policy if exists "members_read_same_madrasa" on madrasa_members;
create policy "members_read_same_madrasa"
  on madrasa_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or madrasa_id in (select public.my_madrasa_ids())
  );

drop policy if exists "members_update_self_or_admin" on madrasa_members;
create policy "members_update_self_or_admin"
  on madrasa_members for update
  to authenticated
  using (
    user_id = auth.uid()
    or madrasa_id in (select id from madrasas where admin_id = auth.uid())
  );

drop policy if exists "wird_read_same_madrasa" on wird_logs;
create policy "wird_read_same_madrasa"
  on wird_logs for select
  to authenticated
  using (madrasa_id in (select public.my_madrasa_ids()));

drop policy if exists "wird_write_own" on wird_logs;
create policy "wird_write_own"
  on wird_logs for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and madrasa_id in (select public.my_madrasa_ids())
  );

drop policy if exists "lb_read_same_madrasa" on weekly_leaderboard;
create policy "lb_read_same_madrasa"
  on weekly_leaderboard for select
  to authenticated
  using (madrasa_id in (select public.my_madrasa_ids()));
