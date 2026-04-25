'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Music, RefreshCw, BookOpen, ChevronRight, Bell, Globe, Pencil, LogOut, Moon, Sun } from 'lucide-react';
import Logo from '../../components/Logo';
import { madrasaStore, isSupabaseMode } from '@/lib/madrasa';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeProvider';
import { supabase } from '@/lib/supabase';
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
  const auth = useAuth();
  const { theme, toggle } = useTheme();
  const supabaseMode = isSupabaseMode();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [recitateur, setRecitateur] = useState('Alafasy_128kbps');
  const [showRecitateur, setShowRecitateur] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showLangue, setShowLangue] = useState(false);
  const [langue, setLangue] = useState('fr');
  const [learnedCount, setLearnedCount] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [profilePseudo, setProfilePseudo] = useState<string>('');
  const [friendCode, setFriendCode] = useState<string>('');
  const [showEditPseudo, setShowEditPseudo] = useState(false);
  const [newPseudo, setNewPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState<string | null>(null);

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
    // Charger le profil Supabase
    if (supabaseMode && !auth.loading && auth.user) {
      madrasaStore()
        .getCurrentUser()
        .then((p) => {
          if (p) {
            setProfilePseudo(p.pseudo);
            setFriendCode(p.friend_code);
            setNewPseudo(p.pseudo);
          }
        });
    }
  }, [supabaseMode, auth.loading, auth.user]);

  const savePseudo = async () => {
    const trimmed = newPseudo.trim();
    if (!trimmed || trimmed === profilePseudo) {
      setShowEditPseudo(false);
      return;
    }
    setPseudoError(null);
    try {
      const { error } = await supabase()
        .from('profiles')
        .update({ pseudo: trimmed, updated_at: new Date().toISOString() })
        .eq('id', auth.user!.id);
      if (error) {
        if (error.message.toLowerCase().includes('unique') || error.message.toLowerCase().includes('duplicate')) {
          setPseudoError('Ce pseudo est deja pris');
        } else {
          setPseudoError(error.message);
        }
        return;
      }
      setProfilePseudo(trimmed);
      setShowEditPseudo(false);
    } catch (err) {
      setPseudoError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/auth');
  };

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
        <div className="w-[72px] h-[72px] rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-white/90" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Logo size={44} />
        </div>
        {supabaseMode && profilePseudo ? (
          <>
            {!showEditPseudo ? (
              <div className="flex items-center justify-center gap-2 mt-3">
                <h2 className="text-lg font-bold">{profilePseudo}</h2>
                <button
                  onClick={() => { setNewPseudo(profilePseudo); setShowEditPseudo(true); }}
                  className="p-1 rounded hover:bg-white/10"
                  aria-label="Modifier pseudo"
                >
                  <Pencil size={14} className="text-emerald-200" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 mt-3">
                <input
                  type="text"
                  value={newPseudo}
                  onChange={(e) => setNewPseudo(e.target.value)}
                  maxLength={30}
                  className="px-2 py-2 text-[var(--text)] bg-[var(--bg-card)] border border-[var(--border)] rounded text-sm w-40"
                  autoFocus
                />
                <button onClick={savePseudo} className="text-xs bg-white/20 px-4 py-2 rounded">OK</button>
                <button onClick={() => { setShowEditPseudo(false); setPseudoError(null); }} className="text-xs text-emerald-200 px-4 py-2">X</button>
              </div>
            )}
            {pseudoError && <p className="text-xs text-red-200 mt-1">{pseudoError}</p>}
            {friendCode && <p className="text-xs text-emerald-200 mt-1">Code ami : {friendCode}</p>}
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mt-3">Quran Hifz</h2>
            <p className="text-sm text-emerald-200 mt-1">Memorise, teste, progresse</p>
          </>
        )}
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
            {/* Mode sombre */}
            <button
              onClick={toggle}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] rounded-t-2xl"
            >
              {theme === 'dark' ? <Sun size={20} className="text-[var(--primary)]" /> : <Moon size={20} className="text-[var(--primary)]" />}
              <span className="flex-1 text-left text-sm text-[var(--text)] font-medium">Mode sombre</span>
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Notifications */}
            <button
              onClick={toggleNotifications}
              className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)]"
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
          <div className="clay-card divide-y divide-[var(--border)]">
            {supabaseMode && auth.user && (
              <button
                onClick={handleSignOut}
                className="w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] rounded-t-2xl"
              >
                <LogOut size={20} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text)] font-medium">Se deconnecter</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className={`w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-red-50/50 dark:hover:bg-red-900/20 ${supabaseMode && auth.user ? 'rounded-b-2xl' : 'rounded-2xl'}`}
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
