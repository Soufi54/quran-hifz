/**
 * quran.ts — Quran data access layer.
 *
 * PERFORMANCE: quran.json (2.7MB) is loaded LAZILY only when full ayah
 * data is needed (reading page, quiz). Listing pages use quran-meta.json
 * (26KB) via getAllSurahsMeta() for instant load.
 */
import type { QuranData, Surah } from '../types';
import metaData from '../data/quran-meta.json';

// ─── Lightweight metadata (26KB, loaded instantly) ─────────

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameTransliteration: string;
  nameFrench: string;
  revelationType: string;
  ayahCount: number;
  firstJuz: number;
  firstPage: number;
  juzList: number[];
}

const meta = metaData as SurahMeta[];

/** Fast: uses 26KB metadata. For listing/search/navigation. */
export function getAllSurahsMeta(): SurahMeta[] {
  return meta;
}

/** Fast: metadata only. */
export function getSurahMeta(number: number): SurahMeta | undefined {
  return meta.find(s => s.number === number);
}

/** Fast: juz grouping from metadata. */
export function getJuzList(): number[] {
  const juzSet = new Set<number>();
  meta.forEach(s => s.juzList.forEach(j => juzSet.add(j)));
  return Array.from(juzSet).sort((a, b) => a - b);
}

/** Fast: surahs in a juz from metadata. */
export function getSurahsByJuz(juz: number): SurahMeta[] {
  return meta.filter(s => s.juzList.includes(juz));
}

export const TOTAL_SURAHS = meta.length;

// ─── Full data (2.7MB, loaded lazily on demand) ────────────

let _fullData: QuranData | null = null;

async function loadFullData(): Promise<QuranData> {
  if (_fullData) return _fullData;
  const mod = await import('../data/quran.json');
  _fullData = mod.default as QuranData;
  return _fullData;
}


/** Backward compat — returns all surahs WITH full ayah data. HEAVY. */
export function getAllSurahs(): Surah[] {
  return _fullData?.surahs ?? [];
}

export function getSurah(number: number): Surah | undefined {
  return _fullData?.surahs.find(s => s.number === number);
}

/** Call this at the top of pages that need full ayah data (reading, quiz, learn). */
export async function ensureFullData(): Promise<void> {
  await loadFullData();
}

export interface PageData {
  pageNumber: number;
  ayahs: {
    surahNumber: number;
    surahNameArabic: string;
    ayahNumberInSurah: number;
    text: string;
    translationFr: string;
  }[];
}

export function getPageData(pageNumber: number): PageData {
  const ayahs: PageData['ayahs'] = [];
  const surahs = _fullData?.surahs ?? [];
  surahs.forEach(surah => {
    surah.ayahs.forEach(ayah => {
      if (ayah.page === pageNumber) {
        ayahs.push({
          surahNumber: surah.number,
          surahNameArabic: surah.nameArabic,
          ayahNumberInSurah: ayah.numberInSurah,
          text: ayah.text,
          translationFr: ayah.translationFr,
        });
      }
    });
  });
  return { pageNumber, ayahs };
}

export function getFirstPageOfSurah(surahNumber: number): number {
  const s = getSurahMeta(surahNumber);
  return s?.firstPage ?? 1;
}

export function getLastPageOfSurah(surahNumber: number): number {
  const surah = getSurah(surahNumber);
  if (!surah || surah.ayahs.length === 0) return 1;
  return surah.ayahs[surah.ayahs.length - 1].page;
}

export function getAudioUrl(surahNumber: number, ayahNumber: number): string {
  const recitateur = typeof window !== 'undefined'
    ? localStorage.getItem('recitateur') || 'Alafasy_128kbps'
    : 'Alafasy_128kbps';
  const surah = String(surahNumber).padStart(3, '0');
  const ayah = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${recitateur}/${surah}${ayah}.mp3`;
}

export function getTafsirUrl(surahNumber: number, ayahNumber: number, lang: 'ar' | 'en' = 'ar'): string {
  const slug = lang === 'ar' ? 'ar-tafsir-ibn-kathir' : 'en-tafsir-ibn-kathir';
  return `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${surahNumber}/${ayahNumber}.json`;
}
