/**
 * Client API pour fetcher les traductions et tafsir depuis quran.com API v4
 * et Al-Quran Cloud API.
 *
 * Cache local avec AsyncStorage pour usage hors-ligne.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Translation, Tafsir } from './translations';

const QURANCOM_BASE = 'https://api.quran.com/api/v4';
const ALQURAN_BASE = 'https://api.alquran.cloud/v1';
const CACHE_PREFIX = 'cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface CacheEntry {
  data: any;
  timestamp: number;
}

// ============================================================
// CACHE
// ============================================================

async function getFromCache(key: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function saveToCache(key: string, data: any): Promise<void> {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

// ============================================================
// FETCH TRADUCTION D'UN VERSET
// ============================================================

export interface VerseTranslation {
  surahNumber: number;
  ayahNumber: number;
  text: string;
}

/**
 * Fetch la traduction d'une sourate entiere.
 * Retourne un map ayahNumber -> texte traduit.
 */
export async function fetchSurahTranslation(
  translation: Translation,
  surahNumber: number
): Promise<Record<number, string>> {
  const cacheKey = `trans_${translation.id}_${surahNumber}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  let result: Record<number, string> = {};

  try {
    if (translation.source === 'qurancom') {
      // Quran.com API v4
      const url = `${QURANCOM_BASE}/quran/translations/${translation.resourceId}?chapter_number=${surahNumber}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.translations) {
        for (const t of data.translations) {
          // verse_key format: "2:255"
          const parts = t.verse_key?.split(':');
          if (parts && parts.length === 2) {
            const ayahNum = parseInt(parts[1]);
            // Strip HTML tags
            result[ayahNum] = (t.text || '').replace(/<[^>]*>/g, '').trim();
          }
        }
      }
    } else if (translation.source === 'alquran_cloud') {
      // Al-Quran Cloud API
      const url = `${ALQURAN_BASE}/surah/${surahNumber}/${translation.resourceId}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.data?.ayahs) {
        for (const ayah of data.data.ayahs) {
          result[ayah.numberInSurah] = ayah.text || '';
        }
      }
    }
  } catch (e) {
    console.error(`Erreur fetch traduction ${translation.id} sourate ${surahNumber}:`, e);
    return result;
  }

  if (Object.keys(result).length > 0) {
    await saveToCache(cacheKey, result);
  }

  return result;
}

// ============================================================
// FETCH TAFSIR D'UN VERSET
// ============================================================

export interface VerseTafsir {
  surahNumber: number;
  ayahNumber: number;
  text: string;
}

/**
 * Fetch le tafsir d'un verset specifique.
 */
export async function fetchAyahTafsir(
  tafsir: Tafsir,
  surahNumber: number,
  ayahNumber: number
): Promise<string> {
  const cacheKey = `tafsir_${tafsir.id}_${surahNumber}_${ayahNumber}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  let text = '';

  try {
    if (tafsir.source === 'qurancom') {
      // Quran.com API v4 - tafsirs endpoint
      const verseKey = `${surahNumber}:${ayahNumber}`;
      const url = `${QURANCOM_BASE}/tafsirs/${tafsir.resourceId}/by_ayah/${verseKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.tafsir?.text) {
        text = data.tafsir.text.replace(/<[^>]*>/g, '').trim();
      }
    }
  } catch (e) {
    console.error(`Erreur fetch tafsir ${tafsir.id} ${surahNumber}:${ayahNumber}:`, e);
    return '';
  }

  if (text) {
    await saveToCache(cacheKey, text);
  }

  return text;
}

/**
 * Fetch le tafsir d'une sourate entiere.
 */
export async function fetchSurahTafsir(
  tafsir: Tafsir,
  surahNumber: number,
  totalAyahs: number
): Promise<Record<number, string>> {
  const cacheKey = `tafsir_full_${tafsir.id}_${surahNumber}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const result: Record<number, string> = {};

  // Fetch par batch pour eviter trop de requetes
  const promises: Promise<void>[] = [];
  for (let i = 1; i <= totalAyahs; i++) {
    const ayahNum = i;
    promises.push(
      fetchAyahTafsir(tafsir, surahNumber, ayahNum).then(text => {
        if (text) result[ayahNum] = text;
      })
    );

    // Batch de 10 requetes max en parallele
    if (promises.length >= 10) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  if (Object.keys(result).length > 0) {
    await saveToCache(cacheKey, result);
  }

  return result;
}
