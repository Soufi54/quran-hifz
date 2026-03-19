'use client';

import { User, Bell, Clock, Music, RefreshCw } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function ProfilPage() {
  const handleReset = () => {
    if (confirm('Veux-tu vraiment reinitialiser toute ta progression ?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-20 page-enter">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-5 py-8 rounded-b-3xl text-center" style={{ boxShadow: '0 4px 20px rgba(6, 78, 59, 0.2)' }}>
        <div className="w-18 h-18 rounded-2xl bg-white/15 flex items-center justify-center mx-auto w-[72px] h-[72px]" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <User size={36} className="text-white/90" />
        </div>
        <h2 className="text-lg font-bold mt-3">Utilisateur</h2>
        <p className="text-sm text-emerald-200 mt-1">QuranDuel MVP</p>
      </div>

      <div className="p-4 space-y-5 mt-2">
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1">Parametres</h3>
          <div className="clay-card divide-y divide-emerald-50">
            <button className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50 rounded-t-2xl">
              <Bell size={20} className="text-emerald-600" />
              <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Notifications</span>
            </button>
            <button className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50">
              <Clock size={20} className="text-emerald-600" />
              <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Objectif quotidien</span>
            </button>
            <button className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50 rounded-b-2xl">
              <Music size={20} className="text-emerald-600" />
              <span className="flex-1 text-left text-sm text-emerald-900 font-medium">Recitateur</span>
              <span className="text-sm text-gray-400">Alafasy</span>
            </button>
          </div>
        </div>

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
