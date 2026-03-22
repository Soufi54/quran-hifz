'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Eye } from 'lucide-react';
import { getSurah, getAudioUrl } from '../../../../lib/quran';
import {
  getChunks,
  getVerseMastery,
  setVerseMastery,
  isChunkUnlocked,
  incrementCombo,
  resetCombo,
  getComboMultiplier,
  addLearningXP,
  generateRecognitionQ,
  generateCompletionQ,
} from '../../../../lib/learning';
import WordPuzzle from '../../../../components/WordPuzzle';
import ComboBar from '../../../../components/ComboBar';
import type { Ayah } from '../../../../types';

// ─── Types locaux ───────────────────────────────────────────

type Step = 'listen' | 'recognize' | 'puzzle' | 'complete' | 'recite';

interface LocalChunk {
  index: number;
  ayahs: Ayah[];
  locked: boolean;
}

interface RecognitionQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface CompletionQuestion {
  ayahText: string;
  blanks: { position: number; answer: string; options: string[] }[];
}

// ─── Constantes ─────────────────────────────────────────────

const STEPS: Step[] = ['listen', 'recognize', 'puzzle', 'complete', 'recite'];
const STEP_LABELS: Record<Step, string> = {
  listen: 'Ecouter',
  recognize: 'Reconnaitre',
  puzzle: 'Puzzle',
  complete: 'Completer',
  recite: 'Reciter',
};
const LISTEN_COUNT = 3;
const PUZZLE_TIMER = 30;

const GREEN = '#10B981';
const RED = '#EF4444';
const GOLD = '#D4AF37';
const ORANGE = '#F59E0B';

// ─── Composant principal ────────────────────────────────────

