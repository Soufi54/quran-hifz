/**
 * MushafPageView — Rendu fidèle d'une page du Mushaf Madina
 *
 * Affiche 15 lignes de texte arabe avec la disposition exacte du Coran imprimé.
 * La mémoire visuelle est clé pour le Hifz : chaque mot est à sa place exacte.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { getMushafPage, getAyahFromLocation, getSurahFromLocation } from '../lib/mushaf';
import type { MushafLine, MushafWord } from '../lib/mushaf';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_PADDING_H = 16;
const PAGE_PADDING_V = 12;
const CONTENT_WIDTH = SCREEN_WIDTH - PAGE_PADDING_H * 2;

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
};

interface MushafPageViewProps {
  pageNumber: number;
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
}

export default function MushafPageView({
  pageNumber,
  activeAyah,
  onAyahPress,
  onAyahLongPress,
}: MushafPageViewProps) {
  const page = getMushafPage(pageNumber);

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
                  activeAyah={activeAyah}
                  onAyahPress={onAyahPress}
                  onAyahLongPress={onAyahLongPress}
                  isLastLine={idx === page.lines.length - 1}
                />
              ))}
            </View>
          </View>
        </View>
        {/* Numéro de page */}
        <Text style={styles.pageNumber}>{pageNumber}</Text>
      </View>
    </View>
  );
}

// === Composant ligne ===

interface MushafLineViewProps {
  line: MushafLine;
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
  isLastLine: boolean;
}

function MushafLineView({
  line,
  activeAyah,
  onAyahPress,
  onAyahLongPress,
  isLastLine,
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
              activeAyah={activeAyah}
              onAyahPress={onAyahPress}
              onAyahLongPress={onAyahLongPress}
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
  activeAyah?: { surah: number; ayah: number } | null;
  onAyahPress?: (surah: number, ayah: number) => void;
  onAyahLongPress?: (surah: number, ayah: number) => void;
}

function MushafWordView({
  word,
  activeAyah,
  onAyahPress,
  onAyahLongPress,
}: MushafWordViewProps) {
  const surah = getSurahFromLocation(word.loc);
  const ayah = getAyahFromLocation(word.loc);

  const isActive =
    activeAyah && activeAyah.surah === surah && activeAyah.ayah === ayah;

  // Vérifier si le mot est un numéro de verset (contient des chiffres arabes)
  const isVerseEnd = /[٠-٩]+/.test(word.w) && word.w.trim().length <= 4;

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
    minHeight: (SCREEN_HEIGHT * 0.7) / 15, // ~15 lignes par page
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
    fontFamily: Platform.OS === 'ios' ? 'UthmanicHafs' : 'UthmanicHafs',
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
    fontFamily: Platform.OS === 'ios' ? 'UthmanicHafs' : 'UthmanicHafs',
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
    fontFamily: Platform.OS === 'ios' ? 'UthmanicHafs' : 'UthmanicHafs',
    fontSize: BASE_FONT_SIZE * 0.95,
    color: COLORS.text,
    textAlign: 'center',
  },

  // Numéro de page
  pageNumber: {
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
