import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I18nProvider, useI18n, LOCALES, DEFAULT_LOCALE, type Locale } from '../i18n';
import de from '../de.json';
import en from '../en.json';
import es from '../es.json';

const allTranslations: Record<Locale, typeof de> = { de, en, es };

function TestConsumer() {
  const { locale, t, setLocale } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t.header.title}</span>
      {LOCALES.map((l) => (
        <button key={l} onClick={() => setLocale(l)} data-testid={`to-${l}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.setAttribute('lang', DEFAULT_LOCALE);
    document.title = '';
  });

  it('defaults to the default locale', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale').textContent).toBe(DEFAULT_LOCALE);
    expect(screen.getByTestId('title').textContent).toBe(allTranslations[DEFAULT_LOCALE].header.title);
  });

  it('can switch to each supported locale', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    for (const locale of LOCALES) {
      act(() => {
        screen.getByTestId(`to-${locale}`).click();
      });

      expect(screen.getByTestId('locale').textContent).toBe(locale);
      expect(screen.getByTestId('title').textContent).toBe(allTranslations[locale].header.title);
      expect(localStorage.getItem('locale')).toBe(locale);
      expect(document.documentElement.getAttribute('lang')).toBe(locale);
    }
  });

  it('restores locale from localStorage', () => {
    const nonDefault = LOCALES.find((l) => l !== DEFAULT_LOCALE)!;
    localStorage.setItem('locale', nonDefault);
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale').textContent).toBe(nonDefault);
  });

  it('updates document title when locale changes', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(document.title).toBe(allTranslations[DEFAULT_LOCALE].meta.title);

    const targetLocale = LOCALES.find((l) => l !== DEFAULT_LOCALE)!;
    act(() => {
      screen.getByTestId(`to-${targetLocale}`).click();
    });

    expect(document.title).toBe(allTranslations[targetLocale].meta.title);
  });
});

describe('Translation files', () => {
  it('all translation files have the same top-level keys', () => {
    const referenceKeys = Object.keys(allTranslations[DEFAULT_LOCALE]).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(allTranslations[locale]).sort()).toEqual(referenceKeys);
    }
  });

  it('all translation files have the same nested keys for each section', () => {
    for (const key of Object.keys(allTranslations[DEFAULT_LOCALE]) as Array<keyof typeof de>) {
      const referenceKeys = Object.keys(allTranslations[DEFAULT_LOCALE][key]).sort();
      for (const locale of LOCALES) {
        expect(Object.keys(allTranslations[locale][key]).sort()).toEqual(referenceKeys);
      }
    }
  });

  it('all deduction keys match the canonical German names from tax-engine', () => {
    const canonicalNames = [
      'Lohnsteuer',
      'Solidaritätszuschlag',
      'Kirchensteuer',
      'Krankenversicherung',
      'Pflegeversicherung',
      'Rentenversicherung',
      'Arbeitslosenversicherung',
    ];
    for (const locale of LOCALES) {
      for (const name of canonicalNames) {
        expect(allTranslations[locale].deductions).toHaveProperty(name);
      }
    }
  });

  it('German deduction display names match their keys', () => {
    for (const [key, value] of Object.entries(allTranslations[DEFAULT_LOCALE].deductions)) {
      expect(key).toBe(value);
    }
  });

  it('all non-default deduction translations are non-empty strings', () => {
    for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      for (const value of Object.values(allTranslations[locale].deductions)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});
