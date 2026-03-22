/**
 * Mushaf Layout — Disposition exacte du Mushaf Madina (604 pages, 15 lignes)
 *
 * Utilise le dataset zonetecde/mushaf-layout pour reproduire fidèlement
 * la disposition de chaque page du Coran imprimé.
 * La mémoire visuelle est essentielle pour la mémorisation (hifz).
 */

import mushafData from '../data/mushaf-layout.json';

export interface MushafWord {
  loc: string;   // "2:3:1" = surah:ayah:word
  w: string;     // Texte arabe du mot
}

export interface MushafLine {
  line: number;
  type: 'text' | 'surah-header' | 'basmala';
  text?: string;
  surah?: string;
  verseRange?: string;  // "2:1-2:5"
  words?: MushafWord[];
}

export interface MushafPage {
  page: number;
  lines: MushafLine[];
}

// Les données sont chargées une seule fois au démarrage
const allPages: MushafPage[] = mushafData as MushafPage[];

/**
 * Retourne les données de layout d'une page spécifique (1-604)
 */
export function getMushafPage(pageNumber: number): MushafPage | null {
  if (pageNumber < 1 || pageNumber > 604) return null;
  return allPages[pageNumber - 1] || null;
}

/**
 * Retourne les pages d'une sourate donnée
 */
export function getSurahPages(surahNumber: number): number[] {
  const pages: Set<number> = new Set();

  for (const page of allPages) {
    for (const line of page.lines) {
      if (line.type === 'surah-header' && line.surah === String(surahNumber).padStart(3, '0')) {
        pages.add(page.page);
      }
      if (line.verseRange) {
        const match = line.verseRange.match(/^(\d+):/);
        if (match && parseInt(match[1]) === surahNumber) {
          pages.add(page.page);
        }
      }
      // Vérifier les mots individuels
      if (line.words) {
        for (const word of line.words) {
          const surah = parseInt(word.loc.split(':')[0]);
          if (surah === surahNumber) {
            pages.add(page.page);
            break;
          }
        }
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Extrait le numéro de verset depuis un "location" string ("2:255:1" -> 255)
 */
export function getAyahFromLocation(location: string): number {
  const parts = location.split(':');
  return parts.length >= 2 ? parseInt(parts[1]) : 0;
}

/**
 * Extrait le numéro de sourate depuis un "location" string ("2:255:1" -> 2)
 */
export function getSurahFromLocation(location: string): number {
  return parseInt(location.split(':')[0]);
}

/**
 * Nombre total de pages du Mushaf
 */
export const TOTAL_PAGES = 604;

/**
 * Nombre de lignes par page dans le Mushaf Madina
 */
export const LINES_PER_PAGE = 15;
