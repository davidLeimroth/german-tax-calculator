import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaxClassChart from '../TaxClassChart';
import type { TaxInput } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

vi.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data, indexBy, keys }: {
    data: Array<Record<string, unknown>>;
    indexBy: string;
    keys: string[];
  }) => (
    <div data-testid="mock-bar-chart">
      {data.map((d) => (
        <span key={String(d[indexBy])} data-testid={`bar-${d[indexBy]}`}>
          {String(d[indexBy])}: {keys.map((k) => String(d[k])).join(',')}
          {d.isCurrent ? ' (current)' : ''}
        </span>
      ))}
    </div>
  ),
}));

function getBaseInput(overrides?: Partial<TaxInput>): TaxInput {
  return {
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
    ...overrides,
  };
}

describe('TaxClassChart', () => {
  it('renders with a figure role and accessible caption', () => {
    render(<TaxClassChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const figure = screen.getByRole('figure');
    expect(figure).toBeInTheDocument();
    expect(figure).toHaveAttribute('aria-labelledby', 'tax-class-chart-caption');
  });

  it('renders bars for all six tax classes', () => {
    render(<TaxClassChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    for (let tc = 1; tc <= 6; tc++) {
      expect(screen.getByTestId(`bar-${tc}`)).toBeInTheDocument();
    }
  });

  it('marks the current tax class', () => {
    render(<TaxClassChart baseInput={getBaseInput({ taxClass: 3 })} />, { wrapper: I18nWrapper });

    const bar3 = screen.getByTestId('bar-3');
    expect(bar3.textContent).toContain('(current)');

    const bar1 = screen.getByTestId('bar-1');
    expect(bar1.textContent).not.toContain('(current)');
  });

  it('computes different net values for different tax classes', () => {
    render(<TaxClassChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const bar1Text = screen.getByTestId('bar-1').textContent;
    const bar3Text = screen.getByTestId('bar-3').textContent;
    const bar5Text = screen.getByTestId('bar-5').textContent;

    // Tax class 3 should yield higher net than class 1
    // Tax class 5 should yield lower net than class 1
    expect(bar1Text).not.toBe(bar3Text);
    expect(bar1Text).not.toBe(bar5Text);
  });

  it('renders net values that are positive numbers', () => {
    render(<TaxClassChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const bar1 = screen.getByTestId('bar-1');
    const netValue = bar1.textContent?.split(': ')[1]?.split(' ')[0];
    expect(Number(netValue)).toBeGreaterThan(0);
  });

  it('adapts to monthly salary mode', () => {
    const { rerender } = render(
      <TaxClassChart baseInput={getBaseInput({ salaryMode: 'annual' })} />,
      { wrapper: I18nWrapper },
    );

    const annualBar = screen.getByTestId('bar-1').textContent;

    rerender(
      <I18nWrapper>
        <TaxClassChart baseInput={getBaseInput({ salaryMode: 'monthly', grossSalary: 4167 })} />
      </I18nWrapper>,
    );

    const monthlyBar = screen.getByTestId('bar-1').textContent;
    expect(annualBar).not.toBe(monthlyBar);
  });

  it('renders the sr-only caption text', () => {
    render(<TaxClassChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const caption = screen.getByText(/Nettoeinkommen je Klasse/);
    expect(caption).toBeInTheDocument();
    expect(caption.className).toContain('sr-only');
  });
});
