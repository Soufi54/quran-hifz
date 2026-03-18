'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '../../components/BottomNav';
import { getAllSurahs, getSurahsByJuz, getJuzList } from '../../lib/quran';
import { getSurahProgress } from '../../lib/storage';
import { SurahStatus, STATUS_COLORS } from '../../types';

export default function SouratesPage() {
  const [viewMode, setViewMode] = useState<'list' | 'juz'>('list');
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});

  useEffect(() => {
    setProgress(getSurahProgress());
  }, []);

  const surahs = getAllSurahs();
  const juzList = getJuzList();
  const getStatus = (n: number): SurahStatus => progress[n] || 'not_started';

  const masteredCount = Object.values(progress).filter(s => s === 'mastered').length;
  const learningCount = Object.values(progress).filter(s => s === 'learning').length;
  const decliningCount = Object.values(progress).filter(s => s === 'declining' || s === 'urgent').length;

  const SurahItem = ({ surah }: { surah: typeof surahs[0] }) => {
    const status = getStatus(surah.number);
    return (
      <Link
        href={`/sourates/${surah.number}`}
        className="flex items-center bg-white mx-3 my-1 p-3 rounded-lg border border-gray-100 hover:border-[#1B4332] transition-colors"
      >
        <div
          className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        />
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-sm font-semibold text-gray-600 flex-shrink-0">
          {surah.number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{surah.nameFrench}</p>
          <p className="text-xs text-gray-400">
            {surah.ayahCount} versets - {surah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Medinoise'}
          </p>
        </div>
        <span className="text-lg text-[#1B4332] font-medium">{surah.nameArabic}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-[#1B4332] text-white px-4 py-4">
        <h1 className="text-xl font-bold text-center">Sourates</h1>
      </div>

      {/* Stats */}
      <div className="flex justify-around bg-white py-3 border-b border-gray-200">
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">{masteredCount}</p>
          <p className="text-[10px] text-gray-500">Maitrisees</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{learningCount}</p>
          <p className="text-[10px] text-gray-500">En cours</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{decliningCount}</p>
          <p className="text-[10px] text-gray-500">A reviser</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex m-3 bg-gray-200 rounded-lg p-0.5">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2 text-sm rounded-md transition-colors ${
            viewMode === 'list' ? 'bg-white text-[#1B4332] font-semibold shadow-sm' : 'text-gray-500'
          }`}
        >
          Par liste
        </button>
        <button
          onClick={() => setViewMode('juz')}
          className={`flex-1 py-2 text-sm rounded-md transition-colors ${
            viewMode === 'juz' ? 'bg-white text-[#1B4332] font-semibold shadow-sm' : 'text-gray-500'
          }`}
        >
          Par juz
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto">
        {viewMode === 'list' ? (
          surahs.map(s => <SurahItem key={s.number} surah={s} />)
        ) : (
          juzList.map(juz => (
            <div key={juz} className="mt-3">
              <h3 className="text-sm font-bold text-[#1B4332] mx-4 mb-2 pb-1 border-b border-gray-200">
                Juz {juz}
              </h3>
              {getSurahsByJuz(juz).map(s => <SurahItem key={s.number} surah={s} />)}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
