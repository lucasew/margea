import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

/** Supported <html lang> tags (resource keys). Longest prefix match wins. */
const HTML_LANGS = ['en', 'es', 'pt'] as const;

/** Map i18next language codes to BCP-47 tags for <html lang>. */
function toHtmlLang(lng: string): string {
  const lower = lng.toLowerCase();
  // Longest prefix match wins (e.g. pt-BR before pt if both listed).
  const byLength = [...HTML_LANGS].sort((a, b) => b.length - a.length);
  for (const code of byLength) {
    if (lower === code || lower.startsWith(`${code}-`)) return code;
  }
  return 'en';
}

function syncDocumentLang(lng: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = toHtmlLang(lng);
}

i18next.on('languageChanged', syncDocumentLang);

void i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
  })
  .then(() => {
    syncDocumentLang(i18next.language);
  });

export default i18next;
