import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getMosqueLevel } from '../../lib/scoring';
import { MOSQUE_LEVELS, SurahStatus } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOSQUE_ICONS: Record<number, string> = {
  1: 'leaf-outline',
  2: 'home-outline',
  3: 'business-outline',
  4: 'business',
  5: 'globe-outline',
  6: 'star-outline',
  7: 'star',
};

export default function ProgressionScreen() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [progress, setProgress] = useState<Record<number, SurahStatus>>({});

  useEffect(() => {
    loadStats();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mosquee */}
      <View style={styles.mosqueCard}>
        <Ionicons
          name={MOSQUE_ICONS[mosqueLevel] as any}
          size={80}
          color="#1B4332"
        />
        <Text style={styles.mosqueName}>{mosqueName}</Text>
        <Text style={styles.mosqueLevel}>Niveau {mosqueLevel}/7</Text>
        {nextLevel && (
          <View style={styles.mosqueProgress}>
            <View style={styles.mosqueProgressBar}>
              <View style={[styles.mosqueProgressFill, { width: `${Math.min(100, progressToNext)}%` }]} />
            </View>
            <Text style={styles.mosqueProgressText}>
              Encore {nextLevel.minStreak - streak} jours pour "{nextLevel.name}"
            </Text>
          </View>
        )}
      </View>

      {/* Streak */}
      <View style={styles.streakCard}>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={32} color="#F97316" />
          <View>
            <Text style={styles.streakNumber}>{streak} jours</Text>
            <Text style={styles.streakLabel}>Streak actuel</Text>
          </View>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakRow}>
          <Ionicons name="trophy" size={32} color="#FBBF24" />
          <View>
            <Text style={styles.streakNumber}>{bestStreak} jours</Text>
            <Text style={styles.streakLabel}>Meilleur streak</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalXP}</Text>
          <Text style={styles.statLabel}>XP Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{mastered}</Text>
          <Text style={styles.statLabel}>Maitrisees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FBBF24' }]}>{learning}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{declining + urgent}</Text>
          <Text style={styles.statLabel}>A reviser</Text>
        </View>
      </View>

      {/* Info declin */}
      {(declining + urgent) > 0 && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color="#F97316" />
          <Text style={styles.warningText}>
            {declining + urgent} sourate(s) en declin. Va dans "Sourates" pour les reviser avant qu'elles ne soient perdues.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  mosqueCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  mosqueName: { fontSize: 22, fontWeight: 'bold', color: '#1B4332', marginTop: 12 },
  mosqueLevel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  mosqueProgress: { width: '100%', marginTop: 16 },
  mosqueProgressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  mosqueProgressFill: { height: '100%', backgroundColor: '#1B4332', borderRadius: 4 },
  mosqueProgressText: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },
  streakCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  streakRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  streakNumber: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  streakLabel: { fontSize: 12, color: '#6B7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  warningCard: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FDBA74' },
  warningText: { flex: 1, fontSize: 13, color: '#9A3412', lineHeight: 18 },
});
