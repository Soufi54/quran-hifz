'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QuizQuestion } from '../types';
import { getSurah, getFirstPageOfSurah } from '../lib/quran';

// QCF data pour le mapping lignes/versets
interface QcfWord { c: string; t: string; p: number; vk: string; }
type QcfPageData = Record<string, QcfWord[]>;
type QcfAllPages = Record<string, QcfPageData>;
let qcfCache: QcfAllPages | null = null;
async function getQcfData(): Promise<QcfAllPages> {
  if (qcfCache) return qcfCache;
  const mod = await import('../data/qcf-pages.json');
  qcfCache = mod.default as QcfAllPages;
  return qcfCache;
}

// Trouver les lignes d'un verset sur une page
function getVerseLines(qcfPage: QcfPageData | undefined, surahNumber: number, ayahNumber: number): number[] {
  if (!qcfPage) return [];
  const vk = `${surahNumber}:${ayahNumber}`;
  const lines: number[] = [];
  for (const [lineNum, words] of Object.entries(qcfPage)) {
    if (words.some(w => w.vk === vk)) lines.push(parseInt(lineNum));
  }
  return lines.sort((a, b) => a - b);
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number, totalPoints: number) => void;
  onLoseLife?: () => void;
  lives: number;
}

const MAX_TIME_S = 30;

function getPointsForAnswer(correct: boolean, responseTimeMs: number): number {
  if (!correct) return 0;
  if (responseTimeMs >= MAX_TIME_S * 1000) return 0;
  if (responseTimeMs < 2000) return 100;
  if (responseTimeMs < 4000) return 80;
  if (responseTimeMs < 7000) return 60;
  if (responseTimeMs < 12000) return 40;
  return 20;
}

