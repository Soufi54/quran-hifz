'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface WordPuzzleProps {
  words: string[];
  onComplete: (errors: number) => void;
  timerSeconds?: number;
}

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
  const initializedRef = useRef(false);
  const wordsKeyRef = useRef('');

  // Init pool UNE SEULE FOIS
  useEffect(() => {
    const key = words.join('|');
    if (initializedRef.current && key === wordsKeyRef.current) return;
    initializedRef.current = true;
    wordsKeyRef.current = key;

    const items = words.map((text, i) => ({ id: `${i}-${text}`, text, used: false }));
    const shuffled = shuffle(items);
    // S'assurer que le shuffle est different
    const same = shuffled.every((w, i) => w.text === words[i]);
    const finalPool = same && words.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;

    setPool(finalPool);
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
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, done, onComplete]);

  const timerPercent = useMemo(() => (timeLeft / timerSeconds) * 100, [timeLeft, timerSeconds]);

  const handleTap = useCallback((word: PoolWord) => {
    if (done) return;
    const nextIndex = placed.length;
    const expectedWord = words[nextIndex];

    if (word.text === expectedWord) {
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 300);
      const newPlaced = [...placed, word.text];
      setPlaced(newPlaced);
      setPool(prev => prev.map(w => w.id === word.id ? { ...w, used: true } : w));
      if (newPlaced.length === words.length) {
        setDone(true);
        onComplete(errorsRef.current);
      }
    } else {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
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
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto" dir="rtl">
      {/* Timer */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-1" dir="ltr">
          <span>{timeLeft}s</span>
          {errors > 0 && <span className="text-red-400">{errors} erreur{errors > 1 ? 's' : ''}</span>}
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden" dir="ltr">
          <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
            style={{ width: `${timerPercent}%` }} />
        </div>
      </div>

      {/* Zone de construction */}
      <div
        className={[
          'min-h-[100px] rounded-2xl p-4',
          'flex flex-wrap gap-2 content-start',
          'transition-colors duration-200',
          placed.length === 0
            ? 'border-2 border-dashed border-gray-300'
            : 'border-2 border-solid border-gray-200 bg-emerald-50/30',
          flashGreen ? 'bg-emerald-50 border-emerald-400' : '',
        ].join(' ')}
        style={{ fontFamily: "'Amiri Quran', serif" }}
      >
        {placed.length === 0 && (
          <p className="text-gray-400 text-center w-full text-sm mt-4" dir="rtl">
            اضغط على الكلمات لترتيب الآية
          </p>
        )}
        {placed.map((text, i) => (
          <span key={`placed-${i}`}
            className="inline-block px-3 py-1.5 rounded-xl text-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
            {text}
          </span>
        ))}
      </div>

      {/* Pool de mots */}
      <div className="flex flex-wrap gap-2 justify-center p-2" style={{ fontFamily: "'Amiri Quran', serif" }}>
        {pool.map(word => {
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
                'bg-white text-gray-800 border border-gray-300',
                'shadow-sm',
                'hover:bg-gray-50 active:scale-95',
                'transition-all duration-150 cursor-pointer select-none',
                isShaking ? 'animate-word-shake bg-red-50 text-red-600 border-red-300' : '',
                done ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {word.text}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes wordShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        :global(.animate-word-shake) {
          animation: wordShake 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
