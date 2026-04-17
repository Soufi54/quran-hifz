'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { TRANSLATIONS, Translation } from '../../../lib/translations';

const LANGUAGE_ORDER = ['fr', 'en', 'ar', 'tr', 'es', 'de', 'id', 'ur', 'ber'];
const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Francais',
  en: 'English',
  ar: 'Arabic / العربية',
  tr: 'Turkce',
  es: 'Espanol',
  de: 'Deutsch',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  ber: 'Tamazight',
};

function groupByLanguage(translations: Translation[]): { code: string; label: string; items: Translation[] }[] {
  const map: Record<string, Translation[]> = {};
  for (const t of translations) {
    if (!map[t.languageCode]) map[t.languageCode] = [];
    map[t.languageCode].push(t);
  }
  return LANGUAGE_ORDER
    .filter(code => map[code])
    .map(code => ({ code, label: LANGUAGE_LABELS[code] || code, items: map[code] }));
}

export default function TraductionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState('fr_local');
  const groups = groupByLanguage(TRANSLATIONS);

  useEffect(() => {
    const saved = localStorage.getItem('qh_translation');
    if (saved) setSelected(saved);
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    localStorage.setItem('qh_translation', id);
  };

  return (
    <div className="min-h-screen pb-8 page-enter bg-[var(--bg)]">
      {/* Header */}
      <div className="islamic-header text-white px-4 py-4 rounded-b-3xl flex items-center gap-3" style={{ boxShadow: '0 4px 20px rgba(13, 92, 77, 0.2)' }}>
        <button onClick={() => router.back()} className="cursor-pointer p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-8">Traduction</h1>
      </div>

      <div className="p-4 space-y-5 mt-2">
        {groups.map(group => (
          <div key={group.code}>
            <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 ml-1">
              {group.label}
            </h3>
            <div className="clay-card divide-y divide-[var(--border)]">
              {group.items.map((t, i) => {
                const isActive = selected === t.id;
                const isFirst = i === 0;
                const isLast = i === group.items.length - 1;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className={`w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] ${isFirst ? 'rounded-t-2xl' : ''} ${isLast ? 'rounded-b-2xl' : ''}`}
                  >
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
                        {t.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.author}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      t.source === 'local'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {t.source === 'local' ? 'hors-ligne' : t.source === 'qurancom' ? 'quran.com' : 'alquran.cloud'}
                    </span>
                    {isActive && (
                      <Check size={18} className="text-[var(--primary)] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
