'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Languages, GraduationCap, ChevronLeft, ChevronRight, EyeOff, Music, BookOpen, Image } from 'lucide-react';
import { getSurah, getPageData, getFirstPageOfSurah, getAudioUrl } from '../../../lib/quran';
import { setSurahStatus, getSurahProgress, setReviewDate } from '../../../lib/storage';
import TafsirButton from '../../../components/TafsirButton';
import MushafImagePage from '../../../components/MushafImagePage';
// Types pour les donnees QCF
interface QcfWord {
  c: string;  // code glyph PUA
  t: string;  // "word" ou "end"
  p: number;  // position
  vk: string; // verse_key "1:1"
}

type QcfPageData = Record<string, QcfWord[]>; // line_number → words
type QcfAllPages = Record<string, QcfPageData>;

// Cache global — charge a la demande, pas au demarrage
let qcfCache: QcfAllPages | null = null;
async function getQcfData(): Promise<QcfAllPages> {
  if (qcfCache) return qcfCache;
  const mod = await import('../../../data/qcf-pages.json');
  qcfCache = mod.default as QcfAllPages;
  return qcfCache;
}

// Charger dynamiquement la police QCF V4 pour une page
const loadedFonts = new Set<number>();
function loadQcfFont(pageNumber: number): Promise<void> {
  if (loadedFonts.has(pageNumber)) return Promise.resolve();
  if (typeof document === 'undefined') return Promise.resolve();

  const fontName = `p${pageNumber}-v4`;
  const url = `https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2/p${pageNumber}.woff2`;

  const fontFace = new FontFace(fontName, `url('${url}') format('woff2')`, {
    display: 'block',
  });

  document.fonts.add(fontFace);
  loadedFonts.add(pageNumber);

  return fontFace.load().then(() => {}).catch(() => {
    // Si COLRv1 echoue (vieux navigateur), essayer OT-SVG
    const fallbackUrl = `https://verses.quran.foundation/fonts/quran/hafs/v4/ot-svg/light/woff2/p${pageNumber}.woff2`;
    const fallback = new FontFace(fontName, `url('${fallbackUrl}') format('woff2')`, {
      display: 'block',
    });
    document.fonts.add(fallback);
    return fallback.load().then(() => {});
  });
}

