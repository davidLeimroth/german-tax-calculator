import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import TaxCalculator from '../TaxCalculator';

describe('TaxCalculator', () => {
  it('renders with default values and shows results', () => {
    render(<TaxCalculator />);

    expect(screen.getByText('Eingaben')).toBeInTheDocument();
    expect(screen.getByText('Aufschluesselung')).toBeInTheDocument();
    expect(screen.getByText(/Brutto \/ Monat/)).toBeInTheDocument();
    expect(screen.getByText(/Netto \/ Monat/)).toBeInTheDocument();
    expect(screen.getByText(/Abzuege \/ Monat/)).toBeInTheDocument();
  });

  it('shows deductions breakdown table', () => {
    render(<TaxCalculator />);

    const table = screen.getByRole('table', { name: /Deductions breakdown/ });
    expect(within(table).getByText('Lohnsteuer')).toBeInTheDocument();
    expect(within(table).getByText('Krankenversicherung')).toBeInTheDocument();
    expect(within(table).getByText('Rentenversicherung')).toBeInTheDocument();
    expect(within(table).getByText('Arbeitslosenversicherung')).toBeInTheDocument();
    expect(within(table).getByText('Pflegeversicherung')).toBeInTheDocument();
  });

  it('displays form and results in a responsive layout', () => {
    const { container } = render(<TaxCalculator />);
    const layout = container.firstElementChild;
    expect(layout?.className).toContain('flex');
    expect(layout?.className).toContain('flex-col');
    expect(layout?.className).toContain('lg:flex-row');
  });

  it('updates results when tax class changes', async () => {
    const user = userEvent.setup();
    render(<TaxCalculator />);

    const nettoStat = screen.getByText(/Netto \/ Monat/).closest('.stat');
    const nettoBefore = nettoStat?.querySelector('.stat-value')?.textContent;

    const taxClassSelect = screen.getByLabelText(/Steuerklasse/);
    await user.selectOptions(taxClassSelect, '3');

    const nettoStatAfter = screen.getByText(/Netto \/ Monat/).closest('.stat');
    const nettoAfter = nettoStatAfter?.querySelector('.stat-value')?.textContent;

    // Tax class 3 should result in higher net income than tax class 1
    expect(nettoAfter).not.toBe(nettoBefore);
  });
});
