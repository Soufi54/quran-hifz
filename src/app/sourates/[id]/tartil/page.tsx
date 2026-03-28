'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mic, Square, RotateCcw, Check } from 'lucide-react';
import { getSurah } from '../../../../lib/quran';
import { setReviewDate, setSurahStatus } from '../../../../lib/storage';
import { normalizeArabic } from '../../../../lib/speech';

type WordStatus = 'hidden' | 'correct' | 'wrong' | 'error-flash';

interface WordState {
  original: string;
  normalized: string;
  status: WordStatus;
  ayahIndex: number; // index du verset dans la sourate
}

export default function TartilPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [micError, setMicError] = useState('');
  const [words, setWords] = useState<WordState[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [ayahSeparators, setAyahSeparators] = useState<Map<number, number>>(new Map());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'receiving' | 'error'>('idle');
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev.slice(-6), `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const activeRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const currentWordRef = useRef(0);
  const wordsRef = useRef<WordState[]>([]);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullTranscriptRef = useRef('');
  const processedUpToRef = useRef(0);
  const restartingRef = useRef(false); // verrou anti-double relance
  const scrollRef = useRef<HTMLDivElement>(null);
  const ayahStartIndices = useRef<number[]>([]); // index du premier mot de chaque verset

  // Construire la liste de mots
  useEffect(() => {
    if (!surah) return;
    const allWords: WordState[] = [];
    const separators = new Map<number, number>();

    const starts: number[] = [];
    surah.ayahs.forEach((ayah, ayahIdx) => {
      separators.set(allWords.length, ayah.numberInSurah);
      starts.push(allWords.length);
      const ayahWords = ayah.text.split(/\s+/).filter(w => w.length > 0);
      ayahWords.forEach(w => {
        allWords.push({
          original: w,
          normalized: normalizeArabic(w),
          status: 'hidden',
          ayahIndex: ayahIdx,
        });
      });
    });

    setWords(allWords);
    wordsRef.current = allWords;
    setAyahSeparators(separators);
    ayahStartIndices.current = starts;
  }, [surah]);

  useEffect(() => { currentWordRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { wordsRef.current = words; }, [words]);

  // Auto-scroll vers le mot courant
  useEffect(() => {
    if (!started || done) return;
    const el = document.getElementById(`word-${currentWordIndex}`);
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const elTop = el.offsetTop;
      const containerHeight = container.clientHeight;
      // Scroll pour garder le mot courant au milieu
      container.scrollTo({ top: elTop - containerHeight / 3, behavior: 'smooth' });
    }
  }, [currentWordIndex, started, done]);

  function cleanup() {
    activeRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setIsListening(false);
  }

  // Marquer un mot et avancer
  const markWord = useCallback((idx: number, status: 'correct' | 'wrong') => {
    if (idx >= wordsRef.current.length) return;
    setWords(prev => {
      const next = [...prev];
      if (next[idx].status === 'hidden') {
        next[idx] = { ...next[idx], status };
      }
      return next;
    });
  }, []);

  const finishAll = useCallback(() => {
    cleanup();
    setDone(true);
    setReviewDate(surahNumber);
  }, [surahNumber]);

  // Comparaison souple entre deux mots normalises
  const similarityScore = useCallback((a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const aChars = a.replace(/\s/g, '').split('');
    const bChars = b.replace(/\s/g, '').split('');
    if (aChars.length === 0 || bChars.length === 0) return 0;

    let matches = 0;
    const used = new Set<number>();
    for (const c of aChars) {
      const fi = bChars.findIndex((e, i) => e === c && !used.has(i));
      if (fi !== -1) { matches++; used.add(fi); }
    }
    return matches / Math.max(aChars.length, bChars.length);
  }, []);

  // Flash erreur visuel
  const flashError = useCallback(() => {
    setErrorFlash(true);
    setTimeout(() => setErrorFlash(false), 600);
  }, []);

  // Retour en arriere : remettre les mots d'un verset a "hidden"
  const goBackToAyah = useCallback((ayahIdx: number) => {
    const startIdx = ayahStartIndices.current[ayahIdx];
    if (startIdx === undefined) return;

    // Remettre tous les mots depuis ce verset a "hidden"
    setWords(prev => prev.map((w, i) => {
      if (i >= startIdx) return { ...w, status: 'hidden' as WordStatus };
      return w;
    }));
    wordsRef.current = wordsRef.current.map((w, i) => {
      if (i >= startIdx) return { ...w, status: 'hidden' as WordStatus };
      return w;
    });

    setCurrentWordIndex(startIdx);
    currentWordRef.current = startIdx;
    processedUpToRef.current = 0;
    fullTranscriptRef.current = '';
  }, []);

  // Detecter si l'utilisateur recommence un verset precedent
  const detectGoBack = useCallback((spoken: string): boolean => {
    const norm = normalizeArabic(spoken);
    if (!norm) return false;
    const spokenWords = norm.split(/\s+/).filter(w => w.length > 0);
    if (spokenWords.length < 2) return false; // besoin d'au moins 2 mots pour detecter

    // Chercher dans les versets deja passes (et le verset courant)
    const currentAyah = wordsRef.current[currentWordRef.current]?.ayahIndex ?? 0;

    for (let aIdx = 0; aIdx <= currentAyah; aIdx++) {
      const startIdx = ayahStartIndices.current[aIdx];
      if (startIdx === undefined || startIdx >= currentWordRef.current) continue;

      // Comparer les 2-3 premiers mots du spoken avec le debut du verset
      const ayahWords = [];
      for (let i = startIdx; i < wordsRef.current.length && wordsRef.current[i].ayahIndex === aIdx; i++) {
        ayahWords.push(wordsRef.current[i].normalized);
        if (ayahWords.length >= 3) break;
      }

      let matchCount = 0;
      for (let i = 0; i < Math.min(spokenWords.length, ayahWords.length); i++) {
        if (similarityScore(spokenWords[i], ayahWords[i]) >= 0.5) matchCount++;
      }

      // Si 2+ mots matchent le debut d'un verset precedent → retour en arriere
      if (matchCount >= 2) {
        goBackToAyah(aIdx);
        return true;
      }
    }
    return false;
  }, [similarityScore, goBackToAyah]);

  // ALGORITHME PRINCIPAL : matching par flux continu
  const processTranscript = useCallback((fullText: string) => {
    const normalized = normalizeArabic(fullText);
    if (!normalized) return;

    const spokenWords = normalized.split(/\s+/).filter(w => w.length > 0);

    let spokenIdx = processedUpToRef.current;
    let wordIdx = currentWordRef.current;
    let advanced = false;

    while (spokenIdx < spokenWords.length && wordIdx < wordsRef.current.length) {
      const spoken = spokenWords[spokenIdx];
      const expected = wordsRef.current[wordIdx].normalized;

      // Essai 1 : match direct
      const sim = similarityScore(spoken, expected);
      if (sim >= 0.5) {
        markWord(wordIdx, 'correct');
        wordIdx++;
        spokenIdx++;
        advanced = true;
        continue;
      }

      // Essai 2 : speech API a fusionne 2 mots attendus
      if (wordIdx + 1 < wordsRef.current.length) {
        const combined = expected + wordsRef.current[wordIdx + 1].normalized;
        if (similarityScore(spoken, combined) >= 0.5) {
          markWord(wordIdx, 'correct');
          markWord(wordIdx + 1, 'correct');
          wordIdx += 2;
          spokenIdx++;
          advanced = true;
          continue;
        }
      }

      // Essai 3 : speech API a decoupe 1 mot en 2
      if (spokenIdx + 1 < spokenWords.length) {
        const combinedSpoken = spoken + spokenWords[spokenIdx + 1];
        if (similarityScore(combinedSpoken, expected) >= 0.5) {
          markWord(wordIdx, 'correct');
          wordIdx++;
          spokenIdx += 2;
          advanced = true;
          continue;
        }
      }

      // Essai 4 : l'utilisateur a saute 1-2 mots
      for (let skip = 1; skip <= 3 && wordIdx + skip < wordsRef.current.length; skip++) {
        const futureExpected = wordsRef.current[wordIdx + skip].normalized;
        if (similarityScore(spoken, futureExpected) >= 0.5) {
          // Marquer les mots sautes en erreur + flash
          for (let s = 0; s < skip; s++) {
            markWord(wordIdx + s, 'wrong');
          }
          flashError();
          markWord(wordIdx + skip, 'correct');
          wordIdx += skip + 1;
          spokenIdx++;
          advanced = true;
          break;
        }
      }
      if (advanced && wordIdx > currentWordRef.current) continue;

      // Essai 5 : mot parasite — ignorer
      spokenIdx++;
    }

    processedUpToRef.current = spokenIdx;
    if (wordIdx !== currentWordRef.current) {
      setCurrentWordIndex(wordIdx);
      currentWordRef.current = wordIdx;

      // Reset silence timeout
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (activeRef.current && currentWordRef.current < wordsRef.current.length) {
          markWord(currentWordRef.current, 'wrong');
          flashError();
          const next = currentWordRef.current + 1;
          if (next >= wordsRef.current.length) {
            finishAll();
          } else {
            setCurrentWordIndex(next);
            currentWordRef.current = next;
          }
        }
      }, 10000);
    }

    if (wordIdx >= wordsRef.current.length) {
      finishAll();
    }
  }, [similarityScore, markWord, finishAll, flashError]);

  async function startFlow() {
    if (!surah) return;

    // Test micro
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setMicError('Autorise le micro dans les parametres du navigateur, puis reessaie.');
      return;
    }

    const win = window as unknown as Record<string, unknown>;
    const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      (new () => {
        lang: string; continuous: boolean; interimResults: boolean;
        onresult: ((e: { results: { length: number; [k: number]: { isFinal: boolean; [k: number]: { transcript: string } } } }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void; stop: () => void;
      }) | undefined;

    if (!Ctor) {
      setMicError('Ton navigateur ne supporte pas la reconnaissance vocale. Utilise Chrome.');
      return;
    }

    // Reset complet
    setStarted(true);
    setDone(false);
    setMicError('');
    setTranscript('');
    setCurrentWordIndex(0);
    currentWordRef.current = 0;
    fullTranscriptRef.current = '';
    processedUpToRef.current = 0;
    activeRef.current = true;

    const resetWords = wordsRef.current.map(w => ({ ...w, status: 'hidden' as WordStatus }));
    setWords(resetWords);
    wordsRef.current = resetWords;

    const rec = new Ctor();
    rec.lang = 'ar'; // 'ar' plus stable que 'ar-SA' sur Chrome
    rec.continuous = false; // mode one-shot — plus stable, on relance manuellement
    rec.interimResults = true;
    recognitionRef.current = rec;
    setIsListening(true);
    setVoiceStatus('listening');
    addLog('Ecoute demarree (ar-SA)');

    let lastProcessedFinal = '';

    rec.onresult = (event) => {
      if (!activeRef.current) return;
      setVoiceStatus('receiving');

      let finals = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finals += text + ' ';
        } else {
          interim += text + ' ';
        }
      }

      const fullText = (finals + interim).trim();
      setTranscript(fullText);

      // Traiter les resultats finaux
      const trimmedFinals = finals.trim();
      if (trimmedFinals && trimmedFinals !== lastProcessedFinal) {
        lastProcessedFinal = trimmedFinals;

        // DETECTION RETOUR EN ARRIERE : si l'utilisateur recommence un verset
        if (!detectGoBack(trimmedFinals)) {
          fullTranscriptRef.current = trimmedFinals;
          processTranscript(trimmedFinals);
        } else {
          // Reset le transcript car on revient en arriere
          lastProcessedFinal = '';
        }
      }

      // Interim pour feedback temps reel (matching mot courant seulement)
      if (interim.trim()) {
        const interimNorm = normalizeArabic(interim.trim());
        const interimWords = interimNorm.split(/\s+/).filter(w => w.length > 0);
        const wordIdx = currentWordRef.current;
        if (wordIdx < wordsRef.current.length && interimWords.length > 0) {
          for (const iw of interimWords) {
            const sim = similarityScore(iw, wordsRef.current[wordIdx]?.normalized || '');
            if (sim >= 0.5) {
              markWord(wordIdx, 'correct');
              const next = wordIdx + 1;
              if (next >= wordsRef.current.length) {
                finishAll();
              } else {
                setCurrentWordIndex(next);
                currentWordRef.current = next;
              }
              break;
            }
          }
        }
      }
    };

    const restartRec = (reason: string) => {
      if (!activeRef.current || restartingRef.current) return;
      restartingRef.current = true;
      fullTranscriptRef.current = '';
      processedUpToRef.current = 0;
      lastProcessedFinal = '';
      setTimeout(() => {
        restartingRef.current = false;
        if (!activeRef.current) return;
        try {
          rec.start();
          setIsListening(true);
          setVoiceStatus('listening');
          addLog('Relancee (' + reason + ')');
        } catch (e) { addLog('Relance echouee: ' + e); }
      }, 300);
    };

    rec.onend = () => {
      addLog('Recognition arretee');
      setVoiceStatus('listening');
      restartRec('onend');
    };

    rec.onerror = (e) => {
      addLog('Erreur: ' + e.error);
      if (e.error === 'not-allowed') {
        setVoiceStatus('error');
        setMicError('Micro refuse. Va dans les parametres du navigateur.');
        cleanup();
        return;
      }
      if (e.error === 'no-speech') {
        setVoiceStatus('listening');
        restartRec('no-speech');
        return;
      }
      setVoiceStatus('error');
      restartRec('error-' + e.error);
    };

    try {
      rec.start();
    } catch {
      setMicError('Impossible de demarrer. Recharge la page.');
    }

    // Timeout silence initial (15s) — marque le premier mot en erreur si rien dit
    silenceTimeoutRef.current = setTimeout(() => {
      if (activeRef.current && currentWordRef.current === 0) {
        markWord(0, 'wrong');
        flashError();
        setCurrentWordIndex(1);
        currentWordRef.current = 1;
      }
    }, 15000);
  }

  function handleStop() {
    setWords(prev => prev.map((w, i) => {
      if (i >= currentWordRef.current && w.status === 'hidden') {
        return { ...w, status: 'wrong' };
      }
      return w;
    }));
    cleanup();
    setDone(true);
    setReviewDate(surahNumber);
  }

  function restart() {
    cleanup();
    setDone(false);
    setStarted(false);
    setCurrentWordIndex(0);
    currentWordRef.current = 0;
    setTranscript('');
    fullTranscriptRef.current = '';
    processedUpToRef.current = 0;
    setMicError('');
    if (surah) {
      const reset = wordsRef.current.map(w => ({ ...w, status: 'hidden' as WordStatus, ayahIndex: w.ayahIndex }));
      setWords(reset);
      wordsRef.current = reset;
    }
  }

  // Mettre a jour le statut quand termine
  useEffect(() => {
    if (!done || !surah) return;
    const correct = words.filter(w => w.status === 'correct').length;
    const pct = words.length > 0 ? Math.round((correct / words.length) * 100) : 0;
    if (pct >= 80) setSurahStatus(surahNumber, 'mastered');
  }, [done, words, surahNumber, surah]);

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  // Ecran resultats
  if (done) {
    const total = words.length;
    const correct = words.filter(w => w.status === 'correct').length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const mastered = pct >= 80;

    return (
      <div className="min-h-screen page-enter">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">{surah.nameTransliteration}</h1>
          <div className="w-8" />
        </div>

        <div className="flex flex-col items-center justify-center px-6 text-center mt-10">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: mastered ? '#ECFDF5' : '#FEF3C7', boxShadow: 'var(--shadow-clay)' }}>
            {mastered ? <Check size={48} className="text-emerald-500" /> : <RotateCcw size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">{mastered ? 'Maitrisee !' : 'A reviser'}</h2>
          <p className="text-lg text-gray-600 mb-4">{correct}/{total} mots ({pct}%)</p>

          <div className="w-full max-h-[50vh] overflow-y-auto rounded-2xl bg-white p-4" style={{ boxShadow: 'var(--shadow-clay)' }}>
            <div className="text-right leading-[52px]" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
              {words.map((w, i) => {
                const ayahNum = ayahSeparators.get(i);
                const prevAyahEntry = ayahNum !== undefined && i > 0
                  ? Array.from(ayahSeparators.entries()).filter(([idx]) => idx < i).sort((a, b) => b[0] - a[0])[0]
                  : null;
                return (
                  <span key={i}>
                    {prevAyahEntry && (
                      <span className="text-sm text-emerald-400 mx-1">﴿{prevAyahEntry[1]}﴾ </span>
                    )}
                    <span className={`text-xl inline-block mx-0.5 ${
                      w.status === 'correct' ? 'text-emerald-700' :
                      w.status === 'wrong' ? 'text-red-500 line-through decoration-red-300' :
                      'text-gray-400'
                    }`}>
                      {w.original}
                    </span>{' '}
                  </span>
                );
              })}
              {surah.ayahs.length > 0 && (
                <span className="text-sm text-emerald-400 mx-1">﴿{surah.ayahs[surah.ayahs.length - 1].numberInSurah}﴾</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={restart} className="clay-button py-3 px-6">Recommencer</button>
            <button onClick={() => router.back()} className="clay-card py-3 px-6 cursor-pointer text-emerald-700 font-semibold">Retour</button>
          </div>
        </div>
      </div>
    );
  }

  const revealed = words.filter(w => w.status !== 'hidden').length;
  const totalWords = words.length;
  const progress = totalWords > 0 ? (revealed / totalWords) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#FDF6EC' }}>
      {/* Flash erreur */}
      {errorFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-red-500/10 animate-pulse" />
      )}

      {/* Header */}
      <div className={`text-white px-4 py-3 rounded-b-3xl transition-colors duration-300 ${
        errorFlash ? 'bg-gradient-to-br from-red-700 to-red-900' : 'bg-gradient-to-br from-emerald-800 to-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah.nameArabic}
          </h1>
          {started ? (
            <button onClick={handleStop} className="bg-white/15 p-2 rounded-xl cursor-pointer"><Square size={16} /></button>
          ) : (
            <div className="w-8" />
          )}
        </div>
        {started && (
          <>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-emerald-200">{revealed}/{totalWords} mots</p>
              {isListening && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-200">Ecoute</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Contenu */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {!started ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            {micError && (
              <div className="clay-card p-4 mb-6 bg-red-50 border-red-200 max-w-[320px]">
                <p className="text-sm text-red-700">{micError}</p>
              </div>
            )}
            <button
              onClick={startFlow}
              className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 8px 30px rgba(5,150,105,0.4)' }}
            >
              <Mic size={44} className="text-white" />
            </button>
            <h2 className="text-xl font-bold text-emerald-900 mb-2">Mode Tartil</h2>
            <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
              Recite la sourate. Les mots se revelent au fur et a mesure. Les erreurs apparaissent en rouge.
            </p>
            <p className="text-xs text-gray-400 mt-3">{totalWords} mots · Chrome recommande</p>
          </div>
        ) : (
          <div>
            {/* Status vocal */}
            <div className="mb-3 p-2 rounded-lg bg-white/80 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${
                  voiceStatus === 'receiving' ? 'bg-emerald-500 animate-pulse' :
                  voiceStatus === 'listening' ? 'bg-amber-400 animate-pulse' :
                  voiceStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-300'
                }`} />
                <span className="text-xs text-gray-500">
                  {voiceStatus === 'receiving' ? 'Voix detectee' :
                   voiceStatus === 'listening' ? 'En attente de voix...' :
                   voiceStatus === 'error' ? 'Erreur micro' :
                   'Inactif'}
                </span>
              </div>
              {transcript && (
                <p className="text-xs text-gray-400 text-right" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                  {transcript.split(' ').slice(-8).join(' ')}
                </p>
              )}
              {process.env.NODE_ENV === 'development' && debugLog.length > 0 && (
                <div className="mt-1 border-t border-gray-100 pt-1">
                  {debugLog.slice(-3).map((log, i) => (
                    <p key={i} className="text-[10px] text-gray-300 font-mono">{log}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Page Coran avec mots caches */}
            <div className="rounded-2xl bg-white p-5 min-h-[55vh]" style={{ boxShadow: 'var(--shadow-clay)' }}>
              <div className="text-right leading-[56px]" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {words.map((w, i) => {
                  const isCurrentWord = i === currentWordIndex;
                  const ayahNum = ayahSeparators.get(i);
                  const prevAyahEntry = ayahNum !== undefined && i > 0
                    ? Array.from(ayahSeparators.entries()).filter(([idx]) => idx < i).sort((a, b) => b[0] - a[0])[0]
                    : null;

                  return (
                    <span key={i} id={`word-${i}`}>
                      {prevAyahEntry && (
                        <span className="text-sm text-emerald-400 mx-1">﴿{prevAyahEntry[1]}﴾ </span>
                      )}
                      <span
                        className={`text-xl inline-block mx-0.5 rounded transition-all duration-200 ${
                          w.status === 'correct'
                            ? 'text-emerald-700'
                            : w.status === 'wrong'
                            ? 'text-red-500'
                            : isCurrentWord
                            ? 'bg-emerald-50 border-b-2 border-emerald-400'
                            : ''
                        }`}
                        style={w.status === 'hidden' && !isCurrentWord ? {
                          color: 'transparent',
                          background: '#E5E7EB',
                          borderRadius: '4px',
                          padding: '0 2px',
                          userSelect: 'none',
                        } : isCurrentWord && w.status === 'hidden' ? {
                          color: 'transparent',
                          background: '#D1FAE5',
                          borderRadius: '4px',
                          padding: '0 2px',
                        } : undefined}
                      >
                        {w.original}
                      </span>{' '}
                    </span>
                  );
                })}
                {surah.ayahs.length > 0 && (
                  <span className="text-sm text-emerald-400 mx-1">﴿{surah.ayahs[surah.ayahs.length - 1].numberInSurah}﴾</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
