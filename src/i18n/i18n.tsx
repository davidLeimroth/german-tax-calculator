import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import de from './de.json';
import en from './en.json';
import es from './es.json';

export type Locale = 'de' | 'en' | 'es';
export type Translations = typeof de;

export const LOCALES: Locale[] = ['de', 'en', 'es'];
export const DEFAULT_LOCALE: Locale = 'de';
const translations: Record<Locale, Translations> = { de, en, es };

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'de',
  t: de,
  setLocale: () => {},
});

function isLocale(value: string | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function updateUrlParam(key: string, value: string, defaultValue: string) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (value === defaultValue) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const urlParam = new URLSearchParams(window.location.search).get('lang');
    if (isLocale(urlParam)) return urlParam;
    const stored = localStorage.getItem('locale');
    if (isLocale(stored)) return stored;
  }
  return 'de';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
    document.documentElement.setAttribute('lang', l);
    document.title = translations[l].meta.title;
    updateUrlParam('lang', l, DEFAULT_LOCALE);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
    document.title = translations[locale].meta.title;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Cycle to the next locale: de → en → es → de */
export function nextLocale(current: Locale): Locale {
  const idx = LOCALES.indexOf(current);
  return LOCALES[(idx + 1) % LOCALES.length];
}

/** Short display label for each locale */
export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  es: 'ES',
};
