'use client';

import { useState, useEffect } from 'react';
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
    <div className="min-h-screen pb-20">
      <div className="bg-[#1B4332] text-white px-4 py-4">
        <h1 className="text-xl font-bold text-center">Progression</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Mosquee */}
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
          <div className="text-6xl mb-3">{mosque.emoji}</div>
          <h2 className="text-xl font-bold text-[#1B4332]">{mosque.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Niveau {mosqueLevel}/7</p>
          {nextLevel && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B4332] rounded-full transition-all"
                  style={{ width: `${Math.min(100, progressToNext)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Encore {nextLevel.minStreak - streak} jours pour &quot;{nextLevel.name}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-lg font-bold text-gray-900">{streak} jours</p>
              <p className="text-xs text-gray-500">Streak actuel</p>
            </div>
          </div>
          <div className="w-px h-10 bg-gray-200 mx-3" />
          <div className="flex-1 flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-lg font-bold text-gray-900">{bestStreak} jours</p>
              <p className="text-xs text-gray-500">Meilleur streak</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{totalXP}</p>
            <p className="text-xs text-gray-500 mt-1">XP Total</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-green-500">{mastered}</p>
            <p className="text-xs text-gray-500 mt-1">Maitrisees</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-yellow-400">{learning}</p>
            <p className="text-xs text-gray-500 mt-1">En cours</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-red-500">{declining}</p>
            <p className="text-xs text-gray-500 mt-1">A reviser</p>
          </div>
        </div>

        {declining > 0 && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 flex items-start gap-2">
            <span>⚠️</span>
            <p className="text-sm text-orange-800">
              {declining} sourate(s) en declin. Va dans &quot;Sourates&quot; pour les reviser.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
