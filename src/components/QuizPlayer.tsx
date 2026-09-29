'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
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
  onComplete: (score: number, total: number, totalPoints: number, mistakes: QuizQuestion[]) => void;
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
  const scoreRef = useRef(0);
  const totalPointsRef = useRef(0);
  const mistakesRef = useRef<QuizQuestion[]>([]);
  const continueRef = useRef<HTMLButtonElement>(null);

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
    if (phase === 'question' && !answered) {
      startTime.current = Date.now();
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, startTimer]);

  // Timeout
  useEffect(() => {
    if (timeLeft === 0 && !answered && phase === 'question') {
      doAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered, phase]);

  // Clavier (app desktop) : 1-4 pour repondre, Entree/Espace pour continuer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'context') { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setPhase('question'); } return; }
      if (!answered) {
        const n = parseInt(e.key);
        if (n >= 1 && n <= (q?.options.length ?? 0)) doAnswer(n - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answered, idx]);

  // Focus sur "Continuer" apres la reponse (lecteurs d'ecran + clavier)
  useEffect(() => {
    if (answered && phase === 'question') continueRef.current?.focus({ preventScroll: true });
  }, [answered, phase]);

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
      mistakesRef.current.push(q);
      onLoseLife?.();
    }
  }

  function goNext() {
    if (idx < questions.length - 1) {
      setIdx(prev => prev + 1);
      setAnswered(false);
      setSelected(null);
      setPts(0);
      setPhase('question');
    } else {
      onComplete(scoreRef.current, questions.length, totalPointsRef.current, mistakesRef.current);
    }
  }

  if (!q) return null;

  const progress = ((idx + (answered ? 1 : 0)) / questions.length) * 100;
  const arabicOptions = q.type === 'next_ayah' || q.type === 'complete_ayah' || q.type === 'first_word';
  const timerColor = timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-orange-500' : 'text-[var(--text-muted)]';

  // ─── PHASE CONTEXTE : page mushaf + verset surligne ─────────
  if (phase === 'context') {
    const ayah = surah?.ayahs.find(a => a.numberInSurah === q.answerAyahNumber);
    const actualPage = ayah?.page || (surah ? getFirstPageOfSurah(q.surahNumber) : 1);
    const qcfPage = qcfData ? qcfData[String(actualPage)] : undefined;
    const highlightLines = getVerseLines(qcfPage, q.surahNumber, q.answerAyahNumber);

    // Image mushaf classique : 1024x1656, texte y=50 a y=1620
    const IMG_H = 1656;
    const TEXT_TOP = 50;
    const TEXT_BOTTOM = 1620;
    const TOTAL_LINES = 15;
    const LINE_H = (TEXT_BOTTOM - TEXT_TOP) / TOTAL_LINES;

    return (
      <div className="flex flex-col items-center min-h-[70vh]" onClick={() => setPhase('question')} style={{ cursor: 'pointer' }}>
        <div className="text-center py-2">
          <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah?.nameArabic}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{surah?.nameFrench} — verset {q.answerAyahNumber} — page {actualPage}</p>
        </div>

        <div className="w-full flex-1 relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--border)]" style={{ aspectRatio: '1024/1656' }}>
          <img // eslint-disable-line @next/next/no-img-element
            src={getMushafUrl(actualPage)}
            alt={`Page ${actualPage}`}
            className="w-full h-auto absolute inset-0"
          />
          {highlightLines.map(lineNum => {
            // Position en % de la hauteur de l'image
            const topPx = TEXT_TOP + (lineNum - 1) * LINE_H;
            const topPct = (topPx / IMG_H) * 100;
            const hPct = (LINE_H / IMG_H) * 100;
            return (
              <div
                key={lineNum}
                className="absolute"
                style={{
                  top: `${topPct}%`,
                  left: '2%',
                  width: '96%',
                  height: `${hPct}%`,
                  backgroundColor: wasCorrect ? 'rgba(13, 92, 77, 0.2)' : 'rgba(196, 91, 91, 0.15)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-2 mb-1">Appuie pour revenir</p>
      </div>
    );
  }

  // ─── PHASE QUESTION ─────────────────────────────────────────
  return (
    <div className="p-4 relative">
      {/* Progress bar */}
      <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="flex items-center gap-1">
          <Heart size={16} className="text-[var(--danger)]" fill="currentColor" />
          <span className="font-bold text-[var(--danger)]">{lives}</span>
        </div>
        <div className={`font-mono font-bold text-lg ${timerColor}`}>{timeLeft}s</div>
        <span className="text-[var(--primary)] font-semibold">{totalPoints} pts</span>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden mb-6">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-400' : 'bg-[var(--primary)]'
          }`}
          style={{ width: `${(timeLeft / MAX_TIME_S) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="text-lg font-semibold text-center mb-4">{q.questionText}</h2>

      {q.questionArabic && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 mb-6 border border-[var(--border)]">
          {q.contextArabic && (
            <p className="text-lg leading-10 text-right text-[var(--text-muted)] mb-1" dir="rtl"
              style={{ fontFamily: "'Amiri Quran', serif" }}>
              {q.contextArabic}
            </p>
          )}
          <p className="text-2xl leading-[56px] text-right text-[var(--text)]" dir="rtl"
            style={{ fontFamily: "'Amiri Quran', serif" }}>
            {q.questionArabic}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((option, i) => {
          let border = 'border-[var(--border)]';
          let bg = 'bg-[var(--bg-card)]';
          let dim = '';
          if (answered) {
            if (i === q.correctIndex) { border = 'border-[var(--secondary)]'; bg = 'bg-[var(--primary-light)]'; }
            else if (i === selected) { border = 'border-[var(--danger)]'; bg = 'bg-red-50 dark:bg-red-900/20'; }
            else dim = 'opacity-50';
          }
          return (
            <button
              key={i}
              onClick={() => doAnswer(i)}
              disabled={answered}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 ${border} ${bg} ${dim} transition-all ${
                !answered ? 'hover:border-[var(--primary)] active:scale-[0.98]' : ''
              }`}
              dir={arabicOptions ? 'rtl' : 'ltr'}
            >
              <span className="hidden sm:flex shrink-0 w-6 h-6 rounded-md border border-[var(--border)] text-xs text-[var(--text-muted)] items-center justify-center font-mono" aria-hidden>
                {i + 1}
              </span>
              {arabicOptions ? (
                <span className="flex-1 text-right text-xl leading-9 text-[var(--text)]" style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {option}
                </span>
              ) : (
                <span className="flex-1 text-left text-[15px] leading-snug text-[var(--text)]">
                  {option}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Retour apres reponse : la bonne reponse complete, puis on continue a son rythme */}
      {answered && (
        <>
          <div className="h-72" aria-hidden />
          <div
            role="status"
            aria-live="polite"
            className={`fixed inset-x-0 bottom-0 z-50 border-t-2 ${wasCorrect ? 'border-[var(--secondary)]' : 'border-[var(--danger)]'} bg-[var(--bg-card)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]`}
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-lg mx-auto px-4 pt-4 max-h-[55vh] overflow-y-auto">
              <p className={`font-bold ${wasCorrect ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                {wasCorrect ? `Correct${pts > 0 ? ` · +${pts} pts` : ''}` : selected === -1 ? 'Temps ecoule' : 'Pas tout a fait'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {surah?.nameFrench} ({surah?.nameArabic}) — verset {q.answerAyahNumber}
              </p>
              <p className="text-xl leading-10 text-right text-[var(--text)] mt-2" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {q.answerArabic}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 leading-snug">{q.answerTranslation}</p>
            </div>
            <div className="max-w-lg mx-auto px-4 pt-3 flex gap-2">
              <button
                onClick={() => setPhase('context')}
                className="px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text)]"
              >
                Voir la page
              </button>
              <button
                ref={continueRef}
                onClick={goNext}
                className={`flex-1 py-3 rounded-xl font-semibold text-white ${wasCorrect ? 'bg-[var(--primary)]' : 'bg-[var(--danger)]'}`}
              >
                {idx < questions.length - 1 ? 'Continuer' : 'Voir le resultat'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
