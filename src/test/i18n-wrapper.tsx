import type { ReactNode } from 'react';
import { I18nProvider } from '../i18n/i18n';

/** Wraps a component with the I18nProvider for tests (defaults to German locale). */
export function I18nWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
