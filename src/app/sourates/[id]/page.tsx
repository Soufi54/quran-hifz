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

// Composant MushafPage : layout fidele au mushaf imprime
// - Marges laterales proportionnelles
// - Line-height calcule dynamiquement pour remplir la hauteur
// - Separateurs de sourate compacts
// - Auto-sizing robuste (font-size ajuste pour fitter en largeur)
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
  const [fontSize, setFontSize] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [ready, setReady] = useState(false);

  const hasSurahHeader = firstDataLine > 1 && surahStarts.length > 0;
  // Combien d'espace vertical les separateurs prennent (~40px par separateur)
  const inlineSurahCount = surahStarts.filter(s => s.lineNumber !== firstDataLine).length;
  const headerSpace = (hasSurahHeader ? 50 : 0) + (inlineSurahCount * 36);

  useEffect(() => {
    setReady(false);

    const autoFit = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;

      const lines = container.querySelectorAll('.mushaf-line');
      if (lines.length === 0) return;

      // Espace disponible pour les lignes de texte (total - headers - marges)
      const availH = ch - headerSpace - 16; // 16px marge haut+bas
      const nLines = lineNumbers.length;

      // Largeur disponible (avec marges laterales de 4%)
      const availW = cw * 0.92;

      // Calcul du line-height pour repartir les lignes uniformement
      const targetLineH = availH / nLines;

      // Trouver la font-size max qui fait tenir chaque ligne en largeur
      let size = Math.min(28, targetLineH * 0.55); // Estimation initiale
      const minSize = 8;

      while (size > minSize) {
        lines.forEach(line => {
          (line as HTMLElement).style.fontSize = `${size}px`;
        });
        void container.offsetHeight;

        let allFit = true;
        lines.forEach(line => {
          if (line.scrollWidth > availW + 2) allFit = false;
        });
        if (allFit) break;
        size -= 0.5;
      }

      // Line-height = espace par ligne / font-size (en em)
      const lh = Math.max(1.3, Math.min(2.5, targetLineH / size));

      setFontSize(size);
      setLineHeight(lh);
      setReady(true);
    };

    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          autoFit();
          setTimeout(autoFit, 800);
        });
      });
    });
  }, [lineNumbers, fontFamily, headerSpace]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden"
      style={{
        height: 'calc(100vh - 110px)',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.15s',
        padding: '8px 4%',
      }}
    >
      {/* Titre sourate + bismillah — compact */}
      {hasSurahHeader && (
        <div className="text-center" style={{ paddingBottom: 4 }}>
          <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: "'Noto Naskh Arabic', serif", margin: 0 }}>
            {surahStarts[0].surahName}
          </p>
          {surahStarts[0].surahNumber !== 1 && surahStarts[0].surahNumber !== 9 && (
            <p className="text-xs text-[var(--text-muted)]" style={{ fontFamily: "'Amiri Quran', serif", margin: 0 }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          )}
        </div>
      )}

      {/* Lignes de texte — reparties uniformement */}
      <div className="flex-1 flex flex-col justify-between">
        {lineNumbers.map(lineNum => {
          const words = qcfPage[String(lineNum)];
          const surahStart = surahStartLines.get(lineNum);
          const showInlineSurahHeader = surahStart && firstDataLine !== lineNum;

          return (
            <div key={lineNum}>
              {showInlineSurahHeader && (
                <div className="text-center border-t border-b border-[var(--border)]" style={{ padding: '2px 0', margin: '1px 0' }}>
                  <p className="text-xs font-semibold text-[var(--text-muted)]" style={{ fontFamily: "'Noto Naskh Arabic', serif", margin: 0, lineHeight: 1.3 }}>
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
                  lineHeight: lineHeight,
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
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [showImage, setShowImage] = useState(true); // mushaf classique par defaut
  const [isPlaying, setIsPlaying] = useState(false);
  const [translitData, setTranslitData] = useState<Record<string, Record<string, string>> | null>(null);
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

  // Charger la transliteration quand active
  useEffect(() => {
    if (!showPhonetic || translitData) return;
    import('../../../data/transliteration.json').then(mod => {
      setTranslitData(mod.default as Record<string, Record<string, string>>);
    });
  }, [showPhonetic, translitData]);

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

    // Reutiliser un seul element Audio (obligatoire sur iOS Safari)
    const audio = audioRef.current || new Audio();
    audioRef.current = audio;

    const pd = getPageData(currentPage);
    for (const ayah of pd.ayahs) {
      if (!playingRef.current) break;
      const key = `${ayah.surahNumber}:${ayah.ayahNumberInSurah}`;
      setPlayingAyahKey(key);
      const url = getAudioUrl(ayah.surahNumber, ayah.ayahNumberInSurah);
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('audio error'));
          audio.src = url;
          audio.load();
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

  // Rendu phonetique
  const renderPhonetic = () => {
    const pd = getPageData(currentPage);
    return (
      <div className="px-4 py-5 overflow-y-auto">
        <div className="flex justify-between items-center pb-2 mb-4 border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
          <span>Page {currentPage}</span>
          <span style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {pd.ayahs[0]?.surahNameArabic}
          </span>
        </div>
        <div className="space-y-5">
          {pd.ayahs.map((ayah, idx) => {
            const translit = translitData?.[String(ayah.surahNumber)]?.[String(ayah.ayahNumberInSurah)] || '';
            const prevSurah = idx > 0 ? pd.ayahs[idx - 1].surahNumber : ayah.surahNumber;
            const isNewSurah = ayah.surahNumber !== prevSurah;
            const surahInfo = isNewSurah ? getSurah(ayah.surahNumber) : null;
            return (
              <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}>
                {isNewSurah && surahInfo && (
                  <div className="text-center py-3 my-2 border-t border-b border-[var(--border)]" style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.03), transparent)' }}>
                    <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                      {surahInfo.nameArabic}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{surahInfo.nameFrench}</p>
                    {ayah.surahNumber !== 9 && (
                      <p className="text-sm text-[var(--text-muted)] mt-1" style={{ fontFamily: "'Amiri Quran', serif" }}>
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                    )}
                  </div>
                )}
                <div className="pb-4 border-b border-[var(--border)] last:border-0">
                  <p className="text-xl leading-[52px] text-right text-[var(--text)] mb-2" dir="rtl"
                    style={{ fontFamily: "'Amiri Quran', serif" }}>
                    {ayah.text}
                    <span className="text-sm text-[var(--text-muted)] mx-1">﴿{ayah.ayahNumberInSurah}﴾</span>
                  </p>
                  <p className="text-base text-[var(--primary)] leading-relaxed italic">
                    {translit || '...'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Rendu traduction
  const renderTranslation = () => (
    <div className="px-4 py-5">
      <div className="flex justify-between items-center pb-2 mb-4 border-b border-[var(--border)] text-xs text-[var(--primary)]">
        <span>Page {currentPage}</span>
        <span style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
          {pageData.ayahs[0]?.surahNameArabic}
        </span>
      </div>
      <div className="space-y-4">
        {pageData.ayahs.map((ayah, idx) => {
          const prevSurah = idx > 0 ? pageData.ayahs[idx - 1].surahNumber : ayah.surahNumber;
          const isNewSurah = ayah.surahNumber !== prevSurah;
          const surahInfo = isNewSurah ? getSurah(ayah.surahNumber) : null;
          return (
            <div key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}>
              {isNewSurah && surahInfo && (
                <div className="text-center py-3 my-2 border-t border-b border-[var(--border)]" style={{ background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.05), transparent)' }}>
                  <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                    {surahInfo.nameArabic}
                  </p>
                  <p className="text-xs text-[var(--primary)]">{surahInfo.nameFrench}</p>
                  {ayah.surahNumber !== 9 && (
                    <p className="text-sm text-[var(--primary)] mt-1" style={{ fontFamily: "'Amiri Quran', serif" }}>
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                    </p>
                  )}
                </div>
              )}
              <div className="clay-card p-4">
                <p className="text-xl leading-[52px] text-right text-[var(--text)] mb-3" dir="rtl"
                  style={{ fontFamily: "'Amiri Quran', serif" }}>
                  {ayah.text}
                  <span className="text-sm text-[var(--primary)] mx-1">﴿{ayah.ayahNumberInSurah}﴾</span>
                </p>
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    <span className="text-xs font-semibold text-[var(--primary)] mr-1">{ayah.ayahNumberInSurah}.</span>
                    {ayah.translationFr}
                  </p>
                  <TafsirButton surahNumber={ayah.surahNumber} ayahNumber={ayah.ayahNumberInSurah} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-[var(--text-muted)] mt-6">Page {currentPage} / 604</p>
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
        style={{ background: showTranslation ? 'var(--primary-light)' : 'var(--bg)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showPhonetic ? renderPhonetic() : showTranslation ? renderTranslation() : showImage ? (
          <MushafImagePage
            pageNumber={currentPage}
            qcfPage={qcfPage}
            playingAyahKey={playingAyahKey}
          />
        ) : renderQcf()}
      </div>

      {/* Barre du bas */}
      <div className="bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={playPageAudio}
          className="flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 hover:text-[var(--primary)] text-[var(--text-muted)] min-w-[44px]">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="mt-0.5">{isPlaying ? 'Pause' : 'Ecouter'}</span>
        </button>

        <button onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) { setShowImage(false); setShowPhonetic(false); } }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showTranslation ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}>
          <Languages size={20} />
          <span className="mt-0.5">Traduction</span>
        </button>

        <button onClick={() => { setShowPhonetic(!showPhonetic); if (!showPhonetic) { setShowTranslation(false); setShowImage(false); } }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showPhonetic ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}>
          <span className="text-base">أ</span>
          <span className="mt-0.5">Phonetique</span>
        </button>

        <button onClick={() => { setShowImage(!showImage); if (showImage) { setShowTranslation(false); setShowPhonetic(false); } }}
          className={`flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 min-w-[44px] ${
            showImage ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}>
          <Image size={20} aria-hidden="true" />
          <span className="mt-0.5">Tajweed</span>
        </button>

        <button onClick={() => setShowRecitateur(!showRecitateur)}
          className="flex flex-col items-center text-[10px] cursor-pointer transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text)] min-w-[44px]">
          <Music size={20} />
          <span className="mt-0.5">Recitateur</span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= 604}
            className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80">
            <ChevronLeft size={18} className="text-[var(--primary)]" />
          </button>
          <span className="text-xs text-[var(--text-muted)] font-mono min-w-[40px] text-center">{currentPage}</span>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
            className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center disabled:opacity-30 cursor-pointer transition-colors hover:opacity-80">
            <ChevronRight size={18} className="text-[var(--primary)]" />
          </button>
        </div>
      </div>

      {/* Popup recitateur */}
      {showRecitateur && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowRecitateur(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-[var(--bg-card)] rounded-t-2xl w-full p-4 pb-8" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text)] mb-3">Recitateur</h3>
            <div className="space-y-1">
              {RECITATEURS.map(r => (
                <button key={r.id} onClick={() => {
                  setRecitateur(r.id);
                  localStorage.setItem('recitateur', r.id);
                  setShowRecitateur(false);
                }}
                  className={`w-full text-left p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                    recitateur === r.id ? 'bg-[var(--primary-light)] text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)]'
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
