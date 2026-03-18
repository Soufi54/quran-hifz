'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSurah, getFirstPageOfSurah, getLastPageOfSurah, getAudioUrl, getPageData } from '../../../lib/quran';
import { setSurahStatus, getSurahProgress, setReviewDate } from '../../../lib/storage';

function getMushafImageUrl(pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${padded}.png`;
}

export default function SurahPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    if (!surah) return;
    const first = getFirstPageOfSurah(surahNumber);
    const last = getLastPageOfSurah(surahNumber);
    const pages: number[] = [];
    for (let p = first; p <= last; p++) {
      pages.push(p);
    }
    setPageNumbers(pages);

    const progress = getSurahProgress();
    if (!progress[surahNumber] || progress[surahNumber] === 'not_started') {
      setSurahStatus(surahNumber, 'learning');
    }
    setReviewDate(surahNumber);
  }, [surahNumber, surah]);

  const playPageAudio = async () => {
    if (pageNumbers.length === 0) return;

    if (isPlaying) {
      playingRef.current = false;
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);
    const pageNum = pageNumbers[currentPageIndex];
    const pageData = getPageData(pageNum);

    for (const ayah of pageData.ayahs) {
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

  const currentPage = pageNumbers[currentPageIndex];
  const translationData = showTranslation && currentPage ? getPageData(currentPage) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332]">
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

      {/* Page mushaf - image */}
      {currentPage && (
        <div className="flex-1 overflow-y-auto bg-[#FDF6EC]">
          <div className="relative w-full" style={{ minHeight: '500px' }}>
            {!imageError ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={getMushafImageUrl(currentPage)}
                alt={`Page ${currentPage} du mushaf`}
                className="w-full h-auto"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <p>Image non disponible pour la page {currentPage}</p>
              </div>
            )}
          </div>

          {/* Traduction sous l'image */}
          {showTranslation && translationData && (
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Traduction</h3>
              <div className="space-y-2">
                {translationData.ayahs.map((ayah) => (
                  <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`} className="text-sm text-gray-700">
                    <span className="text-xs font-semibold text-[#1B4332] mr-1">{ayah.ayahNumberInSurah}.</span>
                    {ayah.translationFr}
                  </div>
                ))}
              </div>
            </div>
          )}
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
            onClick={() => { setCurrentPageIndex(i => Math.min(pageNumbers.length - 1, i + 1)); setImageError(false); }}
            disabled={currentPageIndex === pageNumbers.length - 1}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 text-sm"
          >
            ←
          </button>
          <span className="text-xs text-gray-500">p.{currentPage}</span>
          <button
            onClick={() => { setCurrentPageIndex(i => Math.max(0, i - 1)); setImageError(false); }}
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
