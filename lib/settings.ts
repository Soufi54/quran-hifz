/**
 * Gestion des preferences utilisateur (AsyncStorage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECITER_ID, getReciterById, RECITERS } from './reciters';
import { DEFAULT_TRANSLATION_ID, DEFAULT_TAFSIR_ID, getTranslationById, getTafsirById } from './translations';

const KEYS = {
  RECITER: 'setting_reciter_id',
  TRANSLATION: 'setting_translation_id',
  TAFSIR: 'setting_tafsir_id',
};

// ============================================================
// RECITATEUR
// ============================================================

export async function getSelectedReciterId(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(KEYS.RECITER);
    if (id && getReciterById(id)) return id;
  } catch {}
  return DEFAULT_RECITER_ID;
}

export async function setSelectedReciterId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.RECITER, id);
}

// ============================================================
// TRADUCTION
// ============================================================

export async function getSelectedTranslationId(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(KEYS.TRANSLATION);
    if (id && getTranslationById(id)) return id;
  } catch {}
  return DEFAULT_TRANSLATION_ID;
}

export async function setSelectedTranslationId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRANSLATION, id);
}

// ============================================================
// TAFSIR
// ============================================================

export async function getSelectedTafsirId(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(KEYS.TAFSIR);
    if (id && getTafsirById(id)) return id;
  } catch {}
  return DEFAULT_TAFSIR_ID;
}

export async function setSelectedTafsirId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.TAFSIR, id);
}
