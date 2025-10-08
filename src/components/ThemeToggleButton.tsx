import React from 'react';
import { useThemeStore } from '../store/themeStore';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const label = isDark ? '라이트 모드' : '다크 모드';
  const statusDotClass = isDark ? 'bg-amber-300' : 'bg-slate-400';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-6 left-6 z-30 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus:ring-slate-600"
      aria-label={`테마 전환: ${label}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${statusDotClass}`} aria-hidden />
      {label}
    </button>
  );
};

export default ThemeToggleButton;
