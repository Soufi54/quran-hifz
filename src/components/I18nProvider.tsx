'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Locale, getLocale, setLocale as saveLocale, t as translate, TranslationKey } from '../lib/i18n';

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}>({ locale: 'fr', setLocale: () => {}, t: (k) => k });

export function useI18n() { return useContext(I18nContext); }

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => { setLocaleState(getLocale()); }, []);

  const changeLocale = (l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  const t = (key: TranslationKey) => translate(key, locale);

  return <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>{children}</I18nContext.Provider>;
}
