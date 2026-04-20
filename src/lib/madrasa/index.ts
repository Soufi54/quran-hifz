// Factory + singleton pour le MadrasaStore.
//
// Feature flag : si NEXT_PUBLIC_SUPABASE_URL est defini, on utilise SupabaseMadrasaStore.
// Sinon on tombe sur LocalMadrasaStore (mode dev sans backend).

import { MadrasaStore } from './store';
import { LocalMadrasaStore } from './local-store';
import { SupabaseMadrasaStore } from './supabase-store';
import { isSupabaseConfigured } from '../supabase';

let instance: MadrasaStore | null = null;

export function madrasaStore(): MadrasaStore {
  if (!instance) {
    instance = isSupabaseConfigured() ? new SupabaseMadrasaStore() : new LocalMadrasaStore();
  }
  return instance;
}

export function isSupabaseMode(): boolean {
  return isSupabaseConfigured();
}

export * from './types';
export type { MadrasaStore } from './store';
export { avatarColor, avatarInitial, randomCode } from './utils';
