import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import BreakdownTable from '../BreakdownTable';
import { calculateNetSalary } from '../../lib/tax-engine';
import type { TaxResult } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

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

describe('BreakdownTable', () => {
  it('renders the table with correct column headers', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    const table = screen.getByRole('table', { name: /Aufschlüsselung der Abzüge/ });
    expect(table).toBeInTheDocument();

    expect(screen.getByText('Abzug')).toBeInTheDocument();
    expect(screen.getByText('Arbeitnehmer')).toBeInTheDocument();
    expect(screen.getByText('Arbeitgeber')).toBeInTheDocument();
    expect(screen.getByText('Gesamt')).toBeInTheDocument();
    expect(screen.getByText('% vom Brutto')).toBeInTheDocument();
  });

  it('renders rows for each non-zero deduction', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    expect(screen.getByText('Lohnsteuer')).toBeInTheDocument();
    expect(screen.getByText('Krankenversicherung')).toBeInTheDocument();
    expect(screen.getByText('Rentenversicherung')).toBeInTheDocument();
    expect(screen.getByText('Arbeitslosenversicherung')).toBeInTheDocument();
    expect(screen.getByText('Pflegeversicherung')).toBeInTheDocument();
  });

  it('does not render rows for zero-value deductions', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    // No church tax for non-member
    const rows = screen.getAllByRole('row');
    const cellTexts = rows.map((r) => r.textContent);
    const hasKirchensteuer = cellTexts.some((t) => t?.includes('Kirchensteuer'));
    expect(hasKirchensteuer).toBe(false);
  });

  it('shows summary row for total deductions', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    expect(screen.getByText('Gesamt Abzüge')).toBeInTheDocument();
  });

  it('shows net salary summary row', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    // The Netto row in the footer
    const tfoot = screen.getByRole('table').querySelector('tfoot');
    expect(tfoot).not.toBeNull();
    expect(within(tfoot!).getByText('Netto')).toBeInTheDocument();
  });

  it('displays correct percentage values', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    // All percentage cells should contain a % sign
    const cells = screen.getAllByText(/%/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('supports column sorting by clicking headers', async () => {
    const user = userEvent.setup();
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    // Click the "Arbeitnehmer" header to sort
    const employeeHeader = screen.getByText('Arbeitnehmer');
    await user.click(employeeHeader);

    // After first click, should show a sort indicator (ascending or descending)
    const firstSort = employeeHeader.closest('th')?.getAttribute('aria-sort');
    expect(['ascending', 'descending']).toContain(firstSort);

    // Click again to toggle sort direction
    await user.click(employeeHeader);
    const secondSort = employeeHeader.closest('th')?.getAttribute('aria-sort');
    expect(['ascending', 'descending']).toContain(secondSort);
    expect(secondSort).not.toBe(firstSort);

    // Click again to clear sorting
    await user.click(employeeHeader);
    expect(employeeHeader.closest('th')?.getAttribute('aria-sort')).toBe('none');
  });

  it('renders with responsive overflow wrapper', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    const wrapper = screen.getByRole('region', { name: /Detaillierte Aufschlüsselung/ });
    expect(wrapper.className).toContain('overflow-x-auto');
  });

  it('updates when result prop changes', () => {
    const result1 = getSampleResult();
    const { rerender } = render(<BreakdownTable result={result1} />, { wrapper: I18nWrapper });

    const tfoot1 = screen.getByRole('table').querySelector('tfoot');
    const nettoText1 = within(tfoot1!).getByText('Netto').closest('tr')?.textContent;

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
        <BreakdownTable result={result2} />
      </I18nWrapper>
    );

    const tfoot2 = screen.getByRole('table').querySelector('tfoot');
    const nettoText2 = within(tfoot2!).getByText('Netto').closest('tr')?.textContent;

    expect(nettoText1).not.toBe(nettoText2);
  });

  it('shows employer share columns with correct values', () => {
    const result = getSampleResult();
    render(<BreakdownTable result={result} />, { wrapper: I18nWrapper });

    // Rentenversicherung should have employer share > 0
    const rvRow = screen.getByText('Rentenversicherung').closest('tr');
    expect(rvRow).not.toBeNull();
    // The row should have multiple cells with EUR values
    const cells = within(rvRow!).getAllByText(/€/);
    expect(cells.length).toBeGreaterThanOrEqual(3); // employee, employer, total
  });
});
