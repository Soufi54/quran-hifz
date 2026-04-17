'use client';

import { useState, useEffect } from 'react';
import { Flame, Trophy, Zap, CheckCircle, BookOpen, AlertTriangle } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { getMosqueLevel } from '../../lib/scoring';
import { getStreak, getBestStreak, getTotalXP, getSurahProgress } from '../../lib/storage';
import { MOSQUE_LEVELS, SurahStatus } from '../../types';

export default function ProgressionPage() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});

  useEffect(() => {
    setStreak(getStreak());
    setBestStreak(getBestStreak());
    setTotalXP(getTotalXP());
    setProgress(getSurahProgress());
  }, []);

  const mosqueLevel = getMosqueLevel(streak);
  const mosque = MOSQUE_LEVELS[mosqueLevel];
  const nextLevel = mosqueLevel < 7 ? MOSQUE_LEVELS[(mosqueLevel + 1) as 1|2|3|4|5|6|7] : null;
  const progressToNext = nextLevel
    ? ((streak - mosque.minStreak) / (nextLevel.minStreak - mosque.minStreak)) * 100
    : 100;

  const statuses = Object.values(progress);
  const mastered = statuses.filter(s => s === 'mastered').length;
  const learning = statuses.filter(s => s === 'learning').length;
  const declining = statuses.filter(s => s === 'declining' || s === 'urgent').length;

  return (
    <div className="min-h-screen pb-20 page-enter">
      <div className="islamic-header text-white px-5 py-5 rounded-b-3xl" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <h1 className="text-xl font-bold text-center">Progression</h1>
      </div>

      <div className="p-4 space-y-4 mt-2">
        {/* Mosquee */}
        <div className="clay-card p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3"><span className="text-4xl">{mosque.emoji}</span></div>
          <h2 className="text-xl font-bold text-[var(--primary)]">{mosque.name}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Niveau {mosqueLevel}/7</p>
          {nextLevel && (
            <div className="mt-5">
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)', boxShadow: 'var(--shadow-clay-inset)' }}>
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, progressToNext)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Encore {nextLevel.minStreak - streak} jours pour &quot;{nextLevel.name}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="clay-card p-4 flex items-center">
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
              <Flame size={22} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text)]">{streak} jours</p>
              <p className="text-[11px] text-[var(--text-muted)]">Streak actuel</p>
            </div>
          </div>
          <div className="w-px h-10 bg-[var(--border)] mx-3" />
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
              <Trophy size={22} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text)]">{bestStreak} jours</p>
              <p className="text-[11px] text-[var(--text-muted)]">Meilleur streak</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="clay-card p-4 text-center">
            <Zap size={20} className="text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--text)]">{totalXP}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">XP Total</p>
          </div>
          <div className="clay-card p-4 text-center">
            <CheckCircle size={20} className="text-[var(--primary)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--primary)]">{mastered}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Maitrisees</p>
          </div>
          <div className="clay-card p-4 text-center">
            <BookOpen size={20} className="text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-500">{learning}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">En cours</p>
          </div>
          <div className="clay-card p-4 text-center">
            <AlertTriangle size={20} className="text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-500">{declining}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">A reviser</p>
          </div>
        </div>

        {declining > 0 && (
          <div className="clay-card p-3.5 flex items-start gap-2.5 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-700">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              {declining} sourate(s) en declin. Va dans &quot;Sourates&quot; pour les reviser.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
