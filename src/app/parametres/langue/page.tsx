'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { useI18n } from '../../../components/I18nProvider';
import { Locale } from '../../../lib/i18n';

const LANGUES: { code: Locale; native: string; label: string }[] = [
  { code: 'fr', native: 'Francais', label: 'French' },
  { code: 'en', native: 'English', label: 'Anglais' },
  { code: 'ar', native: 'العربية', label: 'Arabic' },
];

export default function LanguePage() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  const handleSelect = (code: Locale) => {
    setLocale(code);
    router.back();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-4 flex items-center gap-3 rounded-b-3xl">
        <button onClick={() => router.back()} className="cursor-pointer p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold">{t('language')}</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 mt-4">
        <div className="clay-card divide-y divide-[var(--border)]">
          {LANGUES.map((lang, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === LANGUES.length - 1;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--primary-light)] ${
                  isFirst ? 'rounded-t-2xl' : ''
                } ${isLast ? 'rounded-b-2xl' : ''}`}
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-[var(--text)]">{lang.native}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{lang.label}</p>
                </div>
                {locale === lang.code && (
                  <Check size={18} className="text-[var(--primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
