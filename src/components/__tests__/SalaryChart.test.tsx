import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SalaryChart from '../SalaryChart';
import { calculateNetSalary } from '../../lib/tax-engine';
import type { TaxResult } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

// Mock Nivo's ResponsivePie since it requires a real DOM with dimensions
vi.mock('@nivo/pie', () => ({
  ResponsivePie: ({ data }: { data: Array<{ id: string; value: number }> }) => (
    <div data-testid="mock-pie-chart">
      {data.map((d) => (
        <span key={d.id} data-testid={`pie-slice-${d.id}`}>
          {d.id}: {d.value}
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

describe('SalaryChart', () => {
  it('renders the pie chart container', () => {
    const result = getSampleResult();
    render(<SalaryChart result={result} />, { wrapper: I18nWrapper });
    expect(screen.getByRole('figure', { name: /Gehaltsaufteilung als Kreisdiagramm/ })).toBeInTheDocument();
  });

  it('renders pie slices for all non-zero deductions', () => {
    const result = getSampleResult();
    render(<SalaryChart result={result} />, { wrapper: I18nWrapper });

    expect(screen.getByTestId('pie-slice-Netto')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Lohnsteuer')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Krankenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Rentenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Arbeitslosenversicherung')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Pflegeversicherung')).toBeInTheDocument();
  });

  it('does not render slices for zero-value items', () => {
    const result = getSampleResult();
    // No church member -> no Kirchensteuer
    render(<SalaryChart result={result} />, { wrapper: I18nWrapper });
    expect(screen.queryByTestId('pie-slice-Kirchensteuer')).not.toBeInTheDocument();
  });

  it('includes Kirchensteuer slice when church member', () => {
    const result = calculateNetSalary({
      grossSalary: 50000,
      salaryMode: 'annual',
      taxYear: 2025,
      taxClass: 1,
      state: 'Bayern',
      churchMember: true,
      childrenCount: 0,
      healthInsuranceType: 'gesetzlich',
      zusatzbeitragRate: 0.017,
      age: 30,
    });
    render(<SalaryChart result={result} />, { wrapper: I18nWrapper });
    expect(screen.getByTestId('pie-slice-Kirchensteuer')).toBeInTheDocument();
  });

  it('updates when result prop changes', () => {
    const result1 = getSampleResult();
    const { rerender } = render(<SalaryChart result={result1} />, { wrapper: I18nWrapper });
    const netto1 = screen.getByTestId('pie-slice-Netto').textContent;

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
        <SalaryChart result={result2} />
      </I18nWrapper>
    );
    const netto2 = screen.getByTestId('pie-slice-Netto').textContent;

    expect(netto1).not.toBe(netto2);
  });
});
