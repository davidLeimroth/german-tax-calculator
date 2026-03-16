import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import EffectiveRateChart from '../EffectiveRateChart';
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
          {series.id}: {series.data.length} points, max={Math.max(...series.data.map((d) => d.y)).toFixed(1)}
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

describe('EffectiveRateChart', () => {
  it('renders with a figure role and accessible caption', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const figure = screen.getByRole('figure');
    expect(figure).toBeInTheDocument();
    expect(figure).toHaveAttribute('aria-labelledby', 'effective-rate-chart-caption');
  });

  it('renders both effective and marginal rate series', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    expect(screen.getByTestId('series-EffectiveRate')).toBeInTheDocument();
    expect(screen.getByTestId('series-MarginalRate')).toBeInTheDocument();
  });

  it('renders a marker at the user income', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const marker = screen.getByTestId('marker');
    expect(marker.textContent).toBe('50000');
  });

  it('renders monthly marker when salaryMode is monthly', () => {
    render(
      <EffectiveRateChart baseInput={getBaseInput({ salaryMode: 'monthly', grossSalary: 4000 })} />,
      { wrapper: I18nWrapper },
    );

    const marker = screen.getByTestId('marker');
    expect(marker.textContent).toBe('4000');
  });

  it('shows legend with two items', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    expect(screen.getByRole('switch', { name: /Effektiver Steuersatz/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Grenzsteuersatz/ })).toBeInTheDocument();
  });

  it('toggles series visibility via legend', async () => {
    const user = userEvent.setup();
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    // Both visible initially
    expect(screen.getByTestId('series-EffectiveRate')).toBeInTheDocument();
    expect(screen.getByTestId('series-MarginalRate')).toBeInTheDocument();

    // Hide effective rate
    await user.click(screen.getByRole('switch', { name: /Effektiver Steuersatz/ }));
    expect(screen.queryByTestId('series-EffectiveRate')).not.toBeInTheDocument();
    expect(screen.getByTestId('series-MarginalRate')).toBeInTheDocument();

    // Show it again
    await user.click(screen.getByRole('switch', { name: /Effektiver Steuersatz/ }));
    expect(screen.getByTestId('series-EffectiveRate')).toBeInTheDocument();
  });

  it('renders the sr-only caption text', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const caption = screen.getByText(/Effektiver und Grenzsteuersatz/);
    expect(caption).toBeInTheDocument();
    expect(caption.className).toContain('sr-only');
  });

  it('generates rate data points for multiple income levels', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const effective = screen.getByTestId('series-EffectiveRate');
    // Should have many data points
    const pointsMatch = effective.textContent?.match(/(\d+) points/);
    expect(Number(pointsMatch?.[1])).toBeGreaterThan(10);
  });

  it('marginal rate max is higher than effective rate max', () => {
    render(<EffectiveRateChart baseInput={getBaseInput()} />, { wrapper: I18nWrapper });

    const effectiveText = screen.getByTestId('series-EffectiveRate').textContent || '';
    const marginalText = screen.getByTestId('series-MarginalRate').textContent || '';

    const effectiveMax = Number(effectiveText.match(/max=([\d.]+)/)?.[1]);
    const marginalMax = Number(marginalText.match(/max=([\d.]+)/)?.[1]);

    expect(marginalMax).toBeGreaterThanOrEqual(effectiveMax);
  });
});
