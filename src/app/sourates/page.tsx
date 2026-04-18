'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, AlertTriangle, Search, Star } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { getAllSurahsMeta, SurahMeta } from '../../lib/quran';
import { getSurahProgress, getFavorites, toggleFavorite } from '../../lib/storage';
import { SurahStatus, STATUS_COLORS } from '../../types';
import { useI18n } from '../../components/I18nProvider';

export default function SouratesPage() {
  const { t } = useI18n();
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(() => {
    setProgress(getSurahProgress());
    setFavorites(getFavorites());
  }, []);

  const surahs = getAllSurahsMeta();
  const getStatus = (n: number): SurahStatus => progress[n] || 'not_started';

  const masteredCount = Object.values(progress).filter(s => s === 'mastered').length;
  const learningCount = Object.values(progress).filter(s => s === 'learning').length;
  const decliningCount = Object.values(progress).filter(s => s === 'declining' || s === 'urgent').length;

  const handleToggleFav = useCallback((e: React.MouseEvent, surahNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(surahNumber);
    setFavorites(getFavorites());
  }, []);

  const filteredSurahs = surahs.filter(s => {
    if (showFavOnly && !favorites.includes(s.number)) return false;
    if (!search) return true;
    return (
      s.nameTransliteration.toLowerCase().includes(search.toLowerCase()) ||
      s.nameArabic.includes(search) ||
      String(s.number) === search
    );
  });

  const SurahItem = ({ surah }: { surah: SurahMeta }) => {
    const status = getStatus(surah.number);
    const fav = favorites.includes(surah.number);
    return (
      <Link
        href={`/sourates/${surah.number}`}
        className="flex items-center px-4 py-3.5 cursor-pointer transition-colors hover:bg-[var(--primary-light)] border-b border-[var(--border)] last:border-b-0"
      >
        {/* Numero */}
        <div className="relative mr-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center border-2" style={{ borderColor: STATUS_COLORS[status] }}>
            <span className="text-xs font-bold text-[var(--text-muted)]">{surah.number}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text)] text-[15px]">{surah.nameTransliteration}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {surah.revelationType === 'mecquoise' ? 'Meccan' : 'Medinan'} · {surah.ayahCount} ayahs
          </p>
        </div>

        {/* Nom arabe + etoile */}
        <div className="flex items-center gap-2">
          <p className="text-lg text-[var(--primary)]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah.nameArabic}
          </p>
          <button
            onClick={(e) => handleToggleFav(e, surah.number)}
            className="p-1 cursor-pointer"
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Star
              size={18}
              className={fav ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
              fill={fav ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen pb-20 page-enter bg-[var(--bg)]">
      {/* Header */}
      <div className="islamic-header text-white px-5 pt-5 pb-4 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <h1 className="text-xl font-bold text-center mb-4">Sourates</h1>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/40 text-white outline-none focus:bg-white/25 transition-colors"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-3 border-b border-[var(--border)]">
        <div className="text-center flex items-center gap-1.5">
          <CheckCircle size={14} className="text-[var(--primary)]" />
          <span className="text-sm font-bold text-[var(--primary)]">{masteredCount}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{t('mastered')}</span>
        </div>
        <div className="text-center flex items-center gap-1.5">
          <Clock size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-500">{learningCount}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{t('learning')}</span>
        </div>
        <div className="text-center flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-500" />
          <span className="text-sm font-bold text-red-500">{decliningCount}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{t('toReview')}</span>
        </div>
      </div>

      {/* Filtre Favoris */}
      <div className="px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => setShowFavOnly(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
            showFavOnly
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
          }`}
        >
          <Star size={12} fill={showFavOnly ? 'currentColor' : 'none'} />
          {favorites.length === 0 ? t('noFavorites') : `${t('favorites')} (${favorites.length})`}
        </button>
      </div>

      {/* List avec headers Juz */}
      <div className="overflow-y-auto">
        {filteredSurahs.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] text-sm py-10">Aucune sourate trouve</p>
        ) : (
          filteredSurahs.map((s, i) => {
            const surahJuz = s.firstJuz || 1;
            const prevJuz = i > 0 ? (filteredSurahs[i - 1].firstJuz || 1) : 0;
            const showJuzHeader = surahJuz !== prevJuz && !showFavOnly;
            return (
              <div key={s.number}>
                {showJuzHeader && (
                  <div className="sticky top-0 z-10 bg-[var(--primary-light)] px-4 py-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider border-b border-[var(--border)]">
                    Juz {surahJuz}
                  </div>
                )}
                <SurahItem surah={s} />
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
