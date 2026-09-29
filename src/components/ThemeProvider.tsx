'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

export function useTheme() { return useContext(ThemeContext); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('qh_theme') as Theme;
    if (saved) setTheme(saved);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    setLoaded(true);
  }, []);

  // Ne pas ecrire avant d'avoir lu le theme sauvegarde (sinon "light" l'ecrase au montage)
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('qh_theme', theme);
  }, [theme, loaded]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
