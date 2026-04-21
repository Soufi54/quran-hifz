-- Les policies weekly_leaderboard n'autorisaient que SELECT. Les insert/update echouaient silencieusement.
-- On permet a tout membre de la madrasa d'insert/update (suffisant pour V1 — V2 via RPC security definer).

drop policy if exists "lb_insert_same_madrasa" on weekly_leaderboard;
create policy "lb_insert_same_madrasa"
  on weekly_leaderboard for insert
  to authenticated
  with check (madrasa_id in (select public.my_madrasa_ids()));

drop policy if exists "lb_update_same_madrasa" on weekly_leaderboard;
create policy "lb_update_same_madrasa"
  on weekly_leaderboard for update
  to authenticated
  using (madrasa_id in (select public.my_madrasa_ids()))
  with check (madrasa_id in (select public.my_madrasa_ids()));
