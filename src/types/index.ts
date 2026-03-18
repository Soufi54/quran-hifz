export type SurahStatus = 'not_started' | 'learning' | 'mastered' | 'declining' | 'urgent';

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translationFr: string;
  page: number;
  juz: number;
}

export interface Surah {
  number: number;
  nameArabic: string;
  nameFrench: string;
  nameTransliteration: string;
  revelationType: 'mecquoise' | 'medinoise';
  ayahCount: number;
  ayahs: Ayah[];
}

export interface QuranData {
  surahs: Surah[];
  totalPages: number;
  totalAyahs: number;
}

export interface QuizQuestion {
  type: 'next_ayah' | 'complete_ayah' | 'identify_surah' | 'first_word' | 'translation';
  questionText: string;
  questionArabic?: string;
  options: string[];
  correctIndex: number;
  surahNumber: number;
  ayahNumber: number;
}

export type MosqueLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MOSQUE_LEVELS: Record<MosqueLevel, { name: string; minStreak: number; emoji: string }> = {
  1: { name: 'Tapis de priere', minStreak: 0, emoji: '🧎' },
  2: { name: 'Mussalla', minStreak: 7, emoji: '🏠' },
  3: { name: 'Petite mosquee', minStreak: 30, emoji: '🕌' },
  4: { name: 'Mosquee de quartier', minStreak: 90, emoji: '🕌' },
  5: { name: 'Grande mosquee', minStreak: 180, emoji: '🕌' },
  6: { name: 'Mosquee royale', minStreak: 365, emoji: '✨🕌' },
  7: { name: 'Mosquee monumentale', minStreak: 730, emoji: '🌟🕌🌟' },
};

export const STATUS_COLORS: Record<SurahStatus, string> = {
  not_started: '#9CA3AF',
  learning: '#FBBF24',
  mastered: '#10B981',
  declining: '#F97316',
  urgent: '#EF4444',
};

export const STATUS_LABELS: Record<SurahStatus, string> = {
  not_started: 'Pas commence',
  learning: 'En cours',
  mastered: 'Maitrise',
  declining: 'En declin',
  urgent: 'A reviser',
};
