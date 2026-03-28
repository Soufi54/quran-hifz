import quranData from '../data/quran.json';
import { QuranData, Surah } from '../types';

const data = quranData as QuranData;

export function getAllSurahs(): Surah[] {
  return data.surahs;
}

export function getSurah(number: number): Surah | undefined {
  return data.surahs.find(s => s.number === number);
}

export function getSurahsByJuz(juz: number): Surah[] {
  return data.surahs.filter(s => s.ayahs.some(a => a.juz === juz));
}

export function getJuzList(): number[] {
  const juzSet = new Set<number>();
  data.surahs.forEach(s => s.ayahs.forEach(a => juzSet.add(a.juz)));
  return Array.from(juzSet).sort((a, b) => a - b);
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
  data.surahs.forEach(surah => {
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
  const surah = getSurah(surahNumber);
  if (!surah || surah.ayahs.length === 0) return 1;
  return surah.ayahs[0].page;
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

export const TOTAL_SURAHS = data.surahs.length;
