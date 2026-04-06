/**
 * Gestion des preferences utilisateur (localStorage)
 */

import { DEFAULT_RECITER_ID, getReciterById } from './reciters';
import { DEFAULT_TRANSLATION_ID, DEFAULT_TAFSIR_ID, getTranslationById, getTafsirById, getTranslationsByLanguage } from './translations';
import { getUserLanguage } from './storage';

const KEYS = {
  RECITER: 'setting_reciter_id',
  TRANSLATION: 'setting_translation_id',
  TAFSIR: 'setting_tafsir_id',
};

function get(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function set(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

// Recitateur
export function getSelectedReciterId(): string {
  const id = get(KEYS.RECITER);
  if (id && getReciterById(id)) return id;
  return DEFAULT_RECITER_ID;
}

export function setSelectedReciterId(id: string): void {
  set(KEYS.RECITER, id);
}

// Traduction
export function getSelectedTranslationId(): string {
  const id = get(KEYS.TRANSLATION);
  if (id && getTranslationById(id)) return id;
  // Choisir la traduction par defaut selon la langue de l'utilisateur
  const lang = getUserLanguage();
  const translationsForLang = getTranslationsByLanguage(lang);
  if (translationsForLang.length > 0) return translationsForLang[0].id;
  return DEFAULT_TRANSLATION_ID;
}

export function setSelectedTranslationId(id: string): void {
  set(KEYS.TRANSLATION, id);
}

// Tafsir
export function getSelectedTafsirId(): string {
  const id = get(KEYS.TAFSIR);
  if (id && getTafsirById(id)) return id;
  return DEFAULT_TAFSIR_ID;
}

export function setSelectedTafsirId(id: string): void {
  set(KEYS.TAFSIR, id);
}