export default function ApprendrePage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  // Donnees de la sourate
  const [chunks, setChunks] = useState<LocalChunk[]>([]);
  const [activeChunk, setActiveChunk] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('listen');

  // Combo / XP
  const [combo, setCombo] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Etat etape "Ecouter"
  const [listenCount, setListenCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // highlightedWord removed — surlignage par ayah entiere
  const [highlightedAyah, setHighlightedAyah] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  // Etat etape "Reconnaitre"
  const [recognitionQs, setRecognitionQs] = useState<RecognitionQuestion[]>([]);
  const [recognitionIdx, setRecognitionIdx] = useState(0);
  const [recognitionAnswer, setRecognitionAnswer] = useState<number | null>(null);

  // Etat etape "Puzzle"
  const [puzzleAyahIdx, setPuzzleAyahIdx] = useState(0);
  const [puzzleTimer, setPuzzleTimer] = useState(PUZZLE_TIMER);
  const [puzzleErrors, setPuzzleErrors] = useState(0);
  const [puzzleDone, setPuzzleDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Etat etape "Completer"
  const [completionQs, setCompletionQs] = useState<CompletionQuestion[]>([]);
  const [completionIdx, setCompletionIdx] = useState(0);
  const [completionBlankIdx, setCompletionBlankIdx] = useState(0);
  const [completionAnswer, setCompletionAnswer] = useState<number | null>(null);
  const [completionFilledBlanks, setCompletionFilledBlanks] = useState<Record<number, string>>({});

  // Etat etape "Reciter"
  const [reciteAyahIdx, setReciteAyahIdx] = useState(0);
  const [reciteRevealed, setReciteRevealed] = useState(false);

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [chunkScore, setChunkScore] = useState(0);

  // Flash feedback
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // ─── Init ───────────────────────────────────────────────────

  useEffect(() => {
    if (!surah) return;
    const rawChunks = getChunks(surahNumber);
    // Convertir les chunks de learning.ts vers le format local avec Ayah[]
    const localChunks: LocalChunk[] = rawChunks.map(rc => ({
      index: rc.index,
      locked: rc.locked,
      ayahs: rc.versets.map(v => {
        const ayah = surah.ayahs.find(a => a.numberInSurah === v.number);
        return ayah!;
      }).filter(Boolean),
    }));
    setChunks(localChunks);
  }, [surahNumber, surah]);

  // ─── Helpers ────────────────────────────────────────────────

  const currentChunk = activeChunk !== null ? chunks[activeChunk] : null;
  const currentAyahs = currentChunk?.ayahs ?? [];

  const globalProgress = (): number => {
    if (!surah || chunks.length === 0) return 0;
    let mastered = 0;
    for (const chunk of chunks) {
      if (isChunkUnlocked(surahNumber, chunk.index)) {
        const m = chunk.ayahs.every(
          (a) => getVerseMastery(surahNumber, a.numberInSurah) >= 3
        );
        if (m) mastered++;
      }
    }
    return Math.round((mastered / chunks.length) * 100);
  };

  const milestone = (): string | null => {
    const p = globalProgress();
    if (p >= 100) return '100% de la sourate !';
    if (p >= 75) return '75% de la sourate !';
    if (p >= 50) return '50% de la sourate !';
    if (p >= 25) return '25% de la sourate !';
    return null;
  };

  const flash = (color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 400);
  };

  const handleCorrect = () => {
    const newCombo = incrementCombo();
    setCombo(newCombo);
    if (newCombo >= 5 && newCombo % 5 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    addLearningXP(10);
    flash(GREEN);
  };

  const handleWrong = () => {
    resetCombo();
    setCombo(0);
    flash(RED);
  };

  // ─── Navigation etapes ─────────────────────────────────────

  const goToStep = useCallback(
    (step: Step) => {
      setCurrentStep(step);

      if (step === 'listen') {
        setListenCount(0);
        void 0 /* highlightedWord removed */;
        setHighlightedAyah(0);
      }

      if (step === 'recognize' && activeChunk !== null) {
        // Generer plusieurs questions en appelant generateRecognitionQ plusieurs fois
        const qs: RecognitionQuestion[] = [];
        for (let i = 0; i < Math.max(currentAyahs.length - 1, 1); i++) {
          const q = generateRecognitionQ(surahNumber, activeChunk);
          if (q) qs.push({ prompt: q.question, options: q.options, correctIndex: q.correctIndex });
        }
        setRecognitionQs(qs);
        setRecognitionIdx(0);
        setRecognitionAnswer(null);
      }

      if (step === 'puzzle') {
        setPuzzleAyahIdx(0);
        setPuzzleTimer(PUZZLE_TIMER);
        setPuzzleErrors(0);
        setPuzzleDone(false);
      }

      if (step === 'complete' && activeChunk !== null) {
        const qs: CompletionQuestion[] = [];
        for (let i = 0; i < currentAyahs.length; i++) {
          const q = generateCompletionQ(surahNumber, activeChunk);
          if (q) qs.push({ ayahText: q.verseText, blanks: q.blanks.map(b => ({ position: b.position, answer: b.word, options: b.options })) });
        }
        setCompletionQs(qs);
        setCompletionIdx(0);
        setCompletionBlankIdx(0);
        setCompletionAnswer(null);
        setCompletionFilledBlanks({});
      }

      if (step === 'recite') {
        setReciteAyahIdx(0);
        setReciteRevealed(false);
      }
    },
    [currentAyahs, surahNumber]
  );

  const nextStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      goToStep(STEPS[idx + 1]);
    } else {
      finishChunk();
    }
  };

  const startChunk = (index: number) => {
    setActiveChunk(index);
    setCombo(0);
    setShowCelebration(false);
    setChunkScore(0);
    // On attend que currentAyahs se mette a jour
    setTimeout(() => goToStep('listen'), 0);
  };

  const finishChunk = () => {
    if (!currentChunk) return;
    // Calcul du score
    const score = Math.max(0, combo * 10);
    setChunkScore(score);
    // Mise a jour mastery
    for (const ayah of currentAyahs) {
      const current = getVerseMastery(surahNumber, ayah.numberInSurah);
      setVerseMastery(surahNumber, ayah.numberInSurah, Math.min(5, current + 1) as 0 | 1 | 2 | 3 | 4 | 5);
    }
    setShowCelebration(true);
  };

  // ─── Puzzle timer ──────────────────────────────────────────

  useEffect(() => {
    if (currentStep !== 'puzzle' || puzzleDone) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setPuzzleTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, puzzleDone, puzzleAyahIdx]);

  // ─── Audio lecture ─────────────────────────────────────────

  const playChunkAudio = async () => {
    if (isPlaying) {
      playingRef.current = false;
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);

    for (let i = 0; i < currentAyahs.length; i++) {
      if (!playingRef.current) break;
      const ayah = currentAyahs[i];
      setHighlightedAyah(i);
      const url = getAudioUrl(surahNumber, ayah.numberInSurah);
      const audio = new Audio(url);
      audioRef.current = audio;

      // Surlignage mot par mot (estimation basee sur la duree)
      const words = ayah.text.split(/\s+/);
      let wordInterval: ReturnType<typeof setInterval> | null = null;

      try {
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => {
            const wordDuration = (audio.duration * 1000) / Math.max(words.length, 1);
            let wordIdx = 0;
            void 0 /* highlightedWord removed */;
            wordInterval = setInterval(() => {
              wordIdx++;
              void wordIdx; /* word-level highlight removed */
            }, wordDuration);
          };
          audio.onended = () => {
            if (wordInterval) clearInterval(wordInterval);
            void 0 /* highlightedWord removed */;
            resolve();
          };
          audio.onerror = () => {
            if (wordInterval) clearInterval(wordInterval);
            reject();
          };
          audio.play().catch(reject);
        });
      } catch {
        if (wordInterval) clearInterval(wordInterval);
        break;
      }
    }

    playingRef.current = false;
    setIsPlaying(false);
    void 0 /* highlightedWord removed */;
    setListenCount((c) => c + 1);
  };

  // ─── Rendu conditionnel ────────────────────────────────────

  if (!surah) {
    return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;
  }

  // ─── Vue liste des chunks ─────────────────────────────────

  if (activeChunk === null || showCelebration) {
    if (showCelebration) {
      const m = milestone();
      return (
        <div className="min-h-screen bg-white flex flex-col">
          <Header surahName={surah.nameArabic} progress={globalProgress()} onBack={() => router.back()} />
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {combo >= 5 && <CelebrationConfetti />}
            <div
              className="text-6xl font-bold mb-4"
              style={{ color: GOLD, animation: 'scaleIn 0.5s ease-out' }}
            >
              +{chunkScore} XP
            </div>
            <p className="text-lg text-gray-700 mb-2">Partie terminee !</p>
            {m && (
              <p className="text-sm font-semibold mb-6" style={{ color: GOLD }}>
                {m}
              </p>
            )}
            {combo >= 5 && (
              <p className="text-sm text-gray-500 mb-6">Combo x{combo} !</p>
            )}
            <div className="flex gap-3">
              {activeChunk !== null && activeChunk < chunks.length - 1 && (
                <button
                  onClick={() => startChunk(activeChunk + 1)}
                  className="px-6 py-3 rounded-xl text-white font-semibold cursor-pointer transition-transform active:scale-95"
                  style={{ backgroundColor: GREEN }}
                >
                  Chunk suivant
                </button>
              )}
              <button
                onClick={() => {
                  setActiveChunk(null);
                  setShowCelebration(false);
                }}
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-pointer transition-transform active:scale-95"
              >
                Retour
              </button>
            </div>
          </div>
          <style jsx>{`
            @keyframes scaleIn {
              0% { transform: scale(0.3); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header surahName={surah.nameArabic} progress={globalProgress()} onBack={() => router.back()} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
          {chunks.map((chunk, i) => {
            const unlocked = isChunkUnlocked(surahNumber, chunk.index);
            const ayahRange = `${chunk.ayahs[0].numberInSurah}-${chunk.ayahs[chunk.ayahs.length - 1].numberInSurah}`;
            const mastery = chunk.ayahs.reduce(
              (sum, a) => sum + getVerseMastery(surahNumber, a.numberInSurah),
              0
            );
            const maxMastery = chunk.ayahs.length * 5;
            const masteryPct = Math.round((mastery / maxMastery) * 100);

            return (
              <button
                key={i}
                onClick={() => unlocked && startChunk(i)}
                disabled={!unlocked}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  unlocked
                    ? 'border-emerald-200 bg-white hover:bg-emerald-50 active:scale-[0.98]'
                    : 'border-gray-100 bg-gray-50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    Partie {i + 1}
                  </span>
                  <span className="text-xs text-gray-500">
                    Versets {ayahRange}
                  </span>
                </div>
                {!unlocked ? (
                  <p className="text-xs text-gray-400" style={{ filter: 'blur(3px)' }}>
                    {chunk.ayahs[0].text.slice(0, 60)}...
                  </p>
                ) : (
                  <>
                    <p
                      className="text-base text-right leading-loose text-gray-800 mb-2"
                      dir="rtl"
                      style={{ fontFamily: "'Amiri Quran', serif" }}
                    >
                      {chunk.ayahs[0].text.slice(0, 80)}...
                    </p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${masteryPct}%`,
                          backgroundColor: masteryPct >= 80 ? GREEN : masteryPct >= 40 ? ORANGE : '#E5E7EB',
                        }}
                      />
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Vue apprentissage (un chunk actif) ────────────────────

  const stepIndex = STEPS.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: flashColor, opacity: 0.15 }}
        />
      )}

      {/* Header */}
      <Header
        surahName={surah.nameArabic}
        progress={globalProgress()}
        onBack={() => setActiveChunk(null)}
      />

      {/* ComboBar */}
      <div className="px-4 pt-2">
        <ComboBar combo={combo} multiplier={getComboMultiplier(combo)} showConfetti={showConfetti} />
      </div>

      {/* Barre de progression des etapes */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1 mb-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i <= stepIndex ? GREEN : '#E5E7EB',
              }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center">
          {STEP_LABELS[currentStep]} ({stepIndex + 1}/{STEPS.length})
        </p>
      </div>

      {/* Contenu de l'etape */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {currentStep === 'listen' && (
          <StepListen
            ayahs={currentAyahs}
            listenCount={listenCount}
            isPlaying={isPlaying}
            highlightedAyah={highlightedAyah}
            onPlay={playChunkAudio}
            onReady={nextStep}
          />
        )}

        {currentStep === 'recognize' && (
          <StepRecognize
            questions={recognitionQs}
            currentIdx={recognitionIdx}
            answer={recognitionAnswer}
            onAnswer={(idx: number) => {
              setRecognitionAnswer(idx);
              if (idx === recognitionQs[recognitionIdx].correctIndex) {
                handleCorrect();
              } else {
                handleWrong();
              }
              setTimeout(() => {
                if (recognitionIdx < recognitionQs.length - 1) {
                  setRecognitionIdx(recognitionIdx + 1);
                  setRecognitionAnswer(null);
                } else {
                  nextStep();
                }
              }, 800);
            }}
          />
        )}

        {currentStep === 'puzzle' && currentAyahs[puzzleAyahIdx] && (
          <StepPuzzle
            ayah={currentAyahs[puzzleAyahIdx]}
            timer={puzzleTimer}
            onComplete={(errors: number) => {
              setPuzzleErrors(puzzleErrors + errors);
              if (errors === 0) handleCorrect();
              else handleWrong();

              if (puzzleAyahIdx < currentAyahs.length - 1) {
                setPuzzleAyahIdx(puzzleAyahIdx + 1);
                setPuzzleTimer(PUZZLE_TIMER);
              } else {
                setPuzzleDone(true);
                setTimeout(nextStep, 1000);
              }
            }}
          />
        )}

        {currentStep === 'complete' && completionQs[completionIdx] && (
          <StepComplete
            question={completionQs[completionIdx]}
            blankIdx={completionBlankIdx}
            answer={completionAnswer}
            filledBlanks={completionFilledBlanks}
            onAnswer={(idx: number) => {
              const q = completionQs[completionIdx];
              const blank = q.blanks[completionBlankIdx];
              setCompletionAnswer(idx);

              const correct = blank.options[idx] === blank.answer;
              if (correct) {
                handleCorrect();
                setCompletionFilledBlanks({ ...completionFilledBlanks, [blank.position]: blank.answer });
              } else {
                handleWrong();
              }

              setTimeout(() => {
                setCompletionAnswer(null);
                if (completionBlankIdx < q.blanks.length - 1) {
                  setCompletionBlankIdx(completionBlankIdx + 1);
                } else if (completionIdx < completionQs.length - 1) {
                  setCompletionIdx(completionIdx + 1);
                  setCompletionBlankIdx(0);
                  setCompletionFilledBlanks({});
                } else {
                  nextStep();
                }
              }, 800);
            }}
          />
        )}

        {currentStep === 'recite' && currentAyahs[reciteAyahIdx] && (
          <StepRecite
            ayah={currentAyahs[reciteAyahIdx]}
            revealed={reciteRevealed}
            onReveal={() => setReciteRevealed(true)}
            onEvaluate={(level: 'perfect' | 'hesitation' | 'error') => {
              const ayah = currentAyahs[reciteAyahIdx];
              if (level === 'perfect') {
                setVerseMastery(surahNumber, ayah.numberInSurah, 5);
                handleCorrect();
              } else if (level === 'hesitation') {
                setVerseMastery(surahNumber, ayah.numberInSurah, 3);
              } else {
                setVerseMastery(surahNumber, ayah.numberInSurah, 1);
                handleWrong();
              }

              if (reciteAyahIdx < currentAyahs.length - 1) {
                setReciteAyahIdx(reciteAyahIdx + 1);
                setReciteRevealed(false);
              } else {
                nextStep();
              }
            }}
          />
        )}

        {/* Bouton Passer — toujours visible */}
        <div className="text-center mt-6 pb-4">
          <button
            onClick={nextStep}
            className="text-sm text-gray-400 underline cursor-pointer hover:text-gray-600"
          >
            Passer cette etape
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────

function Header({
  surahName,
  progress,
  onBack,
}: {
  surahName: string;
  progress: number;
  onBack: () => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-1 cursor-pointer">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1 text-center">
          <h1
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: "'Amiri Quran', serif" }}
          >
            {surahName}
          </h1>
        </div>
        <div className="w-7" />
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, backgroundColor: GREEN }}
        />
      </div>
      <p className="text-[10px] text-gray-400 text-right mt-1">{progress}% maitrise</p>
    </div>
  );
}

