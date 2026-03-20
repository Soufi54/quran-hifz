import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Easing, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { Audio } from 'expo-av';
import { getSurah, getPageData, getFirstPageOfSurah, getLastPageOfSurah, getAudioUrl } from '../../lib/quran';
import { PageData } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mode Tartil: l'utilisateur recite de memoire et s'auto-evalue
type TartilVerse = {
  surahNumber: number;
  ayahNumberInSurah: number;
  revealed: boolean;
  selfRating: 'correct' | 'error' | 'hesitation' | null;
};

// Color palette
const COLORS = {
  parchment: '#FDF6E3',
  parchmentDark: '#F5ECD0',
  gold: '#D4AF37',
  goldLight: 'rgba(212,175,55,0.15)',
  goldFaint: 'rgba(212,175,55,0.06)',
  darkGreen: '#0D2818',
  mediumGreen: '#1B4332',
  lightGreen: '#2D6A4F',
  correct: '#10B981',
  correctBg: '#D1FAE5',
  correctBgStrong: '#A7F3D0',
  correctDark: '#065F46',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  errorBgStrong: '#FECACA',
  errorDark: '#991B1B',
  hesitation: '#F59E0B',
  hesitationBg: '#FEF3C7',
  hesitationBgStrong: '#FDE68A',
  hesitationDark: '#92400E',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

export default function SurahScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahNumber = parseInt(id);
  const surah = getSurah(surahNumber);

  const [showTranslation, setShowTranslation] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAyahIndex, setActiveAyahIndex] = useState<number>(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pagerRef = useRef<PagerView>(null);

  // Mode Tartil
  const [tartilMode, setTartilMode] = useState(false);
  const [tartilVerses, setTartilVerses] = useState<TartilVerse[]>([]);
  const [tartilCurrentIndex, setTartilCurrentIndex] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Tartil verse reveal animations (one per verse)
  const tartilRevealAnims = useRef<Animated.Value[]>([]);
  const tartilColorAnims = useRef<Animated.Value[]>([]);
  const tartilCurrentPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!surah) return;
    const firstPage = getFirstPageOfSurah(surahNumber);
    const lastPage = getLastPageOfSurah(surahNumber);
    const pageList: PageData[] = [];
    for (let p = firstPage; p <= lastPage; p++) {
      pageList.push(getPageData(p));
    }
    setPages(pageList);
    markAsLearning();

    // Animation d'entree
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [surahNumber]);

  // Pulse animation pour le verset actif (mushaf mode)
  useEffect(() => {
    if (activeAyahIndex >= 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.015, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeAyahIndex]);

  // Pulse for current tartil verse
  useEffect(() => {
    if (tartilMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tartilCurrentPulse, { toValue: 1.02, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(tartilCurrentPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      tartilCurrentPulse.setValue(1);
    }
  }, [tartilMode, tartilCurrentIndex]);

  const markAsLearning = async () => {
    try {
      const stored = await AsyncStorage.getItem('surahProgress');
      const progress: Record<string, string> = stored ? JSON.parse(stored) : {};
      if (!progress[String(surahNumber)] || progress[String(surahNumber)] === 'not_started') {
        progress[String(surahNumber)] = 'learning';
        await AsyncStorage.setItem('surahProgress', JSON.stringify(progress));
      }
      const reviewDates = await AsyncStorage.getItem('surahReviewDates');
      const dates: Record<string, string> = reviewDates ? JSON.parse(reviewDates) : {};
      dates[String(surahNumber)] = new Date().toISOString();
      await AsyncStorage.setItem('surahReviewDates', JSON.stringify(dates));
    } catch (e) {
      console.error('Erreur sauvegarde progression:', e);
    }
  };

  const playPageAudio = async () => {
    if (!pages[currentPage]) return;

    if (isPlaying && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      setActiveAyahIndex(-1);
      return;
    }

    setIsPlaying(true);
    const pageAyahs = pages[currentPage].ayahs;

    for (let i = 0; i < pageAyahs.length; i++) {
      const ayah = pageAyahs[i];
      setActiveAyahIndex(i);
      try {
        const url = getAudioUrl(ayah.surahNumber, ayah.ayahNumberInSurah);
        const { sound } = await Audio.Sound.createAsync({ uri: url });
        soundRef.current = sound;
        await sound.playAsync();
        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('didJustFinish' in status && status.didJustFinish) {
              resolve();
            }
          });
        });
        await sound.unloadAsync();
      } catch (e) {
        console.error('Erreur audio:', e);
      }
    }
    soundRef.current = null;
    setIsPlaying(false);
    setActiveAyahIndex(-1);
  };

  // ---- Mode Tartil ----
  const enterTartilMode = () => {
    if (!pages[currentPage]) return;
    const verses: TartilVerse[] = pages[currentPage].ayahs.map(a => ({
      surahNumber: a.surahNumber,
      ayahNumberInSurah: a.ayahNumberInSurah,
      revealed: false,
      selfRating: null,
    }));
    // Initialize animations for each verse
    tartilRevealAnims.current = verses.map(() => new Animated.Value(0));
    tartilColorAnims.current = verses.map(() => new Animated.Value(0));
    setTartilVerses(verses);
    setTartilCurrentIndex(0);
    setTartilMode(true);
  };

  const revealTartilVerse = () => {
    if (tartilCurrentIndex >= tartilVerses.length) return;
    const updated = [...tartilVerses];
    updated[tartilCurrentIndex].revealed = true;
    setTartilVerses(updated);

    // Smooth reveal animation
    const anim = tartilRevealAnims.current[tartilCurrentIndex];
    if (anim) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const rateTartilVerse = (rating: 'correct' | 'error' | 'hesitation') => {
    const updated = [...tartilVerses];
    updated[tartilCurrentIndex].selfRating = rating;
    setTartilVerses(updated);

    // Color transition animation
    const colorAnim = tartilColorAnims.current[tartilCurrentIndex];
    if (colorAnim) {
      colorAnim.setValue(0);
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }

    if (tartilCurrentIndex < tartilVerses.length - 1) {
      setTartilCurrentIndex(tartilCurrentIndex + 1);
    }
  };

  const exitTartilMode = () => {
    setTartilMode(false);
    setTartilVerses([]);
    setTartilCurrentIndex(0);
  };

  if (!surah) {
    return (
      <View style={styles.container}>
        <Text>Sourate non trouvee</Text>
      </View>
    );
  }

  const isBismillahSurah = surahNumber !== 9 && surahNumber !== 1;

  // ---- Rendu Mode Tartil ----
  if (tartilMode) {
    const pageAyahs = pages[currentPage]?.ayahs || [];
    const totalVerses = tartilVerses.length;
    const ratedCount = tartilVerses.filter(v => v.selfRating).length;
    const correctCount = tartilVerses.filter(v => v.selfRating === 'correct').length;
    const errorCount = tartilVerses.filter(v => v.selfRating === 'error').length;
    const hesitationCount = tartilVerses.filter(v => v.selfRating === 'hesitation').length;
    const allDone = ratedCount === totalVerses;
    const scorePercent = totalVerses > 0 ? Math.round((correctCount / totalVerses) * 100) : 0;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{
          title: `Tartil - ${surah.nameArabic}`,
          headerStyle: { backgroundColor: COLORS.darkGreen },
          headerTintColor: COLORS.gold,
        }} />

        {/* Progress bar tartil - premium gradient feel */}
        <View style={styles.tartilProgress}>
          <View style={[styles.tartilProgressFill, { width: `${(ratedCount / totalVerses) * 100}%` }]}>
            <View style={styles.tartilProgressSheen} />
          </View>
        </View>

        <ScrollView style={styles.tartilContainer} contentContainerStyle={styles.tartilContent}>
          {/* Islamic border frame top */}
          <View style={styles.mushafFrameTop}>
            <View style={styles.frameCornerLeft}>
              <Text style={styles.frameCornerGlyph}>{'﴾'}</Text>
            </View>
            <View style={styles.frameBorderTop} />
            <View style={styles.frameCornerRight}>
              <Text style={styles.frameCornerGlyph}>{'﴿'}</Text>
            </View>
          </View>

          {/* Header sourate - Calligraphic style */}
          <View style={styles.tartilSurahHeader}>
            <View style={styles.tartilSurahHeaderDecor}>
              <View style={styles.tartilHeaderLine} />
              <View style={styles.tartilHeaderOrnament}>
                <Text style={styles.tartilHeaderOrnamentText}>۞</Text>
              </View>
              <View style={styles.tartilHeaderLine} />
            </View>
            <Text style={styles.tartilSurahName}>{surah.nameArabic}</Text>
            <Text style={styles.tartilSurahSubtitle}>Mode Tartil - Recite de memoire</Text>
            <View style={styles.tartilSurahHeaderDecor}>
              <View style={styles.tartilHeaderLine} />
              <View style={styles.tartilHeaderOrnament}>
                <Text style={styles.tartilHeaderOrnamentText}>۝</Text>
              </View>
              <View style={styles.tartilHeaderLine} />
            </View>
          </View>

          {/* Bismillah in tartil mode */}
          {isBismillahSurah && (
            <View style={styles.tartilBismillah}>
              <Text style={styles.tartilBismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
            </View>
          )}

          {pageAyahs.map((ayah, index) => {
            const verse = tartilVerses[index];
            const isCurrent = index === tartilCurrentIndex;
            const isRevealed = verse?.revealed;
            const rating = verse?.selfRating;

            // Rating-based highlight colors (THE KEY FEATURE - colored background on text)
            let verseBgColor = COLORS.white;
            let textHighlightBg = 'transparent';
            let verseBorderColor = COLORS.border;
            let verseTextColor = COLORS.textPrimary;
            let ratingIconBg = COLORS.mediumGreen;
            let numberBadgeBg = COLORS.mediumGreen;

            if (rating === 'correct') {
              verseBgColor = COLORS.correctBg;
              textHighlightBg = COLORS.correctBgStrong;
              verseBorderColor = COLORS.correct;
              verseTextColor = COLORS.correctDark;
              ratingIconBg = COLORS.correct;
              numberBadgeBg = COLORS.correct;
            } else if (rating === 'error') {
              verseBgColor = COLORS.errorBg;
              textHighlightBg = COLORS.errorBgStrong;
              verseBorderColor = COLORS.error;
              verseTextColor = COLORS.errorDark;
              ratingIconBg = COLORS.error;
              numberBadgeBg = COLORS.error;
            } else if (rating === 'hesitation') {
              verseBgColor = COLORS.hesitationBg;
              textHighlightBg = COLORS.hesitationBgStrong;
              verseBorderColor = COLORS.hesitation;
              verseTextColor = COLORS.hesitationDark;
              ratingIconBg = COLORS.hesitation;
              numberBadgeBg = COLORS.hesitation;
            }

            const revealAnim = tartilRevealAnims.current[index];
            const colorAnim = tartilColorAnims.current[index];

            // Animated background color for smooth transitions
            const animatedBg = colorAnim
              ? colorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.white, verseBgColor],
                })
              : verseBgColor;

            return (
              <Animated.View
                key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}
                style={[
                  styles.tartilVerseCard,
                  isCurrent && !rating && styles.tartilVerseActive,
                  isCurrent && !rating && { transform: [{ scale: tartilCurrentPulse }] },
                  rating && {
                    backgroundColor: verseBgColor,
                    borderColor: verseBorderColor,
                    borderLeftWidth: 5,
                    borderLeftColor: verseBorderColor,
                  },
                ]}
              >
                {/* Verse number badge */}
                <View style={[styles.tartilVerseNumber, { backgroundColor: numberBadgeBg }]}>
                  <Text style={styles.tartilVerseNumberText}>
                    {toArabicNumeral(ayah.ayahNumberInSurah)}
                  </Text>
                </View>

                {/* Rating indicator icon (top right) */}
                {rating && (
                  <View style={[styles.tartilRatingIconBadge, { backgroundColor: ratingIconBg }]}>
                    <Ionicons
                      name={rating === 'correct' ? 'checkmark' : rating === 'error' ? 'close' : 'help'}
                      size={16}
                      color="#fff"
                    />
                  </View>
                )}

                {/* Texte du verset - cache ou visible */}
                {!isRevealed && !rating ? (
                  <View style={styles.tartilHiddenVerse}>
                    {isCurrent ? (
                      <>
                        <View style={styles.tartilHiddenPrompt}>
                          <View style={styles.tartilHiddenDots}>
                            <View style={[styles.tartilDot, styles.tartilDot1]} />
                            <View style={[styles.tartilDot, styles.tartilDot2]} />
                            <View style={[styles.tartilDot, styles.tartilDot3]} />
                          </View>
                          <Text style={styles.tartilHiddenCurrentText}>
                            Recite ce verset puis revele le texte
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.tartilRevealButton} onPress={revealTartilVerse}>
                          <View style={styles.tartilRevealButtonInner}>
                            <Ionicons name="eye-outline" size={20} color="#fff" />
                            <Text style={styles.tartilRevealText}>Reveler le verset</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.tartilHiddenLocked}>
                        <Ionicons name="lock-closed" size={18} color={COLORS.textMuted} />
                        <Text style={styles.tartilHiddenLockedText}>Verset cache</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Animated.View
                    style={[
                      styles.tartilRevealedVerse,
                      revealAnim && {
                        opacity: rating ? 1 : revealAnim,
                        transform: [{
                          translateY: rating ? 0 : revealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        }],
                      },
                    ]}
                  >
                    {/* THE KEY FEATURE: Colored background highlight strip on the Arabic text */}
                    <View style={[
                      styles.tartilTextHighlight,
                      rating && {
                        backgroundColor: textHighlightBg,
                        borderRadius: 8,
                      },
                    ]}>
                      <Text style={[
                        styles.tartilAyahText,
                        { color: verseTextColor },
                        rating === 'error' && styles.tartilAyahTextError,
                        rating === 'correct' && styles.tartilAyahTextCorrect,
                        rating === 'hesitation' && styles.tartilAyahTextHesitation,
                      ]}>
                        {ayah.text}
                        <Text style={[styles.tartilAyahNumber, rating && { color: verseBorderColor }]}>
                          {' '}﴿{toArabicNumeral(ayah.ayahNumberInSurah)}﴾
                        </Text>
                      </Text>
                    </View>

                    {/* Rating label strip under text */}
                    {rating && (
                      <View style={[styles.tartilRatingStrip, { backgroundColor: verseBorderColor }]}>
                        <Ionicons
                          name={rating === 'correct' ? 'checkmark-circle' : rating === 'error' ? 'close-circle' : 'help-circle'}
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.tartilRatingStripText}>
                          {rating === 'correct' ? 'Parfait' : rating === 'error' ? 'Erreur' : 'Hesitation'}
                        </Text>
                      </View>
                    )}

                    {/* Boutons d'evaluation si pas encore note */}
                    {!rating && isCurrent && (
                      <View style={styles.tartilRatingButtons}>
                        <View style={styles.tartilRatingDivider} />
                        <Text style={styles.tartilRatingLabel}>Comment as-tu recite ?</Text>
                        <View style={styles.tartilRatingRow}>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingCorrect]}
                            onPress={() => rateTartilVerse('correct')}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Parfait</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingHesitation]}
                            onPress={() => rateTartilVerse('hesitation')}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="help-circle" size={24} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Hesitation</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingError]}
                            onPress={() => rateTartilVerse('error')}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close-circle" size={24} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Erreur</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}

          {/* Resume si tout est termine */}
          {allDone && (
            <View style={styles.tartilSummary}>
              {/* Score circle */}
              <View style={styles.tartilScoreCircle}>
                <Text style={styles.tartilScorePercent}>{scorePercent}%</Text>
                <Text style={styles.tartilScoreLabel}>Score</Text>
              </View>

              <Text style={styles.tartilSummaryTitle}>Resultats du Tartil</Text>

              <View style={styles.tartilSummaryStats}>
                <View style={[styles.tartilSummaryStat, { backgroundColor: COLORS.correctBg }]}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.correct} />
                  <Text style={[styles.tartilSummaryNumber, { color: COLORS.correctDark }]}>{correctCount}</Text>
                  <Text style={styles.tartilSummaryLabel}>Parfait</Text>
                </View>
                <View style={[styles.tartilSummaryStat, { backgroundColor: COLORS.hesitationBg }]}>
                  <Ionicons name="help-circle" size={28} color={COLORS.hesitation} />
                  <Text style={[styles.tartilSummaryNumber, { color: COLORS.hesitationDark }]}>{hesitationCount}</Text>
                  <Text style={styles.tartilSummaryLabel}>Hesitations</Text>
                </View>
                <View style={[styles.tartilSummaryStat, { backgroundColor: COLORS.errorBg }]}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                  <Text style={[styles.tartilSummaryNumber, { color: COLORS.errorDark }]}>{errorCount}</Text>
                  <Text style={styles.tartilSummaryLabel}>Erreurs</Text>
                </View>
              </View>

              {/* Visual score bar */}
              <View style={styles.tartilScoreBar}>
                {tartilVerses.map((v, i) => (
                  <View
                    key={i}
                    style={[
                      styles.tartilScoreDot,
                      {
                        backgroundColor: v.selfRating === 'correct' ? COLORS.correct :
                          v.selfRating === 'error' ? COLORS.error : COLORS.hesitation
                      }
                    ]}
                  />
                ))}
              </View>

              <View style={styles.tartilSummaryActions}>
                <TouchableOpacity style={styles.tartilRetryBtn} onPress={enterTartilMode} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.tartilRetryText}>Recommencer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tartilExitBtn} onPress={exitTartilMode} activeOpacity={0.8}>
                  <Text style={styles.tartilExitText}>Retour au Mushaf</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Islamic border frame bottom */}
          <View style={styles.mushafFrameBottom}>
            <View style={styles.frameCornerLeft}>
              <Text style={styles.frameCornerGlyph}>{'﴾'}</Text>
            </View>
            <View style={styles.frameBorderTop} />
            <View style={styles.frameCornerRight}>
              <Text style={styles.frameCornerGlyph}>{'﴿'}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Barre du bas Tartil - Premium */}
        <View style={styles.tartilBottomBar}>
          <TouchableOpacity style={styles.tartilBottomQuitBtn} onPress={exitTartilMode} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.tartilBottomQuitText}>Quitter</Text>
          </TouchableOpacity>

          <View style={styles.tartilBottomCenter}>
            <View style={styles.tartilBottomProgressPill}>
              <Text style={styles.tartilBottomProgressText}>
                {ratedCount}/{totalVerses}
              </Text>
            </View>
            <Text style={styles.tartilBottomProgressLabel}>versets evalues</Text>
          </View>

          <View style={styles.tartilBottomStats}>
            <View style={styles.tartilBottomStatItem}>
              <View style={[styles.tartilBottomStatDot, { backgroundColor: COLORS.correct }]} />
              <Text style={styles.tartilBottomStatNum}>{correctCount}</Text>
            </View>
            <View style={styles.tartilBottomStatItem}>
              <View style={[styles.tartilBottomStatDot, { backgroundColor: COLORS.hesitation }]} />
              <Text style={styles.tartilBottomStatNum}>{hesitationCount}</Text>
            </View>
            <View style={styles.tartilBottomStatItem}>
              <View style={[styles.tartilBottomStatDot, { backgroundColor: COLORS.error }]} />
              <Text style={styles.tartilBottomStatNum}>{errorCount}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ---- Rendu Mushaf Tarteel ----
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: COLORS.darkGreen },
          headerTintColor: COLORS.gold,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={enterTartilMode} style={styles.headerBtn}>
                <Ionicons name="mic-outline" size={22} color={COLORS.gold} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTranslation(!showTranslation)} style={styles.headerBtn}>
                <Ionicons name="language" size={22} color={showTranslation ? COLORS.gold : 'rgba(212,175,55,0.4)'} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Mushaf pages - Tarteel Style */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => {
          setCurrentPage(e.nativeEvent.position);
          setActiveAyahIndex(-1);
        }}
      >
        {pages.map((page, pageIndex) => (
          <ScrollView key={page.pageNumber} style={styles.page} contentContainerStyle={styles.pageContent}>
            {/* Islamic frame border */}
            <View style={styles.mushafFrame}>
              {/* Frame top border with ornaments */}
              <View style={styles.mushafFrameTop}>
                <View style={styles.frameCornerLeft}>
                  <Text style={styles.frameCornerGlyph}>{'﴾'}</Text>
                </View>
                <View style={styles.frameBorderTop} />
                <View style={styles.frameOrnamentCenter}>
                  <Text style={styles.frameOrnamentText}>۞</Text>
                </View>
                <View style={styles.frameBorderTop} />
                <View style={styles.frameCornerRight}>
                  <Text style={styles.frameCornerGlyph}>{'﴿'}</Text>
                </View>
              </View>

              {/* Left and right border lines */}
              <View style={styles.mushafFrameContent}>
                <View style={styles.frameBorderLeft} />

                <View style={styles.mushafInner}>
                  {/* Header page - Style Tarteel */}
                  <View style={styles.pageHeader}>
                    <View style={styles.pageHeaderLeft}>
                      <Text style={styles.juzBadge}>
                        الجزء {toArabicNumeral(page.ayahs[0]?.surahNumber ? getSurah(page.ayahs[0].surahNumber)?.ayahs.find(a => a.page === page.pageNumber)?.juz || 1 : 1)}
                      </Text>
                    </View>
                    <Text style={styles.surahHeaderText}>{page.ayahs[0]?.surahNameArabic}</Text>
                    <View style={styles.pageHeaderRight}>
                      <Text style={styles.pageNumberHeader}>{toArabicNumeral(page.pageNumber)}</Text>
                    </View>
                  </View>

                  {/* Bismillah ornementale - Calligraphic header */}
                  {pageIndex === 0 && isBismillahSurah && (
                    <View style={styles.bismillahContainer}>
                      <View style={styles.bismillahDecorLine} />
                      <View style={styles.bismillahContent}>
                        <Text style={styles.bismillahStar}>۝</Text>
                        <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                        <Text style={styles.bismillahStar}>۝</Text>
                      </View>
                      <View style={styles.bismillahDecorLine} />
                    </View>
                  )}

                  {/* Titre de la sourate si premiere page */}
                  {pageIndex === 0 && (
                    <View style={styles.surahTitleContainer}>
                      <View style={styles.surahTitleFrame}>
                        <View style={styles.surahTitleOrnamentRow}>
                          <View style={styles.surahTitleLine} />
                          <Text style={styles.surahTitleOrnament}>۩</Text>
                          <View style={styles.surahTitleLine} />
                        </View>
                        <View style={styles.surahTitleContent}>
                          <Text style={styles.surahTitleArabic}>{surah.nameArabic}</Text>
                          <Text style={styles.surahTitleFrench}>{surah.nameFrench}</Text>
                          <Text style={styles.surahTitleMeta}>
                            {surah.ayahCount} versets · {surah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Medinoise'}
                          </Text>
                        </View>
                        <View style={styles.surahTitleOrnamentRow}>
                          <View style={styles.surahTitleLine} />
                          <Text style={styles.surahTitleOrnament}>۩</Text>
                          <View style={styles.surahTitleLine} />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Versets - Style Tarteel avec surlignage */}
                  <View style={styles.ayahsContainer}>
                    {page.ayahs.map((ayah, ayahIndex) => {
                      const isActive = isPlaying && ayahIndex === activeAyahIndex;
                      return (
                        <Animated.View
                          key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}
                          style={[
                            styles.ayahWrapper,
                            isActive && styles.ayahActive,
                            isActive && { transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => playSpecificAyah(ayah.surahNumber, ayah.ayahNumberInSurah, ayahIndex)}
                            style={styles.ayahTouchable}
                          >
                            <Text style={[styles.ayahText, isActive && styles.ayahTextActive]}>
                              {ayah.text}
                              <Text style={[styles.ayahNumber, isActive && styles.ayahNumberActive]}>
                                {' '}﴿{toArabicNumeral(ayah.ayahNumberInSurah)}﴾{' '}
                              </Text>
                            </Text>
                          </TouchableOpacity>

                          {showTranslation && (
                            <View style={styles.translationContainer}>
                              <View style={styles.translationBar} />
                              <Text style={styles.translationText}>{ayah.translationFr}</Text>
                            </View>
                          )}

                          {/* Gold ornamental separator between ayahs */}
                          {ayahIndex < page.ayahs.length - 1 && (
                            <View style={styles.ayahSeparator}>
                              <View style={styles.ayahSeparatorLine} />
                              <Text style={styles.ayahSeparatorDot}>۝</Text>
                              <View style={styles.ayahSeparatorLine} />
                            </View>
                          )}
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.frameBorderRight} />
              </View>

              {/* Frame bottom border with page number */}
              <View style={styles.mushafFrameBottom}>
                <View style={styles.frameCornerLeft}>
                  <Text style={styles.frameCornerGlyph}>{'﴾'}</Text>
                </View>
                <View style={styles.frameBorderTop} />
                <View style={styles.frameOrnamentCenter}>
                  <Text style={styles.pageNumberBottom}>{page.pageNumber}</Text>
                </View>
                <View style={styles.frameBorderTop} />
                <View style={styles.frameCornerRight}>
                  <Text style={styles.frameCornerGlyph}>{'﴿'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        ))}
      </PagerView>

      {/* Bottom bar - Premium Tarteel style */}
      <View style={styles.bottomBar}>
        {/* Play button with glow */}
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={playPageAudio}
          activeOpacity={0.8}
        >
          <View style={styles.playButtonInner}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Tartil button */}
        <TouchableOpacity style={styles.tartilButton} onPress={enterTartilMode} activeOpacity={0.8}>
          <View style={styles.tartilButtonGlow} />
          <Ionicons name="mic" size={18} color={COLORS.gold} />
          <Text style={styles.tartilButtonText}>Tartil</Text>
        </TouchableOpacity>

        {/* Quiz button */}
        <TouchableOpacity
          style={styles.quizButton}
          onPress={() => router.push(`/quiz/${surahNumber}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="school" size={18} color="#fff" />
          <Text style={styles.quizButtonText}>Quiz</Text>
        </TouchableOpacity>

        {/* Page indicator pill */}
        <View style={styles.pageIndicatorContainer}>
          <Text style={styles.pageIndicator}>
            {currentPage + 1}/{pages.length}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // Lecture d'un verset specifique
  async function playSpecificAyah(surahNum: number, ayahNum: number, index: number) {
    if (isPlaying) return;
    setIsPlaying(true);
    setActiveAyahIndex(index);
    try {
      const url = getAudioUrl(surahNum, ayahNum);
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            resolve();
          }
        });
      });
      await sound.unloadAsync();
    } catch (e) {
      console.error('Erreur audio:', e);
    }
    soundRef.current = null;
    setIsPlaying(false);
    setActiveAyahIndex(-1);
  }
}

// Convertir un nombre en chiffres arabes
function toArabicNumeral(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).split('').map(d => arabicDigits[parseInt(d)]).join('');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  pager: { flex: 1 },
  page: { flex: 1, backgroundColor: COLORS.parchment },
  pageContent: {
    paddingHorizontal: 6,
    paddingBottom: 20,
    paddingTop: 8,
  },

  // Header actions
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 8 },
  headerBtn: { padding: 6 },

  // ======= MUSHAF FRAME (Islamic border) =======
  mushafFrame: {
    borderWidth: 0,
    margin: 4,
  },
  mushafFrameTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  mushafFrameBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  mushafFrameContent: {
    flexDirection: 'row',
  },
  mushafInner: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  frameBorderLeft: {
    width: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.25,
    borderRadius: 1,
  },
  frameBorderRight: {
    width: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.25,
    borderRadius: 1,
  },
  frameBorderTop: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
  },
  frameCornerLeft: {
    width: 24,
    alignItems: 'center',
  },
  frameCornerRight: {
    width: 24,
    alignItems: 'center',
  },
  frameCornerGlyph: {
    fontSize: 16,
    color: COLORS.gold,
    opacity: 0.6,
  },
  frameOrnamentCenter: {
    marginHorizontal: 8,
  },
  frameOrnamentText: {
    fontSize: 18,
    color: COLORS.gold,
    opacity: 0.7,
  },

  // ======= PAGE HEADER =======
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.goldFaint,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
  },
  pageHeaderLeft: { flex: 1, alignItems: 'flex-start' },
  pageHeaderRight: { flex: 1, alignItems: 'flex-end' },
  juzBadge: { fontSize: 14, color: COLORS.mediumGreen, fontWeight: '600' },
  surahHeaderText: { fontSize: 22, color: COLORS.darkGreen, fontWeight: '700' },
  pageNumberHeader: { fontSize: 14, color: '#8B7355', fontWeight: '500' },

  // ======= BISMILLAH - Calligraphic =======
  bismillahContainer: {
    marginVertical: 18,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bismillahDecorLine: {
    width: '70%',
    height: 1.5,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
  },
  bismillahContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  bismillahStar: {
    fontSize: 16,
    color: COLORS.gold,
    opacity: 0.7,
  },
  bismillah: {
    fontSize: 28,
    textAlign: 'center',
    color: COLORS.darkGreen,
    lineHeight: 50,
    fontWeight: '500',
  },

  // ======= SURAH TITLE =======
  surahTitleContainer: { marginBottom: 22, alignItems: 'center' },
  surahTitleFrame: { alignItems: 'center', width: '88%' },
  surahTitleOrnamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  surahTitleLine: { flex: 1, height: 1.5, backgroundColor: COLORS.gold, opacity: 0.35 },
  surahTitleOrnament: {
    fontSize: 16,
    color: COLORS.gold,
    marginHorizontal: 10,
    opacity: 0.7,
  },
  surahTitleContent: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: COLORS.goldFaint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    marginVertical: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  surahTitleArabic: { fontSize: 32, fontWeight: '700', color: COLORS.darkGreen, marginBottom: 6 },
  surahTitleFrench: { fontSize: 17, color: '#374151', fontWeight: '500' },
  surahTitleMeta: { fontSize: 13, color: '#8B7355', marginTop: 6 },

  // ======= AYAHS - Mushaf Style =======
  ayahsContainer: { paddingHorizontal: 2 },
  ayahWrapper: {
    marginBottom: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ayahActive: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.correct,
    borderRadius: 10,
  },
  ayahTouchable: { paddingVertical: 2 },
  ayahText: {
    fontSize: 26,
    lineHeight: 56,
    color: COLORS.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  ayahTextActive: {
    color: COLORS.correctDark,
    fontWeight: '600',
  },
  ayahNumber: {
    fontSize: 15,
    color: COLORS.gold,
    fontWeight: '700',
  },
  ayahNumberActive: {
    color: COLORS.correct,
  },

  // Gold ornamental separator between ayahs
  ayahSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 20,
    opacity: 0.5,
  },
  ayahSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.4,
  },
  ayahSeparatorDot: {
    fontSize: 12,
    color: COLORS.gold,
    marginHorizontal: 8,
  },

  // Traduction
  translationContainer: {
    flexDirection: 'row',
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  translationBar: {
    width: 3,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
    marginRight: 12,
    opacity: 0.4,
  },
  translationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    flex: 1,
    fontStyle: 'italic',
  },

  // Page number
  pageNumberBottom: {
    fontSize: 15,
    color: COLORS.gold,
    marginHorizontal: 12,
    fontWeight: '600',
  },

  // ======= BOTTOM BAR - Premium =======
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGreen,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
    overflow: 'hidden',
  },
  playButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: COLORS.mediumGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    borderColor: COLORS.correct,
  },
  tartilButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    gap: 6,
    overflow: 'hidden',
  },
  tartilButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  tartilButtonText: { color: COLORS.gold, fontWeight: '700', fontSize: 14 },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    marginLeft: 'auto',
    backgroundColor: COLORS.mediumGreen,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quizButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pageIndicatorContainer: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pageIndicator: { fontSize: 13, color: COLORS.gold, fontWeight: '600' },

  // ======= TARTIL MODE STYLES =======
  tartilProgress: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tartilProgressFill: {
    height: '100%',
    backgroundColor: COLORS.correct,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tartilProgressSheen: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  tartilContainer: { flex: 1, backgroundColor: COLORS.parchment },
  tartilContent: { padding: 14, paddingBottom: 40 },

  // Tartil surah header - ornamental
  tartilSurahHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.goldFaint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tartilSurahHeaderDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 6,
  },
  tartilHeaderLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
  },
  tartilHeaderOrnament: {
    marginHorizontal: 10,
  },
  tartilHeaderOrnamentText: {
    fontSize: 16,
    color: COLORS.gold,
    opacity: 0.7,
  },
  tartilSurahName: { fontSize: 30, fontWeight: '700', color: COLORS.darkGreen, marginVertical: 6 },
  tartilSurahSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  // Tartil bismillah
  tartilBismillah: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
  },
  tartilBismillahText: {
    fontSize: 24,
    color: COLORS.darkGreen,
    lineHeight: 44,
    opacity: 0.7,
  },

  // Tartil verse card
  tartilVerseCard: {
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tartilVerseActive: {
    borderColor: COLORS.gold,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tartilVerseNumber: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.mediumGreen,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tartilVerseNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Rating icon badge (top right)
  tartilRatingIconBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  // Hidden verse
  tartilHiddenVerse: {
    padding: 28,
    paddingLeft: 48,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  tartilHiddenPrompt: {
    alignItems: 'center',
  },
  tartilHiddenDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tartilDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    opacity: 0.4,
  },
  tartilDot1: { opacity: 0.3 },
  tartilDot2: { opacity: 0.5 },
  tartilDot3: { opacity: 0.7 },
  tartilHiddenCurrentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tartilRevealButton: {
    marginTop: 14,
    borderRadius: 24,
    overflow: 'hidden',
  },
  tartilRevealButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tartilRevealText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  tartilHiddenLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.5,
  },
  tartilHiddenLockedText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Revealed verse
  tartilRevealedVerse: { padding: 18, paddingLeft: 48, paddingTop: 14 },

  // THE KEY FEATURE: Text highlight background
  tartilTextHighlight: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tartilAyahText: {
    fontSize: 24,
    lineHeight: 50,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: COLORS.textPrimary,
  },
  tartilAyahTextError: {
    // Red text background is handled by parent container backgroundColor
    fontWeight: '500',
  },
  tartilAyahTextCorrect: {
    fontWeight: '500',
  },
  tartilAyahTextHesitation: {
    fontWeight: '500',
  },
  tartilAyahNumber: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '700',
  },

  // Rating strip label under text
  tartilRatingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginTop: 8,
  },
  tartilRatingStripText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Rating buttons
  tartilRatingButtons: { marginTop: 14 },
  tartilRatingDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  tartilRatingLabel: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12, fontWeight: '500' },
  tartilRatingRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  tartilRatingBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
    minWidth: 85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tartilRatingCorrect: { backgroundColor: COLORS.correct },
  tartilRatingHesitation: { backgroundColor: COLORS.hesitation },
  tartilRatingError: { backgroundColor: COLORS.error },
  tartilRatingBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ======= TARTIL SUMMARY =======
  tartilSummary: {
    marginTop: 28,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tartilScoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.goldFaint,
    borderWidth: 3,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tartilScorePercent: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.darkGreen,
  },
  tartilScoreLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: -2,
  },
  tartilSummaryTitle: { fontSize: 22, fontWeight: '700', color: COLORS.darkGreen, marginBottom: 20 },
  tartilSummaryStats: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  tartilSummaryStat: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 85,
  },
  tartilSummaryNumber: { fontSize: 26, fontWeight: '800', marginTop: 6 },
  tartilSummaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, fontWeight: '500' },
  tartilScoreBar: { flexDirection: 'row', gap: 5, marginVertical: 16 },
  tartilScoreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tartilSummaryActions: { flexDirection: 'row', gap: 14, marginTop: 12 },
  tartilRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mediumGreen,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tartilRetryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tartilExitBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tartilExitText: { color: '#374151', fontWeight: '600', fontSize: 16 },

  // ======= TARTIL BOTTOM BAR - Premium =======
  tartilBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tartilBottomQuitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tartilBottomQuitText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  tartilBottomCenter: {
    alignItems: 'center',
  },
  tartilBottomProgressPill: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tartilBottomProgressText: {
    color: COLORS.gold,
    fontWeight: '700',
    fontSize: 15,
  },
  tartilBottomProgressLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  tartilBottomStats: {
    flexDirection: 'row',
    gap: 10,
  },
  tartilBottomStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tartilBottomStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tartilBottomStatNum: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