// Image mushaf tajweed URL
function getMushafUrl(page: number): string {
  return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${String(page).padStart(3, '0')}.png`;
}

type Phase = 'question' | 'context';

export default function QuizPlayer({ questions, onComplete, onLoseLife, lives }: QuizPlayerProps) {
  const [idx, setIdx] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [pts, setPts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_S);
  const [phase, setPhase] = useState<Phase>('question');
  const [wasCorrect, setWasCorrect] = useState(false);

  const [qcfData, setQcfData] = useState<QcfAllPages | null>(null);

  const startTime = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const totalPointsRef = useRef(0);

  // Charger les donnees QCF au mount
  useEffect(() => {
    getQcfData().then(setQcfData);
  }, []);

  const q = questions[idx];
  const surah = q ? getSurah(q.surahNumber) : null;

  // Timer
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

  // Demarrer le timer quand on passe a la phase question
  useEffect(() => {
    if (phase === 'question') {
      startTime.current = Date.now();
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, phase, startTimer]);

  // Timeout
  useEffect(() => {
    if (timeLeft === 0 && !answered && phase === 'question') {
      doAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered, phase]);

  // Phase contexte : auto-avance apres 5s
  useEffect(() => {
    if (phase !== 'context') return;
    contextRef.current = setTimeout(goNext, 5000);
    return () => { if (contextRef.current) clearTimeout(contextRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function doAnswer(optionIndex: number) {
    if (answered) return;
    setAnswered(true);
    setSelected(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - startTime.current;
    const correct = optionIndex >= 0 && optionIndex === q.correctIndex;
    const points = getPointsForAnswer(correct, responseTime);
    setPts(points);
    setWasCorrect(correct);

    if (correct) {
      scoreRef.current += 1;
      totalPointsRef.current += points;
      setTotalPoints(totalPointsRef.current);
    } else {
      onLoseLife?.();
    }

    // Apres 1.5s → montrer le contexte
    setTimeout(() => setPhase('context'), 1500);
  }

  function goNext() {
    if (contextRef.current) clearTimeout(contextRef.current);
    if (idx < questions.length - 1) {
      setIdx(prev => prev + 1);
      setAnswered(false);
      setSelected(null);
      setPts(0);
      setPhase('question');
    } else {
      onComplete(scoreRef.current, questions.length, totalPointsRef.current);
    }
  }

  if (!q) return null;

  const progress = ((idx + 1) / questions.length) * 100;
  const timerColor = timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-orange-500' : 'text-gray-500';

  // ─── PHASE CONTEXTE : page mushaf + verset surligne ─────────
  if (phase === 'context') {
    const ayah = surah?.ayahs.find(a => a.numberInSurah === q.ayahNumber);
    const actualPage = ayah?.page || (surah ? getFirstPageOfSurah(q.surahNumber) : 1);
    const qcfPage = qcfData ? qcfData[String(actualPage)] : undefined;
    const highlightLines = getVerseLines(qcfPage, q.surahNumber, q.ayahNumber);

    // Zone de texte dans l'image mushaf classique (approximation)
    const TEXT_ZONE = { top: 0.02, bottom: 0.98 };
    const TOTAL_LINES = 15;
    const lineHeight = (TEXT_ZONE.bottom - TEXT_ZONE.top) / TOTAL_LINES;

    return (
      <div className="flex flex-col items-center min-h-[70vh]" onClick={goNext} style={{ cursor: 'pointer' }}>
        {/* Nom sourate */}
        <div className="text-center py-2">
          <p className="text-lg font-bold text-emerald-900" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah?.nameArabic}
          </p>
          <p className="text-xs text-gray-400">{surah?.nameFrench} — verset {q.ayahNumber} — page {actualPage}</p>
          <p className={`text-sm font-semibold mt-1 ${wasCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
            {wasCorrect ? 'Correct !' : 'Incorrect'}
            {pts > 0 && ` +${pts} pts`}
          </p>
        </div>

        {/* Image mushaf avec verset surligne */}
        <div className="w-full flex-1 relative rounded-xl overflow-hidden border border-gray-200">
          <img // eslint-disable-line @next/next/no-img-element
            src={getMushafUrl(actualPage)}
            alt={`Page ${actualPage}`}
            className="w-full h-auto"
          />
          {/* Overlay surlignage des lignes du verset */}
          {highlightLines.map(lineNum => (
            <div
              key={lineNum}
              className="absolute"
              style={{
                top: `${(TEXT_ZONE.top + (lineNum - 1) * lineHeight) * 100}%`,
                left: '3%',
                width: '94%',
                height: `${lineHeight * 100}%`,
                backgroundColor: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                borderRadius: '4px',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        <p className="text-xs text-gray-300 mt-2 mb-1">Appuie pour continuer</p>
      </div>
    );
  }

  // ─── PHASE QUESTION ─────────────────────────────────────────
  return (
    <div className="p-4 relative">
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[#1B4332] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span>❤️</span>
          <span className="font-bold text-red-500">{lives}</span>
        </div>
        <div className={`font-mono font-bold text-lg ${timerColor}`}>{timeLeft}s</div>
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
      <h2 className="text-lg font-semibold text-center mb-4">{q.questionText}</h2>

      {q.questionArabic && (
        <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
          <p className="text-2xl leading-[56px] text-right" dir="rtl"
            style={{ fontFamily: "'Amiri Quran', serif" }}>
            {q.questionArabic}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((option, i) => {
          let border = 'border-gray-200';
          let bg = 'bg-white';
          if (answered) {
            if (i === q.correctIndex) { border = 'border-green-500'; bg = 'bg-green-50'; }
            else if (i === selected) { border = 'border-red-500'; bg = 'bg-red-50'; }
          }
          return (
            <button
              key={i}
              onClick={() => doAnswer(i)}
              disabled={answered}
              className={`w-full text-right p-4 rounded-xl border-2 ${border} ${bg} transition-all ${
                !answered ? 'hover:border-[#1B4332] active:scale-[0.98]' : ''
              }`}
              dir="rtl"
            >
              <span className="text-base leading-8" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ref sourate apres reponse */}
      {answered && (
        <p className="text-xs text-gray-400 text-center mt-4">
          {surah?.nameFrench} ({surah?.nameArabic}) — verset {q.ayahNumber}
        </p>
      )}
    </div>
  );
}
