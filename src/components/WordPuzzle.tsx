'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface WordPuzzleProps {
  words: string[];
  onComplete: (errors: number) => void;
  timerSeconds?: number;
}

/** Fisher-Yates shuffle (retourne une copie) */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface PoolWord {
  id: string;
  text: string;
  used: boolean;
}

export default function WordPuzzle({ words, onComplete, timerSeconds = 30 }: WordPuzzleProps) {
  const [pool, setPool] = useState<PoolWord[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [shakeWordId, setShakeWordId] = useState<string | null>(null);
  const [flashGreen, setFlashGreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [done, setDone] = useState(false);
  const errorsRef = useRef(0);

  // Init pool avec mots melanges
  useEffect(() => {
    const shuffled = shuffle(words.map((text, i) => ({
      id: `${i}-${text}`,
      text,
      used: false,
    })));
    setPool(shuffled);
    setPlaced([]);
    setErrors(0);
    errorsRef.current = 0;
    setTimeLeft(timerSeconds);
    setDone(false);
  }, [words, timerSeconds]);

  // Timer
  useEffect(() => {
    if (done) return;
    if (timeLeft <= 0) {
      setDone(true);
      onComplete(errorsRef.current);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, done, onComplete]);

  const timerPercent = useMemo(() => (timeLeft / timerSeconds) * 100, [timeLeft, timerSeconds]);

  const handleTap = useCallback((word: PoolWord) => {
    if (done) return;

    const nextIndex = placed.length;
    const expectedWord = words[nextIndex];

    if (word.text === expectedWord) {
      // Correct
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 300);

      const newPlaced = [...placed, word.text];
      setPlaced(newPlaced);
      setPool((prev) =>
        prev.map((w) => (w.id === word.id ? { ...w, used: true } : w))
      );

      // Tous places ?
      if (newPlaced.length === words.length) {
        setDone(true);
        onComplete(errorsRef.current);
      }
    } else {
      // Erreur
      const newErrors = errorsRef.current + 1;
      errorsRef.current = newErrors;
      setErrors(newErrors);
      setShakeWordId(word.id);
      setTimeout(() => setShakeWordId(null), 500);
    }
  }, [done, placed, words, onComplete]);

  const timerColor = timeLeft > timerSeconds * 0.5
    ? 'bg-emerald-500'
    : timeLeft > timerSeconds * 0.2
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto" dir="rtl">
      {/* Timer */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-1" dir="ltr">
          <span>{timeLeft}s</span>
          {errors > 0 && (
            <span className="text-red-400">{errors} erreur{errors > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden" dir="ltr">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Zone de construction */}
      <div
        className={[
          'min-h-[120px] rounded-2xl p-4',
          'flex flex-wrap gap-2 content-start',
          'transition-colors duration-200',
          placed.length === 0
            ? 'border-2 border-dashed border-gray-600'
            : 'border-2 border-solid border-gray-600/40 bg-gray-800/30',
          flashGreen ? 'bg-emerald-900/30 border-emerald-500/50' : '',
        ].join(' ')}
        style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
      >
        {placed.length === 0 && (
          <p className="text-gray-500 text-center w-full text-sm mt-6" dir="rtl">
            اضغط على الكلمات لترتيب الآية
          </p>
        )}
        {placed.map((text, i) => (
          <span
            key={`placed-${i}`}
            className={[
              'inline-block px-4 py-2 rounded-xl text-lg',
              'bg-emerald-700/60 text-white',
              'animate-word-slide-in',
            ].join(' ')}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Pool de mots */}
      <div
        className="flex flex-wrap gap-2 justify-center p-2"
        style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
      >
        {pool.map((word) => {
          if (word.used) return null;

          const isShaking = shakeWordId === word.id;

          return (
            <button
              key={word.id}
              type="button"
              onClick={() => handleTap(word)}
              disabled={done}
              className={[
                'px-4 py-2 rounded-xl text-lg',
                'bg-gray-800 text-gray-100',
                'shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
                'hover:bg-gray-700 active:scale-95',
                'transition-all duration-150 cursor-pointer',
                'select-none',
                isShaking ? 'animate-word-shake bg-red-800/60 text-red-200' : '',
                done ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {word.text}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes wordSlideIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes wordShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        :global(.animate-word-slide-in) {
          animation: wordSlideIn 0.3s ease-out;
        }
        :global(.animate-word-shake) {
          animation: wordShake 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
