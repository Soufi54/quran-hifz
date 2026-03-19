'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllSurahs } from '../../../lib/quran';
import { getSurahProgress, setSurahStatus } from '../../../lib/storage';
import { SurahStatus } from '../../../types';

export default function SouratesConnuesPage() {
  const router = useRouter();
  const surahs = getAllSurahs();
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});

  useEffect(() => {
    setProgress(getSurahProgress());
  }, []);

  const toggleSurah = (num: number) => {
    const current = progress[num] || 'not_started';
    const newStatus: SurahStatus = current === 'not_started' ? 'learning' : 'not_started';
    setSurahStatus(num, newStatus);
    setProgress(prev => ({ ...prev, [num]: newStatus }));
  };

  const selectAll = () => {
    const newProgress: Record<number, SurahStatus> = {};
    surahs.forEach(s => {
      newProgress[s.number] = 'learning';
      setSurahStatus(s.number, 'learning');
    });
    setProgress(newProgress);
  };

  const selectJuzAmma = () => {
    surahs.forEach(s => {
      if (s.number >= 78) {
        setSurahStatus(s.number, 'learning');
        setProgress(prev => ({ ...prev, [s.number]: 'learning' }));
      }
    });
  };

  const selectedCount = Object.values(progress).filter(s => s !== 'not_started').length;

  return (
    <div className="min-h-screen page-enter">
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(6, 78, 59, 0.2)' }}>
        <button onClick={() => router.back()} className="cursor-pointer p-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold">Mes sourates</h1>
          <p className="text-xs text-emerald-200">{selectedCount} selectionnees</p>
        </div>
        <div className="w-8" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mx-4 mt-4">
        <button onClick={selectJuzAmma} className="clay-button text-sm flex-1 py-2.5 text-center">
          Juz Amma
        </button>
        <button onClick={selectAll} className="clay-card text-sm flex-1 py-2.5 text-center cursor-pointer text-emerald-700 font-semibold">
          Tout selectionner
        </button>
      </div>

      <p className="text-xs text-gray-400 mx-5 mt-3 mb-2">
        Selectionne les sourates que tu connais. Le quiz et le challenge quotidien porteront dessus.
      </p>

      {/* Liste */}
      <div className="pb-8">
        {surahs.map(surah => {
          const status = progress[surah.number] || 'not_started';
          const selected = status !== 'not_started';
          return (
            <button
              key={surah.number}
              onClick={() => toggleSurah(surah.number)}
              className={`w-full flex items-center mx-3 my-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                selected ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-white border-2 border-transparent'
              }`}
              style={{ maxWidth: 'calc(100% - 24px)' }}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                selected ? 'bg-emerald-500' : 'bg-gray-200'
              }`}>
                {selected && <Check size={14} className="text-white" />}
              </div>
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3 text-xs font-bold text-gray-500 flex-shrink-0">
                {surah.number}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm text-gray-800">{surah.nameFrench}</p>
                <p className="text-[10px] text-gray-400">{surah.ayahCount} versets</p>
              </div>
              <span className="text-sm text-emerald-700" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {surah.nameArabic}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
