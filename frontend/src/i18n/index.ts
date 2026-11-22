import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fil from './fil.json';

export const resources = { en: { translation: en }, fil: { translation: fil } } as const;
export type Language = keyof typeof resources;

/** Device language -> app language. Tagalog (tl) phones get Filipino too. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'fil' || code === 'tl' ? 'fil' : 'en';
}

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
