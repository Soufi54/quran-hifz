'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import type { QuizQuestion } from '../../../types';

import QuizPlayer from '../../../components/QuizPlayer';
import { getSurah, ensureFullData } from '../../../lib/quran';
import { generateQuizForSurah } from '../../../lib/quiz-generator';
import { calculateSurahMasteredXP } from '../../../lib/scoring';
import { getLives, loseLive, addXP, setSurahStatus, setReviewDate, getStreak } from '../../../lib/storage';
import { madrasaStore, isSupabaseMode } from '@/lib/madrasa';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.surahId as string);

  const [dataReady, setDataReady] = useState(false);
  const [questions, setQuestions] = useState<ReturnType<typeof generateQuizForSurah>>([]);
  const [lives, setLives] = useState(5);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xp: number; mastered: boolean; mistakes: QuizQuestion[] } | null>(null);

  useEffect(() => {
    ensureFullData().then(() => {
      setDataReady(true);
      setQuestions(generateQuizForSurah(surahNumber, 10));
      setLives(getLives());
    });
  }, [surahNumber]);

  const surah = getSurah(surahNumber);

  const handleComplete = async (score: number, total: number, totalPoints: number, mistakes: QuizQuestion[]) => {
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

    // Propager l'XP gagne aux madrasas actives de l'user (mode Supabase uniquement)
    if (isSupabaseMode() && xp > 0) {
      try {
        const s = madrasaStore();
        const me = await s.getCurrentUser();
        if (me) {
          const myMadrasas = await s.listMyMadrasas();
          await Promise.all(myMadrasas.map((m) => s.addQuizXp(m.id, xp)));
        }
      } catch (err) {
        console.error('addQuizXp aux madrasas echoue:', err);
      }
    }

    setResult({ score, total, xp, mastered, mistakes });
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
      <div className="bg-[var(--primary-dark)] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour" className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold truncate">Quiz · {surah.nameFrench}</h1>
        <div className="w-9" />
      </div>

      {done && result ? (
        <div className="px-4 pt-10 pb-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${result.mastered ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
              {result.mastered ? <CheckCircle2 size={32} /> : <RotateCcw size={28} />}
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-1">
              {result.mastered ? 'Sourate maitrisee' : 'Continue a reviser'}
            </h2>
            <p className="text-lg text-[var(--text-muted)]">
              {result.score}/{result.total} · {Math.round((result.score / result.total) * 100)}%
            </p>
            {!result.mastered && (
              <p className="text-sm text-[var(--text-muted)] mt-1">80% pour maitriser la sourate</p>
            )}
            <p className="text-xl font-bold text-[var(--primary)] mt-3">+{result.xp} XP</p>
          </div>

          {result.mistakes.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">A revoir</h3>
              <ul className="space-y-3">
                {result.mistakes.map((m, i) => (
                  <li key={i} className="rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Verset {m.answerAyahNumber}</p>
                    {m.type === 'next_ayah' && (
                      <p className="text-base leading-8 text-right text-[var(--text-muted)]" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                        {m.questionArabic} ...
                      </p>
                    )}
                    <p className="text-xl leading-10 text-right text-[var(--text)]" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                      {m.answerArabic}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] leading-snug mt-1">{m.answerTranslation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={retry}
              className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-semibold"
            >
              Recommencer
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-[var(--border)] text-[var(--text)] py-3 rounded-xl font-semibold"
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
