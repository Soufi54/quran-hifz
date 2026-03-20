import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Easing } from 'react-native';
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

  // Pulse animation pour le verset actif
  useEffect(() => {
    if (activeAyahIndex >= 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeAyahIndex]);

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
    setTartilVerses(verses);
    setTartilCurrentIndex(0);
    setTartilMode(true);
  };

  const revealTartilVerse = () => {
    if (tartilCurrentIndex >= tartilVerses.length) return;
    const updated = [...tartilVerses];
    updated[tartilCurrentIndex].revealed = true;
    setTartilVerses(updated);
  };

  const rateTartilVerse = (rating: 'correct' | 'error' | 'hesitation') => {
    const updated = [...tartilVerses];
    updated[tartilCurrentIndex].selfRating = rating;
    setTartilVerses(updated);

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
    const allDone = ratedCount === totalVerses;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: `Tartil - ${surah.nameArabic}`, headerStyle: { backgroundColor: '#0D2818' } }} />

        {/* Progress bar tartil */}
        <View style={styles.tartilProgress}>
          <View style={[styles.tartilProgressFill, { width: `${(ratedCount / totalVerses) * 100}%` }]} />
        </View>

        <ScrollView style={styles.tartilContainer} contentContainerStyle={styles.tartilContent}>
          {/* Header sourate */}
          <View style={styles.tartilSurahHeader}>
            <Text style={styles.tartilSurahName}>{surah.nameArabic}</Text>
            <Text style={styles.tartilSurahSubtitle}>Mode Tartil - Recite de memoire</Text>
          </View>

          {pageAyahs.map((ayah, index) => {
            const verse = tartilVerses[index];
            const isCurrent = index === tartilCurrentIndex;
            const isRevealed = verse?.revealed;
            const rating = verse?.selfRating;

            // Couleur de fond selon la note
            let verseBg = 'transparent';
            let verseBorder = 'transparent';
            let verseTextColor = '#1A1A1A';

            if (rating === 'correct') {
              verseBg = '#ECFDF5';
              verseBorder = '#10B981';
              verseTextColor = '#065F46';
            } else if (rating === 'error') {
              verseBg = '#FEF2F2';
              verseBorder = '#EF4444';
              verseTextColor = '#991B1B';
            } else if (rating === 'hesitation') {
              verseBg = '#FFFBEB';
              verseBorder = '#F59E0B';
              verseTextColor = '#92400E';
            }

            return (
              <View key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`} style={[
                styles.tartilVerseCard,
                isCurrent && styles.tartilVerseActive,
                rating && { backgroundColor: verseBg, borderColor: verseBorder },
              ]}>
                {/* Numero du verset */}
                <View style={[styles.tartilVerseNumber, rating && { backgroundColor: verseBorder || '#1B4332' }]}>
                  <Text style={styles.tartilVerseNumberText}>{ayah.ayahNumberInSurah}</Text>
                </View>

                {/* Texte du verset - cache ou visible */}
                {!isRevealed && !rating ? (
                  <View style={styles.tartilHiddenVerse}>
                    <Text style={styles.tartilHiddenText}>
                      {isCurrent ? '👆 Recite ce verset puis revele' : '🔒 Verset cache'}
                    </Text>
                    {isCurrent && (
                      <TouchableOpacity style={styles.tartilRevealButton} onPress={revealTartilVerse}>
                        <Ionicons name="eye-outline" size={18} color="#fff" />
                        <Text style={styles.tartilRevealText}>Reveler</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.tartilRevealedVerse}>
                    <Text style={[styles.tartilAyahText, { color: verseTextColor }]}>
                      {ayah.text}
                    </Text>

                    {/* Boutons d'evaluation si pas encore note */}
                    {!rating && isCurrent && (
                      <View style={styles.tartilRatingButtons}>
                        <Text style={styles.tartilRatingLabel}>Comment as-tu recite ?</Text>
                        <View style={styles.tartilRatingRow}>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingCorrect]}
                            onPress={() => rateTartilVerse('correct')}
                          >
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Parfait</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingHesitation]}
                            onPress={() => rateTartilVerse('hesitation')}
                          >
                            <Ionicons name="help-circle" size={22} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Hesitation</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tartilRatingBtn, styles.tartilRatingError]}
                            onPress={() => rateTartilVerse('error')}
                          >
                            <Ionicons name="close-circle" size={22} color="#fff" />
                            <Text style={styles.tartilRatingBtnText}>Erreur</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Icone de notation */}
                    {rating && (
                      <View style={styles.tartilRatingIcon}>
                        <Ionicons
                          name={rating === 'correct' ? 'checkmark-circle' : rating === 'error' ? 'close-circle' : 'help-circle'}
                          size={24}
                          color={rating === 'correct' ? '#10B981' : rating === 'error' ? '#EF4444' : '#F59E0B'}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Resume si tout est termine */}
          {allDone && (
            <View style={styles.tartilSummary}>
              <Text style={styles.tartilSummaryTitle}>Resultats du Tartil</Text>
              <View style={styles.tartilSummaryStats}>
                <View style={styles.tartilSummaryStat}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <Text style={styles.tartilSummaryNumber}>{correctCount}</Text>
                  <Text style={styles.tartilSummaryLabel}>Parfait</Text>
                </View>
                <View style={styles.tartilSummaryStat}>
                  <Ionicons name="help-circle" size={28} color="#F59E0B" />
                  <Text style={styles.tartilSummaryNumber}>
                    {tartilVerses.filter(v => v.selfRating === 'hesitation').length}
                  </Text>
                  <Text style={styles.tartilSummaryLabel}>Hesitations</Text>
                </View>
                <View style={styles.tartilSummaryStat}>
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
                  <Text style={styles.tartilSummaryNumber}>{errorCount}</Text>
                  <Text style={styles.tartilSummaryLabel}>Erreurs</Text>
                </View>
              </View>

              {/* Score visuel */}
              <View style={styles.tartilScoreBar}>
                {tartilVerses.map((v, i) => (
                  <View
                    key={i}
                    style={[
                      styles.tartilScoreDot,
                      {
                        backgroundColor: v.selfRating === 'correct' ? '#10B981' :
                          v.selfRating === 'error' ? '#EF4444' : '#F59E0B'
                      }
                    ]}
                  />
                ))}
              </View>

              <View style={styles.tartilSummaryActions}>
                <TouchableOpacity style={styles.tartilRetryBtn} onPress={enterTartilMode}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.tartilRetryText}>Recommencer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tartilExitBtn} onPress={exitTartilMode}>
                  <Text style={styles.tartilExitText}>Retour au Mushaf</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barre du bas Tartil */}
        <View style={styles.tartilBottomBar}>
          <TouchableOpacity style={styles.tartilBottomBtn} onPress={exitTartilMode}>
            <Ionicons name="close" size={22} color="#EF4444" />
            <Text style={styles.tartilBottomBtnText}>Quitter</Text>
          </TouchableOpacity>
          <Text style={styles.tartilBottomProgress}>{ratedCount}/{totalVerses} versets</Text>
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
          headerStyle: { backgroundColor: '#0D2818' },
          headerTintColor: '#D4AF37',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={enterTartilMode} style={styles.headerBtn}>
                <Ionicons name="mic-outline" size={22} color="#D4AF37" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTranslation(!showTranslation)} style={styles.headerBtn}>
                <Ionicons name="language" size={22} color={showTranslation ? '#D4AF37' : 'rgba(212,175,55,0.4)'} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Mushaf pages - Style Tarteel */}
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
            {/* Bordure ornementale superieure */}
            <View style={styles.ornamentTop}>
              <View style={styles.ornamentLine} />
              <View style={styles.ornamentDiamond}>
                <Text style={styles.ornamentText}>۞</Text>
              </View>
              <View style={styles.ornamentLine} />
            </View>

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

            {/* Bismillah ornementale */}
            {pageIndex === 0 && isBismillahSurah && (
              <View style={styles.bismillahContainer}>
                <View style={styles.bismillahDecor}>
                  <View style={styles.bismillahLine} />
                  <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                  <View style={styles.bismillahLine} />
                </View>
              </View>
            )}

            {/* Titre de la sourate si premiere page */}
            {pageIndex === 0 && (
              <View style={styles.surahTitleContainer}>
                <View style={styles.surahTitleFrame}>
                  <View style={styles.surahTitleLine} />
                  <View style={styles.surahTitleContent}>
                    <Text style={styles.surahTitleArabic}>{surah.nameArabic}</Text>
                    <Text style={styles.surahTitleFrench}>{surah.nameFrench}</Text>
                    <Text style={styles.surahTitleMeta}>
                      {surah.ayahCount} versets · {surah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Medinoise'}
                    </Text>
                  </View>
                  <View style={styles.surahTitleLine} />
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
                  </Animated.View>
                );
              })}
            </View>

            {/* Bordure ornementale inferieure */}
            <View style={styles.ornamentBottom}>
              <View style={styles.ornamentLine} />
              <Text style={styles.pageNumberBottom}>{page.pageNumber}</Text>
              <View style={styles.ornamentLine} />
            </View>
          </ScrollView>
        ))}
      </PagerView>

      {/* Bottom bar - Style Tarteel premium */}
      <View style={styles.bottomBar}>
        {/* Bouton play/pause */}
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={playPageAudio}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
        </TouchableOpacity>

        {/* Bouton Tartil */}
        <TouchableOpacity style={styles.tartilButton} onPress={enterTartilMode}>
          <Ionicons name="mic" size={20} color="#D4AF37" />
          <Text style={styles.tartilButtonText}>Tartil</Text>
        </TouchableOpacity>

        {/* Bouton Quiz */}
        <TouchableOpacity
          style={styles.quizButton}
          onPress={() => router.push(`/quiz/${surahNumber}`)}
        >
          <Ionicons name="school" size={20} color="#fff" />
          <Text style={styles.quizButtonText}>Quiz</Text>
        </TouchableOpacity>

        {/* Page indicator */}
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
  container: { flex: 1, backgroundColor: '#FEFBF3' },
  pager: { flex: 1 },
  page: { flex: 1 },
  pageContent: { paddingHorizontal: 12, paddingBottom: 40, paddingTop: 8 },

  // Header actions
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 8 },
  headerBtn: { padding: 4 },

  // Ornements
  ornamentTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8 },
  ornamentBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 8 },
  ornamentLine: { flex: 1, height: 1.5, backgroundColor: '#D4AF37', opacity: 0.4 },
  ornamentDiamond: { marginHorizontal: 12 },
  ornamentText: { fontSize: 18, color: '#D4AF37' },

  // Page header - style Tarteel
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13,40,24,0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  pageHeaderLeft: { flex: 1, alignItems: 'flex-start' },
  pageHeaderRight: { flex: 1, alignItems: 'flex-end' },
  juzBadge: { fontSize: 13, color: '#1B4332', fontWeight: '500' },
  surahHeaderText: { fontSize: 20, color: '#0D2818', fontWeight: '700' },
  pageNumberHeader: { fontSize: 13, color: '#8B7355' },

  // Bismillah ornementale
  bismillahContainer: { marginVertical: 16, alignItems: 'center' },
  bismillahDecor: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 8 },
  bismillahLine: { flex: 1, height: 1, backgroundColor: '#D4AF37', opacity: 0.3 },
  bismillah: {
    fontSize: 24,
    textAlign: 'center',
    color: '#0D2818',
    marginHorizontal: 16,
    lineHeight: 44,
  },

  // Titre de la sourate
  surahTitleContainer: { marginBottom: 20, alignItems: 'center' },
  surahTitleFrame: { alignItems: 'center', width: '85%' },
  surahTitleLine: { width: '60%', height: 1.5, backgroundColor: '#D4AF37', opacity: 0.5 },
  surahTitleContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    marginVertical: 8,
    width: '100%',
  },
  surahTitleArabic: { fontSize: 28, fontWeight: '700', color: '#0D2818', marginBottom: 4 },
  surahTitleFrench: { fontSize: 16, color: '#374151', fontWeight: '500' },
  surahTitleMeta: { fontSize: 12, color: '#8B7355', marginTop: 4 },

  // Versets - Style Tarteel
  ayahsContainer: { paddingHorizontal: 4 },
  ayahWrapper: {
    marginBottom: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ayahActive: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  ayahTouchable: { paddingVertical: 2 },
  ayahText: {
    fontSize: 24,
    lineHeight: 52,
    color: '#1A1A1A',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  ayahTextActive: {
    color: '#065F46',
    fontWeight: '600',
  },
  ayahNumber: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
  ayahNumberActive: {
    color: '#10B981',
  },

  // Traduction
  translationContainer: {
    flexDirection: 'row',
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  translationBar: {
    width: 2.5,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    marginRight: 12,
    opacity: 0.5,
  },
  translationText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
  },

  // Page number
  pageNumberBottom: {
    fontSize: 14,
    color: '#D4AF37',
    marginHorizontal: 12,
    fontWeight: '500',
  },

  // Bottom bar - Premium
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B4332',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  playButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tartilButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    gap: 6,
  },
  tartilButtonText: { color: '#D4AF37', fontWeight: '600', fontSize: 14 },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B4332',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginLeft: 'auto',
  },
  quizButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pageIndicatorContainer: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicator: { fontSize: 12, color: '#D4AF37', fontWeight: '500' },

  // ---- Styles Mode Tartil ----
  tartilProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tartilProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  tartilContainer: { flex: 1, backgroundColor: '#FEFBF3' },
  tartilContent: { padding: 16, paddingBottom: 40 },
  tartilSurahHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(13,40,24,0.05)',
    borderRadius: 12,
  },
  tartilSurahName: { fontSize: 26, fontWeight: '700', color: '#0D2818' },
  tartilSurahSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  tartilVerseCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tartilVerseActive: {
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tartilVerseNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1B4332',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tartilVerseNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  tartilHiddenVerse: {
    padding: 24,
    paddingLeft: 44,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  tartilHiddenText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  tartilRevealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 12,
  },
  tartilRevealText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  tartilRevealedVerse: { padding: 16, paddingLeft: 44 },
  tartilAyahText: {
    fontSize: 22,
    lineHeight: 44,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  tartilRatingButtons: { marginTop: 16 },
  tartilRatingLabel: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 10 },
  tartilRatingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  tartilRatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tartilRatingCorrect: { backgroundColor: '#10B981' },
  tartilRatingHesitation: { backgroundColor: '#F59E0B' },
  tartilRatingError: { backgroundColor: '#EF4444' },
  tartilRatingBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  tartilRatingIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Resume Tartil
  tartilSummary: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
  },
  tartilSummaryTitle: { fontSize: 20, fontWeight: '700', color: '#0D2818', marginBottom: 16 },
  tartilSummaryStats: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  tartilSummaryStat: { alignItems: 'center' },
  tartilSummaryNumber: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  tartilSummaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tartilScoreBar: { flexDirection: 'row', gap: 4, marginVertical: 16 },
  tartilScoreDot: { width: 12, height: 12, borderRadius: 6 },
  tartilSummaryActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  tartilRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B4332',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tartilRetryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  tartilExitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tartilExitText: { color: '#374151', fontWeight: '500', fontSize: 15 },

  // Bottom bar Tartil
  tartilBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D2818',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tartilBottomBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tartilBottomBtnText: { color: '#EF4444', fontWeight: '500', fontSize: 14 },
  tartilBottomProgress: { color: '#D4AF37', fontWeight: '600', fontSize: 14 },
});
