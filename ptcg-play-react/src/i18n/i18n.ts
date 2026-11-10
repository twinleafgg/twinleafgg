import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../ptcg-play/src/assets/i18n/en.json';
import es from '../../../ptcg-play/src/assets/i18n/es.json';
import jp from '../../../ptcg-play/src/assets/i18n/jp.json';
import fr from '../../../ptcg-play/src/assets/i18n/fr.json';
import { CUBE_EN } from '../cube/cubeStrings';
import { isSupportedLanguage, type SupportedLanguageCode } from './languages';

const resources = {
  en: { translation: { ...en, ...CUBE_EN } },
  es: { translation: es },
  jp: { translation: jp },
  fr: { translation: fr },
} as const;

function normalizeStoredLanguage(): void {
  const raw = localStorage.getItem('language');
  if (raw !== null && !isSupportedLanguage(raw)) {
    localStorage.removeItem('language');
  }
}

function pickLanguage(): SupportedLanguageCode {
  normalizeStoredLanguage();
  const raw = localStorage.getItem('language');
  if (raw && isSupportedLanguage(raw)) {
    return raw;
  }
  const m = typeof navigator !== 'undefined' ? navigator.language.match(/\w\w/i) : null;
  const fromNav = m?.[0]?.toLowerCase();
  if (fromNav && isSupportedLanguage(fromNav)) {
    return fromNav;
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: pickLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'jp', 'fr'],
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(code: SupportedLanguageCode): void {
  localStorage.setItem('language', code);
  void i18n.changeLanguage(code);
}

export default i18n;
