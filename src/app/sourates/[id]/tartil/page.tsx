'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Check, X, RotateCcw } from 'lucide-react';
import { getSurah } from '../../../../lib/quran';
import { setReviewDate, setSurahStatus } from '../../../../lib/storage';

export default function TartilPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentAyah, setCurrentAyah] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<('correct' | 'wrong' | null)[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (surah) {
      setResults(new Array(surah.ayahs.length).fill(null));
    }
  }, [surah]);

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  const ayah = surah.ayahs[currentAyah];
  const totalAyahs = surah.ayahs.length;
  const correctCount = results.filter(r => r === 'correct').length;
  const answeredCount = results.filter(r => r !== null).length;

  const handleResult = (result: 'correct' | 'wrong') => {
    const newResults = [...results];
    newResults[currentAyah] = result;
    setResults(newResults);

    if (currentAyah < totalAyahs - 1) {
      setCurrentAyah(prev => prev + 1);
      setRevealed(false);
    } else {
      // Termine
      setDone(true);
      setReviewDate(surahNumber);
      const finalCorrect = newResults.filter(r => r === 'correct').length;
      const percentage = (finalCorrect / totalAyahs) * 100;
      if (percentage >= 80) {
        setSurahStatus(surahNumber, 'mastered');
      }
    }
  };

  const restart = () => {
    setCurrentAyah(0);
    setRevealed(false);
    setResults(new Array(totalAyahs).fill(null));
    setDone(false);
  };

  if (done) {
    const percentage = Math.round((correctCount / totalAyahs) * 100);
    const mastered = percentage >= 80;
    return (
      <div className="min-h-screen page-enter">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <h1 className="flex-1 text-center text-base font-bold">Tartil - {surah.nameFrench}</h1>
          <div className="w-8" />
        </div>
        <div className="flex flex-col items-center justify-center px-8 text-center mt-16">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5" style={{
            background: mastered ? '#ECFDF5' : '#FEF3C7',
            boxShadow: 'var(--shadow-clay)'
          }}>
            {mastered ? <Check size={48} className="text-emerald-500" /> : <RotateCcw size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">
            {mastered ? 'Sourate maitrisee !' : 'Continue a reviser'}
          </h2>
          <p className="text-lg text-gray-600">{correctCount}/{totalAyahs} versets corrects ({percentage}%)</p>
          {!mastered && <p className="text-sm text-gray-400 mt-1">Il faut 80% pour maitriser</p>}
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
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="cursor-pointer p-1"><ArrowLeft size={22} /></button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold">Tartil - {surah.nameFrench}</h1>
            <p className="text-xs text-emerald-200">Recite de memoire, puis verifie</p>
          </div>
          <div className="w-8" />
        </div>
        {/* Progress */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / totalAyahs) * 100}%` }}
          />
        </div>
        <p className="text-xs text-emerald-200 text-center mt-1">Verset {currentAyah + 1}/{totalAyahs}</p>
      </div>

      {/* Main area */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center">
        {/* Indication */}
        <p className="text-sm text-gray-500 mb-4 text-center">
          Recite le verset {currentAyah + 1} de memoire, puis appuie sur &quot;Reveler&quot;
        </p>

        {/* Verset cache ou revele */}
        <div className="clay-card w-full p-6 min-h-[200px] flex items-center justify-center mb-6">
          {revealed ? (
            <p
              className="text-xl leading-[56px] text-right text-emerald-900 w-full"
              dir="rtl"
              style={{ fontFamily: "'Amiri Quran', serif" }}
            >
              {ayah.text}
              <span className="text-sm text-emerald-400 mx-1">﴿{ayah.numberInSurah}﴾</span>
            </p>
          ) : (
            <div className="text-center">
              <EyeOff size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Verset {currentAyah + 1} masque</p>
              <p className="text-xs text-gray-300 mt-1">Recite-le de memoire...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="clay-button w-full py-4 text-base flex items-center justify-center gap-2"
          >
            <Eye size={20} />
            Reveler le verset
          </button>
        ) : (
          <div className="w-full space-y-3">
            <p className="text-center text-sm text-gray-500 mb-2">Tu l&apos;avais ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResult('correct')}
                className="flex-1 py-4 rounded-xl bg-emerald-500 text-white font-semibold text-base flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                style={{ boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' }}
              >
                <Check size={20} />
                Oui
              </button>
              <button
                onClick={() => handleResult('wrong')}
                className="flex-1 py-4 rounded-xl bg-red-500 text-white font-semibold text-base flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                <X size={20} />
                Non
              </button>
            </div>
          </div>
        )}

        {/* Mini indicators */}
        <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
          {results.map((r, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === currentAyah ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
              } ${
                r === 'correct' ? 'bg-emerald-500' :
                r === 'wrong' ? 'bg-red-500' :
                'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
