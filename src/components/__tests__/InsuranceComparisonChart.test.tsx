import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InsuranceComparisonChart from '../InsuranceComparisonChart';
import type { TaxInput } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

vi.mock('@nivo/line', () => ({
  ResponsiveLine: ({ data, markers }: {
    data: Array<{ id: string; data: Array<{ x: number; y: number }> }>;
    markers?: Array<{ value: number }>;
  }) => (
    <div data-testid="mock-line-chart">
      {data.map((series) => (
        <div key={series.id} data-testid={`series-${series.id}`}>
          {series.id}: {series.data.length} points, last={series.data[series.data.length - 1]?.y}
        </div>
      ))}
      {markers?.map((m, i) => (
        <div key={i} data-testid="marker">
          {m.value}
        </div>
      ))}
    </div>
  ),
}));

function getBaseInput(overrides?: Partial<TaxInput>): TaxInput {
  return {
    grossSalary: 60000,
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

describe('InsuranceComparisonChart', () => {
  it('renders with a figure role and accessible caption', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const figure = screen.getByRole('figure');
    expect(figure).toBeInTheDocument();
    expect(figure).toHaveAttribute('aria-labelledby', 'insurance-chart-caption');
  });

  it('renders both GKV and PKV series', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    expect(screen.getByTestId('series-GKV')).toBeInTheDocument();
    expect(screen.getByTestId('series-PKV')).toBeInTheDocument();
  });

  it('renders a marker at the user income', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const marker = screen.getByTestId('marker');
    expect(marker.textContent).toBe('60000');
  });

  it('uses monthly marker when salaryMode is monthly', () => {
    render(
      <InsuranceComparisonChart baseInput={getBaseInput({ salaryMode: 'monthly', grossSalary: 5000 })} />,
      { wrapper: I18nWrapper },
    );

    const marker = screen.getByTestId('marker');
    expect(marker.textContent).toBe('5000');
  });

  it('shows legend with GKV and PKV items', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    expect(screen.getByRole('switch', { name: /GKV/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /PKV/ })).toBeInTheDocument();
  });

  it('toggles series visibility via legend', async () => {
    const user = userEvent.setup();
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    expect(screen.getByTestId('series-GKV')).toBeInTheDocument();
    expect(screen.getByTestId('series-PKV')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /GKV/ }));
    expect(screen.queryByTestId('series-GKV')).not.toBeInTheDocument();
    expect(screen.getByTestId('series-PKV')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /GKV/ }));
    expect(screen.getByTestId('series-GKV')).toBeInTheDocument();
  });

  it('renders the sr-only caption text', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const caption = screen.getByText(/Nettoeinkommen bei GKV und PKV/);
    expect(caption).toBeInTheDocument();
    expect(caption.className).toContain('sr-only');
  });

  it('uses default PKV monthly when none provided', () => {
    render(
      <InsuranceComparisonChart baseInput={getBaseInput({ healthInsuranceType: 'gesetzlich' })} />,
      { wrapper: I18nWrapper },
    );

    // Should still render without errors
    expect(screen.getByTestId('series-PKV')).toBeInTheDocument();
  });

  it('uses provided PKV monthly value', () => {
    render(
      <InsuranceComparisonChart baseInput={getBaseInput({
        healthInsuranceType: 'privat',
        privatHealthInsuranceMonthly: 600,
      })} />,
      { wrapper: I18nWrapper },
    );

    expect(screen.getByTestId('series-PKV')).toBeInTheDocument();
  });

  it('generates data points for multiple income levels', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const gkvSeries = screen.getByTestId('series-GKV');
    const pointsMatch = gkvSeries.textContent?.match(/(\d+) points/);
    expect(Number(pointsMatch?.[1])).toBeGreaterThan(10);
  });

  it('both series have positive net values at high income', () => {
    render(<InsuranceComparisonChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const gkvText = screen.getByTestId('series-GKV').textContent || '';
    const pkvText = screen.getByTestId('series-PKV').textContent || '';

    const gkvLast = Number(gkvText.match(/last=(\d+)/)?.[1]);
    const pkvLast = Number(pkvText.match(/last=(\d+)/)?.[1]);

    expect(gkvLast).toBeGreaterThan(0);
    expect(pkvLast).toBeGreaterThan(0);
  });
});
