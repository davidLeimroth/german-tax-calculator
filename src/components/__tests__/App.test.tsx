import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { DEFAULT_LOCALE } from '../../i18n/i18n';
import de from '../../i18n/de.json';
import en from '../../i18n/en.json';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('lang', DEFAULT_LOCALE);
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('renders the full app with header, main, and footer', () => {
    render(<App />);

    expect(screen.getByText(de.header.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(de.header.subtitle))).toBeInTheDocument();
    expect(screen.getByText(/Hinweis/)).toBeInTheDocument();
  });

  it('renders the skip link', () => {
    render(<App />);
    expect(screen.getByText(de.header.skipLink)).toBeInTheDocument();
  });

  it('renders both LanguageToggle and ThemeToggle', () => {
    render(<App />);

    expect(screen.getByTestId('language-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('switches language from German to English', async () => {
    const user = userEvent.setup();
    render(<App />);

    const langToggle = screen.getByTestId('language-toggle');
    await user.selectOptions(langToggle, 'en');

    expect(screen.getByText(en.header.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(en.header.subtitle))).toBeInTheDocument();
    expect(screen.getByText(en.header.skipLink)).toBeInTheDocument();
  });

  it('renders the TaxCalculator within the main area', () => {
    render(<App />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main.id).toBe('calculator');
  });

  it('renders the footer with disclaimer and copyright', () => {
    render(<App />);

    expect(screen.getByText(/Keine Gewähr|No guarantee|Sin garantía/)).toBeInTheDocument();
  });
});
