-- Mini-Madrasa — schema V2
-- Applique ce script sur un nouveau projet Supabase (SQL Editor).
-- Voir ../rls-policies.sql pour les Row Level Security.
-- Voir ../../docs/MIGRATION_SUPABASE.md pour le pas-a-pas de migration.

-- Extensions utiles
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Profiles (1 ligne par user authentifie)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null unique,
  friend_code text not null unique check (length(friend_code) = 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-generation du friend_code a la creation du profil
create or replace function gen_friend_code() returns text language sql as $$
  select upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
$$;

-- ============================================================
-- 2. Madrasas
-- ============================================================
create table if not exists madrasas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  invite_code text not null unique check (length(invite_code) = 6),
  admin_id uuid not null references profiles(id) on delete cascade,
  max_members integer not null default 50 check (max_members between 2 and 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_madrasas_admin on madrasas(admin_id);

-- ============================================================
-- 3. Membres des madrasas (avec soft delete pour garder l'historique)
-- ============================================================
create table if not exists madrasa_members (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references madrasas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz, -- null = actif, date = parti (stats conservees)
  unique(madrasa_id, user_id)
);

create index if not exists idx_members_user on madrasa_members(user_id);
create index if not exists idx_members_madrasa_active on madrasa_members(madrasa_id) where left_at is null;

-- Limite 5 madrasas actives par user
create or replace function enforce_max_madrasas() returns trigger language plpgsql as $$
declare
  active_count integer;
begin
  if new.left_at is null then
    select count(*) into active_count
    from madrasa_members
    where user_id = new.user_id and left_at is null;
    if active_count >= 5 then
      raise exception 'Un user ne peut etre dans que 5 madrasas actives';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_max_madrasas on madrasa_members;
create trigger trg_enforce_max_madrasas
  before insert or update on madrasa_members
  for each row execute function enforce_max_madrasas();

-- ============================================================
-- 4. Wird quotidien (V1 : bouton fait/pas fait)
-- ============================================================
create table if not exists wird_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  madrasa_id uuid not null references madrasas(id) on delete cascade,
  log_date date not null,
  done boolean not null default false,
  validated_at timestamptz,
  unique(user_id, madrasa_id, log_date)
);

create index if not exists idx_wird_madrasa_date on wird_logs(madrasa_id, log_date);

-- ============================================================
-- 5. Classement hebdomadaire
-- ============================================================
create table if not exists weekly_leaderboard (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references madrasas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null, -- vendredi de debut de semaine
  wird_days integer not null default 0 check (wird_days between 0 and 7),
  quiz_xp integer not null default 0,
  rank integer,
  is_winner boolean not null default false,
  unique(madrasa_id, user_id, week_start)
);

create index if not exists idx_lb_madrasa_week on weekly_leaderboard(madrasa_id, week_start);

-- ============================================================
-- 6. Challenges 1v1
-- ============================================================
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid references madrasas(id) on delete cascade, -- nullable : defi entre amis hors madrasa
  challenger_id uuid not null references profiles(id) on delete cascade,
  opponent_id uuid not null references profiles(id) on delete cascade,
  surah_numbers integer[] not null,
  num_questions integer not null default 5 check (num_questions in (5, 10)),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'refused', 'expired')),
  challenger_score integer,
  opponent_score integer,
  winner_id uuid references profiles(id),
  xp_reward integer not null default 50,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  check (challenger_id <> opponent_id)
);

create index if not exists idx_chall_opponent_pending on challenges(opponent_id) where status = 'pending';
create index if not exists idx_chall_challenger on challenges(challenger_id);

-- ============================================================
-- 7. Amis
-- ============================================================
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade, -- emetteur de la demande
  friend_id uuid not null references profiles(id) on delete cascade, -- destinataire
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique(user_id, friend_id)
);

create index if not exists idx_friend_friend on friendships(friend_id) where status = 'pending';

-- ============================================================
-- 8. Trigger de creation de profil a la signup auth.users
-- ============================================================
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_code text;
begin
  -- Essaie max 5 fois pour eviter collision
  for i in 1..5 loop
    new_code := gen_friend_code();
    begin
      insert into profiles (id, pseudo, friend_code)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)),
        new_code
      );
      exit;
    exception when unique_violation then
      if i = 5 then raise; end if;
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 9. Cron hebdo : cloture du leaderboard vendredi 00:00 UTC
-- Necessite l'extension pg_cron (activee dans Supabase Dashboard > Database > Extensions)
-- ============================================================
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'close-weekly-leaderboards',
--   '0 0 * * 5', -- tous les vendredis a minuit UTC
--   $$
--   update weekly_leaderboard
--   set is_winner = true
--   where week_start = current_date - interval '7 days'
--     and rank = 1;
--   $$
-- );
