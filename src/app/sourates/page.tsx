'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { getAllSurahs, getSurahsByJuz, getJuzList } from '../../lib/quran';
import { getSurahProgress } from '../../lib/storage';
import { SurahStatus, STATUS_COLORS } from '../../types';

export default function SouratesPage() {
  const [viewMode, setViewMode] = useState<'list' | 'juz'>('list');
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProgress(getSurahProgress());
  }, []);

  const surahs = getAllSurahs();
  const juzList = getJuzList();
  const getStatus = (n: number): SurahStatus => progress[n] || 'not_started';

  const filteredSurahs = search
    ? surahs.filter(s =>
        s.nameTransliteration.toLowerCase().includes(search.toLowerCase()) ||
        s.nameArabic.includes(search) ||
        String(s.number) === search
      )
    : surahs;

  const masteredCount = Object.values(progress).filter(s => s === 'mastered').length;
  const learningCount = Object.values(progress).filter(s => s === 'learning').length;
  const decliningCount = Object.values(progress).filter(s => s === 'declining' || s === 'urgent').length;

  const SurahItem = ({ surah }: { surah: typeof surahs[0] }) => {
    const status = getStatus(surah.number);
    return (
      <Link
        href={`/sourates/${surah.number}`}
        className="flex items-center px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#F0F9F6] border-b border-gray-100 last:border-b-0"
      >
        {/* Numero + indicateur */}
        <div className="relative mr-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center border-2" style={{ borderColor: STATUS_COLORS[status] }}>
            <span className="text-xs font-bold text-gray-600">{surah.number}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-[15px]">{surah.nameTransliteration}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {surah.revelationType === 'mecquoise' ? 'Meccan' : 'Medinan'} · {surah.ayahCount} ayahs
          </p>
        </div>

        {/* Nom arabe */}
        <div className="text-right">
          <p className="text-lg text-[#0D5C4D]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah.nameArabic}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen pb-20 page-enter bg-white">
      {/* Header */}
      <div className="islamic-header text-white px-5 pt-5 pb-4 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <h1 className="text-xl font-bold text-center mb-4">Sourates</h1>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher une sourate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/40 text-white outline-none focus:bg-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-3 border-b border-gray-100">
        <div className="text-center flex items-center gap-1.5">
          <CheckCircle size={14} className="text-[#0D5C4D]" />
          <span className="text-sm font-bold text-[#0D5C4D]">{masteredCount}</span>
          <span className="text-[10px] text-gray-400">maitrisees</span>
        </div>
        <div className="text-center flex items-center gap-1.5">
          <Clock size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-500">{learningCount}</span>
          <span className="text-[10px] text-gray-400">en cours</span>
        </div>
        <div className="text-center flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-500" />
          <span className="text-sm font-bold text-red-500">{decliningCount}</span>
          <span className="text-[10px] text-gray-400">a reviser</span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex mx-4 mt-3 mb-1 p-0.5 rounded-lg bg-gray-100">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2 text-xs rounded-md cursor-pointer transition-all ${viewMode === 'list' ? 'bg-white text-[#0D5C4D] font-semibold shadow-sm' : 'text-gray-500'}`}
        >
          Sourates
        </button>
        <button
          onClick={() => setViewMode('juz')}
          className={`flex-1 py-2 text-xs rounded-md cursor-pointer transition-all ${viewMode === 'juz' ? 'bg-white text-[#0D5C4D] font-semibold shadow-sm' : 'text-gray-500'}`}
        >
          Juz
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto">
        {viewMode === 'list' ? (
          filteredSurahs.map((s, i) => {
            const surahJuz = s.ayahs[0]?.juz || 1;
            const prevJuz = i > 0 ? (filteredSurahs[i - 1].ayahs[0]?.juz || 1) : 0;
            const showJuzHeader = surahJuz !== prevJuz;
            return (
              <div key={s.number}>
                {showJuzHeader && (
                  <div className="sticky top-0 z-10 bg-[#F0F9F6] px-4 py-2 text-xs font-bold text-[#0D5C4D] uppercase tracking-wider border-b border-[#E2EBE8]">
                    Juz {surahJuz}
                  </div>
                )}
                <SurahItem surah={s} />
              </div>
            );
          })
        ) : (
          juzList.map(juz => (
            <div key={juz}>
              <div className="sticky top-0 bg-[#F0F9F6] px-4 py-2 text-xs font-bold text-[#0D5C4D] uppercase tracking-wider border-b border-[#E2EBE8]">
                Juz {juz}
              </div>
              {getSurahsByJuz(juz).map(s => <SurahItem key={s.number} surah={s} />)}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
