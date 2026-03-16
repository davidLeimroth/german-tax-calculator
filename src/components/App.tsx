import { I18nProvider, useI18n } from '../i18n/i18n';
import TaxCalculator from './TaxCalculator';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

function AppContent() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen">
      <a
        href="#calculator"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-content focus:rounded"
      >
        {t.header.skipLink}
      </a>
      <header className="navbar bg-base-100 shadow-sm px-6">
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t.header.title}</h1>
          <p className="text-xs text-base-content/60 hidden sm:block">
            {t.header.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main id="calculator" className="w-full px-6 py-8 flex-1" aria-label="Tax calculator">
        <TaxCalculator />
      </main>

      <footer className="bg-base-100 border-t border-base-300 py-6 mt-8">
        <div className="px-6 text-center text-sm">
          <p className="text-base-content/80">
            <strong>{t.footer.disclaimer.split(':')[0]}:</strong>
            {t.footer.disclaimer.substring(t.footer.disclaimer.indexOf(':') + 1)}
          </p>
          <p className="mt-2 text-base-content/60">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
