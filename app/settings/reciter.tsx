import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { RECITERS, Reciter, getAudioUrlForReciter } from '../../lib/reciters';
import { getSelectedReciterId, setSelectedReciterId } from '../../lib/settings';
import { scale, fontScale, spacing } from '../../lib/responsive';

const STYLE_LABELS: Record<Reciter['style'], string> = {
  murattal: 'Murattal',
  mujawwad: 'Mujawwad',
  muallim: 'Apprentissage',
};

const STYLE_DESCRIPTIONS: Record<Reciter['style'], string> = {
  murattal: 'Recitation melodique standard',
  mujawwad: 'Recitation embellie et ornee',
  muallim: 'Recitation lente pour apprendre',
};

export default function ReciterSettingsScreen() {
  const [selectedId, setSelectedId] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    getSelectedReciterId().then(setSelectedId);
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    await setSelectedReciterId(id);
  };

  const handlePreview = async (reciter: Reciter) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (previewingId === reciter.id) {
        setPreviewingId(null);
        return;
      }

      setPreviewingId(reciter.id);
      // Al-Fatiha, verset 1 pour preview
      const url = getAudioUrlForReciter(reciter, 1, 1);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPreviewingId(null);
        }
      });
    } catch (e) {
      setPreviewingId(null);
      Alert.alert('Erreur', 'Impossible de charger cet audio. Verifie ta connexion.');
    }
  };

  const groupedByStyle = (['murattal', 'mujawwad', 'muallim'] as const).map(style => ({
    style,
    label: STYLE_LABELS[style],
    description: STYLE_DESCRIPTIONS[style],
    reciters: RECITERS.filter(r => r.style === style),
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Recitateur' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerText}>
          Choisis le recitateur pour l'ecoute des versets
        </Text>

        {groupedByStyle.map(group => (
          <View key={group.style} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <Text style={styles.sectionDesc}>{group.description}</Text>
            </View>

            {group.reciters.map(reciter => {
              const isSelected = selectedId === reciter.id;
              const isPreviewing = previewingId === reciter.id;

              return (
                <TouchableOpacity
                  key={reciter.id}
                  style={[styles.reciterItem, isSelected && styles.reciterItemSelected]}
                  onPress={() => handleSelect(reciter.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.reciterInfo}>
                    <Text style={[styles.reciterName, isSelected && styles.reciterNameSelected]}>
                      {reciter.name}
                    </Text>
                    <Text style={styles.reciterArabic}>{reciter.nameArabic}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.previewBtn, isPreviewing && styles.previewBtnActive]}
                    onPress={() => handlePreview(reciter)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={isPreviewing ? 'stop' : 'play'}
                      size={scale(16)}
                      color={isPreviewing ? '#EF4444' : '#6366F1'}
                    />
                  </TouchableOpacity>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={scale(22)} color="#10B981" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { paddingBottom: spacing.xl },
  headerText: {
    fontSize: fontScale(14),
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  section: { marginTop: spacing.md, paddingHorizontal: spacing.md },
  sectionHeader: { marginBottom: scale(10), paddingLeft: scale(4) },
  sectionTitle: {
    fontSize: fontScale(13),
    fontWeight: '700',
    color: '#0D2818',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: fontScale(11),
    color: '#9CA3AF',
    marginTop: scale(2),
  },

  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: scale(14),
    borderRadius: scale(12),
    marginBottom: scale(6),
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    gap: scale(10),
  },
  reciterItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  reciterInfo: { flex: 1 },
  reciterName: {
    fontSize: fontScale(14),
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reciterNameSelected: { color: '#065F46' },
  reciterArabic: {
    fontSize: fontScale(13),
    color: '#9CA3AF',
    marginTop: scale(2),
    fontFamily: 'UthmanicHafs',
  },

  previewBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
});
