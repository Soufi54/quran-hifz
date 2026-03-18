'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSurah, getPageData, getFirstPageOfSurah, getLastPageOfSurah, getAudioUrl } from '../../../lib/quran';
import { setSurahStatus, getSurahProgress, setReviewDate } from '../../../lib/storage';
import { PageData } from '../../../lib/quran';

export default function SurahPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    if (!surah) return;
    const first = getFirstPageOfSurah(surahNumber);
    const last = getLastPageOfSurah(surahNumber);
    const pageList: PageData[] = [];
    for (let p = first; p <= last; p++) {
      pageList.push(getPageData(p));
    }
    setPages(pageList);

    const progress = getSurahProgress();
    if (!progress[surahNumber] || progress[surahNumber] === 'not_started') {
      setSurahStatus(surahNumber, 'learning');
    }
    setReviewDate(surahNumber);
  }, [surahNumber, surah]);

  const playPageAudio = async () => {
    if (!pages[currentPageIndex]) return;

    if (isPlaying) {
      playingRef.current = false;
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);
    const ayahs = pages[currentPageIndex].ayahs;

    for (const ayah of ayahs) {
      if (!playingRef.current) break;
      const url = getAudioUrl(ayah.surahNumber, ayah.ayahNumberInSurah);
      const audio = new Audio(url);
      audioRef.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject();
          audio.play().catch(reject);
        });
      } catch {
        break;
      }
    }
    playingRef.current = false;
    setIsPlaying(false);
  };

  if (!surah) {
    return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;
  }

  const page = pages[currentPageIndex];
  const isBismillah = surahNumber !== 9 && surahNumber !== 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF6EC]">
      {/* Header */}
      <div className="bg-[#1B4332] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold" style={{ fontFamily: "'Amiri Quran', serif" }}>
            {surah.nameArabic}
          </h1>
          <p className="text-xs opacity-80">{surah.nameFrench}</p>
        </div>
        <button
          onClick={() => router.push(`/quiz/${surahNumber}`)}
          className="bg-white/20 px-3 py-1 rounded-full text-sm"
        >
          Quiz
        </button>
      </div>

      {/* Page mushaf */}
      {page && (
        <div className="flex-1 overflow-y-auto">
          {/* Cadre mushaf */}
          <div className="mx-2 my-3 border-2 border-[#C9A96E] rounded-sm bg-[#FFFDF7] min-h-[70vh]">
            {/* Header de page - style mushaf */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-[#C9A96E] bg-[#F5EDD8]">
              <span className="text-xs text-[#8B7355]">
                Juz {page.ayahs[0]?.surahNumber && getSurah(page.ayahs[0].surahNumber)?.ayahs.find(a => a.page === page.pageNumber)?.juz}
              </span>
              <span className="text-sm text-[#1B4332]" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {page.ayahs[0]?.surahNameArabic}
              </span>
            </div>

            {/* Contenu de la page */}
            <div className="px-5 py-4">
              {/* Bismillah */}
              {currentPageIndex === 0 && isBismillah && (
                <p
                  className="text-center text-[#1B4332] my-5"
                  dir="rtl"
                  style={{ fontFamily: "'Amiri Quran', serif", fontSize: '28px', lineHeight: '60px' }}
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </p>
              )}

              {/* Texte coranique continu - style mushaf */}
              <div dir="rtl" className="text-justify">
                {page.ayahs.map((ayah) => (
                  <span key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}>
                    <span
                      className="text-[#1A1A1A] leading-[2.8]"
                      style={{ fontFamily: "'Amiri Quran', serif", fontSize: '26px' }}
                    >
                      {ayah.text}
                    </span>
                    <span
                      className="text-[#C9A96E] mx-1"
                      style={{ fontFamily: "'Amiri Quran', serif", fontSize: '18px' }}
                    >
                      ﴿{ayah.ayahNumberInSurah}﴾
                    </span>
                    {showTranslation && (
                      <span className="block text-sm text-gray-500 leading-6 my-2 text-left border-r-2 border-[#C9A96E] pr-3" dir="ltr">
                        {ayah.translationFr}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Numero de page */}
            <div className="text-center py-3 border-t border-[#C9A96E] bg-[#F5EDD8]">
              <span className="text-sm text-[#8B7355]">{page.pageNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={playPageAudio} className="flex flex-col items-center text-xs text-gray-600">
          <span className="text-xl">{isPlaying ? '⏸️' : '▶️'}</span>
          <span>{isPlaying ? 'Pause' : 'Ecouter'}</span>
        </button>
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={`flex flex-col items-center text-xs ${showTranslation ? 'text-[#1B4332] font-semibold' : 'text-gray-400'}`}
        >
          <span className="text-xl">🌍</span>
          <span>Traduction</span>
        </button>

        <div className="flex-1" />

        {/* Page navigation - fleches inversees pour sens arabe */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPageIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={currentPageIndex === pages.length - 1}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 text-sm"
          >
            ←
          </button>
          <span className="text-xs text-gray-500">{currentPageIndex + 1}/{pages.length}</span>
          <button
            onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
            disabled={currentPageIndex === 0}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 text-sm"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
