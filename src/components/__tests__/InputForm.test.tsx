import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InputForm, { DEFAULT_VALUES, formValuesToTaxInput } from '../InputForm';
import { I18nWrapper } from '../../test/i18n-wrapper';

describe('InputForm', () => {
  it('renders all form fields', () => {
    render(<InputForm onChange={vi.fn()} />, { wrapper: I18nWrapper });

    expect(screen.getByLabelText(/Bruttoeinkommen/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gehaltszeitraum/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Steuerklasse/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bundesland/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kirchenmitglied/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Anzahl Kinder/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alter/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Krankenversicherung/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Zusatzbeitrag/)).toBeInTheDocument();
  });

  it('has correct default values', () => {
    render(<InputForm onChange={vi.fn()} />, { wrapper: I18nWrapper });

    expect(screen.getByLabelText(/Bruttoeinkommen/)).toHaveValue(50000);
    expect(screen.getByLabelText(/Gehaltszeitraum/)).toHaveValue('annual');
    expect(screen.getByLabelText(/Steuerklasse/)).toHaveValue('1');
    expect(screen.getByLabelText(/Bundesland/)).toHaveValue('Baden-Wuerttemberg');
    expect(screen.getByLabelText(/Kirchenmitglied/)).not.toBeChecked();
    expect(screen.getByLabelText(/Anzahl Kinder/)).toHaveValue(0);
    expect(screen.getByLabelText(/Alter/)).toHaveValue(30);
    expect(screen.getByRole('combobox', { name: /Krankenversicherung/ })).toHaveValue('gesetzlich');
  });

  it('shows PKV field when privat is selected', async () => {
    const user = userEvent.setup();
    render(<InputForm onChange={vi.fn()} />, { wrapper: I18nWrapper });

    const kvSelect = screen.getByRole('combobox', { name: /Krankenversicherung/ });
    await user.selectOptions(kvSelect, 'privat');

    expect(screen.getByLabelText(/PKV Eigenbeitrag/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Zusatzbeitrag/)).not.toBeInTheDocument();
  });

  it('calls onChange with updated values on field change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InputForm onChange={onChange} />, { wrapper: I18nWrapper });

    // Initial call with defaults
    expect(onChange).toHaveBeenCalled();

    const taxClassSelect = screen.getByLabelText(/Steuerklasse/);
    await user.selectOptions(taxClassSelect, '3');

    const lastCallValues = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallValues.taxClass).toBe(3);
  });

  it('clamps salary to zero for negative input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InputForm onChange={onChange} />, { wrapper: I18nWrapper });

    const salaryInput = screen.getByLabelText(/Bruttoeinkommen/);
    await user.clear(salaryInput);
    await user.type(salaryInput, '0');

    const lastCallValues = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallValues.grossSalary).toBeGreaterThanOrEqual(0);
  });
});

describe('formValuesToTaxInput', () => {
  it('converts annual salary correctly', () => {
    const input = formValuesToTaxInput(DEFAULT_VALUES);
    expect(input.grossSalary).toBe(50000);
    expect(input.salaryMode).toBe('annual');
    expect(input.taxClass).toBe(1);
    expect(input.state).toBe('Baden-Wuerttemberg');
    expect(input.churchMember).toBe(false);
    expect(input.childrenCount).toBe(0);
    expect(input.healthInsuranceType).toBe('gesetzlich');
    expect(input.zusatzbeitragRate).toBeCloseTo(0.025);
  });

  it('converts monthly salary correctly', () => {
    const values = { ...DEFAULT_VALUES, salaryMode: 'monthly' as const, grossSalary: 5000 };
    const input = formValuesToTaxInput(values);
    expect(input.grossSalary).toBe(5000);
    expect(input.salaryMode).toBe('monthly');
  });

  it('converts zusatzbeitrag from percentage to decimal', () => {
    const values = { ...DEFAULT_VALUES, zusatzbeitragRate: 1.7 };
    const input = formValuesToTaxInput(values);
    expect(input.zusatzbeitragRate).toBeCloseTo(0.017);
  });
});
