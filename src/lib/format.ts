/** Format a number as a Euro currency string using German locale */
export function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

/**
 * Color palette for chart components, keyed by deduction short name.
 * Colors are chosen to meet WCAG 3:1 contrast against both light (#ffffff)
 * and dark (#1d232a, DaisyUI dark base-100) backgrounds.
 */
export const CHART_COLORS: Record<string, string> = {
  Netto: '#16a34a',
  Lohnsteuer: '#dc2626',
  Soli: '#854d0e',
  Kirchensteuer: '#ca8a04',
  Krankenversicherung: '#2563eb',
  Pflegeversicherung: '#7c3aed',
  Rentenversicherung: '#0891b2',
  Arbeitslosenversicherung: '#db2777',
};

/** Short labels for chart axes on small screens */
export const SHORT_LABELS: Record<string, string> = {
  Krankenversicherung: 'KV',
  Pflegeversicherung: 'PV',
  Rentenversicherung: 'RV',
  Arbeitslosenversicherung: 'AV',
  Kirchensteuer: 'KiSt',
  Lohnsteuer: 'LSt',
  Soli: 'Soli',
  Netto: 'Netto',
};

/** Map a deduction name to its chart-friendly short key */
export function toChartKey(name: string): string {
  return name === 'Solidaritätszuschlag' ? 'Soli' : name;
}

/** Build evenly-spaced income sample points from 0 to maxIncome */
export function buildIncomePoints(maxIncome: number): number[] {
  const points: number[] = [0];
  const step = Math.max(1000, Math.round(maxIncome / 100) - (Math.round(maxIncome / 100) % 1000));
  for (let income = step; income <= maxIncome; income += step) {
    points.push(income);
  }
  if (points[points.length - 1] !== maxIncome) {
    points.push(maxIncome);
  }
  return points;
}

/** Translate a chart series key (German canonical or short name) to a display name */
export function translateSeriesId(id: string, t: { chart: { netto: string }; deductions: Record<string, string> }): string {
  if (id === 'Netto') return t.chart.netto;
  if (id === 'Soli') return t.deductions['Solidaritätszuschlag'] || id;
  return t.deductions[id as keyof typeof t.deductions] || id;
}

/** Shared Nivo theme that inherits text color from CSS (works in light and dark mode) */
export const NIVO_THEME = {
  text: { fill: 'currentColor' },
  axis: { ticks: { text: { fill: 'currentColor' } } },
  grid: { line: { stroke: 'currentColor', strokeOpacity: 0.15 } },
};
