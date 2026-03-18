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

export interface UserProfile {
  id: string;
  display_name: string;
  xp: number;
  streak: number;
  best_streak: number;
  mosque_level: number;
  last_challenge_date: string | null;
  onboarding_done: boolean;
  daily_goal_minutes: number;
}

export interface UserSurahProgress {
  id: string;
  user_id: string;
  surah_number: number;
  status: SurahStatus;
  current_passage: number;
  mastery_score: number;
  last_reviewed_at: string | null;
  review_count: number;
}

export interface QuizQuestion {
  type: 'next_ayah' | 'complete_ayah' | 'identify_surah' | 'order_ayahs' | 'first_word' | 'translation';
  questionText: string;
  questionArabic?: string;
  options: string[];
  correctIndex: number;
  surahNumber: number;
  ayahNumber: number;
}

export interface DailyChallenge {
  id: string;
  user_id: string;
  challenge_date: string;
  score: number;
  xp_earned: number;
  questions: QuizQuestion[];
}

export type MosqueLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MOSQUE_LEVELS: Record<MosqueLevel, { name: string; minStreak: number }> = {
  1: { name: 'Tapis de priere', minStreak: 0 },
  2: { name: 'Mussalla', minStreak: 7 },
  3: { name: 'Petite mosquee', minStreak: 30 },
  4: { name: 'Mosquee de quartier', minStreak: 90 },
  5: { name: 'Grande mosquee', minStreak: 180 },
  6: { name: 'Mosquee royale', minStreak: 365 },
  7: { name: 'Mosquee monumentale', minStreak: 730 },
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
