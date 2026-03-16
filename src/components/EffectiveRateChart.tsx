import { useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { TaxInput } from '../lib/types';
import { calculateNetSalary } from '../lib/tax-engine';
import { formatEur, NIVO_THEME, buildIncomePoints } from '../lib/format';
import { useI18n } from '../i18n/i18n';
import ChartLegend from './ChartLegend';

interface EffectiveRateChartProps {
  baseInput: TaxInput;
}

const COLOR_EFFECTIVE = '#2563eb';
const COLOR_MARGINAL = '#dc2626';

interface RatePoint {
  income: number;
  effectiveRate: number;
  marginalRate: number;
}

function computeRates(baseInput: TaxInput, annualPoints: number[]): RatePoint[] {
  const results: RatePoint[] = [];

  for (let i = 0; i < annualPoints.length; i++) {
    const income = annualPoints[i];

    if (income === 0) {
      results.push({ income: 0, effectiveRate: 0, marginalRate: 0 });
      continue;
    }

    const result = calculateNetSalary({ ...baseInput, grossSalary: income, salaryMode: 'annual' });
    const totalDeductions = result.totalDeductionsAnnual;
    const effectiveRate = Math.min(100, Math.max(0, (totalDeductions / income) * 100));

    let marginalRate = 0;
    const prevIncome = i > 0 ? annualPoints[i - 1] : 0;
    if (prevIncome > 0) {
      const prevResult = calculateNetSalary({ ...baseInput, grossSalary: prevIncome, salaryMode: 'annual' });
      const delta = income - prevIncome;
      const deductionDelta = totalDeductions - prevResult.totalDeductionsAnnual;
      marginalRate = Math.min(100, Math.max(0, (deductionDelta / delta) * 100));
    } else if (i > 0) {
      marginalRate = effectiveRate;
    }

    results.push({
      income,
      effectiveRate: Number(effectiveRate.toFixed(1)),
      marginalRate: Number(marginalRate.toFixed(1)),
    });
  }

  return results;
}

const SERIES_KEYS = {
  effective: 'EffectiveRate',
  marginal: 'MarginalRate',
} as const;

export default function EffectiveRateChart({ baseInput }: EffectiveRateChartProps) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const isMonthly = baseInput.salaryMode === 'monthly';
  const divisor = isMonthly ? 12 : 1;
  const annualGross = isMonthly ? baseInput.grossSalary * 12 : baseInput.grossSalary;
  const maxAnnual = Math.min(Math.max(150000, annualGross * 2), 1000000);
  const displayMax = maxAnnual / divisor;
  const userDisplayIncome = annualGross / divisor;
  const xAxisLabel = isMonthly ? t.chart.incomeBreakdownXAxisMonthly : t.chart.incomeBreakdownXAxisAnnual;

  const allSeries = useMemo(() => {
    const annualPoints = buildIncomePoints(maxAnnual);
    const rates = computeRates(baseInput, annualPoints);

    return [
      {
        id: SERIES_KEYS.effective,
        label: t.chart.effectiveLine,
        color: COLOR_EFFECTIVE,
        data: rates.map((r) => ({ x: r.income / divisor, y: r.effectiveRate })),
      },
      {
        id: SERIES_KEYS.marginal,
        label: t.chart.marginalLine,
        color: COLOR_MARGINAL,
        data: rates.map((r) => ({ x: r.income / divisor, y: r.marginalRate })),
      },
    ];
  }, [baseInput, maxAnnual, divisor, t]);

  const visibleSeries = useMemo(
    () => allSeries.filter((s) => !hidden.has(s.id)),
    [allSeries, hidden],
  );

  const toggleSeries = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seriesColorMap: Record<string, string> = {
    [SERIES_KEYS.effective]: COLOR_EFFECTIVE,
    [SERIES_KEYS.marginal]: COLOR_MARGINAL,
  };

  const seriesLabelMap: Record<string, string> = {
    [SERIES_KEYS.effective]: t.chart.effectiveLine,
    [SERIES_KEYS.marginal]: t.chart.marginalLine,
  };

  return (
    <div role="figure" aria-labelledby="effective-rate-chart-caption">
      <span id="effective-rate-chart-caption" className="sr-only">
        {t.chart.effectiveRateCaption}
      </span>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:flex-1 min-w-0" style={{ height: 350 }}>
          <ResponsiveLine
            data={visibleSeries}
            margin={{ top: 20, right: 20, bottom: 50, left: 55 }}
            xScale={{ type: 'linear', min: 0, max: displayMax }}
            yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
            curve="monotoneX"
            enableArea={false}
            enablePoints={false}
            lineWidth={2}
            colors={(d) => seriesColorMap[d.id as string] || '#999'}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickValues: 5,
              format: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
              legend: xAxisLabel,
              legendOffset: 40,
              legendPosition: 'middle' as const,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickValues: 6,
              format: (v) => `${v}%`,
            }}
            theme={{
              ...NIVO_THEME,
              axis: {
                ...NIVO_THEME.axis,
                legend: { text: { fill: 'currentColor', fontSize: 12 } },
                ticks: { text: { fill: 'currentColor' } },
              },
            }}
            layers={['grid', 'axes', 'crosshair', 'lines', 'markers', 'points', 'slices', 'mesh', 'legends']}
            enableSlices="x"
            sliceTooltip={({ slice }) => {
              const displayIncome = slice.points[0]?.data.x as number;
              return (
                <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm" style={{ minWidth: 220 }}>
                  <strong>{formatEur(displayIncome)} {xAxisLabel}</strong>
                  <table className="mt-1 w-full">
                    <tbody>
                      {slice.points.map((point, idx) => {
                        const val = point.data.y as number;
                        const pointId = String(point.serieId || point.id || '');
                        const id = pointId.replace(/\.\d+$/, '');
                        const name = seriesLabelMap[id] || id;
                        const color = seriesColorMap[id] || point.serieColor || '#999';
                        return (
                          <tr key={idx}>
                            <td className="pr-2 py-0.5">
                              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                            </td>
                            <td className="py-0.5 pr-4">{name}</td>
                            <td className="text-right font-mono py-0.5">{val.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }}
            markers={[
              {
                axis: 'x',
                value: userDisplayIncome,
                lineStyle: { stroke: 'currentColor', strokeWidth: 1.5, strokeDasharray: '6 4' },
                legend: formatEur(userDisplayIncome),
                legendPosition: 'top' as const,
                textStyle: { fill: 'currentColor', fontSize: 11 },
              },
            ]}
            animate={true}
            motionConfig="gentle"
          />
        </div>
        <ChartLegend series={allSeries} hidden={hidden} onToggle={toggleSeries} />
      </div>
    </div>
  );
}
