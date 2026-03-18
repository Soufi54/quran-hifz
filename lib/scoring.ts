import { MosqueLevel } from '../types';

const XP_PER_CORRECT = 10;
const XP_SPEED_BONUS = 5;
const XP_CHALLENGE_BONUS = 20;
const XP_SURAH_MASTERED = 50;

export function calculateQuestionXP(correct: boolean, responseTimeMs: number): number {
  if (!correct) return 0;
  let xp = XP_PER_CORRECT;
  if (responseTimeMs < 3000) xp += XP_SPEED_BONUS;
  return xp;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2;
  if (streak >= 7) return 1.5;
  return 1;
}

export function calculateChallengeXP(correctAnswers: number, streak: number): number {
  const baseXP = correctAnswers * XP_PER_CORRECT;
  const bonus = correctAnswers === 5 ? XP_CHALLENGE_BONUS : 0;
  const multiplier = getStreakMultiplier(streak);
  return Math.floor((baseXP + bonus) * multiplier);
}

export function calculateSurahMasteredXP(streak: number): number {
  return Math.floor(XP_SURAH_MASTERED * getStreakMultiplier(streak));
}

export function getMosqueLevel(streak: number): MosqueLevel {
  if (streak >= 730) return 7;
  if (streak >= 365) return 6;
  if (streak >= 180) return 5;
  if (streak >= 90) return 4;
  if (streak >= 30) return 3;
  if (streak >= 7) return 2;
  return 1;
}

const MAX_LIVES = 5;
const LIFE_REGEN_MS = 60 * 60 * 1000; // 1 heure

export function calculateLives(lastLivesCount: number, lastLivesUpdateTime: number): number {
  const now = Date.now();
  const elapsed = now - lastLivesUpdateTime;
  const livesRegained = Math.floor(elapsed / LIFE_REGEN_MS);
  return Math.min(MAX_LIVES, lastLivesCount + livesRegained);
}

export function checkSurahDecline(lastReviewedAt: string | null): 'ok' | 'declining' | 'urgent' {
  if (!lastReviewedAt) return 'ok';
  const now = new Date();
  const lastReview = new Date(lastReviewedAt);
  const daysSince = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) return 'urgent';
  if (daysSince > 14) return 'declining';
  return 'ok';
}
