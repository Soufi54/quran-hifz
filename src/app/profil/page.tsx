'use client';

import BottomNav from '../../components/BottomNav';

export default function ProfilPage() {
  const handleReset = () => {
    if (confirm('Veux-tu vraiment reinitialiser toute ta progression ?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-[#1B4332] text-white px-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto text-3xl">
          👤
        </div>
        <h2 className="text-lg font-bold mt-3">Utilisateur</h2>
        <p className="text-sm opacity-70">QuranDuel MVP</p>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">Parametres</h3>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm text-gray-700">Recitateur</span>
              <span className="text-sm text-gray-400">Alafasy</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">Compte</h3>
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={handleReset}
              className="w-full p-4 text-left text-sm text-red-500 font-medium"
            >
              Reinitialiser la progression
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">QuranDuel v1.0.0 - MVP</p>
      </div>

      <BottomNav />
    </div>
  );
}
