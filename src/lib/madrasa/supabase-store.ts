// Stub SupabaseStore. V2.
//
// Ce fichier est volontairement vide. Quand Chaker est pret pour Supabase :
//
// 1. Installer le client : `npm install @supabase/supabase-js`
// 2. Configurer .env.local :
//    NEXT_PUBLIC_SUPABASE_URL=...
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
// 3. Appliquer le schema : supabase/migrations/001_madrasa_schema.sql
// 4. Appliquer les RLS : supabase/rls-policies.sql
// 5. Implementer chaque methode de MadrasaStore ici en appelant le client Supabase
// 6. Dans src/lib/madrasa/index.ts, remplacer `new LocalMadrasaStore()` par `new SupabaseMadrasaStore()`
//
// L'interface MadrasaStore ne change pas — les composants UI continuent de marcher tels quels.
//
// Voir docs/MIGRATION_SUPABASE.md pour les details.

import { MadrasaStore } from './store';

export class SupabaseMadrasaStore implements Partial<MadrasaStore> {
  constructor() {
    throw new Error(
      'SupabaseMadrasaStore non implementee. Voir docs/MIGRATION_SUPABASE.md',
    );
  }
}
