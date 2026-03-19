'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Check, X, RotateCcw, Mic, Square, Download, Loader2 } from 'lucide-react';
import { getSurah } from '../../../../lib/quran';
import { setReviewDate, setSurahStatus } from '../../../../lib/storage';
import {
  isWebSpeechAvailable, startWebSpeechRecognition, stopWebSpeechRecognition,
  loadWhisper, isWhisperLoaded, startRecording, stopRecording, transcribeWithWhisper,
  compareArabicTexts, getWordDiff,
} from '../../../../lib/speech';

type Mode = 'manual' | 'webspeech' | 'whisper';

export default function TartilPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentAyah, setCurrentAyah] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<('correct' | 'wrong' | null)[]>([]);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>('manual');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [wordDiff, setWordDiff] = useState<{ word: string; correct: boolean }[]>([]);
  const [whisperLoading, setWhisperLoading] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [whisperReady, setWhisperReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speechAvail, setSpeechAvail] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (surah) setResults(new Array(surah.ayahs.length).fill(null));
    setSpeechAvail(isWebSpeechAvailable());
    setWhisperReady(isWhisperLoaded());
  }, [surah]);

  // Timer d'enregistrement
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  const ayah = surah.ayahs[currentAyah];
  const totalAyahs = surah.ayahs.length;
  const correctCount = results.filter(r => r === 'correct').length;
  const answeredCount = results.filter(r => r !== null).length;

  // --- Charger Whisper ---
  const handleLoadWhisper = async () => {
    setWhisperLoading(true);
    try {
      await loadWhisper((p) => setWhisperProgress(p));
      setWhisperReady(true);
      setMode('whisper');
    } catch {
      alert('Erreur chargement Whisper');
    }
    setWhisperLoading(false);
  };

  // --- Demarrer enregistrement ---
  const handleStartRecording = async () => {
    setRecognizedText('');
    setSimilarity(null);
    setWordDiff([]);
    setIsRecording(true);

    if (mode === 'webspeech') {
      startWebSpeechRecognition().then(transcript => {
        processTranscript(transcript);
      }).catch(() => {
        setIsRecording(false);
      });
    } else if (mode === 'whisper') {
      await startRecording();
    }
  };

  // --- Arreter enregistrement ---
  const handleStopRecording = async () => {
    setIsRecording(false);

    if (mode === 'webspeech') {
      stopWebSpeechRecognition();
      // Le resultat arrivera via la promise de startWebSpeechRecognition
    } else if (mode === 'whisper') {
      setProcessing(true);
      try {
        const blob = await stopRecording();
        const transcript = await transcribeWithWhisper(blob);
        processTranscript(transcript);
      } catch {
        setProcessing(false);
      }
    }
  };

  const processTranscript = (transcript: string) => {
    setRecognizedText(transcript);
    const sim = compareArabicTexts(transcript, ayah.text);
    setSimilarity(sim);
    setWordDiff(getWordDiff(transcript, ayah.text));
    setRevealed(true);
    setProcessing(false);
    if (sim >= 0.7) {
      // Auto-marquer correct avec delai pour voir le feedback
      setTimeout(() => handleResult('correct'), 1500);
    }
  };

  const handleResult = (result: 'correct' | 'wrong') => {
    const newResults = [...results];
    newResults[currentAyah] = result;
    setResults(newResults);
    if (currentAyah < totalAyahs - 1) {
      setTimeout(() => {
        setCurrentAyah(prev => prev + 1);
        setRevealed(false);
        setRecognizedText('');
        setSimilarity(null);
        setWordDiff([]);
      }, 500);
    } else {
      setDone(true);
      setReviewDate(surahNumber);
      const finalCorrect = newResults.filter(r => r === 'correct').length;
      if ((finalCorrect / totalAyahs) * 100 >= 80) setSurahStatus(surahNumber, 'mastered');
    }
  };

  const restart = () => {
    setCurrentAyah(0);
    setRevealed(false);
    setResults(new Array(totalAyahs).fill(null));
    setDone(false);
    setRecognizedText('');
    setSimilarity(null);
    setWordDiff([]);
  };

  // --- Ecran termine ---
  if (done) {
    const percentage = Math.round((correctCount / totalAyahs) * 100);
    const mastered = percentage >= 80;
    return (
      <div className="min-h-screen page-enter">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">Tartil - {surah.nameTransliteration}</h1>
          <div className="w-8" />
        </div>
        <div className="flex flex-col items-center justify-center px-8 text-center mt-16">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5" style={{
            background: mastered ? '#ECFDF5' : '#FEF3C7', boxShadow: 'var(--shadow-clay)'
          }}>
            {mastered ? <Check size={48} className="text-emerald-500" /> : <RotateCcw size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">{mastered ? 'Sourate maitrisee !' : 'Continue a reviser'}</h2>
          <p className="text-lg text-gray-600">{correctCount}/{totalAyahs} ({percentage}%)</p>
          <div className="flex gap-3 mt-8">
            <button onClick={restart} className="clay-button py-3 px-6">Recommencer</button>
            <button onClick={() => router.back()} className="clay-card py-3 px-6 cursor-pointer text-emerald-700 font-semibold">Retour</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold">Tartil - {surah.nameTransliteration}</h1>
          </div>
          <div className="w-8" />
        </div>
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${(answeredCount / totalAyahs) * 100}%` }} />
        </div>
        <p className="text-xs text-emerald-200 text-center mt-1">{currentAyah + 1}/{totalAyahs}</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mx-4 mt-3 p-1 rounded-xl" style={{ background: '#E8F5E9', boxShadow: 'var(--shadow-clay-inset)' }}>
        <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-xs rounded-lg cursor-pointer transition-all ${mode === 'manual' ? 'bg-white text-emerald-700 font-semibold shadow-md' : 'text-gray-500'}`}>
          Manuel
        </button>
        {speechAvail && (
          <button onClick={() => setMode('webspeech')} className={`flex-1 py-2 text-xs rounded-lg cursor-pointer transition-all ${mode === 'webspeech' ? 'bg-white text-emerald-700 font-semibold shadow-md' : 'text-gray-500'}`}>
            Rapide
          </button>
        )}
        <button
          onClick={() => whisperReady ? setMode('whisper') : handleLoadWhisper()}
          disabled={whisperLoading}
          className={`flex-1 py-2 text-xs rounded-lg cursor-pointer transition-all ${mode === 'whisper' ? 'bg-white text-emerald-700 font-semibold shadow-md' : 'text-gray-500'}`}
        >
          {whisperLoading ? (
            <span className="flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin" />{whisperProgress}%</span>
          ) : whisperReady ? 'Precis' : (
            <span className="flex items-center justify-center gap-1"><Download size={11} />Precis</span>
          )}
        </button>
      </div>

      <div className="flex-1 p-5 flex flex-col items-center justify-center">
        <p className="text-sm text-gray-500 mb-4 text-center">Verset {currentAyah + 1}</p>

        {/* Verset */}
        <div className="clay-card w-full p-6 min-h-[180px] flex items-center justify-center mb-4">
          {revealed ? (
            <div className="w-full">
              {wordDiff.length > 0 ? (
                <p className="text-xl leading-[52px] text-right w-full" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {wordDiff.map((w, i) => (
                    <span key={i} className={w.correct ? 'text-emerald-700' : 'text-red-500 underline decoration-2'}>{w.word} </span>
                  ))}
                  <span className="text-sm text-emerald-400">﴿{ayah.numberInSurah}﴾</span>
                </p>
              ) : (
                <p className="text-xl leading-[52px] text-right w-full text-emerald-900" dir="rtl" style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {ayah.text}<span className="text-sm text-emerald-400 mx-1">﴿{ayah.numberInSurah}﴾</span>
                </p>
              )}
              {similarity !== null && (
                <p className={`text-center mt-3 text-sm font-bold ${similarity >= 0.7 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Math.round(similarity * 100)}% correct
                </p>
              )}
            </div>
          ) : processing ? (
            <div className="text-center">
              <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">Analyse en cours...</p>
            </div>
          ) : isRecording ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-3 animate-pulse" style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
                <Mic size={28} className="text-white" />
              </div>
              <p className="text-lg font-bold text-red-500">{recordingTime}s</p>
              <p className="text-xs text-gray-400 mt-1">Recite le verset...</p>
            </div>
          ) : (
            <div className="text-center text-gray-300">
              <p className="text-4xl mb-2">?</p>
              <p className="text-sm">Verset masque</p>
            </div>
          )}
        </div>

        {recognizedText && (
          <div className="clay-card w-full p-3 mb-4 bg-gray-50">
            <p className="text-xs text-gray-400 mb-1">Reconnu :</p>
            <p className="text-sm text-right text-gray-700" dir="rtl">{recognizedText}</p>
          </div>
        )}

        {/* Actions */}
        {!revealed && !processing ? (
          <div className="w-full space-y-3">
            {mode !== 'manual' && (
              isRecording ? (
                <button
                  onClick={handleStopRecording}
                  className="w-full py-4 rounded-xl bg-red-500 text-white text-base flex items-center justify-center gap-2 cursor-pointer font-semibold transition-transform active:scale-95"
                  style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
                >
                  <Square size={18} fill="white" />
                  Arreter ({recordingTime}s)
                </button>
              ) : (
                <button
                  onClick={handleStartRecording}
                  disabled={mode === 'whisper' && !whisperReady}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-white text-base flex items-center justify-center gap-2 cursor-pointer font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}
                >
                  <Mic size={20} />
                  Reciter
                </button>
              )
            )}
            <button
              onClick={() => setRevealed(true)}
              className={`w-full py-4 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer font-semibold ${
                mode === 'manual' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
              style={{ boxShadow: mode === 'manual' ? '0 4px 12px rgba(5,150,105,0.3)' : 'none' }}
            >
              <Eye size={20} /> Reveler
            </button>
          </div>
        ) : revealed ? (
          <div className="w-full">
            <p className="text-center text-sm text-gray-500 mb-2">Correct ?</p>
            <div className="flex gap-3">
              <button onClick={() => handleResult('correct')} className="flex-1 py-4 rounded-xl bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95" style={{ boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                <Check size={20} /> Oui
              </button>
              <button onClick={() => handleResult('wrong')} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95" style={{ boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                <X size={20} /> Non
              </button>
            </div>
          </div>
        ) : null}

        {/* Dots */}
        <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
          {results.map((r, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i === currentAyah ? 'ring-2 ring-emerald-400 ring-offset-1' : ''} ${r === 'correct' ? 'bg-emerald-500' : r === 'wrong' ? 'bg-red-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
