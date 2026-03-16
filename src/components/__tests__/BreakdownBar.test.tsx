import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BreakdownBar from '../BreakdownBar';
import { calculateNetSalary } from '../../lib/tax-engine';
import type { TaxResult } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

// Mock Nivo's ResponsiveBar since it requires a real DOM with dimensions
vi.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data, keys }: { data: Array<Record<string, number | string>>; keys: string[] }) => (
    <div data-testid="mock-bar-chart">
      {data.map((d, i) => (
        <span key={i} data-testid={`bar-segment-${d.fullName || d.category}`}>
          {d.fullName || d.category}: {keys.includes('value') ? d.value : keys.map((k) => d[k]).join(',')}
        </span>
      ))}
    </div>
  ),
}));

function getSampleResult(): TaxResult {
  return calculateNetSalary({
    grossSalary: 50000,
    salaryMode: 'annual',
    taxYear: 2025,
    taxClass: 1,
    state: 'Bayern',
    churchMember: false,
    childrenCount: 0,
    healthInsuranceType: 'gesetzlich',
    zusatzbeitragRate: 0.017,
    age: 30,
  });
}

describe('BreakdownBar', () => {
  it('renders the bar chart container', () => {
    const result = getSampleResult();
    render(<BreakdownBar result={result} />, { wrapper: I18nWrapper });
    expect(screen.getByRole('figure', { name: /Monatliche Aufschlüsselung als Balkendiagramm/ })).toBeInTheDocument();
  });

  it('renders bar segments for all non-zero deductions', () => {
    const result = getSampleResult();
    render(<BreakdownBar result={result} />, { wrapper: I18nWrapper });

    expect(screen.getByTestId('bar-segment-Netto')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Lohnsteuer')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Krankenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Rentenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Arbeitslosenversicherung')).toBeInTheDocument();
  });

  it('does not render segments for zero-value items', () => {
    const result = getSampleResult();
    render(<BreakdownBar result={result} />, { wrapper: I18nWrapper });
    // No church member -> no Kirchensteuer
    expect(screen.queryByTestId('bar-segment-Kirchensteuer')).not.toBeInTheDocument();
  });

  it('updates when result prop changes', () => {
    const result1 = getSampleResult();
    const { rerender } = render(<BreakdownBar result={result1} />, { wrapper: I18nWrapper });
    const netto1 = screen.getByTestId('bar-segment-Netto').textContent;

    const result2 = calculateNetSalary({
      grossSalary: 80000,
      salaryMode: 'annual',
      taxYear: 2025,
      taxClass: 1,
      state: 'Bayern',
      churchMember: false,
      childrenCount: 0,
      healthInsuranceType: 'gesetzlich',
      zusatzbeitragRate: 0.017,
      age: 30,
    });
    rerender(
      <I18nWrapper>
        <BreakdownBar result={result2} />
      </I18nWrapper>
    );
    const netto2 = screen.getByTestId('bar-segment-Netto').textContent;

    expect(netto1).not.toBe(netto2);
  });
});
