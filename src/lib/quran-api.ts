/**
 * Client API pour fetcher les traductions et tafsir depuis quran.com API v4
 * et Al-Quran Cloud API.
 * Cache local avec localStorage.
 */

import { Translation, Tafsir } from './translations';

const QURANCOM_BASE = 'https://api.quran.com/api/v4';
const ALQURAN_BASE = 'https://api.alquran.cloud/v1';
const CACHE_PREFIX = 'cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface CacheEntry {
  data: Record<number, string> | string;
  timestamp: number;
}

function getFromCache(key: string): Record<number, string> | string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function saveToCache(key: string, data: Record<number, string> | string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

export interface VerseTranslation {
  surahNumber: number;
  ayahNumber: number;
  text: string;
}

/**
 * Fetch la traduction d'une sourate entiere.
 */
export async function fetchSurahTranslation(
  translation: Translation,
  surahNumber: number
): Promise<Record<number, string>> {
  const cacheKey = `trans_${translation.id}_${surahNumber}`;
  const cached = getFromCache(cacheKey);
  if (cached && typeof cached === 'object') return cached as Record<number, string>;

  const result: Record<number, string> = {};

  try {
    if (translation.source === 'qurancom') {
      const url = `${QURANCOM_BASE}/quran/translations/${translation.resourceId}?chapter_number=${surahNumber}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.translations) {
        for (const t of data.translations) {
          const parts = t.verse_key?.split(':');
          if (parts && parts.length === 2) {
            const ayahNum = parseInt(parts[1]);
            result[ayahNum] = (t.text || '').replace(/<[^>]*>/g, '').trim();
          }
        }
      }
    } else if (translation.source === 'alquran_cloud') {
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
    saveToCache(cacheKey, result);
  }

  return result;
}

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
  const cached = getFromCache(cacheKey);
  if (cached && typeof cached === 'string') return cached;

  let text = '';

  try {
    if (tafsir.source === 'qurancom') {
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
    saveToCache(cacheKey, text);
  }

  return text;
}
