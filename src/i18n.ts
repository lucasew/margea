import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

/** Map i18next language codes to BCP-47 tags for <html lang>. */
function toHtmlLang(lng: string): string {
  const base = lng.split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'en' || base === 'es' || base === 'pt') return base;
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
