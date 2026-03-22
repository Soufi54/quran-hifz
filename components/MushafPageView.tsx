/**
 * MushafPageView — Rendu fidèle d'une page du Mushaf Madina
 *
 * Affiche 15 lignes de texte arabe avec la disposition exacte du Coran imprimé.
 * La mémoire visuelle est clé pour le Hifz : chaque mot est à sa place exacte.
 *
 * Modes :
 * - "read"  : lecture normale, tap = audio, long-press = tafsir
 * - "hifz"  : mots masqués sur la page Mushaf, tap pour révéler + auto-évaluation
 *             (comme poser son doigt sur le mot dans le livre physique)
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMushafPage, getAyahFromLocation, getSurahFromLocation } from '../lib/mushaf';
import type { MushafLine, MushafWord } from '../lib/mushaf';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_PADDING_H = 16;
const PAGE_PADDING_V = 12;

// Taille de police adaptative selon l'écran
const BASE_FONT_SIZE = Math.min(SCREEN_WIDTH * 0.048, 22);
const HEADER_FONT_SIZE = BASE_FONT_SIZE * 1.1;

const COLORS = {
  parchment: '#FDF6E3',
  parchmentDark: '#F5EDDA',
  gold: '#D4AF37',
  goldLight: '#E8D48B',
  darkGreen: '#0D2818',
  text: '#1A1A1A',
  verseNumber: '#8B6914',
  headerBg: '#F0E6CC',
  lineSeparator: '#E8DCC8',
  correct: '#10B981',
  correctBg: '#D1FAE5',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  hesitation: '#F59E0B',
  hesitationBg: '#FEF3C7',
  hidden: '#C4B5A0',
  hiddenBg: '#E8DCC8',
};

// === Types pour le mode Hifz ===

type HifzRating = 'correct' | 'error' | 'hesitation' | null;

interface WordHifzState {
  hidden: boolean;
  revealed: boolean;
  rating: HifzRating;
}

// === Mode d'affichage ===
export type MushafMode = 'read' | 'hifz';

// === Props ===

interface MushafPageViewProps {
  pageNumber: number;
  mode?: MushafMode;
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
  /** Callback quand tous les mots de la page ont été évalués */
  onHifzComplete?: (stats: { correct: number; error: number; hesitation: number; total: number }) => void;
}

