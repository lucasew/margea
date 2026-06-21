import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'react-feather';
import { THEMES, resolveTheme } from '../constants';

type Theme = (typeof THEMES)[keyof typeof THEMES];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    return resolveTheme(localStorage.getItem('theme'), prefersDark) as Theme;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT,
    );
  };

  const { t } = useTranslation();
  const isDarkMode = theme === THEMES.DARK;
  const title = isDarkMode ? t('theme.toggleToLight') : t('theme.toggleToDark');
  const label = isDarkMode ? t('theme.light') : t('theme.dark');

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-sm btn-square"
      title={title}
      aria-label={title}
    >
      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