// Composant MushafPage : auto-sizing pour fitter exactement dans l'ecran
function MushafPage({
  fontFamily, lineNumbers, qcfPage, surahStarts, surahStartLines, firstDataLine, playingAyahKey,
}: {
  fontFamily: string;
  lineNumbers: number[];
  qcfPage: QcfPageData;
  surahStarts: { lineNumber: number; surahNumber: number; surahName: string }[];
  surahStartLines: Map<number, { lineNumber: number; surahNumber: number; surahName: string }>;
  firstDataLine: number;
  playingAyahKey: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Taille initiale basee sur le nombre de lignes
  const initialSize = lineNumbers.length <= 8 ? 28 : lineNumbers.length <= 13 ? 22 : 20;
  const [fontSize, setFontSize] = useState(initialSize);
  const [ready, setReady] = useState(false);

  const isFullPage = lineNumbers.length >= 13;
  const hasSurahHeader = firstDataLine > 1 && surahStarts.length > 0;

  // Auto-size : apres le rendu, mesurer et ajuster
  useEffect(() => {
    setReady(false);
    setFontSize(initialSize);

    const autoFit = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const lines = container.querySelectorAll('.mushaf-line');
      if (lines.length === 0) return;

      let size = initialSize;
      const minSize = 12;

      while (size > minSize) {
        let fits = true;
        lines.forEach(line => {
          (line as HTMLElement).style.fontSize = `${size}px`;
        });
        // Forcer le reflow
        void container.offsetHeight;
        lines.forEach(line => {
          if (line.scrollWidth > containerWidth + 1) fits = false;
        });
        if (fits) break;
        size -= 0.5;
      }

      setFontSize(size);
      setReady(true);
    };

    // Attendre que la police soit chargee, puis re-verifier apres 1s
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          autoFit();
          // Re-check apres 1s au cas ou la police se charge en retard
          setTimeout(autoFit, 1000);
        });
      });
    });
  }, [lineNumbers, fontFamily, initialSize]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col overflow-hidden ${isFullPage ? 'justify-between' : 'justify-center'}`}
      style={{
        height: 'calc(100vh - 110px)',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Titre sourate + bismillah */}
      {hasSurahHeader && (
        <div className="text-center py-1">
          <p className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {surahStarts[0].surahName}
          </p>
          {surahStarts[0].surahNumber !== 1 && surahStarts[0].surahNumber !== 9 && (
            <p className="text-base text-gray-600 mt-0.5" style={{ fontFamily: "'Amiri Quran', serif" }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          )}
        </div>
      )}

      {lineNumbers.map(lineNum => {
        const words = qcfPage[String(lineNum)];
        const surahStart = surahStartLines.get(lineNum);
        const showInlineSurahHeader = surahStart && firstDataLine !== lineNum;

        return (
          <div key={lineNum}>
            {showInlineSurahHeader && (
              <div className="text-center">
                <p className="text-base font-bold text-gray-700" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                  {surahStart.surahName}
                </p>
              </div>
            )}
            <div
              dir="rtl"
              className="mushaf-line"
              style={{
                fontFamily: `'${fontFamily}', sans-serif`,
                fontSize: `${fontSize}px`,
                lineHeight: 1.35,
              }}
            >
              {words.map((word, wi) => (
                <span key={wi}>
                  <span
                    dangerouslySetInnerHTML={{ __html: word.c }}
                    className={playingAyahKey && word.vk === playingAyahKey ? 'mushaf-highlight' : ''}
                  />{' '}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SurahPage() {
  const params = useParams();
  const router = useRouter();
  const surahNumber = parseInt(params.id as string);
  const surah = getSurah(surahNumber);

  const [currentPage, setCurrentPage] = useState(1);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showImage, setShowImage] = useState(true); // mushaf classique par defaut
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRecitateur, setShowRecitateur] = useState(false);
  const [recitateur, setRecitateur] = useState('Alafasy_128kbps');
  const [fontReady, setFontReady] = useState(false);
  const [qcfPage, setQcfPage] = useState<QcfPageData | null>(null);
  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null); // "surah:ayah" en cours de lecture

  const RECITATEURS = [
    { id: 'Alafasy_128kbps', name: 'Alafasy' },
    { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit' },
    { id: 'Husary_128kbps', name: 'Husary' },
    { id: 'Minshawi_Murattal_128kbps', name: 'Minshawi' },
    { id: 'Saood_ash-Shuraym_128kbps', name: 'Shuraym' },
  ];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recitateur');
    if (saved) setRecitateur(saved);
  }, []);

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

  // Charger les donnees QCF + la police pour la page courante
  useEffect(() => {
    setFontReady(false);
    setQcfPage(null);

    Promise.all([
      getQcfData().then(data => {
        setQcfPage(data[String(currentPage)] || null);
      }),
      loadQcfFont(currentPage),
    ]).then(() => {
      setFontReady(true);
    });

    // Pre-charger les pages adjacentes
    if (currentPage > 1) loadQcfFont(currentPage - 1);
    if (currentPage < 604) loadQcfFont(currentPage + 1);
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(604, page));
    setCurrentPage(clamped);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      // Sens arabe : swipe gauche = page precedente, swipe droite = page suivante
      goToPage(diff > 0 ? currentPage - 1 : currentPage + 1);
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
    const pd = getPageData(currentPage);
    for (const ayah of pd.ayahs) {
      if (!playingRef.current) break;
      const key = `${ayah.surahNumber}:${ayah.ayahNumberInSurah}`;
      setPlayingAyahKey(key);
      const url = getAudioUrl(ayah.surahNumber, ayah.ayahNumberInSurah);
      const audio = new Audio(url);
      audioRef.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject();
          audio.play().catch(reject);
        });
      } catch { break; }
    }
    setPlayingAyahKey(null);
    playingRef.current = false;
    setIsPlaying(false);
  };

  if (!surah) return <div className="p-8 text-center text-gray-500">Sourate non trouvee</div>;

  const pageData = getPageData(currentPage);

  // Detecter si une nouvelle sourate commence sur cette page
  const getSurahStarts = (): { lineNumber: number; surahNumber: number; surahName: string }[] => {
    if (!qcfPage) return [];
    const starts: { lineNumber: number; surahNumber: number; surahName: string }[] = [];
    const lineNumbers = Object.keys(qcfPage).map(Number).sort((a, b) => a - b);
    let prevSurah = '';

    for (const lineNum of lineNumbers) {
      const words = qcfPage[String(lineNum)];
      if (words.length > 0) {
        const vk = words[0].vk;
        const surahNum = vk.split(':')[0];
        if (surahNum !== prevSurah) {
          // Nouvelle sourate commence ici
          const s = getSurah(parseInt(surahNum));
          if (s) {
            starts.push({
              lineNumber: lineNum,
              surahNumber: parseInt(surahNum),
              surahName: s.nameArabic,
            });
          }
          prevSurah = surahNum;
        }
      }
    }
    return starts;
  };

  // Rendu QCF V4 — composition identique au mushaf
  const renderQcf = () => {
    if (!qcfPage) return <div className="text-center text-gray-400 py-20">Page non disponible</div>;
    if (!fontReady) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
        </div>
      );
    }

    const fontFamily = `p${currentPage}-v4`;
    const lineNumbers = Object.keys(qcfPage).map(Number).sort((a, b) => a - b);
    const surahStarts = getSurahStarts();
    const surahStartLines = new Map(surahStarts.map(s => [s.lineNumber, s]));

    // La premiere ligne de donnees — les lignes avant sont titre/bismillah (dans la police)
    const firstDataLine = lineNumbers[0] || 1;


    return (
      <MushafPage
        fontFamily={fontFamily}
        lineNumbers={lineNumbers}
        qcfPage={qcfPage}
        surahStarts={surahStarts}
        surahStartLines={surahStartLines}
        firstDataLine={firstDataLine}
        playingAyahKey={playingAyahKey}
      />
    );
  };

  // Rendu traduction
  const renderTranslation = () => (
    <div className="px-4 py-5">
      <div className="flex justify-between items-center pb-2 mb-4 border-b border-emerald-200 text-xs text-emerald-600">
        <span>Page {currentPage}</span>
        <span style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
          {pageData.ayahs[0]?.surahNameArabic}
        </span>
      </div>
      <div className="space-y-4">
        {pageData.ayahs.map((ayah) => (
          <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`} className="clay-card p-4">
            <p className="text-xl leading-[52px] text-right text-emerald-900 mb-3" dir="rtl"
              style={{ fontFamily: "'Amiri Quran', serif" }}>
              {ayah.text}
              <span className="text-sm text-emerald-400 mx-1">﴿{ayah.ayahNumberInSurah}﴾</span>
            </p>
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
  );

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
        <button onClick={() => router.push(`/sourates/${surahNumber}/apprendre`)}
          className="bg-amber-500/80 p-2 rounded-xl cursor-pointer transition-colors hover:bg-amber-500" title="Apprendre">
          <BookOpen size={18} />
        </button>
        <button onClick={() => router.push(`/sourates/${surahNumber}/tartil`)}
          className="bg-white/15 p-2 rounded-xl cursor-pointer transition-colors hover:bg-white/25" title="Mode Tartil">
          <EyeOff size={18} />
        </button>
        <button onClick={() => router.push(`/quiz/${surahNumber}`)}
          className="bg-white/15 p-2 rounded-xl cursor-pointer transition-colors hover:bg-white/25" title="Quiz">
          <GraduationCap size={18} />
        </button>
      </div>

      {/* Contenu — swipeable */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-x-hidden ${showTranslation ? 'overflow-y-auto' : 'overflow-hidden h-full'}`}
        style={{ background: showTranslation ? '#F0FDF4' : '#FFFFFF' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showTranslation ? renderTranslation() : showImage ? (
          <MushafImagePage
            pageNumber={currentPage}
            qcfPage={qcfPage}
            playingAyahKey={playingAyahKey}
          />
        ) : renderQcf()}
      </div>

      {/* Barre du bas */}
      <div className="bg-white/95 backdrop-blur-md border-t border-emerald-100 px-4 py-3 flex items-center gap-3">
        <button onClick={playPageAudio}
          className="flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 hover:text-emerald-700 text-gray-500 min-w-[44px]">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="mt-0.5">{isPlaying ? 'Pause' : 'Ecouter'}</span>
        </button>

        <button onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setShowImage(false); }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showTranslation ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}>
          <Languages size={20} />
          <span className="mt-0.5">Traduction</span>
        </button>

        <button onClick={() => { setShowImage(!showImage); if (showImage) setShowTranslation(false); }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showImage ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}>
          <Image size={20} />
          <span className="mt-0.5">Tajweed</span>
        </button>

        <button onClick={() => setShowRecitateur(!showRecitateur)}
          className="flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 text-gray-400 hover:text-gray-600 min-w-[44px]">
          <Music size={20} />
          <span className="mt-0.5">Recitateur</span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= 604}
            className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:bg-emerald-100">
            <ChevronLeft size={18} className="text-emerald-700" />
          </button>
          <span className="text-xs text-gray-500 font-mono min-w-[40px] text-center">{currentPage}</span>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
            className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:bg-emerald-100">
            <ChevronRight size={18} className="text-emerald-700" />
          </button>
        </div>
      </div>

      {/* Popup recitateur */}
      {showRecitateur && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowRecitateur(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-t-2xl w-full p-4 pb-8" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-emerald-900 mb-3">Recitateur</h3>
            <div className="space-y-1">
              {RECITATEURS.map(r => (
                <button key={r.id} onClick={() => {
                  setRecitateur(r.id);
                  localStorage.setItem('recitateur', r.id);
                  setShowRecitateur(false);
                }}
                  className={`w-full text-left p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                    recitateur === r.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
