import quranData from '../data/quran.json';
import { QuranData, Surah, Ayah, PageData } from '../types';

const data = quranData as QuranData;

export function getAllSurahs(): Surah[] {
  return data.surahs;
}

export function getSurah(number: number): Surah | undefined {
  return data.surahs.find(s => s.number === number);
}

export function getSurahsByJuz(juz: number): Surah[] {
  return data.surahs.filter(s =>
    s.ayahs.some(a => a.juz === juz)
  );
}

export function getJuzList(): number[] {
  const juzSet = new Set<number>();
  data.surahs.forEach(s => s.ayahs.forEach(a => juzSet.add(a.juz)));
  return Array.from(juzSet).sort((a, b) => a - b);
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

export function getSurahPassages(surahNumber: number, passageSize: number = 7): Ayah[][] {
  const surah = getSurah(surahNumber);
  if (!surah) return [];

  const passages: Ayah[][] = [];
  for (let i = 0; i < surah.ayahs.length; i += passageSize) {
    passages.push(surah.ayahs.slice(i, i + passageSize));
  }
  return passages;
}

/**
 * Retourne l'URL audio pour un verset.
 * @param subfolder - Le dossier everyayah.com du recitateur (ex: 'Alafasy_128kbps')
 */
export function getAudioUrl(surahNumber: number, ayahNumber: number, subfolder: string = 'Alafasy_128kbps'): string {
  const surah = String(surahNumber).padStart(3, '0');
  const ayah = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${subfolder}/${surah}${ayah}.mp3`;
}

export const TOTAL_PAGES = data.totalPages;
export const TOTAL_AYAHS = data.totalAyahs;
export const TOTAL_SURAHS = data.surahs.length;
