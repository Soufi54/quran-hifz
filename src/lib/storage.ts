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

export function updateStreak(): number {
  const today = new Date().toISOString().split('T')[0];
  const lastChallenge = get('lastChallengeDate');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

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

export function getSurahProgress(): Record<number, SurahStatus> {
  const stored = get('surahProgress');
  if (!stored) return {};
  return JSON.parse(stored);
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
  const dates = JSON.parse(get('surahReviewDates') || '{}');
  dates[surahNumber] = new Date().toISOString();
  set('surahReviewDates', JSON.stringify(dates));
}

export function getReviewDate(surahNumber: number): string | null {
  const dates = JSON.parse(get('surahReviewDates') || '{}');
  return dates[surahNumber] || null;
}

// --- Declin des sourates ---

export function updateSurahDeclines(): void {
  const progress = getSurahProgress();
  const dates = JSON.parse(get('surahReviewDates') || '{}');
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
  const today = new Date().toISOString().split('T')[0];
  return get('lastChallengeDate') === today;
}
