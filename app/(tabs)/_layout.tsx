import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { scale, fontScale } from '../../lib/responsive';
import { useTheme } from '../../context/ThemeContext';

export default function TabsLayout() {
  const tabBarHeight = Platform.OS === 'ios' ? scale(64) : scale(60);
  const iconSize = scale(24);
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.separator,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? scale(6) : scale(6),
          paddingTop: scale(6),
          height: tabBarHeight,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontScale(11),
          fontWeight: '600',
          marginTop: scale(2),
        },
        headerStyle: {
          backgroundColor: colors.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.separator,
        },
        headerTintColor: colors.gold,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: fontScale(18),
          color: colors.textOnHeader,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Challenge',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'star' : 'star-outline'} size={iconSize} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sourates"
        options={{
          title: 'Sourates',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'book' : 'book-outline'} size={iconSize} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progression"
        options={{
          title: 'Progression',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'trending-up' : 'trending-up-outline' as any} size={iconSize} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={iconSize} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: scale(12),
    padding: scale(4),
    paddingHorizontal: scale(12),
  },
});
