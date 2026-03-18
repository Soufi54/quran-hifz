import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfilScreen() {
  const handleResetProgress = () => {
    Alert.alert(
      'Reinitialiser',
      'Veux-tu vraiment reinitialiser toute ta progression ? Cette action est irreversible.',
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
            ]);
            Alert.alert('Fait', 'Ta progression a ete reinitialisee.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>Utilisateur</Text>
        <Text style={styles.subtitle}>QuranDuel MVP</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parametres</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color="#374151" />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="time-outline" size={22} color="#374151" />
          <Text style={styles.menuText}>Objectif quotidien</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="musical-notes-outline" size={22} color="#374151" />
          <Text style={styles.menuText}>Recitateur</Text>
          <Text style={styles.menuValue}>Alafasy</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleResetProgress}>
          <Ionicons name="refresh-outline" size={22} color="#EF4444" />
          <Text style={[styles.menuText, { color: '#EF4444' }]}>Reinitialiser la progression</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>QuranDuel v1.0.0 - MVP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1B4332', paddingVertical: 32, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 4, gap: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  menuText: { flex: 1, fontSize: 15, color: '#374151' },
  menuValue: { fontSize: 14, color: '#9CA3AF' },
  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 40 },
});
