import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Animated, Switch } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMosqueLevel, getStreakMultiplier } from '../../lib/scoring';
import { scale, fontScale, spacing } from '../../lib/responsive';
import { getSelectedReciterId, getSelectedTranslationId, getSelectedTafsirId } from '../../lib/settings';
import { getReciterById } from '../../lib/reciters';
import { getTranslationById, getTafsirById } from '../../lib/translations';
import { useTheme } from '../../context/ThemeContext';

export default function ProfilScreen() {
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [reciterName, setReciterName] = useState('Alafasy');
  const [translationName, setTranslationName] = useState('Locale');
  const [tafsirName, setTafsirName] = useState('Ibn Kathir');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors, isDark, toggleTheme } = useTheme();

  useEffect(() => {
    loadStats();
    loadSettings();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Refresh settings when screen is focused (after changing in settings screens)
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const recId = await getSelectedReciterId();
      const reciter = getReciterById(recId);
      if (reciter) setReciterName(reciter.name.split(' ').pop() || reciter.name);

      const transId = await getSelectedTranslationId();
      const trans = getTranslationById(transId);
      if (trans) setTranslationName(trans.name);

      const tafId = await getSelectedTafsirId();
      const taf = getTafsirById(tafId);
      if (taf) setTafsirName(taf.name);
    } catch (e) {
      console.error(e);
    }
  };

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
              'lastReadSurah',
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
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header profil */}
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { borderColor: colors.gold, backgroundColor: colors.goldLight }]}>
              <Ionicons name="person" size={scale(36)} color={colors.gold} />
            </View>
            <View style={[styles.levelBadge, { backgroundColor: colors.gold, borderColor: colors.headerBg }]}>
              <Text style={[styles.levelBadgeText, { color: colors.headerBg }]}>{mosqueLevel}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textOnHeader }]}>Apprenant</Text>
          <Text style={[styles.subtitle, { color: colors.textOnHeaderMuted }]}>QuranDuel</Text>

          {/* Mini stats */}
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Ionicons name="flash" size={scale(18)} color={colors.gold} />
              <Text style={[styles.headerStatNumber, { color: colors.textOnHeader }]}>{totalXP.toLocaleString()}</Text>
              <Text style={[styles.headerStatLabel, { color: colors.textOnHeaderMuted }]}>XP</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Ionicons name="flame" size={scale(18)} color="#F97316" />
              <Text style={[styles.headerStatNumber, { color: colors.textOnHeader }]}>{streak}</Text>
              <Text style={[styles.headerStatLabel, { color: colors.textOnHeaderMuted }]}>Streak</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Ionicons name="checkmark-circle" size={scale(18)} color="#10B981" />
              <Text style={[styles.headerStatNumber, { color: colors.textOnHeader }]}>{mastered}</Text>
              <Text style={[styles.headerStatLabel, { color: colors.textOnHeaderMuted }]}>Maitrisees</Text>
            </View>
          </View>

          {/* Multiplier badge */}
          {multiplier > 1 && (
            <View style={[styles.multiplierBadge, { backgroundColor: colors.goldLight }]}>
              <Ionicons name="flash" size={scale(16)} color={colors.gold} />
              <Text style={[styles.multiplierText, { color: colors.gold }]}>Multiplicateur x{multiplier} actif !</Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PARAMETRES</Text>

          {/* Dark Mode toggle */}
          <View style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]}>
            <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
              <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={scale(20)} color="#6366F1" />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Mode sombre</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.surface}
            />
          </View>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(212,175,55,0.1)' }]}>
              <Ionicons name="notifications-outline" size={scale(20)} color={colors.gold} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Ionicons name="time-outline" size={scale(20)} color="#10B981" />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Objectif quotidien</Text>
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>10 min</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} activeOpacity={0.7} onPress={() => router.push('/settings/reciter')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
              <Ionicons name="musical-notes-outline" size={scale(20)} color="#6366F1" />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Recitateur</Text>
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>{reciterName}</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} activeOpacity={0.7} onPress={() => router.push('/settings/translation')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
              <Ionicons name="language-outline" size={scale(20)} color="#F97316" />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Traduction</Text>
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>{translationName}</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} activeOpacity={0.7} onPress={() => router.push('/settings/tafsir')}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(212,175,55,0.1)' }]}>
              <Ionicons name="book-outline" size={scale(20)} color={colors.gold} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Tafsir</Text>
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>{tafsirName}</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color={colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COMPTE</Text>

          <TouchableOpacity style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }]} onPress={handleResetProgress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Ionicons name="refresh-outline" size={scale(20)} color="#EF4444" />
            </View>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Reinitialiser la progression</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>QuranDuel v1.1.0</Text>
        <Text style={[styles.copyright, { color: colors.gold }]}>Fait avec amour pour la Oumma</Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingVertical: scale(32),
    paddingBottom: scale(28),
    alignItems: 'center',
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  levelBadge: {
    position: 'absolute',
    bottom: scale(-4),
    right: scale(-4),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  levelBadgeText: { fontSize: fontScale(12), fontWeight: '800' },
  name: { fontSize: fontScale(22), fontWeight: '800', marginTop: scale(14) },
  subtitle: { fontSize: fontScale(14), marginTop: scale(2) },

  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(20),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: scale(14),
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    gap: scale(4),
  },
  headerStat: { flex: 1, alignItems: 'center', gap: scale(4) },
  headerStatNumber: { fontSize: fontScale(18), fontWeight: '800' },
  headerStatLabel: { fontSize: fontScale(11) },
  headerStatDivider: { width: 1, height: scale(30), backgroundColor: 'rgba(255,255,255,0.15)' },

  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + spacing.xs,
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(6),
  },
  multiplierText: { fontSize: fontScale(13), fontWeight: '600' },

  // Sections
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: fontScale(12),
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: scale(10),
    marginLeft: scale(4),
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(14),
    marginBottom: scale(6),
    gap: spacing.sm + spacing.xs,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minHeight: scale(48),
  },
  menuIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: fontScale(15), fontWeight: '500' },
  menuValue: { fontSize: fontScale(14) },

  // Footer
  version: { textAlign: 'center', fontSize: fontScale(12), marginTop: scale(40) },
  copyright: { textAlign: 'center', fontSize: fontScale(11), marginTop: scale(4), marginBottom: scale(20), opacity: 0.6 },
});
