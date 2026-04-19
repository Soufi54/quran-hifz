// Factory + singleton pour le MadrasaStore.
//
// Pour switcher Local -> Supabase :
//   Remplacer `new LocalMadrasaStore()` par `new SupabaseMadrasaStore()`
//   (plus configurer les env vars NEXT_PUBLIC_SUPABASE_*)
//
// Rien d'autre a changer dans l'app.

import { MadrasaStore } from './store';
import { LocalMadrasaStore } from './local-store';

let instance: MadrasaStore | null = null;

export function madrasaStore(): MadrasaStore {
  if (!instance) {
    instance = new LocalMadrasaStore();
  }
  return instance;
}

export * from './types';
export type { MadrasaStore } from './store';
export { avatarColor, avatarInitial, randomCode } from './utils';
