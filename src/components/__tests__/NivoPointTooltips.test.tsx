import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EffectiveRateChart from '../EffectiveRateChart';
import IncomeBreakdownChart from '../IncomeBreakdownChart';
import InsuranceComparisonChart from '../InsuranceComparisonChart';
import MarginalRateChart from '../MarginalRateChart';
import type { TaxInput } from '../../lib/types';
import { I18nWrapper } from '../../test/i18n-wrapper';

interface TooltipPoint {
  id: string;
  seriesId: string;
  seriesColor: string;
  data: { x: number; y: number };
}

vi.mock('@nivo/line', () => ({
  ResponsiveLine: ({ data, sliceTooltip }: {
    data: Array<{ id: string }>;
    sliceTooltip: (props: { slice: { points: TooltipPoint[] } }) => ReactNode;
  }) => sliceTooltip({
    slice: {
      points: [
        ...data.map((series, index) => ({
          id: `opaque-point-${index}`,
          seriesId: series.id,
          seriesColor: '#123456',
          data: { x: 50000, y: 100 - index * 30 },
        })),
        { id: 'opaque-fallback', seriesId: 'UnknownSeries', seriesColor: '#123456', data: { x: 50000, y: 0 } },
      ],
    },
  }),
}));

const baseInput: TaxInput = {
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
};

describe('Nivo point tooltips', () => {
  it.each([
    ['effective rate', EffectiveRateChart, 'Effektiver Steuersatz'],
    ['income breakdown', IncomeBreakdownChart, 'Netto'],
    ['insurance comparison', InsuranceComparisonChart, 'GKV (Gesetzlich)'],
    ['marginal rate', MarginalRateChart, 'Netto'],
  ] as const)('uses the series identity and fallback color in %s', (_name, Chart, label) => {
    render(<Chart baseInput={baseInput} />, { wrapper: I18nWrapper });

    const table = within(screen.getByRole('table'));
    expect(table.getByRole('cell', { name: label })).toBeInTheDocument();
    const fallback = table.getByRole('cell', { name: 'UnknownSeries' }).closest('tr');
    expect(fallback?.querySelector('span')).toHaveStyle({ backgroundColor: '#123456' });
  });
});
