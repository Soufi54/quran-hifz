-- Mini-Madrasa — Row Level Security
-- Applique ce script apres 001_madrasa_schema.sql.

-- ============================================================
-- Profiles
-- ============================================================
alter table profiles enable row level security;

-- Lecture publique (tout user authentifie peut voir les pseudos et codes amis)
-- ... necessaire pour chercher par @pseudo ou par code ami
create policy "profiles_read_all"
  on profiles for select
  to authenticated
  using (true);

-- Chaque user ne peut modifier que son propre profil
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Insertion geree par le trigger handle_new_user, donc pas besoin de policy insert.

-- ============================================================
-- Madrasas
-- ============================================================
alter table madrasas enable row level security;

-- Lecture : tout user authentifie peut lire les madrasas (needed pour landing d'invitation)
create policy "madrasas_read_all"
  on madrasas for select
  to authenticated
  using (true);

-- Creation : l'admin_id doit etre auth.uid()
create policy "madrasas_insert_self"
  on madrasas for insert
  to authenticated
  with check (admin_id = auth.uid());

-- Update / delete : admin uniquement
create policy "madrasas_update_admin"
  on madrasas for update
  to authenticated
  using (admin_id = auth.uid())
  with check (admin_id = auth.uid());

create policy "madrasas_delete_admin"
  on madrasas for delete
  to authenticated
  using (admin_id = auth.uid());

-- ============================================================
-- Madrasa members
-- ============================================================
alter table madrasa_members enable row level security;

-- Lecture : un user voit les membres des madrasas dans lesquelles il est lui-meme membre
create policy "members_read_same_madrasa"
  on madrasa_members for select
  to authenticated
  using (
    madrasa_id in (
      select madrasa_id from madrasa_members
      where user_id = auth.uid() and left_at is null
    )
  );

-- Ajout : un user ne peut s'ajouter que lui-meme (via jointure par code)
create policy "members_insert_self"
  on madrasa_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update : l'user concerne OU l'admin (pour kick / reactiver)
create policy "members_update_self_or_admin"
  on madrasa_members for update
  to authenticated
  using (
    user_id = auth.uid()
    or madrasa_id in (select id from madrasas where admin_id = auth.uid())
  );

-- ============================================================
-- Wird logs
-- ============================================================
alter table wird_logs enable row level security;

-- Lecture : membres de la meme madrasa se voient
create policy "wird_read_same_madrasa"
  on wird_logs for select
  to authenticated
  using (
    madrasa_id in (
      select madrasa_id from madrasa_members
      where user_id = auth.uid() and left_at is null
    )
  );

-- Ecriture : chaque user ne peut ecrire que son propre wird, dans une madrasa dont il est membre
create policy "wird_write_own"
  on wird_logs for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and madrasa_id in (
      select madrasa_id from madrasa_members
      where user_id = auth.uid() and left_at is null
    )
  );

create policy "wird_update_own"
  on wird_logs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Weekly leaderboard
-- ============================================================
alter table weekly_leaderboard enable row level security;

create policy "lb_read_same_madrasa"
  on weekly_leaderboard for select
  to authenticated
  using (
    madrasa_id in (
      select madrasa_id from madrasa_members
      where user_id = auth.uid() and left_at is null
    )
  );

-- L'ecriture du leaderboard est geree cote serveur (edge function / RPC SECURITY DEFINER).
-- Aucune policy insert/update en acces direct client.

-- ============================================================
-- Challenges
-- ============================================================
alter table challenges enable row level security;

create policy "chall_read_involved"
  on challenges for select
  to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid());

create policy "chall_insert_self"
  on challenges for insert
  to authenticated
  with check (challenger_id = auth.uid());

-- Update : le challenger peut enregistrer son score, l'opponent peut accepter/refuser/enregistrer
create policy "chall_update_involved"
  on challenges for update
  to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid())
  with check (challenger_id = auth.uid() or opponent_id = auth.uid());

-- ============================================================
-- Friendships
-- ============================================================
alter table friendships enable row level security;

create policy "friend_read_involved"
  on friendships for select
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

create policy "friend_insert_self"
  on friendships for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update : le destinataire accepte
create policy "friend_update_recipient"
  on friendships for update
  to authenticated
  using (friend_id = auth.uid())
  with check (friend_id = auth.uid());

-- Delete : soit l'emetteur, soit le destinataire
create policy "friend_delete_involved"
  on friendships for delete
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
