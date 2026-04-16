import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllSurahs, getJuzList, getSurahsByJuz, getSurah } from '../../lib/quran';
import { Surah, SurahStatus, STATUS_COLORS, STATUS_LABELS } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, fontScale, spacing } from '../../lib/responsive';
import { useTheme } from '../../context/ThemeContext';

type ViewMode = 'list' | 'juz';

interface LastReadData {
  surahNumber: number;
  timestamp: string;
}

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
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: scale(8),
    transform: [{ rotate: '45deg' }],
    marginRight: scale(14),
  },
  diamond: {
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: { fontSize: fontScale(14), fontWeight: '700', color: '#6B7280' },
});

export default function SouratesScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('juz');
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});
  const [lastRead, setLastRead] = useState<LastReadData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    loadProgress();
    loadLastRead();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Rafraichir la derniere sourate lue quand l'ecran reprend le focus
  useFocusEffect(
    useCallback(() => {
      loadLastRead();
      loadProgress();
    }, [])
  );

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

  const loadLastRead = async () => {
    try {
      const stored = await AsyncStorage.getItem('lastReadSurah');
      if (stored) {
        setLastRead(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erreur chargement derniere lecture:', e);
    }
  };

  const surahs = getAllSurahs();
  const juzList = getJuzList();

  const getStatus = (surahNumber: number): SurahStatus => {
    return progress[surahNumber] || 'not_started';
  };

  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "A l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const renderLastReadBanner = () => {
    if (!lastRead) return null;
    const surah = getSurah(lastRead.surahNumber);
    if (!surah) return null;
    const status = getStatus(lastRead.surahNumber);

    return (
      <TouchableOpacity
        style={[dynStyles.lastReadBanner, {
          backgroundColor: colors.surface,
          borderColor: colors.gold + '40',
        }]}
        onPress={() => router.push(`/surah/${lastRead.surahNumber}`)}
        activeOpacity={0.7}
      >
        <View style={[dynStyles.lastReadIcon, { backgroundColor: colors.goldLight }]}>
          <Ionicons name="book" size={scale(22)} color={colors.gold} />
        </View>
        <View style={dynStyles.lastReadInfo}>
          <Text style={[dynStyles.lastReadLabel, { color: colors.textMuted }]}>Continuer la lecture</Text>
          <Text style={[dynStyles.lastReadName, { color: colors.textPrimary }]}>{surah.nameFrench}</Text>
          <Text style={[dynStyles.lastReadMeta, { color: colors.textMuted }]}>
            {surah.nameArabic} · {formatTimeAgo(lastRead.timestamp)}
          </Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={scale(28)} color={colors.gold} />
      </TouchableOpacity>
    );
  };

  const renderSurahItem = ({ item }: { item: Surah }) => {
    const status = getStatus(item.number);
    return (
      <TouchableOpacity
        style={[styles.surahItem, {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        }]}
        onPress={() => router.push(`/surah/${item.number}`)}
        activeOpacity={0.7}
      >
        <SurahNumberBadge number={item.number} status={status} />
        <View style={styles.surahInfo}>
          <Text style={[styles.surahNameFr, { color: colors.textPrimary }]}>{item.nameFrench}</Text>
          <View style={styles.surahMetaRow}>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
            <Text style={[styles.surahMeta, { color: colors.textMuted }]}>
              {item.ayahCount} v. · {item.revelationType === 'mecquoise' ? 'Mecq.' : 'Med.'}
            </Text>
          </View>
        </View>
        <View style={styles.surahRight}>
          <Text style={[styles.surahNameAr, { color: colors.textPrimary }]}>{item.nameArabic}</Text>
          <Ionicons name="chevron-forward" size={scale(16)} color={colors.gold} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderJuzSection = (juz: number) => {
    const juzSurahs = getSurahsByJuz(juz);
    return (
      <View key={juz} style={styles.juzSection}>
        <View style={styles.juzHeader}>
          <View style={[styles.juzBadge, { backgroundColor: colors.headerBg }]}>
            <Text style={[styles.juzBadgeText, { color: colors.gold }]}>{juz}</Text>
          </View>
          <Text style={[styles.juzTitle, { color: colors.textPrimary }]}>Juz {juz}</Text>
          <View style={[styles.juzLine, { backgroundColor: colors.separator }]} />
        </View>
        {juzSurahs.map(surah => {
          const status = getStatus(surah.number);
          return (
            <TouchableOpacity
              key={surah.number}
              style={[styles.surahItem, {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              }]}
              onPress={() => router.push(`/surah/${surah.number}`)}
              activeOpacity={0.7}
            >
              <SurahNumberBadge number={surah.number} status={status} />
              <View style={styles.surahInfo}>
                <Text style={[styles.surahNameFr, { color: colors.textPrimary }]}>{surah.nameFrench}</Text>
                <View style={styles.surahMetaRow}>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </View>
                  <Text style={[styles.surahMeta, { color: colors.textMuted }]}>{surah.ayahCount} v.</Text>
                </View>
              </View>
              <View style={styles.surahRight}>
                <Text style={[styles.surahNameAr, { color: colors.textPrimary }]}>{surah.nameArabic}</Text>
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

  const listHeader = () => (
    <>
      {/* Stats premium */}
      <View style={[styles.statsBar, { backgroundColor: colors.headerBg }]}>
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
              <Ionicons name="checkmark-circle" size={scale(18)} color="#10B981" />
            </View>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{masteredCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textOnHeaderMuted }]}>Maitrisees</Text>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(212,175,55,0.12)' }]}>
              <Ionicons name="book" size={scale(18)} color="#D4AF37" />
            </View>
            <Text style={[styles.statNumber, { color: '#D4AF37' }]}>{learningCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textOnHeaderMuted }]}>En cours</Text>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="alert-circle" size={scale(18)} color="#EF4444" />
            </View>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{decliningCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textOnHeaderMuted }]}>A reviser</Text>
          </View>
        </View>
      </View>

      {/* Derniere sourate lue */}
      {renderLastReadBanner()}

      {/* Toggle premium */}
      <View style={[styles.toggleContainer, {
        backgroundColor: colors.toggleBg,
        borderColor: colors.border,
      }]}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && {
            backgroundColor: colors.toggleActiveBg,
            borderWidth: 1,
            borderColor: colors.toggleActiveBorder,
          }]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={scale(16)} color={viewMode === 'list' ? colors.gold : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: viewMode === 'list' ? colors.gold : colors.textSecondary }, viewMode === 'list' && { fontWeight: '700' }]}>Par sourate</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'juz' && {
            backgroundColor: colors.toggleActiveBg,
            borderWidth: 1,
            borderColor: colors.toggleActiveBorder,
          }]}
          onPress={() => setViewMode('juz')}
        >
          <Ionicons name="layers" size={scale(16)} color={viewMode === 'juz' ? colors.gold : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: viewMode === 'juz' ? colors.gold : colors.textSecondary }, viewMode === 'juz' && { fontWeight: '700' }]}>Par juz</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]}>
      {viewMode === 'list' ? (
        <FlatList
          data={surahs}
          keyExtractor={item => String(item.number)}
          renderItem={renderSurahItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={juzList}
          keyExtractor={item => String(item)}
          renderItem={({ item }) => renderJuzSection(item)}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

// Styles dynamiques pour la banniere "derniere lecture"
const dynStyles = StyleSheet.create({
  lastReadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm + spacing.xs,
    marginTop: spacing.sm + spacing.xs,
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1.5,
    gap: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lastReadIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastReadInfo: { flex: 1 },
  lastReadLabel: { fontSize: fontScale(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  lastReadName: { fontSize: fontScale(16), fontWeight: '700', marginTop: scale(2) },
  lastReadMeta: { fontSize: fontScale(12), marginTop: scale(2) },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Stats
  statsBar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statsProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm + spacing.xs,
  },
  statsProgressCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  statsProgressPercent: { fontSize: fontScale(14), fontWeight: '800', color: '#D4AF37' },
  statsProgressInfo: { flex: 1 },
  statsProgressTitle: { fontSize: fontScale(14), color: 'rgba(255,255,255,0.7)', marginBottom: scale(6) },
  statsProgressBar: {
    height: scale(6),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  statsProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: scale(3) },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: scale(4) },
  statIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: { fontSize: fontScale(18), fontWeight: '800' },
  statLabel: { fontSize: fontScale(11) },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    margin: spacing.sm + spacing.xs,
    borderRadius: scale(12),
    padding: scale(3),
    borderWidth: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
    gap: scale(6),
  },
  toggleText: { fontSize: fontScale(14), fontWeight: '500' },

  // List
  listContent: { paddingBottom: scale(20) },

  // Surah item
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm + spacing.xs,
    marginVertical: scale(4),
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minHeight: scale(48),
  },
  surahInfo: { flex: 1 },
  surahNameFr: { fontSize: fontScale(15), fontWeight: '600' },
  surahMetaRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(4) },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    gap: scale(4),
  },
  statusDot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  statusText: { fontSize: fontScale(11), fontWeight: '600' },
  surahMeta: { fontSize: fontScale(12) },
  surahRight: { alignItems: 'flex-end', gap: scale(4) },
  surahNameAr: { fontSize: fontScale(20), fontWeight: '600', fontFamily: 'UthmanicHafs' },

  // Juz
  juzSection: { marginTop: spacing.sm },
  juzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: scale(10),
  },
  juzBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzBadgeText: { fontSize: fontScale(12), fontWeight: '700' },
  juzTitle: { fontSize: fontScale(16), fontWeight: '700' },
  juzLine: { flex: 1, height: 1 },
});
