'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
        className="clay-card flex items-center mx-3 my-1.5 p-3.5 cursor-pointer"
      >
        <div
          className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        />
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mr-3 text-sm font-bold text-emerald-700 flex-shrink-0">
          {surah.number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-900 text-sm">{surah.nameFrench}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {surah.ayahCount} versets · {surah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Medinoise'}
          </p>
        </div>
        <span className="text-lg text-emerald-700" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
          {surah.nameArabic}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen pb-20 page-enter">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-5 py-5 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(6, 78, 59, 0.2)' }}>
        <h1 className="text-xl font-bold text-center">Sourates</h1>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-4 mx-3 mt-3 clay-card">
        <div className="text-center flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" />
          <div>
            <p className="text-lg font-bold text-emerald-600">{masteredCount}</p>
            <p className="text-[10px] text-gray-400">Maitrisees</p>
          </div>
        </div>
        <div className="w-px bg-emerald-100" />
        <div className="text-center flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold text-amber-500">{learningCount}</p>
            <p className="text-[10px] text-gray-400">En cours</p>
          </div>
        </div>
        <div className="w-px bg-emerald-100" />
        <div className="text-center flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <div>
            <p className="text-lg font-bold text-red-500">{decliningCount}</p>
            <p className="text-[10px] text-gray-400">A reviser</p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex m-3 p-1 rounded-xl" style={{ background: '#E8F5E9', boxShadow: 'var(--shadow-clay-inset)' }}>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 ${
            viewMode === 'list' ? 'bg-white text-emerald-700 font-semibold shadow-md' : 'text-gray-500'
          }`}
        >
          Par liste
        </button>
        <button
          onClick={() => setViewMode('juz')}
          className={`flex-1 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 ${
            viewMode === 'juz' ? 'bg-white text-emerald-700 font-semibold shadow-md' : 'text-gray-500'
          }`}
        >
          Par juz
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto pb-4">
        {viewMode === 'list' ? (
          surahs.map(s => <SurahItem key={s.number} surah={s} />)
        ) : (
          juzList.map(juz => (
            <div key={juz} className="mt-4">
              <h3 className="text-xs font-bold text-emerald-700 mx-4 mb-2 pb-1.5 border-b border-emerald-100 uppercase tracking-wide">
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
