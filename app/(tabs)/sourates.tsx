import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllSurahs, getJuzList, getSurahsByJuz } from '../../lib/quran';
import { Surah, SurahStatus, STATUS_COLORS, STATUS_LABELS } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ViewMode = 'list' | 'juz';

export default function SouratesScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem('surahProgress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const mapped: Record<number, SurahStatus> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          mapped[parseInt(key)] = value as SurahStatus;
        });
        setProgress(mapped);
      }
    } catch (e) {
      console.error('Erreur chargement progression:', e);
    }
  };

  const surahs = getAllSurahs();
  const juzList = getJuzList();

  const getStatus = (surahNumber: number): SurahStatus => {
    return progress[surahNumber] || 'not_started';
  };

  const renderSurahItem = ({ item }: { item: Surah }) => {
    const status = getStatus(item.number);
    return (
      <TouchableOpacity
        style={styles.surahItem}
        onPress={() => router.push(`/surah/${item.number}`)}
      >
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
        <View style={styles.surahNumber}>
          <Text style={styles.surahNumberText}>{item.number}</Text>
        </View>
        <View style={styles.surahInfo}>
          <Text style={styles.surahNameFr}>{item.nameFrench}</Text>
          <Text style={styles.surahMeta}>
            {item.ayahCount} versets - {item.revelationType === 'mecquoise' ? 'Mecquoise' : 'Medinoise'}
          </Text>
        </View>
        <Text style={styles.surahNameAr}>{item.nameArabic}</Text>
      </TouchableOpacity>
    );
  };

  const renderJuzSection = (juz: number) => {
    const juzSurahs = getSurahsByJuz(juz);
    return (
      <View key={juz} style={styles.juzSection}>
        <Text style={styles.juzTitle}>Juz {juz}</Text>
        {juzSurahs.map(surah => (
          <TouchableOpacity
            key={surah.number}
            style={styles.surahItem}
            onPress={() => router.push(`/surah/${surah.number}`)}
          >
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[getStatus(surah.number)] }]} />
            <View style={styles.surahNumber}>
              <Text style={styles.surahNumberText}>{surah.number}</Text>
            </View>
            <View style={styles.surahInfo}>
              <Text style={styles.surahNameFr}>{surah.nameFrench}</Text>
              <Text style={styles.surahMeta}>{surah.ayahCount} versets</Text>
            </View>
            <Text style={styles.surahNameAr}>{surah.nameArabic}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Stats rapides
  const masteredCount = Object.values(progress).filter(s => s === 'mastered').length;
  const learningCount = Object.values(progress).filter(s => s === 'learning').length;
  const decliningCount = Object.values(progress).filter(s => s === 'declining' || s === 'urgent').length;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{masteredCount}</Text>
          <Text style={styles.statLabel}>Maitrisees</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#FBBF24' }]}>{learningCount}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{decliningCount}</Text>
          <Text style={styles.statLabel}>A reviser</Text>
        </View>
      </View>

      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>Par liste</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'juz' && styles.toggleActive]}
          onPress={() => setViewMode('juz')}
        >
          <Text style={[styles.toggleText, viewMode === 'juz' && styles.toggleTextActive]}>Par juz</Text>
        </Pressable>
      </View>

      {/* Liste */}
      {viewMode === 'list' ? (
        <FlatList
          data={surahs}
          keyExtractor={item => String(item.number)}
          renderItem={renderSurahItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={juzList}
          keyExtractor={item => String(item)}
          renderItem={({ item }) => renderJuzSection(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  toggleContainer: { flexDirection: 'row', margin: 12, backgroundColor: '#E5E7EB', borderRadius: 8, padding: 2 },
  toggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { fontSize: 14, color: '#6B7280' },
  toggleTextActive: { color: '#1B4332', fontWeight: '600' },
  listContent: { paddingBottom: 20 },
  surahItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  surahNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  surahNumberText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  surahInfo: { flex: 1 },
  surahNameFr: { fontSize: 15, fontWeight: '500', color: '#111827' },
  surahMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  surahNameAr: { fontSize: 18, color: '#1B4332', fontWeight: '500' },
  juzSection: { marginTop: 12 },
  juzTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332', marginHorizontal: 16, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
});
