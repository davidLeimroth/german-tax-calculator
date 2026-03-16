/** Format a number as a Euro currency string using German locale */
export function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

/** Color palette for chart components, keyed by deduction short name */
export const CHART_COLORS: Record<string, string> = {
  Netto: '#22c55e',
  Lohnsteuer: '#ef4444',
  Soli: '#f97316',
  Kirchensteuer: '#eab308',
  Krankenversicherung: '#3b82f6',
  Pflegeversicherung: '#8b5cf6',
  Rentenversicherung: '#06b6d4',
  Arbeitslosenversicherung: '#ec4899',
};
