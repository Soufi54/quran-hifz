'use client';

import { useState } from 'react';
import { BookMarked, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getTafsirUrl } from '../lib/quran';

interface TafsirButtonProps {
  surahNumber: number;
  ayahNumber: number;
}

export default function TafsirButton({ surahNumber, ayahNumber }: TafsirButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tafsirAr, setTafsirAr] = useState<string | null>(null);
  const [tafsirEn, setTafsirEn] = useState<string | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const loadTafsir = async () => {
    if (tafsirAr) {
      setOpen(!open);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const [arRes, enRes] = await Promise.all([
        fetch(getTafsirUrl(surahNumber, ayahNumber, 'ar')),
        fetch(getTafsirUrl(surahNumber, ayahNumber, 'en')),
      ]);
      if (arRes.ok) {
        const arData = await arRes.json();
        setTafsirAr(arData.text || '');
      }
      if (enRes.ok) {
        const enData = await enRes.json();
        setTafsirEn(enData.text || '');
      }
    } catch {
      setTafsirAr('Tafsir non disponible');
    }
    setLoading(false);
  };

  const currentText = lang === 'ar' ? tafsirAr : tafsirEn;

  return (
    <div className="mt-2">
      <button
        onClick={loadTafsir}
        className="flex items-center gap-1.5 text-xs text-emerald-600 cursor-pointer hover:text-emerald-800 transition-colors"
      >
        <BookMarked size={13} />
        <span>Tafsir Ibn Kathir</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={18} className="text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Toggle langue */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setLang('ar')}
                  className={`text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    lang === 'ar' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'
                  }`}
                >
                  عربي
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    lang === 'en' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'
                  }`}
                >
                  English
                </button>
              </div>
              <div
                className={`text-sm leading-relaxed ${lang === 'ar' ? 'text-right' : 'text-left'} text-gray-700`}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                {(currentText || 'Non disponible').replace(/<[^>]*>/g, '')}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
