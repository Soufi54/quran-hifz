'use client';

import { useState, useEffect } from 'react';
import { Flame, Heart, BookOpen, Trophy, CheckCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import QuizPlayer from '../components/QuizPlayer';
import { generateDailyChallenge } from '../lib/quiz-generator';
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

  const handleComplete = (score: number, total: number, totalPoints: number) => {
    const newStreak = updateStreak();
    const xp = Math.floor(totalPoints / 10);
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
    <div className="min-h-screen pb-20 page-enter">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-5 py-5 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(6, 78, 59, 0.2)' }}>
        <h1 className="text-xl font-bold text-center">Challenge du jour</h1>
        <div className="flex justify-center gap-8 mt-3">
          <div className="flex items-center gap-1.5">
            <Flame size={18} className="text-amber-400" />
            <span className="font-semibold">{streak} jours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart size={18} className="text-red-400" fill="currentColor" />
            <span className="font-semibold">{lives}</span>
          </div>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      )}

      {state === 'no_surahs' && (
        <div className="flex flex-col items-center justify-center px-8 text-center mt-16">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5" style={{ boxShadow: 'var(--shadow-clay)' }}>
            <BookOpen size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-emerald-900 mb-2">Pas encore de sourates</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
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
        <div className="flex flex-col items-center justify-center px-8 text-center mt-12">
          {result ? (
            <>
              <div className="w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center mb-5" style={{ boxShadow: 'var(--shadow-clay)' }}>
                <Trophy size={44} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">Challenge termine !</h2>
              <p className="text-lg text-gray-600">{result.score}/{result.total} bonnes reponses</p>
              <div className="clay-card px-6 py-3 mt-4">
                <span className="text-xl font-bold text-emerald-700">+{result.xp} XP</span>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Flame size={24} className="text-amber-500" />
                <span className="text-lg font-bold text-amber-600">{streak} jours</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center mb-5" style={{ boxShadow: 'var(--shadow-clay)' }}>
                <CheckCircle size={44} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-emerald-900 mb-2">Challenge du jour termine !</h2>
              <div className="flex items-center gap-2 mt-3">
                <Flame size={24} className="text-amber-500" />
                <span className="text-lg font-bold text-amber-600">{streak} jours</span>
              </div>
              <p className="text-gray-500 mt-3 text-sm">Reviens demain pour continuer ton streak</p>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
