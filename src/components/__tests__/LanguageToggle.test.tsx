import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LanguageToggle from '../LanguageToggle';
import { I18nWrapper } from '../../test/i18n-wrapper';
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from '../../i18n/i18n';
import de from '../../i18n/de.json';

describe('LanguageToggle', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.setAttribute('lang', DEFAULT_LOCALE);
  });

  it('renders a select with the default locale selected', () => {
    render(<LanguageToggle />, { wrapper: I18nWrapper });
    const select = screen.getByTestId('language-toggle') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_LOCALE);
  });

  it('has options for all supported locales', () => {
    render(<LanguageToggle />, { wrapper: I18nWrapper });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(LOCALES.map((l) => LOCALE_LABELS[l]));
  });

  it('switches locale when a different option is selected', async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />, { wrapper: I18nWrapper });

    const select = screen.getByTestId('language-toggle');
    const targetLocale = LOCALES.find((l) => l !== DEFAULT_LOCALE)!;
    await user.selectOptions(select, targetLocale);

    expect((select as HTMLSelectElement).value).toBe(targetLocale);
    expect(localStorage.getItem('locale')).toBe(targetLocale);
    expect(document.documentElement.getAttribute('lang')).toBe(targetLocale);
  });

  it('restores locale from localStorage on mount', () => {
    const targetLocale = LOCALES[LOCALES.length - 1];
    localStorage.setItem('locale', targetLocale);
    render(<LanguageToggle />, { wrapper: I18nWrapper });

    const select = screen.getByTestId('language-toggle') as HTMLSelectElement;
    expect(select.value).toBe(targetLocale);
  });

  it('has an accessible aria-label', () => {
    render(<LanguageToggle />, { wrapper: I18nWrapper });
    expect(screen.getByLabelText(de.lang.ariaLabel)).toBeInTheDocument();
  });
});
