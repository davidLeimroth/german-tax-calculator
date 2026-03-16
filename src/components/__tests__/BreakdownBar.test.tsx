import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BreakdownBar from '../BreakdownBar';
import { calculateNetSalary } from '../../lib/tax-engine';
import type { TaxResult } from '../../lib/types';

// Mock Nivo's ResponsiveBar since it requires a real DOM with dimensions
vi.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data, keys }: { data: Array<Record<string, number | string>>; keys: string[] }) => (
    <div data-testid="mock-bar-chart">
      {keys.map((key) => (
        <span key={key} data-testid={`bar-segment-${key}`}>
          {key}: {data[0][key]}
        </span>
      ))}
    </div>
  ),
}));

function getSampleResult(): TaxResult {
  return calculateNetSalary({
    annualGrossSalary: 50000,
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
    render(<BreakdownBar result={result} />);
    expect(screen.getByRole('img', { name: /Monthly breakdown bar chart/ })).toBeInTheDocument();
  });

  it('renders bar segments for all non-zero deductions', () => {
    const result = getSampleResult();
    render(<BreakdownBar result={result} />);

    expect(screen.getByTestId('bar-segment-Netto')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Lohnsteuer')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Krankenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Rentenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-Arbeitslosenversicherung')).toBeInTheDocument();
  });

  it('does not render segments for zero-value items', () => {
    const result = getSampleResult();
    render(<BreakdownBar result={result} />);
    // No church member -> no Kirchensteuer
    expect(screen.queryByTestId('bar-segment-Kirchensteuer')).not.toBeInTheDocument();
    // Soli may or may not be zero depending on income level
  });

  it('updates when result prop changes', () => {
    const result1 = getSampleResult();
    const { rerender } = render(<BreakdownBar result={result1} />);
    const netto1 = screen.getByTestId('bar-segment-Netto').textContent;

    const result2 = calculateNetSalary({
      annualGrossSalary: 80000,
      taxClass: 1,
      state: 'Bayern',
      churchMember: false,
      childrenCount: 0,
      healthInsuranceType: 'gesetzlich',
      zusatzbeitragRate: 0.017,
      age: 30,
    });
    rerender(<BreakdownBar result={result2} />);
    const netto2 = screen.getByTestId('bar-segment-Netto').textContent;

    expect(netto1).not.toBe(netto2);
  });
});