export default function MushafPageView({
  pageNumber,
  mode = 'read',
  activeAyah,
  onAyahPress,
  onAyahLongPress,
  onHifzComplete,
}: MushafPageViewProps) {
  const page = getMushafPage(pageNumber);

  // Collecter tous les mots de la page pour le mode Hifz
  const allWords = useMemo(() => {
    if (!page) return [];
    const words: { loc: string; lineIdx: number; wordIdx: number }[] = [];
    page.lines.forEach((line, li) => {
      if (line.type === 'text' && line.words) {
        line.words.forEach((w, wi) => {
          // Exclure les numéros de versets du masquage
          const isVerseNum = /^[\s٠-٩]+$/.test(w.w.trim());
          if (!isVerseNum) {
            words.push({ loc: w.loc, lineIdx: li, wordIdx: wi });
          }
        });
      }
    });
    return words;
  }, [page, pageNumber]);

  // État Hifz : chaque mot peut être caché, révélé, noté
  const [wordStates, setWordStates] = useState<Map<string, WordHifzState>>(() => {
    const map = new Map();
    if (mode === 'hifz') {
      allWords.forEach(w => {
        map.set(`${w.lineIdx}-${w.wordIdx}`, { hidden: true, revealed: false, rating: null });
      });
    }
    return map;
  });

  // Index du mot courant en mode Hifz (le prochain à deviner)
  const [hifzCurrentIdx, setHifzCurrentIdx] = useState(0);

  // Barre de notation visible après révélation
  const [showRating, setShowRating] = useState(false);
  const [ratingForKey, setRatingForKey] = useState<string | null>(null);

  // Réinitialiser l'état quand le mode change
  const isHifz = mode === 'hifz';

  // Gérer le tap sur un mot caché
  const handleHifzWordPress = useCallback((lineIdx: number, wordIdx: number) => {
    const key = `${lineIdx}-${wordIdx}`;
    setWordStates(prev => {
      const next = new Map(prev);
      const state = next.get(key);
      if (state && state.hidden && !state.revealed) {
        next.set(key, { ...state, revealed: true });
      }
      return next;
    });
    setShowRating(true);
    setRatingForKey(key);
  }, []);

  // Évaluer le mot révélé
  const handleRate = useCallback((rating: HifzRating) => {
    if (!ratingForKey) return;
    setWordStates(prev => {
      const next = new Map(prev);
      const state = next.get(ratingForKey);
      if (state) {
        next.set(ratingForKey, { ...state, rating });
      }
      return next;
    });
    setShowRating(false);
    setRatingForKey(null);

    // Avancer au prochain mot
    const nextIdx = hifzCurrentIdx + 1;
    setHifzCurrentIdx(nextIdx);

    // Vérifier si la page est terminée
    if (nextIdx >= allWords.length && onHifzComplete) {
      let correct = 0, error = 0, hesitation = 0;
      wordStates.forEach(s => {
        if (s.rating === 'correct') correct++;
        else if (s.rating === 'error') error++;
        else if (s.rating === 'hesitation') hesitation++;
      });
      // +1 pour le rating qu'on vient de donner
      if (rating === 'correct') correct++;
      else if (rating === 'error') error++;
      else if (rating === 'hesitation') hesitation++;
      onHifzComplete({ correct, error, hesitation, total: allWords.length });
    }
  }, [ratingForKey, hifzCurrentIdx, allWords.length, onHifzComplete, wordStates]);

  // Fonction pour obtenir l'état d'un mot
  const getWordState = useCallback((lineIdx: number, wordIdx: number): WordHifzState | null => {
    if (!isHifz) return null;
    return wordStates.get(`${lineIdx}-${wordIdx}`) || null;
  }, [isHifz, wordStates]);

  // Progression Hifz
  const hifzProgress = useMemo(() => {
    if (!isHifz || allWords.length === 0) return 0;
    let rated = 0;
    wordStates.forEach(s => { if (s.rating) rated++; });
    return rated / allWords.length;
  }, [isHifz, wordStates, allWords.length]);

  if (!page || page.lines.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.pageFrame}>
          <Text style={styles.emptyText}>Page {pageNumber}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de progression Hifz */}
      {isHifz && (
        <View style={styles.hifzProgressBar}>
          <View style={[styles.hifzProgressFill, { width: `${hifzProgress * 100}%` }]} />
        </View>
      )}

      <View style={styles.pageFrame}>
        {/* Cadre décoratif */}
        <View style={styles.borderOuter}>
          <View style={styles.borderInner}>
            {/* Contenu des lignes */}
            <View style={styles.linesContainer}>
              {page.lines.map((line, idx) => (
                <MushafLineView
                  key={`${pageNumber}-${line.line}-${idx}`}
                  line={line}
                  lineIdx={idx}
                  activeAyah={activeAyah}
                  onAyahPress={onAyahPress}
                  onAyahLongPress={onAyahLongPress}
                  isLastLine={idx === page.lines.length - 1}
                  isHifz={isHifz}
                  getWordState={getWordState}
                  onHifzWordPress={handleHifzWordPress}
                  hifzCurrentWord={isHifz && hifzCurrentIdx < allWords.length ? allWords[hifzCurrentIdx] : null}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Barre de notation Hifz (apparaît après révélation d'un mot) */}
        {isHifz && showRating && (
          <View style={styles.ratingBar}>
            <TouchableOpacity
              style={[styles.ratingBtn, { backgroundColor: COLORS.correct }]}
              onPress={() => handleRate('correct')}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.ratingBtnText}>Correct</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratingBtn, { backgroundColor: COLORS.hesitation }]}
              onPress={() => handleRate('hesitation')}
            >
              <Ionicons name="help" size={20} color="#fff" />
              <Text style={styles.ratingBtnText}>Hesitation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratingBtn, { backgroundColor: COLORS.error }]}
              onPress={() => handleRate('error')}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.ratingBtnText}>Erreur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Numéro de page */}
        <Text style={styles.pageNumberText}>{pageNumber}</Text>
      </View>
    </View>
  );
}

