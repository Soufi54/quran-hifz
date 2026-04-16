/**
 * Systeme de theme Light / Dark pour l'application
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceBorder: string;
  headerBg: string;
  tabBarBg: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnHeader: string;
  textOnHeaderMuted: string;

  // Accents (identiques dans les 2 themes)
  gold: string;
  goldLight: string;
  goldFaint: string;
  darkGreen: string;
  mediumGreen: string;

  // Status (identiques)
  correct: string;
  error: string;
  hesitation: string;
  warning: string;

  // Borders & shadows
  border: string;
  borderFaint: string;
  shadow: string;
  separator: string;

  // Toggle / Pill backgrounds
  toggleBg: string;
  toggleActiveBg: string;
  toggleActiveBorder: string;

  // Surah page specifics
  parchment: string;
  parchmentDark: string;
  surfaceCard: string;
  textOnDarkBg: string;
  textSubtle: string;
  hiddenOverlay: string;
}

export const LightTheme: ThemeColors = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceBorder: '#F3F4F6',
  headerBg: '#0D2818',
  tabBarBg: '#0D2818',

  textPrimary: '#0D2818',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnHeader: '#FFFFFF',
  textOnHeaderMuted: 'rgba(255,255,255,0.6)',

  gold: '#D4AF37',
  goldLight: 'rgba(212,175,55,0.15)',
  goldFaint: 'rgba(212,175,55,0.06)',
  darkGreen: '#0D2818',
  mediumGreen: '#1B4332',

  correct: '#10B981',
  error: '#EF4444',
  hesitation: '#F59E0B',
  warning: '#F97316',

  border: '#E5E7EB',
  borderFaint: '#F3F4F6',
  shadow: '#000000',
  separator: 'rgba(212,175,55,0.15)',

  toggleBg: '#FFFFFF',
  toggleActiveBg: 'rgba(212,175,55,0.1)',
  toggleActiveBorder: 'rgba(212,175,55,0.2)',

  parchment: '#FDF6E3',
  parchmentDark: '#F5ECD0',
  surfaceCard: '#FFFFFF',
  textOnDarkBg: '#FFFFFF',
  textSubtle: '#374151',
  hiddenOverlay: 'rgba(0,0,0,0.015)',
};

export const DarkTheme: ThemeColors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceBorder: '#2A2A2A',
  headerBg: '#111111',
  tabBarBg: '#111111',

  textPrimary: '#F5F5F5',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',
  textOnHeader: '#F5F5F5',
  textOnHeaderMuted: 'rgba(255,255,255,0.5)',

  gold: '#D4AF37',
  goldLight: 'rgba(212,175,55,0.2)',
  goldFaint: 'rgba(212,175,55,0.08)',
  darkGreen: '#0D2818',
  mediumGreen: '#1B4332',

  correct: '#10B981',
  error: '#EF4444',
  hesitation: '#F59E0B',
  warning: '#F97316',

  border: '#2A2A2A',
  borderFaint: '#222222',
  shadow: '#000000',
  separator: 'rgba(212,175,55,0.1)',

  toggleBg: '#1A1A1A',
  toggleActiveBg: 'rgba(212,175,55,0.15)',
  toggleActiveBorder: 'rgba(212,175,55,0.3)',

  parchment: '#121212',
  parchmentDark: '#1A1A1A',
  surfaceCard: '#1E1E1E',
  textOnDarkBg: '#F5F5F5',
  textSubtle: '#A0A0A0',
  hiddenOverlay: 'rgba(255,255,255,0.03)',
};

export function getTheme(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? DarkTheme : LightTheme;
}
