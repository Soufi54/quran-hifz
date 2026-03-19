'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, RotateCcw, Mic, Square, AlertCircle } from 'lucide-react';
import { getSurah } from '../../../../lib/quran';
import { setReviewDate, setSurahStatus } from '../../../../lib/storage';
import { compareArabicTexts } from '../../../../lib/speech';

type AyahResult = { status: 'pending' | 'correct' | 'wrong' | 'timeout' };

export default function TartilPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [started, setStarted] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [results, setResults] = useState<AyahResult[]>([]);
  const [done, setDone] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [micError, setMicError] = useState('');

  const currentAyahRef = useRef(0);
  const doneRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const resultStartIndexRef = useRef(0); // Index de depart dans les resultats pour le verset courant

  useEffect(() => {
    if (surah) setResults(surah.ayahs.map(() => ({ status: 'pending' })));
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah]);

  useEffect(() => { currentAyahRef.current = currentAyah; }, [currentAyah]);
  useEffect(() => { doneRef.current = done; }, [done]);

  function log(msg: string) {
    console.log('[Tartil]', msg);
    setDebugLog(prev => [...prev.slice(-8), msg]);
  }

  function cleanup() {
    activeRef.current = false;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  function markAyah(idx: number, status: 'correct' | 'wrong' | 'timeout') {
    setResults(prev => { const next = [...prev]; next[idx] = { status }; return next; });
    setFeedback(status === 'correct' ? 'correct' : 'wrong');
  }

  function moveToNextAyah() {
    if (!surah || doneRef.current) return;
    const nextIdx = currentAyahRef.current + 1;
    setFeedback(null);
    setTranscript('');

    if (nextIdx >= surah.ayahs.length) {
      cleanup();
      setDone(true);
      setReviewDate(surahNumber);
      log('Termine !');
      return;
    }

    setCurrentAyah(nextIdx);
    log(`Verset ${nextIdx + 1}/${surah.ayahs.length}`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!doneRef.current && activeRef.current) {
        log(`Timeout verset ${currentAyahRef.current + 1}`);
        markAyah(currentAyahRef.current, 'timeout');
        setTimeout(() => moveToNextAyah(), 1000);
      }
    }, 20000);
  }

  async function startFlow() {
    if (!surah) return;

    // 1. Test micro
    log('Test micro...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      log('Micro OK');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      log('Micro REFUSE: ' + msg);
      setMicError('Autorise le micro dans les parametres du navigateur, puis reessaie.');
      return;
    }

    // 2. Test Web Speech API
    const win = window as unknown as Record<string, unknown>;
    const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      (new () => {
        lang: string; continuous: boolean; interimResults: boolean;
        onresult: ((e: { results: { length: number; [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void; stop: () => void;
      }) | undefined;

    if (!Ctor) {
      log('Web Speech API absente');
      setMicError('Ton navigateur ne supporte pas la reconnaissance vocale. Utilise Chrome.');
      return;
    }

    // 3. Demarrer
    setStarted(true);
    setCurrentAyah(0);
    setTranscript('');
    setDone(false);
    setFeedback(null);
    setMicError('');
    activeRef.current = true;
    resultStartIndexRef.current = 0;
    setResults(surah.ayahs.map(() => ({ status: 'pending' })));
    log('Demarrage reconnaissance...');

    const rec = new Ctor();
    rec.lang = 'ar-SA';
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      if (!activeRef.current || doneRef.current) return;

      // Ne prendre que les resultats DEPUIS le debut du verset courant
      let currentText = '';
      const startIdx = resultStartIndexRef.current;
      for (let i = startIdx; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript + ' ';
      }
      currentText = currentText.trim();
      setTranscript(currentText);

      const idx = currentAyahRef.current;
      if (!surah.ayahs[idx]) return;
      const sim = compareArabicTexts(currentText, surah.ayahs[idx].text);
      log(`Match: ${Math.round(sim * 100)}% (v${idx + 1}) "${currentText.slice(0, 30)}"`);

      if (sim >= 0.5) {
        log(`Correct ! (${Math.round(sim * 100)}%)`);
        markAyah(idx, 'correct');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Marquer l'index de fin pour le prochain verset
        resultStartIndexRef.current = event.results.length;
        setTimeout(() => moveToNextAyah(), 1200);
      }
    };

    rec.onend = () => {
      log('Recognition ended, restarting...');
      // Reset l'index car les resultats repartent de 0 apres restart
      resultStartIndexRef.current = 0;
      if (activeRef.current && !doneRef.current) {
        setTimeout(() => {
          try { rec.start(); log('Restarted'); } catch (e) { log('Restart failed: ' + e); }
        }, 300);
      }
    };

    rec.onerror = (e) => {
      log('Error: ' + e.error);
      if (e.error === 'not-allowed') {
        setMicError('Micro refuse. Va dans les parametres du navigateur → Micro → Autoriser.');
        cleanup();
        return;
      }
      // Relancer pour les autres erreurs
      if (activeRef.current && !doneRef.current) {
        setTimeout(() => { try { rec.start(); } catch {} }, 500);
      }
    };

    try {
      rec.start();
      log('Ecoute active');
    } catch (err) {
      log('Erreur start: ' + err);
      setMicError('Impossible de demarrer. Recharge la page et autorise le micro.');
      return;
    }

    // Timeout premier verset (20s)
    timeoutRef.current = setTimeout(() => {
      if (!doneRef.current && activeRef.current) {
        log('Timeout verset 1');
        markAyah(currentAyahRef.current, 'timeout');
        setTimeout(() => moveToNextAyah(), 1000);
      }
    }, 20000);
  }

  function handleStop() { cleanup(); setDone(true); setReviewDate(surahNumber); }
  function restart() {
    cleanup(); setDone(false); setStarted(false); setCurrentAyah(0);
    setTranscript(''); setFeedback(null); setDebugLog([]); setMicError('');
    if (surah) setResults(surah.ayahs.map(() => ({ status: 'pending' })));
  }

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  const totalAyahs = surah.ayahs.length;
  const correctCount = results.filter(r => r.status === 'correct').length;
  const answeredCount = results.filter(r => r.status !== 'pending').length;
  const ayah = surah.ayahs[currentAyah];

  if (done) {
    const pct = answeredCount > 0 ? Math.round((correctCount / totalAyahs) * 100) : 0;
    const mastered = pct >= 80;
    if (mastered) setSurahStatus(surahNumber, 'mastered');
    return (
      <div className="min-h-screen page-enter">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">{surah.nameTransliteration}</h1>
          <div className="w-8" />
        </div>
        <div className="flex flex-col items-center justify-center px-8 text-center mt-12">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5" style={{ background: mastered ? '#ECFDF5' : '#FEF3C7', boxShadow: 'var(--shadow-clay)' }}>
            {mastered ? <Check size={48} className="text-emerald-500" /> : <RotateCcw size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">{mastered ? 'Maitrisee !' : 'A reviser'}</h2>
          <p className="text-lg text-gray-600">{correctCount}/{totalAyahs} ({pct}%)</p>
          <div className="w-full mt-6 space-y-1 max-h-[35vh] overflow-y-auto">
            {results.map((r, i) => r.status !== 'pending' && (
              <div key={i} className={`p-2 rounded-lg text-xs flex items-start gap-2 ${r.status === 'correct' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <span className={r.status === 'correct' ? 'text-emerald-500' : 'text-red-400'}>{r.status === 'correct' ? '✓' : r.status === 'timeout' ? '⏱' : '✗'}</span>
                <p className="text-right flex-1 text-gray-600" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif", fontSize: '13px', lineHeight: '26px' }}>
                  {surah.ayahs[i]?.text.split(' ').slice(0, 5).join(' ')}...
                </p>
              </div>
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

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F0FDF4' }}>
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">{surah.nameTransliteration}</h1>
          {started && <button onClick={handleStop} className="bg-white/15 p-2 rounded-xl cursor-pointer"><Square size={16} /></button>}
        </div>
        {started && (
          <>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(answeredCount / totalAyahs) * 100}%` }} />
            </div>
            <p className="text-xs text-emerald-200 text-center mt-1">{currentAyah + 1} / {totalAyahs}</p>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5">
        {!started ? (
          <div className="text-center">
            {micError && (
              <div className="clay-card p-4 mb-6 flex items-start gap-3 bg-red-50 border-red-200">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 text-left">{micError}</p>
              </div>
            )}
            <button onClick={startFlow} className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 cursor-pointer transition-transform hover:scale-105 active:scale-95" style={{ boxShadow: '0 8px 30px rgba(5,150,105,0.4)' }}>
              <Mic size={44} className="text-white" />
            </button>
            <h2 className="text-xl font-bold text-emerald-900 mb-2">Mode Tartil</h2>
            <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
              Appuie et recite. Les versets defilent automatiquement.
            </p>
            <p className="text-xs text-gray-400 mt-3">{totalAyahs} versets · Chrome recommande</p>
          </div>
        ) : (
          <div className="w-full">
            {feedback && (
              <div className={`text-center mb-4 py-2 rounded-xl text-sm font-bold ${feedback === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {feedback === 'correct' ? 'Correct !' : 'A revoir'}
              </div>
            )}

            <div className="clay-card p-6 min-h-[200px] flex flex-col items-center justify-center relative">
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-gray-400">Ecoute</span>
              </div>

              <p className="text-xs text-gray-400 mb-3">Verset {currentAyah + 1}</p>
              <p className="text-2xl text-emerald-300 mb-2" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {ayah?.text.split(' ').slice(0, 2).join(' ')}...
              </p>

              {transcript && (
                <div className="mt-4 w-full">
                  <p className="text-xs text-gray-400 text-center mb-1">Reconnu :</p>
                  <p className="text-sm text-right text-gray-700 bg-gray-50 rounded-lg p-2.5" dir="rtl">{transcript}</p>
                </div>
              )}
            </div>

            {/* Debug log */}
            <div className="mt-4 p-2 rounded-lg bg-gray-100 text-[10px] text-gray-500 font-mono max-h-[80px] overflow-y-auto">
              {debugLog.map((l, i) => <p key={i}>{l}</p>)}
              {debugLog.length === 0 && <p>En attente...</p>}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
              {results.map((r, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i === currentAyah ? 'ring-2 ring-emerald-400 ring-offset-2 scale-125 bg-emerald-300' : r.status === 'correct' ? 'bg-emerald-500' : r.status === 'wrong' || r.status === 'timeout' ? 'bg-red-400' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
