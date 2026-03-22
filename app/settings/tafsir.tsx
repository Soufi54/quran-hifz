import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAFSIRS, Tafsir } from '../../lib/translations';
import { getSelectedTafsirId, setSelectedTafsirId } from '../../lib/settings';
import { scale, fontScale, spacing } from '../../lib/responsive';

function groupByLanguage(tafsirs: Tafsir[]): { language: string; items: Tafsir[] }[] {
  const groups: Record<string, Tafsir[]> = {};
  for (const t of tafsirs) {
    if (!groups[t.language]) groups[t.language] = [];
    groups[t.language].push(t);
  }
  // Arabe first (most tafsirs are in Arabic), then others
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Arabe') return -1;
    if (b === 'Arabe') return 1;
    if (a === 'Francais') return -1;
    if (b === 'Francais') return 1;
    return a.localeCompare(b);
  });
  return keys.map(lang => ({ language: lang, items: groups[lang] }));
}

const TAFSIR_ICONS: Record<string, string> = {
  'Arabe': 'book',
  'Francais': 'book-outline',
  'English': 'book-outline',
};

export default function TafsirSettingsScreen() {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    getSelectedTafsirId().then(setSelectedId);
  }, []);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    await setSelectedTafsirId(id);
  };

  const groups = groupByLanguage(TAFSIRS);

  return (
    <>
      <Stack.Screen options={{ title: 'Tafsir' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerText}>
          Choisis le tafsir (exegese) affiche quand tu appuies sur un verset
        </Text>

        {groups.map(group => (
          <View key={group.language} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={(TAFSIR_ICONS[group.language] || 'book-outline') as any}
                size={scale(18)}
                color="#D4AF37"
              />
              <Text style={styles.sectionTitle}>{group.language}</Text>
            </View>

            {group.items.map(tafsir => {
              const isSelected = selectedId === tafsir.id;

              return (
                <TouchableOpacity
                  key={tafsir.id}
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => handleSelect(tafsir.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                      {tafsir.name}
                    </Text>
                    <Text style={styles.itemAuthor}>{tafsir.author}</Text>
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
            Le tafsir est telecharge a la demande quand tu appuies sur un verset. Il est ensuite mis en cache pour une utilisation hors-ligne.
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
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: fontScale(14),
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemNameSelected: { color: '#0D2818' },
  itemAuthor: {
    fontSize: fontScale(12),
    color: '#9CA3AF',
    marginTop: scale(2),
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
