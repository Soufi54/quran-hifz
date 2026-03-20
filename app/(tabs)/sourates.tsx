import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllSurahs, getJuzList, getSurahsByJuz } from '../../lib/quran';
import { Surah, SurahStatus, STATUS_COLORS, STATUS_LABELS } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ViewMode = 'list' | 'juz';

// Icone decorative pour le numero de sourate (style Tarteel)
function SurahNumberBadge({ number, status }: { number: number; status: SurahStatus }) {
  const bgColor = status === 'mastered' ? '#10B981' :
    status === 'learning' ? '#D4AF37' :
    status === 'declining' ? '#F97316' :
    status === 'urgent' ? '#EF4444' :
    '#E5E7EB';

  return (
    <View style={[surahBadgeStyles.container, { borderColor: bgColor }]}>
      <View style={[surahBadgeStyles.diamond]}>
        <Text style={[surahBadgeStyles.number, status !== 'not_started' && { color: bgColor }]}>
          {number}
        </Text>
      </View>
    </View>
  );
}

const surahBadgeStyles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
    marginRight: 14,
  },
  diamond: {
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
});

export default function SouratesScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  const renderSurahItem = ({ item, index }: { item: Surah; index: number }) => {
    const status = getStatus(item.number);
    return (
      <TouchableOpacity
        style={styles.surahItem}
        onPress={() => router.push(`/surah/${item.number}`)}
        activeOpacity={0.7}
      >
        <SurahNumberBadge number={item.number} status={status} />
        <View style={styles.surahInfo}>
          <Text style={styles.surahNameFr}>{item.nameFrench}</Text>
          <View style={styles.surahMetaRow}>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
            <Text style={styles.surahMeta}>
              {item.ayahCount} v. · {item.revelationType === 'mecquoise' ? 'Mecq.' : 'Med.'}
            </Text>
          </View>
        </View>
        <View style={styles.surahRight}>
          <Text style={styles.surahNameAr}>{item.nameArabic}</Text>
          <Ionicons name="chevron-forward" size={16} color="#D4AF37" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderJuzSection = (juz: number) => {
    const juzSurahs = getSurahsByJuz(juz);
    return (
      <View key={juz} style={styles.juzSection}>
        <View style={styles.juzHeader}>
          <View style={styles.juzBadge}>
            <Text style={styles.juzBadgeText}>{juz}</Text>
          </View>
          <Text style={styles.juzTitle}>Juz {juz}</Text>
          <View style={styles.juzLine} />
        </View>
        {juzSurahs.map(surah => {
          const status = getStatus(surah.number);
          return (
            <TouchableOpacity
              key={surah.number}
              style={styles.surahItem}
              onPress={() => router.push(`/surah/${surah.number}`)}
              activeOpacity={0.7}
            >
              <SurahNumberBadge number={surah.number} status={status} />
              <View style={styles.surahInfo}>
                <Text style={styles.surahNameFr}>{surah.nameFrench}</Text>
                <View style={styles.surahMetaRow}>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </View>
                  <Text style={styles.surahMeta}>{surah.ayahCount} v.</Text>
                </View>
              </View>
              <View style={styles.surahRight}>
                <Text style={styles.surahNameAr}>{surah.nameArabic}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const masteredCount = Object.values(progress).filter(s => s === 'mastered').length;
  const learningCount = Object.values(progress).filter(s => s === 'learning').length;
  const decliningCount = Object.values(progress).filter(s => s === 'declining' || s === 'urgent').length;
  const totalProgress = Math.round(((masteredCount + learningCount) / 114) * 100);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Stats premium */}
      <View style={styles.statsBar}>
        <View style={styles.statsProgress}>
          <View style={styles.statsProgressCircle}>
            <Text style={styles.statsProgressPercent}>{totalProgress}%</Text>
          </View>
          <View style={styles.statsProgressInfo}>
            <Text style={styles.statsProgressTitle}>Progression globale</Text>
            <View style={styles.statsProgressBar}>
              <View style={[styles.statsProgressFill, { width: `${totalProgress}%` }]} />
            </View>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{masteredCount}</Text>
            <Text style={styles.statLabel}>Maitrisees</Text>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(212,175,55,0.12)' }]}>
              <Ionicons name="book" size={18} color="#D4AF37" />
            </View>
            <Text style={[styles.statNumber, { color: '#D4AF37' }]}>{learningCount}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{decliningCount}</Text>
            <Text style={styles.statLabel}>A reviser</Text>
          </View>
        </View>
      </View>

      {/* Toggle premium */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#D4AF37' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>Par sourate</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'juz' && styles.toggleActive]}
          onPress={() => setViewMode('juz')}
        >
          <Ionicons name="layers" size={16} color={viewMode === 'juz' ? '#D4AF37' : '#6B7280'} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },

  // Stats
  statsBar: {
    backgroundColor: '#0D2818',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statsProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statsProgressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  statsProgressPercent: { fontSize: 14, fontWeight: '800', color: '#D4AF37' },
  statsProgressInfo: { flex: 1 },
  statsProgressTitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  statsProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statsProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 3 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: 4 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  toggleText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  toggleTextActive: { color: '#D4AF37', fontWeight: '700' },

  // List
  listContent: { paddingBottom: 20 },

  // Surah item
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  surahInfo: { flex: 1 },
  surahNameFr: { fontSize: 15, fontWeight: '600', color: '#0D2818' },
  surahMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  surahMeta: { fontSize: 12, color: '#9CA3AF' },
  surahRight: { alignItems: 'flex-end', gap: 4 },
  surahNameAr: { fontSize: 20, color: '#0D2818', fontWeight: '600' },

  // Juz
  juzSection: { marginTop: 8 },
  juzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  juzBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0D2818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzBadgeText: { fontSize: 12, fontWeight: '700', color: '#D4AF37' },
  juzTitle: { fontSize: 16, fontWeight: '700', color: '#0D2818' },
  juzLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.2)' },
});
