# Migration V1 (local) → V2 (Supabase) — Mini-Madrasa

Quand tu es pret a activer Supabase pour avoir un vrai multi-device + multi-user reel,
suis ces etapes dans l'ordre.

## 1. Creer le projet Supabase

1. Aller sur https://supabase.com/dashboard → **New project**
2. Nom : `quranhifz-prod` (ou `quranhifz-dev` pour tester)
3. Region : `eu-west-3` (Paris) ou `eu-west-2` (Londres)
4. Mot de passe DB : genere un fort, garde-le dans ton password manager
5. Plan : **Free** suffit pour commencer (500 Mo DB, 1 Go bandwidth / mois)

## 2. Activer les extensions utiles

Dans le dashboard Supabase :

- `Database > Extensions` → activer `pgcrypto` (pour `gen_random_uuid`)
- Optionnel : `pg_cron` (pour le reset hebdo automatique du leaderboard)

## 3. Appliquer le schema

Dans `SQL Editor` du dashboard, copier-coller ces fichiers dans l'ordre :

1. `supabase/migrations/001_madrasa_schema.sql` — tables + triggers + indexes
2. `supabase/rls-policies.sql` — Row Level Security

Verifier dans `Table Editor` que toutes les tables sont creees :
`profiles`, `madrasas`, `madrasa_members`, `wird_logs`, `weekly_leaderboard`,
`challenges`, `friendships`.

## 4. Configurer l'auth

Dans `Authentication > Providers` :

- **Email** : activer (avec double-opt-in par defaut)
- **Google** : activer, configurer OAuth credentials
- **Apple** (optionnel, obligatoire pour iOS store)

Dans `Authentication > URL Configuration` :

- Site URL : `https://quranhifz.pages.dev`
- Redirect URLs : `https://quranhifz.pages.dev/**`, `http://localhost:3000/**`

## 5. Recuperer les cles

Dans `Project Settings > API` :

- `URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Creer `~/work/quran-duel/.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Ajouter `.env.local` a `.gitignore` si pas deja.

## 6. Installer le client Supabase

```bash
cd ~/work/quran-duel
npm install @supabase/supabase-js
```

## 7. Implementer SupabaseMadrasaStore

Ouvrir `src/lib/madrasa/supabase-store.ts`. Remplacer le stub par une vraie
implementation qui respecte l'interface `MadrasaStore` (voir `store.ts`).

Chaque methode appelle le client Supabase. Exemple :

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export class SupabaseMadrasaStore implements MadrasaStore {
  async listMyMadrasas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('madrasa_members')
      .select('madrasas(*)')
      .eq('user_id', user.id)
      .is('left_at', null);
    return (data ?? []).map(d => d.madrasas).filter(Boolean);
  }
  // ... autres methodes
}
```

Les types TS dans `types.ts` matchent le schema SQL exactement, donc ca devrait
etre mecanique.

## 8. Basculer le store

Dans `src/lib/madrasa/index.ts` :

```diff
- import { LocalMadrasaStore } from './local-store';
+ import { SupabaseMadrasaStore } from './supabase-store';

  let instance: MadrasaStore | null = null;

  export function madrasaStore(): MadrasaStore {
    if (!instance) {
-     instance = new LocalMadrasaStore();
+     instance = new SupabaseMadrasaStore();
    }
    return instance;
  }
```

## 9. Remplacer le UserSwitcher par la vraie auth

Remplacer `src/components/UserSwitcher.tsx` dans `src/app/madrasa/page.tsx` par
un bouton `Connexion` qui appelle `supabase.auth.signInWithOtp()` ou
`signInWithOAuth()`, et un bouton `Deconnexion` s'il est deja connecte.

Enlever le seed de 4 users factices du `LocalMadrasaStore`.

## 10. (Optionnel) Import des donnees locales

Pour ne pas perdre ce que les beta-testeurs ont cree en V1 :

1. Ajouter un bouton "Importer mes donnees locales" dans les settings
2. Apres login Supabase, lire `localStorage` avec `new LocalMadrasaStore().exportRaw()`
3. Envoyer les donnees vers Supabase via des insert batch (en respectant les IDs)
4. Vider ensuite les cles `qh_madrasa_*` du localStorage

## 11. Deploy

Configurer les env vars `NEXT_PUBLIC_SUPABASE_*` dans Cloudflare Pages
(dashboard > Settings > Environment variables).

Push la branche, verifier que le deploy passe.

## 12. Surveiller

- `Supabase Dashboard > Database > Table Editor` : voir les donnees creees
- `Dashboard > Logs` : erreurs RLS / auth
- `Dashboard > API > Auth Users` : comptes crees

## Pieges connus

- **RLS bloque trop** : verifier que les policies dans `rls-policies.sql` sont bien
  appliquees. Sinon : toutes les requetes renvoient des listes vides sans erreur.
- **Trigger `handle_new_user` echoue** : si le pseudo est deja pris, la signup
  echoue. Ajouter un fallback ou demander le pseudo a l'onboarding.
- **Cron hebdo** : pg_cron ne tourne pas en free tier sur tous les plans. Fallback
  : Edge Function + cron.job.org externe qui hit l'endpoint une fois par semaine.
- **Offline** : le client Supabase ne fait pas de sync offline out-of-the-box. Soit
  garder `LocalMadrasaStore` en cache + flush on reconnect, soit utiliser
  `@powersync/supabase`.

## Checklist de validation V2

- [ ] Signup email + Google fonctionnent
- [ ] Creation de madrasa + invite_code genere
- [ ] Lien `/m/CODE` fonctionne en multi-device
- [ ] Wird valide par user A visible instantanement pour user B (Realtime)
- [ ] Classement hebdo se reset le vendredi
- [ ] Challenge 1v1 fonctionne entre deux users sur deux devices distincts
- [ ] Ami ajoute via `/f/CODE` fonctionne
- [ ] Stats persistees apres clear cache / autre device
