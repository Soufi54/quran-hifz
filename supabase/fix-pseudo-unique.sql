-- Fix trigger handle_new_user : si le pseudo est deja pris, append un numero.
-- Avant : unique_violation -> le trigger crashe (mais l'user est cree en auth sans profil).

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_code text;
  base_pseudo text;
  final_pseudo text;
  suffix int := 2;
begin
  base_pseudo := trim(coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)));
  if base_pseudo = '' then base_pseudo := 'User'; end if;
  -- tronquer pour eviter overflow
  base_pseudo := substring(base_pseudo from 1 for 25);
  final_pseudo := base_pseudo;

  -- Essayer jusqu'a 50 variantes
  while suffix < 52 loop
    -- generer un friend_code unique (5 tentatives)
    for i in 1..5 loop
      new_code := gen_friend_code();
      begin
        insert into profiles (id, pseudo, friend_code)
        values (new.id, final_pseudo, new_code);
        return new;
      exception
        when unique_violation then
          if sqlerrm like '%pseudo%' then
            exit; -- pseudo collision, on change de pseudo
          end if;
          -- sinon c'est friend_code collision, retry generate code
      end;
    end loop;
    final_pseudo := base_pseudo || suffix::text;
    suffix := suffix + 1;
  end loop;

  -- Fallback extreme : uuid tronque
  insert into profiles (id, pseudo, friend_code)
  values (new.id, base_pseudo || '-' || substring(new.id::text from 1 for 4), gen_friend_code());
  return new;
end;
$$;
