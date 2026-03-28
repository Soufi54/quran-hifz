import { MosqueLevel } from '../types';

export function calculateQuestionXP(correct: boolean, responseTimeMs: number): number {
  if (!correct) return 0;
  let xp = 10;
  if (responseTimeMs < 3000) xp += 5;
  return xp;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2;
  if (streak >= 7) return 1.5;
  return 1;
}

export function calculateChallengeXP(correctAnswers: number, streak: number, totalQuestions: number = 5): number {
  const baseXP = correctAnswers * 10;
  const bonus = correctAnswers === totalQuestions ? 20 : 0;
  return Math.floor((baseXP + bonus) * getStreakMultiplier(streak));
}

export function calculateSurahMasteredXP(streak: number): number {
  return Math.floor(50 * getStreakMultiplier(streak));
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

export function checkSurahDecline(lastReviewedAt: string | null): 'ok' | 'declining' | 'urgent' {
  if (!lastReviewedAt) return 'ok';
  const daysSince = (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) return 'urgent';
  if (daysSince > 14) return 'declining';
  return 'ok';
}
