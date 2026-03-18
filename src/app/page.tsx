'use client';

import { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import QuizPlayer from '../components/QuizPlayer';
import { generateDailyChallenge } from '../lib/quiz-generator';
import { calculateChallengeXP } from '../lib/scoring';
import {
  getStreak, updateStreak, addXP, getLives, loseLive,
  getLearnedSurahs, isChallengeCompletedToday,
} from '../lib/storage';
import { QuizQuestion } from '../types';

export default function ChallengePage() {
  const [state, setState] = useState<'loading' | 'no_surahs' | 'done' | 'playing'>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(5);
  const [result, setResult] = useState<{ score: number; total: number; xp: number } | null>(null);

  useEffect(() => {
    const s = getStreak();
    setStreak(s);
    setLives(getLives());

    if (isChallengeCompletedToday()) {
      setState('done');
      return;
    }

    const learned = getLearnedSurahs();
    if (learned.length === 0) {
      setState('no_surahs');
      return;
    }

    const q = generateDailyChallenge(learned, 5);
    setQuestions(q);
    setState('playing');
  }, []);

  const handleComplete = (score: number, total: number) => {
    const newStreak = updateStreak();
    const xp = calculateChallengeXP(score, newStreak);
    addXP(xp);
    setStreak(newStreak);
    setResult({ score, total, xp });
    setState('done');
  };

  const handleLoseLife = () => {
    const newLives = loseLive();
    setLives(newLives);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-[#1B4332] text-white px-4 py-4">
        <h1 className="text-xl font-bold text-center">Challenge du jour</h1>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span>🔥 {streak} jours</span>
          <span>❤️ {lives}</span>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Chargement...</p>
        </div>
      )}

      {state === 'no_surahs' && (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
          <span className="text-5xl mb-4">📖</span>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Pas encore de sourates</h2>
          <p className="text-gray-500 text-sm">
            Commence par apprendre une sourate dans l&apos;onglet &quot;Sourates&quot; pour debloquer le challenge quotidien.
          </p>
        </div>
      )}

      {state === 'playing' && questions.length > 0 && (
        <QuizPlayer
          questions={questions}
          onComplete={handleComplete}
          onLoseLife={handleLoseLife}
          lives={lives}
        />
      )}

      {state === 'done' && (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
          {result ? (
            <>
              <span className="text-5xl mb-4">🏆</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Challenge termine !</h2>
              <p className="text-lg text-gray-600">{result.score}/{result.total} bonnes reponses</p>
              <p className="text-xl font-bold text-[#1B4332] mt-1">+{result.xp} XP</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-2xl">🔥</span>
                <span className="text-lg font-bold text-orange-500">{streak} jours</span>
              </div>
            </>
          ) : (
            <>
              <span className="text-5xl mb-4">✅</span>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Challenge du jour termine !</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl">🔥</span>
                <span className="text-lg font-bold text-orange-500">{streak} jours</span>
              </div>
              <p className="text-gray-500 mt-2 text-sm">Reviens demain pour continuer ton streak</p>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
