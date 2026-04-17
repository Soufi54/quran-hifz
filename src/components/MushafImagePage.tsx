'use client';

import { useRef, useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

interface QcfWord {
  c: string;
  t: string;
  p: number;
  vk: string;
}

type QcfPageData = Record<string, QcfWord[]>;

interface MushafImagePageProps {
  pageNumber: number;
  qcfPage: QcfPageData | null;
  playingAyahKey: string | null;
}

function getMushafImageUrl(pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${padded}.png`;
}

// Image mushaf classique : 1024x1656
// Zone de texte mesuree : premiere ligne y≈50, derniere ligne y≈1620
// En pourcentage : top=3%, bottom=97.8%
const IMG_WIDTH = 1024;
const IMG_HEIGHT = 1656;
const TEXT_TOP_PX = 50;
const TEXT_BOTTOM_PX = 1620;
const TOTAL_LINES = 15;
const LINE_HEIGHT_PX = (TEXT_BOTTOM_PX - TEXT_TOP_PX) / TOTAL_LINES;

export default function MushafImagePage({ pageNumber, qcfPage, playingAyahKey }: MushafImagePageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [imageRect, setImageRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Quand l'image charge ou le conteneur resize, calculer la position reelle de l'image
  const updateImageRect = () => {
    if (!imgRef.current || !containerRef.current) return;
    const container = containerRef.current;

    // L'image est en object-fit: contain — calculer sa position reelle
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgRatio = IMG_WIDTH / IMG_HEIGHT;
    const containerRatio = containerW / containerH;

    let renderW: number, renderH: number, offsetX: number, offsetY: number;
    if (containerRatio > imgRatio) {
      // Conteneur plus large que l'image — barres laterales
      renderH = containerH;
      renderW = containerH * imgRatio;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    } else {
      // Conteneur plus haut que l'image — barres haut/bas
      renderW = containerW;
      renderH = containerW / imgRatio;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    }

    setImageRect({ top: offsetY, left: offsetX, width: renderW, height: renderH });
  };

  useEffect(() => {
    window.addEventListener('resize', updateImageRect);
    return () => window.removeEventListener('resize', updateImageRect);
  }, []);

  // Lignes du verset en cours
  const getHighlightLines = (): number[] => {
    if (!playingAyahKey || !qcfPage) return [];
    const lines: number[] = [];
    for (const [lineNum, words] of Object.entries(qcfPage)) {
      if (words.some(w => w.vk === playingAyahKey)) {
        lines.push(parseInt(lineNum));
      }
    }
    return lines.sort((a, b) => a - b);
  };

  const highlightLines = getHighlightLines();

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden flex items-center justify-center"
      style={{ height: 'calc(100vh - 110px)', background: theme === 'dark' ? '#0A0F0D' : 'white' }}
    >
      <img // eslint-disable-line @next/next/no-img-element
        ref={imgRef}
        src={getMushafImageUrl(pageNumber)}
        alt={`Page ${pageNumber}`}
        className="w-full h-full object-contain"
        onLoad={updateImageRect}
        style={{
          display: 'block',
          filter: theme === 'dark' ? 'invert(1) hue-rotate(180deg) contrast(1.3) brightness(0.8)' : 'none',
        }}
      />

      {/* Overlay surlignage */}
      {imageRect && highlightLines.length > 0 && highlightLines.map(lineNum => {
        // Position en pixels dans l'image originale
        const lineTopPx = TEXT_TOP_PX + (lineNum - 1) * LINE_HEIGHT_PX;
        // Convertir en position dans le conteneur
        const scale = imageRect.height / IMG_HEIGHT;
        const topInContainer = imageRect.top + lineTopPx * scale;
        const heightInContainer = LINE_HEIGHT_PX * scale;
        const leftInContainer = imageRect.left + 20 * scale;
        const widthInContainer = imageRect.width - 40 * scale;

        return (
          <div
            key={lineNum}
            className="absolute transition-all duration-300"
            style={{
              top: `${topInContainer}px`,
              left: `${leftInContainer}px`,
              width: `${widthInContainer}px`,
              height: `${heightInContainer}px`,
              backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.18)',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
}
