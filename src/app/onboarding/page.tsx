'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Check } from 'lucide-react';
import { getAllSurahsMeta } from '../../lib/quran';
import { setSurahStatus } from '../../lib/storage';

type Step = 'welcome' | 'level' | 'surahs' | 'goal';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedSurahs, setSelectedSurahs] = useState<Set<number>>(new Set());
  const [dailyGoal, setDailyGoal] = useState(10);
  const surahs = getAllSurahsMeta();

  const toggleSurah = (num: number) => {
    setSelectedSurahs(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const selectJuzAmma = () => {
    const juzAmma = new Set(surahs.filter(s => s.number >= 78).map(s => s.number));
    setSelectedSurahs(juzAmma);
  };

  const finish = () => {
    selectedSurahs.forEach(num => setSurahStatus(num, 'learning'));
    localStorage.setItem('dailyGoalMinutes', String(dailyGoal));
    localStorage.setItem('onboardingDone', 'true');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {step === 'welcome' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-[var(--primary-light)] flex items-center justify-center mb-6" style={{ boxShadow: 'var(--shadow-clay)' }}>
            <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 4C18.745 4 8 14.745 8 28c0 13.255 10.745 24 24 24 3.305 0 6.458-.67 9.33-1.88C35.69 47.25 31 41.15 31 34c0-10.493 8.507-19 19-19 1.89 0 3.716.276 5.44.79C52.78 9.41 43.14 4 32 4z" fill="var(--accent)"/>
              <circle cx="46" cy="12" r="3" fill="var(--accent)"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-3">Quran Hifz</h1>
          <p className="text-[var(--text-muted)] leading-relaxed mb-10">
            Memorise le Coran, un verset a la fois. Challenge quotidien, progression visuelle, et bientot des duels entre amis.
          </p>
          <button onClick={() => setStep('level')} className="w-full text-lg py-4 rounded-xl font-semibold text-white gold-accent shadow-lg cursor-pointer transition-transform active:scale-[0.97] border-none">
            Commencer
          </button>
        </div>
      )}

      {step === 'level' && (
        <div className="flex flex-col min-h-screen px-6 pt-16">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-2">Quel est ton niveau ?</h2>
          <p className="text-[var(--text-muted)] text-center text-sm mb-8">Ca nous aide a personnaliser ton experience</p>

          <div className="space-y-3">
            <button
              onClick={() => { setSelectedSurahs(new Set([1])); setStep('goal'); }}
              className="clay-card w-full p-5 text-left cursor-pointer"
            >
              <p className="font-semibold text-[var(--primary)]">Debutant</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Je commence a memoriser (Al-Fatiha)</p>
            </button>
            <button
              onClick={() => { setStep('surahs'); }}
              className="clay-card w-full p-5 text-left cursor-pointer"
            >
              <p className="font-semibold text-[var(--primary)]">J&apos;ai deja memorise des sourates</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Je veux selectionner ce que je connais</p>
            </button>
            <button
              onClick={() => { selectJuzAmma(); setStep('goal'); }}
              className="clay-card w-full p-5 text-left cursor-pointer"
            >
              <p className="font-semibold text-[var(--primary)]">Je connais Juz Amma</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Les 37 dernieres sourates</p>
            </button>
          </div>
        </div>
      )}

      {step === 'surahs' && (
        <div className="flex flex-col min-h-screen">
          <div className="px-6 pt-12 pb-4">
            <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-1">Quelles sourates connais-tu ?</h2>
            <p className="text-[var(--text-muted)] text-center text-sm mb-4">{selectedSurahs.size} selectionnees</p>
            <div className="flex gap-2 mb-3">
              <button onClick={selectJuzAmma} className="clay-button text-xs flex-1 py-2">Juz Amma</button>
              <button
                onClick={() => setSelectedSurahs(new Set(surahs.map(s => s.number)))}
                className="clay-card text-xs flex-1 py-2 text-center cursor-pointer text-emerald-700 font-semibold"
              >
                Tout
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {surahs.map(s => {
              const selected = selectedSurahs.has(s.number);
              return (
                <button
                  key={s.number}
                  onClick={() => toggleSurah(s.number)}
                  className={`w-full flex items-center my-0.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                    selected ? 'bg-[var(--primary-light)] border border-[var(--primary)]' : 'bg-[var(--bg-card)] border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2.5 ${selected ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-[var(--text-muted)] w-7">{s.number}</span>
                  <span className="flex-1 text-sm text-left text-[var(--text)]">{s.nameFrench}</span>
                  <span className="text-xs text-[#1A8A6E]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>{s.nameArabic}</span>
                </button>
              );
            })}
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border)]" style={{ maxWidth: 480, margin: '0 auto' }}>
            <button onClick={() => setStep('goal')} className="w-full text-base py-3.5 rounded-xl font-semibold text-white gold-accent shadow-lg cursor-pointer transition-transform active:scale-[0.97] border-none">
              Continuer ({selectedSurahs.size} sourates)
            </button>
          </div>
        </div>
      )}

      {step === 'goal' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-6" style={{ boxShadow: 'var(--shadow-clay)' }}>
            <Trophy size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Objectif quotidien</h2>
          <p className="text-[var(--text-muted)] text-sm mb-8">Combien de minutes par jour ?</p>

          <div className="flex gap-3 mb-10">
            {[5, 10, 15, 20].map(min => (
              <button
                key={min}
                onClick={() => setDailyGoal(min)}
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dailyGoal === min
                    ? 'bg-[var(--primary)] text-white shadow-lg scale-110'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
                style={{ boxShadow: dailyGoal === min ? '0 4px 15px rgba(13, 92, 77, 0.4)' : 'var(--shadow-clay-sm)' }}
              >
                <span className="text-lg font-bold">{min}</span>
                <span className="text-[9px]">min</span>
              </button>
            ))}
          </div>

          <button onClick={finish} className="w-full text-lg py-4 rounded-xl font-semibold text-white gold-accent shadow-lg cursor-pointer transition-transform active:scale-[0.97] border-none">
            C&apos;est parti !
          </button>
        </div>
      )}
    </div>
  );
}
