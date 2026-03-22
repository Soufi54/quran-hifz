'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QuizQuestion } from '../types';
import { getSurah } from '../lib/quran';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number, totalPoints: number) => void;
  onLoseLife?: () => void;
  lives: number;
}

const MAX_TIME_S = 30;

function getPointsForAnswer(correct: boolean, responseTimeMs: number): number {
  if (!correct) return 0;
  if (responseTimeMs >= MAX_TIME_S * 1000) return 0; // temps ecoule
  if (responseTimeMs < 2000) return 100;
  if (responseTimeMs < 4000) return 80;
  if (responseTimeMs < 7000) return 60;
  if (responseTimeMs < 12000) return 40;
  return 20;
}

export default function QuizPlayer({ questions, onComplete, onLoseLife, lives }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_S);
  const [showContext, setShowContext] = useState(false); // contexte APRES la reponse
  const [lastCorrect, setLastCorrect] = useState(false);
  const questionStartTime = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const contextTimerRef = useRef<NodeJS.Timeout | null>(null);

  const question = questions[currentIndex];
  const surahInfo = question ? getSurah(question.surahNumber) : null;

  // Contexte apres reponse : auto-passe apres 5s
  useEffect(() => {
    if (!showContext) return;
    contextTimerRef.current = setTimeout(() => {
      advanceAfterContext();
    }, 5000);
    return () => { if (contextTimerRef.current) clearTimeout(contextTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContext]);

  const advanceAfterContext = () => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    setShowContext(false);
    doGoNext(lastCorrect);
  };

  // Timer 30s
  const startTimer = useCallback(() => {
    setTimeLeft(MAX_TIME_S);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!showContext) {
      questionStartTime.current = Date.now();
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, startTimer, showContext]);

  // Auto-reponse quand le temps est ecoule
  useEffect(() => {
    if (timeLeft === 0 && !answered && question) {
      handleTimeout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered]);

  const handleTimeout = () => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(-1); // aucune selection
    setLastPoints(0);
    onLoseLife?.();
    if (timerRef.current) clearInterval(timerRef.current);

    setTimeout(() => showContextScreen(false), 2000);
  };

  const showContextScreen = (wasCorrect: boolean) => {
    setLastCorrect(wasCorrect);
    setShowContext(true);
  };

  const handleAnswer = (optionIndex: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIndex(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - questionStartTime.current;
    const correct = optionIndex === question.correctIndex;
    const points = getPointsForAnswer(correct, responseTime);
    setLastPoints(points);

    if (correct) {
      setScore(prev => prev + 1);
      setTotalPoints(prev => prev + points);
      setShowSuccess(true);
    } else {
      onLoseLife?.();
    }

    setTimeout(() => showContextScreen(correct), 2000);
  };

  const doGoNext = (wasCorrect: boolean) => {
    setShowSuccess(false);
    setShowContext(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswered(false);
      setSelectedIndex(null);
      setLastPoints(null);
      questionStartTime.current = Date.now();
    } else {
      const finalScore = wasCorrect ? score + 1 : score;
      const pts = wasCorrect && lastPoints ? totalPoints + (lastPoints || 0) : totalPoints;
      onComplete(finalScore, questions.length, pts);
    }
  };

  if (!question) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const surah = getSurah(question.surahNumber);
  const surahRef = surah ? `${surah.nameFrench} (${surah.nameArabic}) - verset ${question.ayahNumber}` : '';
  const timerColor = timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-orange-500' : 'text-gray-500';

  // Ecran contexte APRES reponse : page mushaf + verset surligne
  if (showContext && question) {
    const ayah = surahInfo?.ayahs.find(a => a.numberInSurah === question.ayahNumber);
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]"
        onClick={advanceAfterContext} style={{ cursor: 'pointer' }}>
        {/* Nom sourate */}
        <p className="text-xl font-bold text-emerald-900 mb-0.5" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
          {surahInfo?.nameArabic}
        </p>
        <p className="text-xs text-gray-400 mb-4">{surahInfo?.nameFrench} — verset {question.ayahNumber}</p>

        {/* Verset surligne */}
        <div className="w-full rounded-2xl p-5 mb-4"
          style={{ backgroundColor: lastCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)' }}>
          <p className="text-xl leading-[52px] text-right" dir="rtl"
            style={{ fontFamily: "'Amiri Quran', serif", color: '#1A1A1A' }}>
            {ayah?.text || question.questionArabic || question.questionText}
            <span className="text-sm text-emerald-400 mx-1">﴿{question.ayahNumber}﴾</span>
          </p>
        </div>

        {/* Traduction */}
        {ayah?.translationFr && (
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-4 px-2">
            {ayah.translationFr}
          </p>
        )}

        <p className="text-xs text-gray-300">Appuie pour continuer</p>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      {/* Animation bonne reponse */}
      {showSuccess && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce-in">
            <div className="text-8xl animate-pulse">✅</div>
          </div>
          {/* Particules */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${20 + Math.random() * 40}%`,
                  animationDelay: `${Math.random() * 0.3}s`,
                  fontSize: `${20 + Math.random() * 16}px`,
                }}
              >
                {['🌟', '⭐', '✨', '💫', '🎉'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#1B4332] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header info */}
      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span>❤️</span>
          <span className="font-bold text-red-500">{lives}</span>
        </div>
        <div className={`font-mono font-bold text-lg ${timerColor}`}>
          {timeLeft}s
        </div>
        <span className="text-green-600 font-semibold">{totalPoints} pts</span>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-6">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-400' : 'bg-[#1B4332]'
          }`}
          style={{ width: `${(timeLeft / MAX_TIME_S) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-center mb-4">{question.questionText}</h2>

      {question.questionArabic && (
        <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
          <p
            className="text-2xl leading-[56px] text-right"
            dir="rtl"
            style={{ fontFamily: "'Amiri Quran', serif" }}
          >
            {question.questionArabic}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          let borderColor = 'border-gray-200';
          let bgColor = 'bg-white';
          if (answered) {
            if (index === question.correctIndex) {
              borderColor = 'border-green-500';
              bgColor = 'bg-green-50';
            } else if (index === selectedIndex) {
              borderColor = 'border-red-500';
              bgColor = 'bg-red-50';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={answered}
              className={`w-full text-right p-4 rounded-xl border-2 ${borderColor} ${bgColor} transition-all ${
                !answered ? 'hover:border-[#1B4332] active:scale-[0.98]' : ''
              }`}
              dir="rtl"
            >
              <span
                className="text-base leading-8"
                style={{ fontFamily: "'Amiri Quran', serif" }}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback apres reponse */}
      {answered && (
        <div className="mt-4 text-center space-y-2">
          {/* Points */}
          <div>
            <span className={`text-lg font-bold ${lastPoints && lastPoints > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {lastPoints && lastPoints > 0 ? `+${lastPoints} pts` : timeLeft === 0 ? 'Temps ecoule !' : '0 pts'}
            </span>
            {lastPoints && lastPoints >= 80 && <span className="text-sm text-gray-500 ml-2">Rapide !</span>}
          </div>
          {/* Reference sourate + verset */}
          <p className="text-xs text-gray-400">{surahRef}</p>
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s ease-out forwards;
        }
        .animate-confetti {
          animation: confetti 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
