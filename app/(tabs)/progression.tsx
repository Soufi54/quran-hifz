import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getMosqueLevel } from '../../lib/scoring';
import { MOSQUE_LEVELS, SurahStatus } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, fontScale, spacing, SCREEN } from '../../lib/responsive';

// Emojis pour les niveaux de mosquee - represente visuellement la progression
const MOSQUE_EMOJIS: Record<number, string> = {
  1: '🕌',
  2: '🕌',
  3: '🕌',
  4: '🕌',
  5: '🕌',
  6: '🕌',
  7: '🕌',
};

const MOSQUE_DESCRIPTIONS: Record<number, string> = {
  1: 'Un humble debut sur le chemin du savoir',
  2: 'Un petit espace de priere, un grand pas',
  3: 'Ta mosquee prend forme, continue !',
  4: 'Les minarets s\'elevent avec ta perseverance',
  5: 'Une grande mosquee, signe de devotion',
  6: 'Majestueuse comme ta determination',
  7: 'Al-Haram, le sommet du hifz',
};

export default function ProgressionScreen() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mosqueScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    loadStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(mosqueScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadStats = async () => {
    try {
      const s = await AsyncStorage.getItem('streak');
      const bs = await AsyncStorage.getItem('bestStreak');
      const xp = await AsyncStorage.getItem('totalXP');
      const prog = await AsyncStorage.getItem('surahProgress');

      setStreak(s ? parseInt(s) : 0);
      setBestStreak(bs ? parseInt(bs) : 0);
      setTotalXP(xp ? parseInt(xp) : 0);
      if (prog) {
        const parsed = JSON.parse(prog);
        const mapped: Record<number, SurahStatus> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          mapped[parseInt(key)] = value as SurahStatus;
        });
        setProgress(mapped);
      }
    } catch (e) {
      console.error('Erreur chargement stats:', e);
    }
  };

  const mosqueLevel = getMosqueLevel(streak);
  const mosqueName = MOSQUE_LEVELS[mosqueLevel].name;
  const nextLevel = mosqueLevel < 7 ? MOSQUE_LEVELS[(mosqueLevel + 1) as 1|2|3|4|5|6|7] : null;
  const progressToNext = nextLevel
    ? ((streak - MOSQUE_LEVELS[mosqueLevel].minStreak) / (nextLevel.minStreak - MOSQUE_LEVELS[mosqueLevel].minStreak)) * 100
    : 100;

  const statuses = Object.values(progress);
  const mastered = statuses.filter(s => s === 'mastered').length;
  const learning = statuses.filter(s => s === 'learning').length;
  const declining = statuses.filter(s => s === 'declining').length;
  const urgent = statuses.filter(s => s === 'urgent').length;
  const quranProgress = Math.round(((mastered + learning) / 114) * 100);

  // Week day size - responsive to fit 7 days
  const weekDaySize = Math.min(scale(38), (SCREEN.width - spacing.md * 2 - scale(16) * 2 - scale(6) * 6) / 7);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mosquee Hero Card */}
        <Animated.View style={[styles.mosqueCard, { transform: [{ scale: mosqueScale }] }]}>
          <View style={styles.mosqueGlow} />
          <View style={styles.mosqueIconContainer}>
            {/* Mosque level visualization */}
            <View style={styles.mosqueVisual}>
              {Array.from({ length: mosqueLevel }).map((_, i) => (
                <View key={i} style={[styles.mosqueBlock, { height: scale(20 + i * 12), opacity: 0.3 + i * 0.1 }]} />
              ))}
              <View style={styles.mosqueDome} />
            </View>
          </View>
          <Text style={styles.mosqueName}>{mosqueName}</Text>
          <Text style={styles.mosqueDescription}>{MOSQUE_DESCRIPTIONS[mosqueLevel]}</Text>

          {/* Level indicator */}
          <View style={styles.levelRow}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={[
                styles.levelDot,
                i < mosqueLevel && styles.levelDotActive,
                i === mosqueLevel - 1 && styles.levelDotCurrent,
              ]} />
            ))}
          </View>
          <Text style={styles.mosqueLevel}>Niveau {mosqueLevel}/7</Text>

          {nextLevel && (
            <View style={styles.mosqueProgress}>
              <View style={styles.mosqueProgressBar}>
                <Animated.View style={[styles.mosqueProgressFill, { width: `${Math.min(100, progressToNext)}%` }]} />
              </View>
              <Text style={styles.mosqueProgressText}>
                {nextLevel.minStreak - streak} jours restants pour "{nextLevel.name}"
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <View style={styles.streakMain}>
            <View style={styles.streakFlameContainer}>
              <Ionicons name="flame" size={scale(36)} color="#F97316" />
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>jours de streak</Text>
            </View>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.bestStreakContainer}>
            <Ionicons name="trophy" size={scale(24)} color="#D4AF37" />
            <View>
              <Text style={styles.bestStreakNumber}>{bestStreak}</Text>
              <Text style={styles.bestStreakLabel}>Record</Text>
            </View>
          </View>
        </View>

        {/* Streak calendar (7 derniers jours) */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>Cette semaine</Text>
          <View style={styles.weekDays}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
              const isToday = i === new Date().getDay() - 1;
              const isPast = i < new Date().getDay() - 1;
              const isActive = isPast && i >= Math.max(0, new Date().getDay() - 1 - streak);
              return (
                <View key={i} style={[
                  styles.weekDay,
                  { width: weekDaySize, height: weekDaySize * 1.26 },
                  isActive && styles.weekDayActive,
                  isToday && styles.weekDayToday,
                ]}>
                  <Text style={[styles.weekDayText, (isActive || isToday) && styles.weekDayTextActive]}>
                    {day}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={scale(14)} color="#fff" />}
                  {isToday && <Ionicons name="ellipse" size={scale(8)} color="#D4AF37" />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardXP]}>
            <Ionicons name="flash" size={scale(28)} color="#D4AF37" />
            <Text style={styles.statNumber}>{totalXP.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={scale(28)} color="#10B981" />
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{mastered}</Text>
            <Text style={styles.statLabel}>Maitrisees</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="book" size={scale(28)} color="#D4AF37" />
            <Text style={[styles.statNumber, { color: '#D4AF37' }]}>{learning}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={scale(28)} color="#EF4444" />
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{declining + urgent}</Text>
            <Text style={styles.statLabel}>A reviser</Text>
          </View>
        </View>

        {/* Progression Quran */}
        <View style={styles.quranProgressCard}>
          <View style={styles.quranProgressHeader}>
            <Text style={styles.quranProgressTitle}>Progression du Coran</Text>
            <Text style={styles.quranProgressPercent}>{quranProgress}%</Text>
          </View>
          <View style={styles.quranProgressBar}>
            <View style={[styles.quranProgressFill, { width: `${quranProgress}%` }]} />
          </View>
          <Text style={styles.quranProgressSub}>
            {mastered + learning}/114 sourates touchees
          </Text>
        </View>

        {/* Alerte declin */}
        {(declining + urgent) > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <Ionicons name="alert-circle" size={scale(24)} color="#EF4444" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Attention !</Text>
              <Text style={styles.warningText}>
                {declining + urgent} sourate(s) en declin. Revise-les pour ne pas perdre ta memorisation.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { padding: spacing.md, paddingBottom: scale(40) },

  // Mosque card
  mosqueCard: {
    backgroundColor: '#0D2818',
    borderRadius: scale(20),
    padding: scale(28),
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mosqueGlow: {
    position: 'absolute',
    top: scale(-50),
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  mosqueIconContainer: { marginBottom: spacing.sm + spacing.xs },
  mosqueVisual: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(4),
    height: scale(80),
  },
  mosqueBlock: {
    width: scale(12),
    backgroundColor: '#D4AF37',
    borderTopLeftRadius: scale(4),
    borderTopRightRadius: scale(4),
  },
  mosqueDome: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#D4AF37',
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: scale(-12),
  },
  mosqueName: { fontSize: fontScale(24), fontWeight: '800', color: '#D4AF37', marginTop: spacing.sm },
  mosqueDescription: { fontSize: fontScale(14), color: 'rgba(255,255,255,0.6)', marginTop: scale(6), textAlign: 'center', lineHeight: scale(20) },

  levelRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  levelDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: 'rgba(255,255,255,0.2)' },
  levelDotActive: { backgroundColor: '#D4AF37' },
  levelDotCurrent: { width: scale(12), height: scale(12), borderRadius: scale(6), borderWidth: 2, borderColor: '#fff' },
  mosqueLevel: { fontSize: fontScale(13), color: 'rgba(255,255,255,0.5)', marginTop: spacing.sm },

  mosqueProgress: { width: '100%', marginTop: spacing.md },
  mosqueProgressBar: { height: scale(6), backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: scale(3), overflow: 'hidden' },
  mosqueProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: scale(3) },
  mosqueProgressText: { fontSize: fontScale(12), color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: spacing.sm },

  // Streak
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: scale(18),
    marginBottom: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.15)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  streakMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  streakFlameContainer: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: 'rgba(249,115,22,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfo: {},
  streakNumber: { fontSize: fontScale(32), fontWeight: '800', color: '#F97316' },
  streakLabel: { fontSize: fontScale(13), color: '#6B7280' },
  streakDivider: { width: 1, height: scale(40), backgroundColor: '#E5E7EB', marginHorizontal: spacing.md },
  bestStreakContainer: { alignItems: 'center', gap: scale(4) },
  bestStreakNumber: { fontSize: fontScale(20), fontWeight: '800', color: '#D4AF37' },
  bestStreakLabel: { fontSize: fontScale(11), color: '#6B7280' },

  // Week calendar
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: scale(14),
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  weekTitle: { fontSize: fontScale(14), fontWeight: '600', color: '#374151', marginBottom: spacing.sm + spacing.xs },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: {
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    gap: scale(2),
  },
  weekDayActive: { backgroundColor: '#10B981' },
  weekDayToday: { borderWidth: 2, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)' },
  weekDayText: { fontSize: fontScale(12), fontWeight: '600', color: '#9CA3AF' },
  weekDayTextActive: { color: '#fff' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginBottom: spacing.sm + spacing.xs },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#fff',
    borderRadius: scale(14),
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: scale(4),
  },
  statCardXP: { borderColor: 'rgba(212,175,55,0.2)' },
  statNumber: { fontSize: fontScale(24), fontWeight: '800', color: '#0D2818' },
  statLabel: { fontSize: fontScale(12), color: '#6B7280' },

  // Quran progress
  quranProgressCard: {
    backgroundColor: '#fff',
    borderRadius: scale(14),
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quranProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(10) },
  quranProgressTitle: { fontSize: fontScale(15), fontWeight: '600', color: '#0D2818' },
  quranProgressPercent: { fontSize: fontScale(18), fontWeight: '800', color: '#D4AF37' },
  quranProgressBar: { height: scale(8), backgroundColor: '#F3F4F6', borderRadius: scale(4), overflow: 'hidden' },
  quranProgressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: scale(4) },
  quranProgressSub: { fontSize: fontScale(12), color: '#6B7280', marginTop: spacing.sm },

  // Warning
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: scale(14),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  warningIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: fontScale(15), fontWeight: '700', color: '#991B1B', marginBottom: scale(4) },
  warningText: { fontSize: fontScale(13), color: '#B91C1C', lineHeight: fontScale(18) },
});
