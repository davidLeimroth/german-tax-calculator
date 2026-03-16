import { useI18n, LOCALES, LOCALE_LABELS, type Locale } from '../i18n/i18n';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      className="select select-ghost select-sm"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label={t.lang.ariaLabel}
      data-testid="language-toggle"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
