'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Clock, Music, RefreshCw, BookOpen, ChevronRight } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { getLearnedSurahs } from '../../lib/storage';

const RECITATEURS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
  { id: 'Husary_128kbps', name: 'Mahmoud Husary' },
  { id: 'Minshawi_Murattal_128kbps', name: 'Minshawi (Murattal)' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saood ash-Shuraym' },
];

export default function ProfilPage() {
  const router = useRouter();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [recitateur, setRecitateur] = useState('Alafasy_128kbps');
  const [showRecitateur, setShowRecitateur] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);

  useEffect(() => {
    const goal = localStorage.getItem('dailyGoalMinutes');
    if (goal) setDailyGoal(parseInt(goal));
    const rec = localStorage.getItem('recitateur');
    if (rec) setRecitateur(rec);
    setLearnedCount(getLearnedSurahs().length);
  }, []);

  const updateGoal = (min: number) => {
    setDailyGoal(min);
    localStorage.setItem('dailyGoalMinutes', String(min));
    setShowGoal(false);
  };

  const updateRecitateur = (id: string) => {
    setRecitateur(id);
    localStorage.setItem('recitateur', id);
    setShowRecitateur(false);
  };

  const handleReset = () => {
    if (confirm('Veux-tu vraiment reinitialiser toute ta progression ?')) {
      localStorage.clear();
      window.location.href = '/onboarding';
    }
  };

  const recitateurName = RECITATEURS.find(r => r.id === recitateur)?.name || 'Alafasy';

  return (
    <div className="min-h-screen pb-20 page-enter">
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-5 py-8 rounded-b-3xl text-center" style={{ boxShadow: '0 4px 20px rgba(6, 78, 59, 0.2)' }}>
        <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 flex items-center justify-center mx-auto" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <User size={36} className="text-white/90" />
        </div>
        <h2 className="text-lg font-bold mt-3">Utilisateur</h2>
        <p className="text-sm text-emerald-200 mt-1">QuranDuel MVP</p>
      </div>

      <div className="p-4 space-y-5 mt-2">
        {/* Sourates connues */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1">Quiz</h3>
          <button
            onClick={() => router.push('/parametres/sourates')}
            className="clay-card w-full p-4 flex items-center gap-3 cursor-pointer"
          >
            <BookOpen size={20} className="text-emerald-600" />
            <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Mes sourates connues</span>
            <span className="text-sm text-gray-400">{learnedCount}</span>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* Parametres */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1">Parametres</h3>
          <div className="clay-card divide-y divide-emerald-50">
            {/* Objectif quotidien */}
            <button
              onClick={() => setShowGoal(!showGoal)}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50 rounded-t-2xl"
            >
              <Clock size={20} className="text-emerald-600" />
              <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Objectif quotidien</span>
              <span className="text-sm text-gray-400">{dailyGoal} min</span>
            </button>
            {showGoal && (
              <div className="p-4 flex gap-2">
                {[5, 10, 15, 20].map(min => (
                  <button
                    key={min}
                    onClick={() => updateGoal(min)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${
                      dailyGoal === min
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            )}

            {/* Recitateur */}
            <button
              onClick={() => setShowRecitateur(!showRecitateur)}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50 rounded-b-2xl"
            >
              <Music size={20} className="text-emerald-600" />
              <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Recitateur</span>
              <span className="text-sm text-gray-400">{recitateurName}</span>
            </button>
            {showRecitateur && (
              <div className="p-2">
                {RECITATEURS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => updateRecitateur(r.id)}
                    className={`w-full text-left p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                      recitateur === r.id
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compte */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1">Compte</h3>
          <div className="clay-card">
            <button
              onClick={handleReset}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-red-50/50 rounded-2xl"
            >
              <RefreshCw size={20} className="text-red-500" />
              <span className="text-sm text-red-500 font-medium">Reinitialiser la progression</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-300 mt-8">QuranDuel v1.0.0 — MVP</p>
      </div>

      <BottomNav />
    </div>
  );
}
