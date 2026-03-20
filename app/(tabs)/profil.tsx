import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMosqueLevel, getStreakMultiplier } from '../../lib/scoring';

export default function ProfilScreen() {
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mastered, setMastered] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadStats = async () => {
    try {
      const xp = await AsyncStorage.getItem('totalXP');
      const s = await AsyncStorage.getItem('streak');
      const prog = await AsyncStorage.getItem('surahProgress');

      setTotalXP(xp ? parseInt(xp) : 0);
      setStreak(s ? parseInt(s) : 0);
      if (prog) {
        const parsed = JSON.parse(prog);
        const count = Object.values(parsed).filter((v) => v === 'mastered').length;
        setMastered(count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reinitialiser la progression',
      'Toute ta progression sera perdue. Cette action est irreversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reinitialiser',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'surahProgress',
              'streak',
              'bestStreak',
              'totalXP',
              'lastChallengeDate',
              'lives',
              'onboardingDone',
              'surahReviewDates',
            ]);
            setTotalXP(0);
            setStreak(0);
            setMastered(0);
            Alert.alert('Fait', 'Ta progression a ete reinitialisee.');
          },
        },
      ]
    );
  };

  const mosqueLevel = getMosqueLevel(streak);
  const multiplier = getStreakMultiplier(streak);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header profil */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="#D4AF37" />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{mosqueLevel}</Text>
            </View>
          </View>
          <Text style={styles.name}>Apprenant</Text>
          <Text style={styles.subtitle}>QuranDuel</Text>

          {/* Mini stats */}
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Ionicons name="flash" size={18} color="#D4AF37" />
              <Text style={styles.headerStatNumber}>{totalXP.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>XP</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Ionicons name="flame" size={18} color="#F97316" />
              <Text style={styles.headerStatNumber}>{streak}</Text>
              <Text style={styles.headerStatLabel}>Streak</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.headerStatNumber}>{mastered}</Text>
              <Text style={styles.headerStatLabel}>Maitrisees</Text>
            </View>
          </View>

          {/* Multiplier badge */}
          {multiplier > 1 && (
            <View style={styles.multiplierBadge}>
              <Ionicons name="flash" size={16} color="#D4AF37" />
              <Text style={styles.multiplierText}>Multiplicateur x{multiplier} actif !</Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARAMETRES</Text>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(212,175,55,0.1)' }]}>
              <Ionicons name="notifications-outline" size={20} color="#D4AF37" />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.menuText}>Objectif quotidien</Text>
            <Text style={styles.menuValue}>10 min</Text>
            <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
              <Ionicons name="musical-notes-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.menuText}>Recitateur</Text>
            <Text style={styles.menuValue}>Alafasy</Text>
            <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
              <Ionicons name="book-outline" size={20} color="#F97316" />
            </View>
            <Text style={styles.menuText}>Sourates connues</Text>
            <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPTE</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetProgress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Ionicons name="refresh-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Reinitialiser la progression</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>QuranDuel v1.1.0</Text>
        <Text style={styles.copyright}>Fait avec amour pour la Oumma</Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },

  // Header
  header: {
    backgroundColor: '#0D2818',
    paddingVertical: 32,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0D2818',
  },
  levelBadgeText: { fontSize: 12, fontWeight: '800', color: '#0D2818' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 14 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  headerStat: { flex: 1, alignItems: 'center', gap: 4 },
  headerStatNumber: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  headerStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  multiplierText: { fontSize: 13, fontWeight: '600', color: '#D4AF37' },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: 15, color: '#0D2818', fontWeight: '500' },
  menuValue: { fontSize: 14, color: '#9CA3AF' },

  // Footer
  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 40 },
  copyright: { textAlign: 'center', fontSize: 11, color: '#D4AF37', marginTop: 4, marginBottom: 20, opacity: 0.6 },
});
