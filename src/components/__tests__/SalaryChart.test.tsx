import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SalaryChart from '../SalaryChart';
import { calculateNetSalary } from '../../lib/tax-engine';
import type { TaxResult } from '../../lib/types';

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

describe('SalaryChart', () => {
  it('renders the pie chart container', () => {
    const result = getSampleResult();
    render(<SalaryChart result={result} />);
    expect(screen.getByRole('img', { name: /Salary breakdown pie chart/ })).toBeInTheDocument();
  });

  it('renders pie slices for all non-zero deductions', () => {
    const result = getSampleResult();
    render(<SalaryChart result={result} />);

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
    render(<SalaryChart result={result} />);
    expect(screen.queryByTestId('pie-slice-Kirchensteuer')).not.toBeInTheDocument();
  });

  it('includes Kirchensteuer slice when church member', () => {
    const result = calculateNetSalary({
      annualGrossSalary: 50000,
      taxClass: 1,
      state: 'Bayern',
      churchMember: true,
      childrenCount: 0,
      healthInsuranceType: 'gesetzlich',
      zusatzbeitragRate: 0.017,
      age: 30,
    });
    render(<SalaryChart result={result} />);
    expect(screen.getByTestId('pie-slice-Kirchensteuer')).toBeInTheDocument();
  });

  it('updates when result prop changes', () => {
    const result1 = getSampleResult();
    const { rerender } = render(<SalaryChart result={result1} />);
    const netto1 = screen.getByTestId('pie-slice-Netto').textContent;

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
    rerender(<SalaryChart result={result2} />);
    const netto2 = screen.getByTestId('pie-slice-Netto').textContent;

    expect(netto1).not.toBe(netto2);
  });
});