// ─── Etape 1 : Ecouter ──────────────────────────────────────

function StepListen({
  ayahs,
  listenCount,
  isPlaying,
  highlightedAyah,
  onPlay,
  onReady,
}: {
  ayahs: Ayah[];
  listenCount: number;
  isPlaying: boolean;
  highlightedAyah: number;
  onPlay: () => void;
  onReady: () => void;
}) {
  const ready = listenCount >= LISTEN_COUNT;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Ecoute {Math.min(listenCount + 1, LISTEN_COUNT)}/{LISTEN_COUNT}
      </p>

      <div className="w-full space-y-4">
        {ayahs.map((ayah, ai) => (
            <div
              key={ayah.numberInSurah}
              className="text-right rounded-xl p-3 transition-colors duration-300"
              dir="rtl"
              style={{
                backgroundColor: ai === highlightedAyah ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              }}
            >
              <p className="text-xl leading-[56px]" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {ayah.text}
                <span className="text-sm text-gray-400 mx-1">﴿{ayah.numberInSurah}﴾</span>
              </p>
            </div>
        ))}
      </div>

      <button
        onClick={onPlay}
        className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
        style={{ backgroundColor: isPlaying ? RED : GREEN }}
      >
        {isPlaying ? <Pause size={28} color="white" /> : <Play size={28} color="white" />}
      </button>

      {ready && (
        <button
          onClick={onReady}
          className="px-8 py-3 rounded-xl text-white font-semibold cursor-pointer transition-transform active:scale-95"
          style={{ backgroundColor: GREEN, animation: 'fadeIn 0.3s ease-out' }}
        >
          Je suis pret
        </button>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Etape 2 : Reconnaitre ──────────────────────────────────

function StepRecognize({
  questions,
  currentIdx,
  answer,
  onAnswer,
}: {
  questions: RecognitionQuestion[];
  currentIdx: number;
  answer: number | null;
  onAnswer: (idx: number) => void;
}) {
  if (questions.length === 0) return null;
  const q = questions[currentIdx];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500 text-center">
        Question {currentIdx + 1}/{questions.length}
      </p>
      <p className="text-center text-gray-700 font-medium">Quel est le verset suivant ?</p>
      <div
        className="text-right text-xl leading-[56px] text-gray-800 p-4 bg-gray-50 rounded-xl"
        dir="rtl"
        style={{ fontFamily: "'Amiri Quran', serif" }}
      >
        {q.prompt}
      </div>
      <div className="space-y-3">
        {q.options.map((option, i) => {
          let bg = 'bg-white border-gray-200';
          if (answer !== null) {
            if (i === q.correctIndex) bg = 'border-transparent';
            else if (i === answer) bg = 'border-transparent';
          }

          return (
            <button
              key={i}
              onClick={() => answer === null && onAnswer(i)}
              disabled={answer !== null}
              className={`w-full text-right p-4 rounded-xl border transition-all cursor-pointer ${bg}`}
              dir="rtl"
              style={{
                fontFamily: "'Amiri Quran', serif",
                fontSize: '18px',
                lineHeight: '48px',
                backgroundColor:
                  answer !== null && i === q.correctIndex
                    ? `${GREEN}15`
                    : answer !== null && i === answer && i !== q.correctIndex
                    ? `${RED}15`
                    : undefined,
                borderColor:
                  answer !== null && i === q.correctIndex
                    ? GREEN
                    : answer !== null && i === answer && i !== q.correctIndex
                    ? RED
                    : undefined,
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Etape 3 : Puzzle ────────────────────────────────────────

function StepPuzzle({
  ayah,
  timer,
  onComplete,
}: {
  ayah: Ayah;
  timer: number;
  onComplete: (errors: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Verset {ayah.numberInSurah}
        </span>
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: timer <= 10 ? RED : GOLD }}
        >
          {timer}s
        </span>
      </div>

      <WordPuzzle
        words={ayah.text.split(/\s+/).filter((w: string) => w.length > 0)}
        onComplete={onComplete}
        timerSeconds={timer}
      />
    </div>
  );
}

// ─── Etape 4 : Completer ────────────────────────────────────

function StepComplete({
  question,
  blankIdx,
  answer,
  filledBlanks,
  onAnswer,
}: {
  question: CompletionQuestion;
  blankIdx: number;
  answer: number | null;
  filledBlanks: Record<number, string>;
  onAnswer: (idx: number) => void;
}) {
  const blank = question.blanks[blankIdx];

  // Construire le texte avec les blancs
  const words = question.ayahText.split(/\s+/);
  const displayWords = words.map((word, i) => {
    if (filledBlanks[i]) {
      return { text: filledBlanks[i], type: 'filled' as const };
    }
    const isBlank = question.blanks.some((b) => b.position === i);
    if (isBlank) {
      const isCurrentBlank = blank && blank.position === i;
      return { text: '____', type: isCurrentBlank ? 'active' : ('blank' as const) };
    }
    return { text: word, type: 'normal' as const };
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500 text-center">Completez le verset</p>

      <div
        className="text-right text-xl leading-[56px] p-4 bg-gray-50 rounded-xl"
        dir="rtl"
        style={{ fontFamily: "'Amiri Quran', serif" }}
      >
        {displayWords.map((w, i) => (
          <span
            key={i}
            className="transition-all duration-200"
            style={{
              backgroundColor:
                w.type === 'active'
                  ? `${GOLD}30`
                  : w.type === 'filled'
                  ? `${GREEN}15`
                  : 'transparent',
              borderBottom: w.type === 'active' ? `2px solid ${GOLD}` : 'none',
              padding: '2px 6px',
              borderRadius: '4px',
              color: w.type === 'blank' ? '#9CA3AF' : w.type === 'filled' ? GREEN : '#1F2937',
            }}
          >
            {w.text}{' '}
          </span>
        ))}
      </div>

      {blank && (
        <div className="grid grid-cols-2 gap-3">
          {blank.options.map((option, i) => {
            let borderColor = '#E5E7EB';
            let bgColor = 'white';
            if (answer !== null) {
              if (option === blank.answer) {
                borderColor = GREEN;
                bgColor = `${GREEN}10`;
              } else if (i === answer) {
                borderColor = RED;
                bgColor = `${RED}10`;
              }
            }

            return (
              <button
                key={i}
                onClick={() => answer === null && onAnswer(i)}
                disabled={answer !== null}
                className="p-3 rounded-xl border text-center cursor-pointer transition-all active:scale-95"
                dir="rtl"
                style={{
                  fontFamily: "'Amiri Quran', serif",
                  fontSize: '18px',
                  borderColor,
                  backgroundColor: bgColor,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Etape 5 : Reciter ──────────────────────────────────────

function StepRecite({
  ayah,
  revealed,
  onReveal,
  onEvaluate,
}: {
  ayah: Ayah;
  revealed: boolean;
  onReveal: () => void;
  onEvaluate: (level: 'perfect' | 'hesitation' | 'error') => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Recitez le verset {ayah.numberInSurah} de memoire
      </p>

      <div className="w-full relative">
        <div
          className="text-right text-xl leading-[56px] p-6 rounded-xl transition-all duration-300"
          dir="rtl"
          style={{
            fontFamily: "'Amiri Quran', serif",
            backgroundColor: revealed ? '#F9FAFB' : '#D1D5DB',
            color: revealed ? '#1F2937' : 'transparent',
            userSelect: revealed ? 'auto' : 'none',
          }}
        >
          {ayah.text}
          <span className="text-sm text-gray-400 ml-2">﴿{ayah.numberInSurah}﴾</span>
        </div>

        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Recitez puis verifiez</p>
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={onReveal}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-pointer transition-transform active:scale-95"
        >
          <Eye size={18} />
          Reveler
        </button>
      ) : (
        <div className="flex gap-3 w-full">
          <button
            onClick={() => onEvaluate('perfect')}
            className="flex-1 py-3 rounded-xl text-white font-semibold cursor-pointer transition-transform active:scale-95"
            style={{ backgroundColor: GREEN }}
          >
            Parfait
          </button>
          <button
            onClick={() => onEvaluate('hesitation')}
            className="flex-1 py-3 rounded-xl text-white font-semibold cursor-pointer transition-transform active:scale-95"
            style={{ backgroundColor: ORANGE }}
          >
            Hesitation
          </button>
          <button
            onClick={() => onEvaluate('error')}
            className="flex-1 py-3 rounded-xl text-white font-semibold cursor-pointer transition-transform active:scale-95"
            style={{ backgroundColor: RED }}
          >
            Erreur
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Confetti celebration ────────────────────────────────────

function CelebrationConfetti() {
  const particles = Array.from({ length: 30 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = 2 + Math.random() * 1.5;
    const size = 6 + Math.random() * 8;
    const colors = [GOLD, GREEN, ORANGE, RED, '#8B5CF6', '#3B82F6'];
    const color = colors[i % colors.length];
    const rotation = Math.random() * 360;

    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: '-12px',
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `celebFall ${duration}s ease-in ${delay}s forwards`,
          transform: `rotate(${rotation}deg)`,
          opacity: 1,
        }}
      />
    );
  });

  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>
      <style jsx>{`
        @keyframes celebFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}