// === Composant ligne ===

interface MushafLineViewProps {
  line: MushafLine;
  lineIdx: number;
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
  isLastLine: boolean;
  isHifz: boolean;
  getWordState: (lineIdx: number, wordIdx: number) => WordHifzState | null;
  onHifzWordPress: (lineIdx: number, wordIdx: number) => void;
  hifzCurrentWord: { lineIdx: number; wordIdx: number } | null;
}

function MushafLineView({
  line,
  lineIdx,
  activeAyah,
  onAyahPress,
  onAyahLongPress,
  isLastLine,
  isHifz,
  getWordState,
  onHifzWordPress,
  hifzCurrentWord,
}: MushafLineViewProps) {
  if (line.type === 'surah-header') {
    return (
      <View style={styles.surahHeader}>
        <View style={styles.surahHeaderLine} />
        <Text style={styles.surahHeaderText}>{line.text}</Text>
        <View style={styles.surahHeaderLine} />
      </View>
    );
  }

  if (line.type === 'basmala') {
    return (
      <View style={styles.basmalaContainer}>
        <Text style={styles.basmalaText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
      </View>
    );
  }

  // Type "text" — ligne de versets
  if (line.words && line.words.length > 0) {
    return (
      <View style={[styles.textLine, !isLastLine && styles.textLineBorder]}>
        <Text style={styles.lineText}>
          {line.words.map((word, i) => (
            <MushafWordView
              key={`${word.loc}-${i}`}
              word={word}
              lineIdx={lineIdx}
              wordIdx={i}
              activeAyah={activeAyah}
              onAyahPress={onAyahPress}
              onAyahLongPress={onAyahLongPress}
              isHifz={isHifz}
              wordState={getWordState(lineIdx, i)}
              onHifzPress={onHifzWordPress}
              isCurrent={hifzCurrentWord?.lineIdx === lineIdx && hifzCurrentWord?.wordIdx === i}
            />
          ))}
        </Text>
      </View>
    );
  }

  // Fallback : texte brut
  return (
    <View style={[styles.textLine, !isLastLine && styles.textLineBorder]}>
      <Text style={styles.lineText}>
        <Text style={styles.arabicText}>{line.text || ''}</Text>
      </Text>
    </View>
  );
}

// === Composant mot ===

interface MushafWordViewProps {
  word: MushafWord;
  lineIdx: number;
  wordIdx: number;
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
  isHifz: boolean;
  wordState: WordHifzState | null;
  onHifzPress: (lineIdx: number, wordIdx: number) => void;
  isCurrent: boolean;
}

function MushafWordView({
  word,
  lineIdx,
  wordIdx,
  activeAyah,
  onAyahPress,
  onAyahLongPress,
  isHifz,
  wordState,
  onHifzPress,
  isCurrent,
}: MushafWordViewProps) {
  const surah = getSurahFromLocation(word.loc);
  const ayah = getAyahFromLocation(word.loc);

  const isActive = activeAyah && activeAyah.surah === surah && activeAyah.ayah === ayah;
  const isVerseEnd = /[٠-٩]+/.test(word.w) && word.w.trim().length <= 4;

  // Mode Hifz : mot masqué ou révélé
  if (isHifz && wordState && !isVerseEnd) {
    const { hidden, revealed, rating } = wordState;

    // Couleur selon le rating
    let wordColor = COLORS.text;
    let wordBg = 'transparent';
    if (rating === 'correct') {
      wordColor = COLORS.correct;
      wordBg = COLORS.correctBg;
    } else if (rating === 'error') {
      wordColor = COLORS.error;
      wordBg = COLORS.errorBg;
    } else if (rating === 'hesitation') {
      wordColor = COLORS.hesitation;
      wordBg = COLORS.hesitationBg;
    }

    // Mot caché : afficher un bloc flou/opaque
    if (hidden && !revealed) {
      return (
        <Text
          style={[
            styles.arabicText,
            styles.hiddenWord,
            isCurrent && styles.currentHiddenWord,
          ]}
          onPress={() => isCurrent ? onHifzPress(lineIdx, wordIdx) : undefined}
        >
          {'█'.repeat(Math.max(2, Math.ceil(word.w.length * 0.7)))}{' '}
        </Text>
      );
    }

    // Mot révélé avec couleur
    return (
      <Text
        style={[
          styles.arabicText,
          { color: wordColor, backgroundColor: wordBg, borderRadius: 3 },
        ]}
      >
        {word.w}{' '}
      </Text>
    );
  }

  // Mode lecture normal
  const handlePress = useCallback(() => {
    onAyahPress?.(surah, ayah);
  }, [surah, ayah, onAyahPress]);

  const handleLongPress = useCallback(() => {
    onAyahLongPress?.(surah, ayah);
  }, [surah, ayah, onAyahLongPress]);

  if (isVerseEnd) {
    return (
      <Text
        style={[styles.arabicText, styles.verseNumber]}
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        {' '}{word.w}{' '}
      </Text>
    );
  }

  return (
    <Text
      style={[
        styles.arabicText,
        isActive && styles.activeWord,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {word.w}{' '}
    </Text>
  );
}

// === Styles ===

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    backgroundColor: COLORS.parchment,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageFrame: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: PAGE_PADDING_H,
    paddingVertical: PAGE_PADDING_V,
    justifyContent: 'space-between',
  },
  borderOuter: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 4,
    padding: 3,
  },
  borderInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    borderRadius: 2,
    padding: 8,
  },
  linesContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Ligne de texte
  textLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: (SCREEN_HEIGHT * 0.7) / 15,
    paddingVertical: 2,
  },
  textLineBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.lineSeparator,
  },
  lineText: {
    flex: 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  arabicText: {
    fontFamily: 'UthmanicHafs',
    fontSize: BASE_FONT_SIZE,
    color: COLORS.text,
    lineHeight: BASE_FONT_SIZE * 1.8,
    textAlign: 'center',
  },
  activeWord: {
    color: COLORS.gold,
    backgroundColor: '#FFF8E1',
    borderRadius: 4,
  },
  verseNumber: {
    color: COLORS.verseNumber,
    fontSize: BASE_FONT_SIZE * 0.85,
  },

  // Mode Hifz — mots cachés
  hiddenWord: {
    color: COLORS.hiddenBg,
    backgroundColor: COLORS.hiddenBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  currentHiddenWord: {
    backgroundColor: COLORS.gold,
    color: COLORS.gold,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Barre de progression Hifz
  hifzProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.hiddenBg,
  },
  hifzProgressFill: {
    height: 4,
    backgroundColor: COLORS.correct,
    borderRadius: 2,
  },

  // Barre de notation Hifz
  ratingBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ratingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // En-tête sourate
  surahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.headerBg,
    borderRadius: 6,
    marginVertical: 4,
  },
  surahHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gold,
    marginHorizontal: 12,
  },
  surahHeaderText: {
    fontFamily: 'UthmanicHafs',
    fontSize: HEADER_FONT_SIZE,
    color: COLORS.darkGreen,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Basmala
  basmalaContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  basmalaText: {
    fontFamily: 'UthmanicHafs',
    fontSize: BASE_FONT_SIZE * 0.95,
    color: COLORS.text,
    textAlign: 'center',
  },

  // Numéro de page
  pageNumberText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.verseNumber,
    paddingTop: 4,
  },

  // Page vide
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 40,
  },
});
