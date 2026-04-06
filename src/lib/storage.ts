// localStorage wrapper pour la persistence locale (remplace AsyncStorage)
// En V2 on migrera vers Supabase pour la sync multi-device

import { SurahStatus } from '../types';

function get(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function set(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

// --- Streak ---

export function getStreak(): number {
  return parseInt(get('streak') || '0');
}

export function getBestStreak(): number {
  return parseInt(get('bestStreak') || '0');
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function updateStreak(): number {
  const today = toLocalDateStr(new Date());
  const lastChallenge = get('lastChallengeDate');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  let newStreak = 1;
  if (lastChallenge === yesterdayStr) {
    newStreak = getStreak() + 1;
  } else if (lastChallenge === today) {
    return getStreak(); // deja fait aujourd'hui
  }

  set('streak', String(newStreak));
  const best = getBestStreak();
  if (newStreak > best) set('bestStreak', String(newStreak));
  set('lastChallengeDate', today);
  return newStreak;
}

// --- XP ---

export function getTotalXP(): number {
  return parseInt(get('totalXP') || '0');
}

export function addXP(amount: number): number {
  const total = getTotalXP() + amount;
  set('totalXP', String(total));
  return total;
}

// --- Vies ---

export function getLives(): number {
  const lives = parseInt(get('lives') || '5');
  const lastUpdate = parseInt(get('livesLastUpdate') || String(Date.now()));
  const elapsed = Date.now() - lastUpdate;
  const regained = Math.floor(elapsed / (60 * 60 * 1000)); // 1 vie par heure
  const current = Math.min(5, lives + regained);
  if (regained > 0) {
    set('lives', String(current));
    set('livesLastUpdate', String(Date.now()));
  }
  return current;
}

export function loseLive(): number {
  const current = getLives();
  const newLives = Math.max(0, current - 1);
  set('lives', String(newLives));
  set('livesLastUpdate', String(Date.now()));
  return newLives;
}

// --- Progression sourates ---

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function getSurahProgress(): Record<number, SurahStatus> {
  return safeParse(get('surahProgress'), {});
}

export function setSurahStatus(surahNumber: number, status: SurahStatus): void {
  const progress = getSurahProgress();
  progress[surahNumber] = status;
  set('surahProgress', JSON.stringify(progress));
}

export function getLearnedSurahs(): number[] {
  const progress = getSurahProgress();
  return Object.entries(progress)
    .filter(([, status]) => status !== 'not_started')
    .map(([num]) => parseInt(num));
}

// --- Review dates ---

export function setReviewDate(surahNumber: number): void {
  const dates = safeParse<Record<string, string>>(get('surahReviewDates'), {});
  dates[surahNumber] = new Date().toISOString();
  set('surahReviewDates', JSON.stringify(dates));
}

export function getReviewDate(surahNumber: number): string | null {
  const dates = safeParse<Record<string, string>>(get('surahReviewDates'), {});
  return dates[surahNumber] || null;
}

// --- Declin des sourates ---

export function updateSurahDeclines(): void {
  const progress = getSurahProgress();
  const dates = safeParse<Record<string, string>>(get('surahReviewDates'), {});
  const now = Date.now();

  Object.entries(progress).forEach(([numStr, status]) => {
    if (status !== 'mastered' && status !== 'learning') return;
    const lastReview = dates[numStr];
    if (!lastReview) return;
    const daysSince = (now - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      setSurahStatus(parseInt(numStr), 'urgent');
    } else if (daysSince > 14) {
      setSurahStatus(parseInt(numStr), 'declining');
    }
  });
}

// --- Challenge quotidien ---

export function isChallengeCompletedToday(): boolean {
  const today = toLocalDateStr(new Date());
  return get('lastChallengeDate') === today;
}

// --- Langue de l'interface ---

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'tr', 'es', 'de', 'id', 'ur', 'ber'];

function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language?.toLowerCase().split('-')[0] || 'en';
  if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
  return 'en';
}

export function getUserLanguage(): string {
  const stored = get('userLanguage');
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  return detectBrowserLanguage();
}

export function setUserLanguage(lang: string): void {
  set('userLanguage', lang);
}
