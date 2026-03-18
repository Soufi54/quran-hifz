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

  useEffect(() => {
    if (!surah) return;
    const first = getFirstPageOfSurah(surahNumber);
    const last = getLastPageOfSurah(surahNumber);
    const pageList: PageData[] = [];
    for (let p = first; p <= last; p++) {
      pageList.push(getPageData(p));
    }
    setPages(pageList);

    // Marquer comme learning
    const progress = getSurahProgress();
    if (!progress[surahNumber] || progress[surahNumber] === 'not_started') {
      setSurahStatus(surahNumber, 'learning');
    }
    setReviewDate(surahNumber);
  }, [surahNumber, surah]);

  const playPageAudio = async () => {
    if (!pages[currentPageIndex]) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const ayahs = pages[currentPageIndex].ayahs;

    for (const ayah of ayahs) {
      if (!isPlaying && audioRef.current) break;
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
    setIsPlaying(false);
  };

  if (!surah) {
    return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;
  }

  const page = pages[currentPageIndex];
  const isBismillah = surahNumber !== 9 && surahNumber !== 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#1B4332] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold">{surah.nameArabic}</h1>
          <p className="text-xs opacity-80">{surah.nameFrench}</p>
        </div>
        <button
          onClick={() => router.push(`/quiz/${surahNumber}`)}
          className="bg-white/20 px-3 py-1 rounded-full text-sm"
        >
          Quiz
        </button>
      </div>

      {/* Page content */}
      {page && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Page header */}
          <div className="flex justify-between items-center pb-2 mb-3 border-b border-[#D4A574] text-xs text-[#8B7355]">
            <span>Juz {page.ayahs[0]?.surahNumber && getSurah(page.ayahs[0].surahNumber)?.ayahs.find(a => a.page === page.pageNumber)?.juz}</span>
            <span>{page.ayahs[0]?.surahNameArabic}</span>
          </div>

          {/* Bismillah */}
          {currentPageIndex === 0 && isBismillah && (
            <p className="text-xl text-center text-[#1B4332] my-4 leading-10" dir="rtl">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          )}

          {/* Ayahs */}
          <div dir="rtl">
            {page.ayahs.map((ayah) => (
              <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`} className="mb-2">
                <p className="text-xl leading-[48px] text-right text-gray-900 inline">
                  {ayah.text}
                  <span className="text-sm text-[#8B7355] mx-1">﴿{ayah.ayahNumberInSurah}﴾</span>
                </p>
                {showTranslation && (
                  <p className="text-sm text-gray-500 leading-6 mt-1 text-left border-l-2 border-gray-200 pl-3" dir="ltr">
                    {ayah.translationFr}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Page number */}
          <p className="text-center text-sm text-[#8B7355] mt-6">{page.pageNumber}</p>
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

        {/* Page navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
            disabled={currentPageIndex === 0}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
          >
            →
          </button>
          <span className="text-xs text-gray-500">{currentPageIndex + 1}/{pages.length}</span>
          <button
            onClick={() => setCurrentPageIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={currentPageIndex === pages.length - 1}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
}
