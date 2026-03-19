'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, RotateCcw, Mic, Square } from 'lucide-react';
import { getSurah } from '../../../../lib/quran';
import { setReviewDate, setSurahStatus } from '../../../../lib/storage';
import { compareArabicTexts, getWordDiff } from '../../../../lib/speech';

type AyahResult = {
  status: 'pending' | 'listening' | 'correct' | 'wrong' | 'timeout';
  recognizedText?: string;
  similarity?: number;
  wordDiff?: { word: string; correct: boolean }[];
};

export default function TartilPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [started, setStarted] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [results, setResults] = useState<AyahResult[]>([]);
  const [done, setDone] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAyahRef = useRef(0);
  const resultsRef = useRef<AyahResult[]>([]);

  useEffect(() => {
    if (surah) {
      const r = surah.ayahs.map(() => ({ status: 'pending' as const }));
      setResults(r);
      resultsRef.current = r;
    }
  }, [surah]);

  // Sync refs
  useEffect(() => { currentAyahRef.current = currentAyah; }, [currentAyah]);
  useEffect(() => { resultsRef.current = results; }, [results]);

  const createRecognition = useCallback(() => {
    const win = window as unknown as Record<string, unknown>;
    const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as (new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { length: number; [k: number]: { isFinal: boolean; [k: number]: { transcript: string } } } }) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void; stop: () => void;
    }) | undefined;
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = 'ar-SA';
    rec.continuous = true;
    rec.interimResults = true;
    return rec;
  }, []);

  const advanceToNext = useCallback((result: 'correct' | 'wrong' | 'timeout', recognized: string, sim: number, diff: { word: string; correct: boolean }[]) => {
    if (!surah) return;
    const idx = currentAyahRef.current;

    setResults(prev => {
      const next = [...prev];
      next[idx] = { status: result, recognizedText: recognized, similarity: sim, wordDiff: diff };
      resultsRef.current = next;
      return next;
    });

    // Delai avant prochain verset
    setTimeout(() => {
      if (idx < surah.ayahs.length - 1) {
        setCurrentAyah(idx + 1);
        setTranscript('');
        // Relancer le timeout pour le prochain
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          advanceToNext('timeout', '', 0, []);
        }, 15000);
      } else {
        // Fini
        stopListening();
        setDone(true);
        setReviewDate(surahNumber);
        const finalResults = [...resultsRef.current];
        finalResults[idx] = { status: result, recognizedText: recognized, similarity: sim, wordDiff: diff };
        const correctCount = finalResults.filter(r => r.status === 'correct').length;
        if ((correctCount / surah.ayahs.length) * 100 >= 80) {
          setSurahStatus(surahNumber, 'mastered');
        }
      }
    }, 1500);
  }, [surah, surahNumber]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startFlow = useCallback(() => {
    if (!surah) return;
    setStarted(true);
    setIsListening(true);
    setCurrentAyah(0);
    setTranscript('');

    const rec = createRecognition();
    if (!rec) {
      alert('Reconnaissance vocale non disponible sur ce navigateur');
      return;
    }
    recognitionRef.current = rec;

    let accumulated = '';

    rec.onresult = (event) => {
      // Reconstruire le transcript complet
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript + ' ';
      }
      accumulated = full.trim();
      setTranscript(accumulated);

      // Verifier la correspondance avec le verset courant
      const idx = currentAyahRef.current;
      if (!surah.ayahs[idx]) return;
      const expected = surah.ayahs[idx].text;
      const sim = compareArabicTexts(accumulated, expected);

      if (sim >= 0.6) {
        const diff = getWordDiff(accumulated, expected);
        // Reset timeout et avancer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        accumulated = '';
        advanceToNext('correct', accumulated, sim, diff);
      }
    };

    rec.onend = () => {
      // Relancer automatiquement si pas fini
      if (!done && isListening && recognitionRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    rec.onerror = () => {
      // Relancer
      if (!done && isListening) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    rec.start();

    // Timeout 15s par verset
    timeoutRef.current = setTimeout(() => {
      advanceToNext('timeout', accumulated, 0, []);
    }, 15000);
  }, [surah, createRecognition, advanceToNext, done, isListening]);

  const handleStop = () => {
    stopListening();
    setDone(true);
    setReviewDate(surahNumber);
  };

  const restart = () => {
    stopListening();
    setCurrentAyah(0);
    setStarted(false);
    setDone(false);
    setTranscript('');
    if (surah) {
      const r = surah.ayahs.map(() => ({ status: 'pending' as const }));
      setResults(r);
      resultsRef.current = r;
    }
  };

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  const totalAyahs = surah.ayahs.length;
  const correctCount = results.filter(r => r.status === 'correct').length;
  const answeredCount = results.filter(r => r.status !== 'pending' && r.status !== 'listening').length;
  const ayah = surah.ayahs[currentAyah];

  // --- Ecran termine ---
  if (done) {
    const percentage = totalAyahs > 0 ? Math.round((correctCount / totalAyahs) * 100) : 0;
    const mastered = percentage >= 80;
    return (
      <div className="min-h-screen page-enter">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">{surah.nameTransliteration}</h1>
          <div className="w-8" />
        </div>
        <div className="flex flex-col items-center justify-center px-8 text-center mt-12">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5" style={{
            background: mastered ? '#ECFDF5' : '#FEF3C7', boxShadow: 'var(--shadow-clay)'
          }}>
            {mastered ? <Check size={48} className="text-emerald-500" /> : <RotateCcw size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">{mastered ? 'Maitrisee !' : 'A reviser'}</h2>
          <p className="text-lg text-gray-600">{correctCount}/{answeredCount} corrects ({percentage}%)</p>

          {/* Detail par verset */}
          <div className="w-full mt-6 space-y-2 text-left max-h-[40vh] overflow-y-auto">
            {results.map((r, i) => (
              r.status !== 'pending' && (
                <div key={i} className={`p-3 rounded-xl text-sm ${r.status === 'correct' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${r.status === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.status === 'correct' ? 'Correct' : r.status === 'timeout' ? 'Pas recite' : 'Incorrect'}
                    </span>
                    <span className="text-xs text-gray-400">Verset {i + 1}</span>
                  </div>
                  <p className="text-right text-xs text-gray-600" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                    {surah.ayahs[i]?.text}
                  </p>
                </div>
              )
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={restart} className="clay-button py-3 px-6">Recommencer</button>
            <button onClick={() => router.back()} className="clay-card py-3 px-6 cursor-pointer text-emerald-700 font-semibold">Retour</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Ecran principal ---
  return (
    <div className="min-h-screen flex flex-col page-enter">
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold">{surah.nameTransliteration}</h1>
          </div>
          {started && (
            <button onClick={handleStop} className="bg-white/15 p-2 rounded-xl cursor-pointer">
              <Square size={16} />
            </button>
          )}
        </div>
        {started && (
          <>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(answeredCount / totalAyahs) * 100}%` }} />
            </div>
            <p className="text-xs text-emerald-200 text-center mt-1">{currentAyah + 1}/{totalAyahs}</p>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5">
        {!started ? (
          /* Ecran de demarrage */
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={startFlow} style={{ boxShadow: '0 8px 30px rgba(5,150,105,0.4)' }}>
              <Mic size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900 mb-2">Mode Tartil</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] mx-auto">
              Appuie sur le micro et recite {surah.nameTransliteration} du debut a la fin. Les versets defilent automatiquement.
            </p>
            <p className="text-xs text-gray-400 mt-4">{totalAyahs} versets · 15s max par verset</p>
          </div>
        ) : (
          /* Mode ecoute */
          <div className="w-full">
            {/* Verset precedent (correct) */}
            {currentAyah > 0 && results[currentAyah - 1]?.status === 'correct' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 opacity-60">
                <p className="text-sm text-right text-emerald-700" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {surah.ayahs[currentAyah - 1]?.text}
                  <span className="text-xs text-emerald-400 mx-1">﴿{currentAyah}﴾</span>
                </p>
              </div>
            )}

            {/* Verset courant */}
            <div className="clay-card p-6 min-h-[160px] flex items-center justify-center relative">
              {/* Pulse indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-gray-400">Ecoute...</span>
              </div>

              <div className="text-center w-full">
                <p className="text-gray-300 text-sm mb-2">Verset {currentAyah + 1}</p>
                {/* Afficher les premiers mots comme indice */}
                <p className="text-lg text-emerald-300" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {ayah.text.split(' ').slice(0, 2).join(' ')}...
                </p>
              </div>
            </div>

            {/* Transcript en temps reel */}
            {transcript && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Tu dis :</p>
                <p className="text-sm text-right text-gray-700" dir="rtl">{transcript}</p>
              </div>
            )}

            {/* Resultats deja passes */}
            <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
              {results.map((r, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all ${
                  i === currentAyah ? 'ring-2 ring-emerald-400 ring-offset-2 bg-emerald-200' :
                  r.status === 'correct' ? 'bg-emerald-500' :
                  r.status === 'wrong' || r.status === 'timeout' ? 'bg-red-500' :
                  'bg-gray-200'
                }`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
