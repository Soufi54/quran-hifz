'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, Heart, BookOpen, Trophy, CheckCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import QuizPlayer from '../components/QuizPlayer';
import Confetti from '../components/Confetti';
import { useI18n } from '../components/I18nProvider';
import { generateDailyChallenge } from '../lib/quiz-generator';
import { ensureFullData } from '../lib/quran';
import {
  getStreak, updateStreak, addXP, getLives, loseLive,
  getLearnedSurahs, updateSurahDeclines,
} from '../lib/storage';
import { QuizQuestion } from '../types';

export default function ChallengePage() {
  const { t } = useI18n();
  const [state, setState] = useState<'loading' | 'no_surahs' | 'done' | 'playing'>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(5);
  const [result, setResult] = useState<{ score: number; total: number; xp: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const xpRef = useRef(0);

  useEffect(() => {
    const s = getStreak();
    setStreak(s);
    setLives(getLives());
    updateSurahDeclines();

    const learned = getLearnedSurahs();
    if (learned.length === 0) {
      setState('no_surahs');
      return;
    }

    ensureFullData().then(() => {
      const q = generateDailyChallenge(learned, 5);
      setQuestions(q);
      setState('playing');
    });
  }, []);

  const handleComplete = (score: number, total: number, totalPoints: number) => {
    const newStreak = updateStreak();
    const xp = Math.floor(totalPoints / 10);
    addXP(xp);
    setStreak(newStreak);
    setResult({ score, total, xp });
    xpRef.current = xp;
    setState('done');

    if (score >= Math.ceil(total / 2)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setShowXP(true);
    setTimeout(() => setShowXP(false), 2500);
  };

  const handleLoseLife = () => {
    const newLives = loseLive();
    setLives(newLives);
  };

  const streakBadge = streak >= 7
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold animate-pulse">ON FIRE</span>
    : streak >= 3
      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--accent)] text-[var(--accent)] text-xs font-bold animate-pulse">x{streak}</span>
      : null;

  return (
    <div className="min-h-screen pb-20 page-enter">
      {/* Confetti overlay */}
      {showConfetti && <Confetti />}

      {/* XP flottant */}
      {showXP && result && (
        <div
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-2xl font-bold text-[var(--accent)]"
          style={{ animation: 'xpFloat 2.5s ease-out forwards' }}
        >
          +{result.xp} XP
        </div>
      )}

      <style jsx global>{`
        @keyframes xpFloat {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -60px); }
        }
      `}</style>

      {/* Header */}
      <div className="islamic-header text-white px-5 py-5 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <h1 className="text-xl font-bold text-center">{t('challenge')}</h1>
        <div className="flex justify-center gap-8 mt-3">
          <div className="flex items-center gap-1.5">
            <Flame size={18} className="text-[#C9A84C]" />
            <span className="font-semibold">{streak} jours</span>
            {streakBadge && <span className="ml-1">{streakBadge}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Heart size={18} className="text-red-400" fill="currentColor" />
            <span className="font-semibold">{lives}</span>
          </div>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {state === 'no_surahs' && (
        <div className="flex flex-col items-center justify-center px-8 text-center mt-16">
          <div className="w-20 h-20 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mb-5" style={{ boxShadow: 'var(--shadow-clay)' }}>
            <BookOpen size={36} className="text-[var(--primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">{t('noSurahs')}</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {t('startLearning')}
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
              <div className="w-24 h-24 rounded-3xl bg-[var(--accent)]/10 flex items-center justify-center mb-5" style={{ boxShadow: 'var(--shadow-clay)' }}>
                <Trophy size={44} className="text-[var(--accent)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)] mb-2">{t('challengeDone')}</h2>
              <p className="text-lg text-[var(--text-muted)]">{result.score}/{result.total} {t('correctAnswers')}</p>
              <div className="clay-card px-6 py-3 mt-4">
                <span className="text-xl font-bold text-[var(--primary)]">+{result.xp} XP</span>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Flame size={24} className="text-amber-500" />
                <span className="text-lg font-bold text-amber-600">{streak} jours</span>
                {streakBadge}
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-3xl bg-[var(--primary-light)] flex items-center justify-center mb-4" style={{ boxShadow: 'var(--shadow-clay)' }}>
                <CheckCircle size={40} className="text-[var(--primary)]" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={24} className="text-amber-500" />
                <span className="text-lg font-bold text-amber-600">{streak} jours</span>
              </div>
            </>
          )}
          <button
            onClick={() => {
              const learned = getLearnedSurahs();
              if (learned.length > 0) {
                const q = generateDailyChallenge(learned, 5);
                setQuestions(q);
                setResult(null);
                setShowConfetti(false);
                setState('playing');
              }
            }}
            className="gold-accent rounded-xl font-semibold shadow-lg py-4 px-10 mt-4 text-lg border-none cursor-pointer transition-transform active:scale-[0.97]"
          >
            {t('newChallenge')}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
