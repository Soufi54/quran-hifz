'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Clock, Music, RefreshCw, BookOpen, ChevronRight, Bell, Globe } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { getLearnedSurahs, getUserLanguage, setUserLanguage } from '../../lib/storage';
import { requestNotificationPermission, scheduleStreakReminder } from '../../lib/notifications';

const RECITATEURS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Alafasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
  { id: 'Husary_128kbps', name: 'Mahmoud Husary' },
  { id: 'Minshawi_Murattal_128kbps', name: 'Minshawi (Murattal)' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saood ash-Shuraym' },
];

const LANGUES = [
  { code: 'fr', label: 'Francais', native: 'Francais' },
  { code: 'en', label: 'Anglais', native: 'English' },
  { code: 'ar', label: 'Arabe', native: 'العربية' },
  { code: 'tr', label: 'Turc', native: 'Turkce' },
  { code: 'es', label: 'Espagnol', native: 'Espanol' },
  { code: 'de', label: 'Allemand', native: 'Deutsch' },
  { code: 'id', label: 'Indonesien', native: 'Bahasa Indonesia' },
  { code: 'ur', label: 'Ourdou', native: 'اردو' },
  { code: 'ber', label: 'Amazigh', native: 'Tamazight' },
];

export default function ProfilPage() {
  const router = useRouter();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [recitateur, setRecitateur] = useState('Alafasy_128kbps');
  const [showRecitateur, setShowRecitateur] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showLangue, setShowLangue] = useState(false);
  const [langue, setLangue] = useState('fr');
  const [learnedCount, setLearnedCount] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    const goal = localStorage.getItem('dailyGoalMinutes');
    if (goal) setDailyGoal(parseInt(goal));
    const rec = localStorage.getItem('recitateur');
    if (rec) setRecitateur(rec);
    setLearnedCount(getLearnedSurahs().length);
    setLangue(getUserLanguage());
    if (typeof Notification !== 'undefined') {
      setNotifEnabled(Notification.permission === 'granted');
    }
  }, []);

  const toggleNotifications = async () => {
    if (notifEnabled) return;
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifEnabled(true);
      scheduleStreakReminder();
    }
  };

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

  const updateLangue = (code: string) => {
    setLangue(code);
    setUserLanguage(code);
    localStorage.removeItem('setting_translation_id');
    setShowLangue(false);
  };

  const handleReset = () => {
    if (confirm('Veux-tu vraiment reinitialiser toute ta progression ?')) {
      localStorage.clear();
      window.location.href = '/onboarding';
    }
  };

  const recitateurName = RECITATEURS.find(r => r.id === recitateur)?.name || 'Alafasy';
  const langueName = LANGUES.find(l => l.code === langue)?.native || 'Francais';

  return (
    <div className="min-h-screen pb-20 page-enter">
      <div className="islamic-header text-white px-5 py-8 rounded-b-3xl text-center" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 flex items-center justify-center mx-auto" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <User size={36} className="text-white/90" />
        </div>
        <h2 className="text-lg font-bold mt-3">Utilisateur</h2>
        <p className="text-sm text-emerald-200 mt-1">Quran Hifz</p>
      </div>

      <div className="p-4 space-y-5 mt-2">
        {/* Sourates connues */}
        <div>
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 ml-1">Quiz</h3>
          <button
            onClick={() => router.push('/parametres/sourates')}
            className="clay-card w-full p-4 flex items-center gap-3 cursor-pointer"
          >
            <BookOpen size={20} className="text-[var(--primary)]" />
            <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Mes sourates connues</span>
            <span className="text-sm text-[var(--text-muted)]">{learnedCount}</span>
            <ChevronRight size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Parametres */}
        <div>
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 ml-1">Parametres</h3>
          <div className="clay-card divide-y divide-[var(--border)]">
            {/* Notifications */}
            <button
              onClick={toggleNotifications}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] rounded-t-2xl"
            >
              <Bell size={20} className="text-[var(--primary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Rappel quotidien</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${notifEnabled ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                {notifEnabled ? 'Active' : 'Desactive'}
              </span>
            </button>

            {/* Objectif quotidien */}
            <button
              onClick={() => setShowGoal(!showGoal)}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)]"
            >
              <Clock size={20} className="text-[var(--primary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Objectif quotidien</span>
              <span className="text-sm text-[var(--text-muted)]">{dailyGoal} min</span>
            </button>
            {showGoal && (
              <div className="p-4 flex gap-2">
                {[5, 10, 15, 20].map(min => (
                  <button
                    key={min}
                    onClick={() => updateGoal(min)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${
                      dailyGoal === min
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--primary-light)]'
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
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)]"
            >
              <Music size={20} className="text-[var(--primary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Recitateur</span>
              <span className="text-sm text-[var(--text-muted)]">{recitateurName}</span>
            </button>
            {showRecitateur && (
              <div className="p-2">
                {RECITATEURS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => updateRecitateur(r.id)}
                    className={`w-full text-left p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                      recitateur === r.id
                        ? 'bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                        : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)]'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}

            {/* Langue */}
            <button
              onClick={() => setShowLangue(!showLangue)}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] rounded-b-2xl"
            >
              <Globe size={20} className="text-[var(--primary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Langue / Language</span>
              <span className="text-sm text-[var(--text-muted)]">{langueName}</span>
            </button>
            {showLangue && (
              <div className="p-2">
                {LANGUES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => updateLangue(l.code)}
                    className={`w-full text-left p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                      langue === l.code
                        ? 'bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                        : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)]'
                    }`}
                  >
                    <span>{l.native}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">({l.label})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Traduction */}
        <div>
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 ml-1">Contenu</h3>
          <div className="clay-card">
            <button
              onClick={() => router.push('/parametres/traduction')}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] rounded-2xl"
            >
              <Globe size={20} className="text-[var(--primary)]" />
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Traduction</span>
              <ChevronRight size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Compte */}
        <div>
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 ml-1">Compte</h3>
          <div className="clay-card">
            <button
              onClick={handleReset}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-2xl"
            >
              <RefreshCw size={20} className="text-[var(--danger)]" />
              <span className="text-sm text-[var(--danger)] font-medium">Reinitialiser la progression</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-8">Quran Hifz v1.0.0</p>
      </div>

      <BottomNav />
    </div>
  );
}
