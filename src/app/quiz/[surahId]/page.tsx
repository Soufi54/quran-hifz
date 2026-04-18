'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import QuizPlayer from '../../../components/QuizPlayer';
import { getSurah, ensureFullData } from '../../../lib/quran';
import { generateQuizForSurah } from '../../../lib/quiz-generator';
import { calculateSurahMasteredXP } from '../../../lib/scoring';
import { getLives, loseLive, addXP, setSurahStatus, setReviewDate, getStreak } from '../../../lib/storage';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.surahId as string);

  const [dataReady, setDataReady] = useState(false);
  const [questions, setQuestions] = useState<ReturnType<typeof generateQuizForSurah>>([]);
  const [lives, setLives] = useState(5);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xp: number; mastered: boolean } | null>(null);

  useEffect(() => {
    ensureFullData().then(() => {
      setDataReady(true);
      setQuestions(generateQuizForSurah(surahNumber, 10));
      setLives(getLives());
    });
  }, [surahNumber]);

  const surah = getSurah(surahNumber);

  const handleComplete = (score: number, total: number, totalPoints: number) => {
    const percentage = (score / total) * 100;
    const mastered = percentage >= 80;
    let xp = Math.floor(totalPoints / 10);

    if (mastered) {
      setSurahStatus(surahNumber, 'mastered');
      xp += calculateSurahMasteredXP(getStreak());
    } else {
      setSurahStatus(surahNumber, 'learning');
    }

    setReviewDate(surahNumber);
    addXP(xp);
    setResult({ score, total, xp, mastered });
    setDone(true);
  };

  const handleLoseLife = () => {
    const newLives = loseLive();
    setLives(newLives);
  };

  const retry = () => {
    setQuestions(generateQuizForSurah(surahNumber, 10));
    setDone(false);
    setResult(null);
    setLives(getLives());
  };

  if (!dataReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!surah) {
    return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1B4332] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <h1 className="flex-1 text-center text-base font-bold">Quiz - {surah.nameFrench}</h1>
        <div className="w-6" />
      </div>

      {done && result ? (
        <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center">
          <span className="text-6xl mb-4">{result.mastered ? '✅' : '📝'}</span>
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
            {result.mastered ? 'Sourate maitrisee !' : 'Continue a reviser'}
          </h2>
          <p className="text-lg text-[var(--text-muted)]">
            {result.score}/{result.total} ({Math.round((result.score / result.total) * 100)}%)
          </p>
          {!result.mastered && (
            <p className="text-sm text-gray-400 mt-1">Il faut 80% pour maitriser la sourate</p>
          )}
          <p className="text-xl font-bold text-[#1B4332] mt-3">+{result.xp} XP</p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={retry}
              className="bg-[#1B4332] text-white px-6 py-3 rounded-xl font-semibold"
            >
              Recommencer
            </button>
            <button
              onClick={() => router.back()}
              className="bg-[var(--border)] text-[var(--text)] px-6 py-3 rounded-xl font-semibold"
            >
              Retour
            </button>
          </div>
        </div>
      ) : (
        <QuizPlayer
          questions={questions}
          onComplete={handleComplete}
          onLoseLife={handleLoseLife}
          lives={lives}
        />
      )}
    </div>
  );
}
