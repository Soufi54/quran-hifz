import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { Audio } from 'expo-av';
import { getSurah, getPageData, getFirstPageOfSurah, getLastPageOfSurah, getAudioUrl } from '../../lib/quran';
import { PageData } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SurahScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahNumber = parseInt(id);
  const surah = getSurah(surahNumber);

  const [showTranslation, setShowTranslation] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    if (!surah) return;
    const firstPage = getFirstPageOfSurah(surahNumber);
    const lastPage = getLastPageOfSurah(surahNumber);
    const pageList: PageData[] = [];
    for (let p = firstPage; p <= lastPage; p++) {
      pageList.push(getPageData(p));
    }
    setPages(pageList);

    // Marquer comme "learning" si pas encore commence
    markAsLearning();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [surahNumber]);

  const markAsLearning = async () => {
    try {
      const stored = await AsyncStorage.getItem('surahProgress');
      const progress: Record<string, string> = stored ? JSON.parse(stored) : {};
      if (!progress[String(surahNumber)] || progress[String(surahNumber)] === 'not_started') {
        progress[String(surahNumber)] = 'learning';
        await AsyncStorage.setItem('surahProgress', JSON.stringify(progress));
      }
      // Mettre a jour last_reviewed_at
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
      return;
    }

    setIsPlaying(true);
    const pageAyahs = pages[currentPage].ayahs;

    for (const ayah of pageAyahs) {
      try {
        const url = getAudioUrl(ayah.surahNumber, ayah.ayahNumberInSurah);
        const { sound } = await Audio.Sound.createAsync({ uri: url });
        soundRef.current = sound;
        await sound.playAsync();
        // Attendre la fin de la lecture
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
  };

  if (!surah) {
    return (
      <View style={styles.container}>
        <Text>Sourate non trouvee</Text>
      </View>
    );
  }

  const isBismillahSurah = surahNumber !== 9 && surahNumber !== 1;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${surah.nameArabic} - ${surah.nameFrench}`,
        }}
      />

      {/* Mushaf pages */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
      >
        {pages.map((page, index) => (
          <ScrollView key={page.pageNumber} style={styles.page} contentContainerStyle={styles.pageContent}>
            {/* Header page */}
            <View style={styles.pageHeader}>
              <Text style={styles.juzText}>
                Juz {page.ayahs[0]?.surahNumber ? getSurah(page.ayahs[0].surahNumber)?.ayahs.find(a => a.page === page.pageNumber)?.juz : ''}
              </Text>
              <Text style={styles.surahHeaderText}>{page.ayahs[0]?.surahNameArabic}</Text>
            </View>

            {/* Bismillah si premiere page de la sourate */}
            {index === 0 && isBismillahSurah && (
              <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
            )}

            {/* Versets */}
            <View style={styles.ayahsContainer}>
              {page.ayahs.map((ayah, ayahIndex) => (
                <View key={`${ayah.surahNumber}-${ayah.ayahNumberInSurah}`}>
                  <Text style={styles.ayahText}>
                    {ayah.text}
                    <Text style={styles.ayahNumber}> ﴿{ayah.ayahNumberInSurah}﴾ </Text>
                  </Text>
                  {showTranslation && (
                    <Text style={styles.translationText}>{ayah.translationFr}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Page number */}
            <Text style={styles.pageNumber}>{page.pageNumber}</Text>
          </ScrollView>
        ))}
      </PagerView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={playPageAudio}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#1B4332" />
          <Text style={styles.bottomButtonText}>{isPlaying ? 'Pause' : 'Ecouter'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setShowTranslation(!showTranslation)}
        >
          <Ionicons name="language" size={22} color={showTranslation ? '#1B4332' : '#9CA3AF'} />
          <Text style={[styles.bottomButtonText, showTranslation && { color: '#1B4332' }]}>
            Traduction
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quizButton}
          onPress={() => router.push(`/quiz/${surahNumber}`)}
        >
          <Ionicons name="school" size={22} color="#fff" />
          <Text style={styles.quizButtonText}>Quiz</Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {currentPage + 1}/{pages.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  pager: { flex: 1 },
  page: { flex: 1 },
  pageContent: { padding: 16, paddingBottom: 40 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#D4A574', marginBottom: 12 },
  juzText: { fontSize: 12, color: '#8B7355' },
  surahHeaderText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  bismillah: { fontSize: 22, textAlign: 'center', color: '#1B4332', marginVertical: 16, lineHeight: 40 },
  ayahsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' },
  ayahText: { fontSize: 22, lineHeight: 48, color: '#1A1A1A', textAlign: 'right', writingDirection: 'rtl', width: '100%' },
  ayahNumber: { fontSize: 14, color: '#8B7355' },
  translationText: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 8, textAlign: 'left', paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  pageNumber: { textAlign: 'center', fontSize: 14, color: '#8B7355', marginTop: 20 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  bottomButton: { alignItems: 'center', gap: 2 },
  bottomButtonText: { fontSize: 11, color: '#6B7280' },
  quizButton: { backgroundColor: '#1B4332', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6, marginLeft: 'auto' },
  quizButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pageIndicator: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
});
