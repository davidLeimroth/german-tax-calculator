/**
 * Re-exports from tax-years.ts for backward compatibility.
 * Prefer using getTaxYearConfig() directly for year-aware code.
 */
export { DEFAULT_TAX_YEAR, getTaxYearConfig, AVAILABLE_TAX_YEARS } from './tax-years';
export type { TaxYear, TaxYearConfig } from './tax-years';
