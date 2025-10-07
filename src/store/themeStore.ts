import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'trakko-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDocument(initialTheme);

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      set({ theme });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
      applyThemeToDocument(theme);
    },
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(nextTheme);
    }
  };
});
