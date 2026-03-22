'use client';

import { useRef, useState } from 'react';

interface QcfWord {
  c: string;
  t: string;
  p: number;
  vk: string;
}

type QcfPageData = Record<string, QcfWord[]>;

interface MushafImagePageProps {
  pageNumber: number;
  qcfPage: QcfPageData | null; // donnees QCF pour le mapping lignes/versets
  playingAyahKey: string | null; // "surah:ayah" en cours de lecture
}

function getMushafImageUrl(pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${padded}.png`;
}

export default function MushafImagePage({ pageNumber, qcfPage, playingAyahKey }: MushafImagePageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  // Zone de texte dans l'image (approximation pour EasyQuran tajweed)
  // L'image fait ~776x1053, la zone de texte est environ :
  // top: 8%, bottom: 92%, left: 5%, right: 95%
  const TEXT_ZONE = { top: 0.08, bottom: 0.92, left: 0.05, right: 0.95 };

  // Calculer les lignes occupees par le verset en cours
  const getHighlightLines = (): number[] => {
    if (!playingAyahKey || !qcfPage) return [];
    const lines: number[] = [];
    const lineNumbers = Object.keys(qcfPage).map(Number).sort((a, b) => a - b);

    for (const lineNum of lineNumbers) {
      const words = qcfPage[String(lineNum)];
      if (words.some(w => w.vk === playingAyahKey)) {
        lines.push(lineNum);
      }
    }
    return lines;
  };

  const highlightLines = getHighlightLines();
  const totalLines = 15; // mushaf standard = 15 lignes

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - 110px)' }}
    >
      {/* Image du mushaf tajweed */}
      <img // eslint-disable-line @next/next/no-img-element
        src={getMushafImageUrl(pageNumber)}
        alt={`Page ${pageNumber}`}
        className="w-full h-full object-contain"
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setImageLoaded(true);
        }}
        style={{ display: imageLoaded ? 'block' : 'none' }}
      />

      {/* Spinner pendant le chargement */}
      {!imageLoaded && (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
        </div>
      )}

      {/* Overlay de surlignage des ayat */}
      {imageLoaded && highlightLines.length > 0 && imgDimensions.height > 0 && (
        <>
          {highlightLines.map(lineNum => {
            // Calculer la position verticale de cette ligne
            const textZoneHeight = TEXT_ZONE.bottom - TEXT_ZONE.top;
            const lineHeight = textZoneHeight / totalLines;
            // La ligne 1 commence en haut de la zone de texte
            const lineTop = TEXT_ZONE.top + (lineNum - 1) * lineHeight;

            return (
              <div
                key={lineNum}
                className="absolute transition-all duration-300"
                style={{
                  top: `${lineTop * 100}%`,
                  left: `${TEXT_ZONE.left * 100}%`,
                  width: `${(TEXT_ZONE.right - TEXT_ZONE.left) * 100}%`,
                  height: `${lineHeight * 100}%`,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
