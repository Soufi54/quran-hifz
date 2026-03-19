'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft, Play, Pause, Languages, GraduationCap, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { getSurah, getPageData, getFirstPageOfSurah, getAudioUrl } from '../../../lib/quran';
import { setSurahStatus, getSurahProgress, setReviewDate } from '../../../lib/storage';
import TafsirButton from '../../../components/TafsirButton';

function getMushafImageUrl(pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${padded}.png`;
}

export default function SurahPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentPage, setCurrentPage] = useState(1);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  // Swipe detection
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!surah) return;
    const firstPage = getFirstPageOfSurah(surahNumber);
    setCurrentPage(firstPage);

    const progress = getSurahProgress();
    if (!progress[surahNumber] || progress[surahNumber] === 'not_started') {
      setSurahStatus(surahNumber, 'learning');
    }
    setReviewDate(surahNumber);
  }, [surahNumber, surah]);

  // Charger les donnees de traduction quand la page change
  useEffect(() => {
    if (showTranslation) {
          }
  }, [currentPage, showTranslation]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(604, page));
    setCurrentPage(clamped);
    setImageError(false);
  }, []);

  // Sens arabe : swipe gauche = page suivante (numero +1), swipe droite = page precedente
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe gauche → page suivante (sens arabe)
        goToPage(currentPage + 1);
      } else {
        // Swipe droite → page precedente (sens arabe)
        goToPage(currentPage - 1);
      }
    }
  };

  const playPageAudio = async () => {
    if (isPlaying) {
      playingRef.current = false;
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);
    const pageData = getPageData(currentPage);

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

  const pageData = getPageData(currentPage);

  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332]">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="cursor-pointer p-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surah.nameArabic}
          </h1>
          <p className="text-xs text-emerald-200">{surah.nameFrench}</p>
        </div>
        <button
          onClick={() => router.push(`/sourates/${surahNumber}/tartil`)}
          className="bg-white/15 p-2 rounded-xl cursor-pointer transition-colors hover:bg-white/25"
          title="Mode Tartil"
        >
          <EyeOff size={18} />
        </button>
        <button
          onClick={() => router.push(`/quiz/${surahNumber}`)}
          className="bg-white/15 p-2 rounded-xl cursor-pointer transition-colors hover:bg-white/25"
          title="Quiz"
        >
          <GraduationCap size={18} />
        </button>
      </div>

      {/* Page content — swipeable */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ background: showTranslation ? '#F0FDF4' : '#FDF6EC' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showTranslation ? (
          /* MODE TRADUCTION : texte arabe + traduction alternee */
          <div className="px-4 py-5">
            {/* Header page */}
            <div className="flex justify-between items-center pb-2 mb-4 border-b border-emerald-200 text-xs text-emerald-600">
              <span>Page {currentPage}</span>
              <span style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {pageData.ayahs[0]?.surahNameArabic}
              </span>
            </div>

            {/* Versets alternes */}
            <div className="space-y-4">
              {pageData.ayahs.map((ayah) => (
                <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`} className="clay-card p-4">
                  {/* Verset arabe */}
                  <p
                    className="text-xl leading-[52px] text-right text-emerald-900 mb-3"
                    dir="rtl"
                    style={{ fontFamily: "'Amiri Quran', serif" }}
                  >
                    {ayah.text}
                    <span className="text-sm text-emerald-400 mx-1">﴿{ayah.ayahNumberInSurah}﴾</span>
                  </p>
                  {/* Traduction */}
                  <div className="border-t border-emerald-100 pt-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <span className="text-xs font-semibold text-emerald-600 mr-1">{ayah.ayahNumberInSurah}.</span>
                      {ayah.translationFr}
                    </p>
                    <TafsirButton surahNumber={ayah.surahNumber} ayahNumber={ayah.ayahNumberInSurah} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-emerald-400 mt-6">Page {currentPage} / 604</p>
          </div>
        ) : (
          /* MODE MUSHAF : image scannee */
          <div className="relative w-full" style={{ minHeight: '500px' }}>
            {!imageError ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={getMushafImageUrl(currentPage)}
                alt={`Page ${currentPage} du mushaf`}
                className="w-full h-auto"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-emerald-200">
                <p>Image non disponible pour la page {currentPage}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-white/95 backdrop-blur-md border-t border-emerald-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={playPageAudio}
          className="flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 hover:text-emerald-700 text-gray-500 min-w-[44px]"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="mt-0.5">{isPlaying ? 'Pause' : 'Ecouter'}</span>
        </button>

        <button
          onClick={() => {
            setShowTranslation(!showTranslation);
            if (!showTranslation) {
                          }
          }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showTranslation ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Languages size={20} />
          <span className="mt-0.5">Traduction</span>
        </button>

        <div className="flex-1" />

        {/* Navigation pages — infini 1-604 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= 604}
            className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:bg-emerald-100"
          >
            <ChevronLeft size={18} className="text-emerald-700" />
          </button>
          <span className="text-xs text-gray-500 font-mono min-w-[40px] text-center">{currentPage}</span>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:bg-emerald-100"
          >
            <ChevronRight size={18} className="text-emerald-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
