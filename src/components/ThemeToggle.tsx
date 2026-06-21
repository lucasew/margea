import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'react-feather';
import { THEMES } from '../constants';

type Theme = (typeof THEMES)[keyof typeof THEMES];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
      return savedTheme;
    }
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? THEMES.DARK : THEMES.LIGHT;
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
      className="btn btn-ghost btn-sm gap-2"
      title={title}
    >
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </div>
      <span className="hidden lg:inline text-sm">{label}</span>
    </button>
  );
}
