import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TRANSLATIONS, Translation } from '../../lib/translations';
import { getSelectedTranslationId, setSelectedTranslationId } from '../../lib/settings';
import { scale, fontScale, spacing } from '../../lib/responsive';

// Group translations by language
function groupByLanguage(translations: Translation[]): { language: string; items: Translation[] }[] {
  const groups: Record<string, Translation[]> = {};
  for (const t of translations) {
    if (!groups[t.language]) groups[t.language] = [];
    groups[t.language].push(t);
  }
  // Francais first, then alphabetical
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Francais') return -1;
    if (b === 'Francais') return 1;
    return a.localeCompare(b);
  });
  return keys.map(lang => ({ language: lang, items: groups[lang] }));
}

const LANG_FLAGS: Record<string, string> = {
  'Francais': 'FR',
  'English': 'EN',
  'Arabe simplifie': 'AR',
  'Turc': 'TR',
  'Espagnol': 'ES',
  'Allemand': 'DE',
  'Indonesien': 'ID',
  'Urdu': 'UR',
  'Amazigh': 'BER',
};

export default function TranslationSettingsScreen() {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    getSelectedTranslationId().then(setSelectedId);
  }, []);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    await setSelectedTranslationId(id);
  };

  const groups = groupByLanguage(TRANSLATIONS);

  return (
    <>
      <Stack.Screen options={{ title: 'Traduction' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerText}>
          Choisis la traduction affichee sous le texte arabe
        </Text>

        {groups.map(group => (
          <View key={group.language} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>{LANG_FLAGS[group.language] || '??'}</Text>
              </View>
              <Text style={styles.sectionTitle}>{group.language}</Text>
            </View>

            {group.items.map(translation => {
              const isSelected = selectedId === translation.id;
              const isLocal = translation.source === 'local';

              return (
                <TouchableOpacity
                  key={translation.id}
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => handleSelect(translation.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                        {translation.name}
                      </Text>
                      {isLocal && (
                        <View style={styles.offlineBadge}>
                          <Text style={styles.offlineBadgeText}>Hors-ligne</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemAuthor}>{translation.author}</Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={scale(22)} color="#10B981" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={scale(16)} color="#9CA3AF" />
          <Text style={styles.noteText}>
            La traduction "Hors-ligne" est incluse dans l'app. Les autres necessitent une connexion pour le premier chargement, puis sont mises en cache.
          </Text>
        </View>

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
    paddingLeft: scale(4),
    gap: scale(8),
  },
  langBadge: {
    backgroundColor: '#0D2818',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  langBadgeText: { fontSize: fontScale(10), fontWeight: '800', color: '#D4AF37' },
  sectionTitle: {
    fontSize: fontScale(14),
    fontWeight: '700',
    color: '#0D2818',
  },

  item: {
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
  itemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  itemName: {
    fontSize: fontScale(14),
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemNameSelected: { color: '#065F46' },
  itemAuthor: {
    fontSize: fontScale(12),
    color: '#9CA3AF',
    marginTop: scale(2),
  },
  offlineBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  offlineBadgeText: {
    fontSize: fontScale(10),
    fontWeight: '700',
    color: '#10B981',
  },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  noteText: {
    flex: 1,
    fontSize: fontScale(12),
    color: '#9CA3AF',
    lineHeight: fontScale(12) * 1.5,
  },
});
