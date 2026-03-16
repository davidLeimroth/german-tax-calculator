import { useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { TaxInput } from '../lib/types';
import { calculateNetSalary } from '../lib/tax-engine';
import { formatEur, CHART_COLORS, NIVO_THEME, translateSeriesId } from '../lib/format';
import { useI18n } from '../i18n/i18n';
import type { Translations } from '../i18n/i18n';
import ChartLegend from './ChartLegend';

interface MarginalRateChartProps {
  baseInput: TaxInput;
}

interface MarginalPoint {
  income: number;
  netRate: number;
  lohnsteuerRate: number;
  soliRate: number;
  kirchensteuerRate: number;
  kvRate: number;
  pvRate: number;
  rvRate: number;
  avRate: number;
}

function buildAnnualPoints(maxAnnual: number): number[] {
  const step = 1000;
  const points: number[] = [];
  for (let income = step; income <= maxAnnual; income += step) {
    points.push(income);
  }
  return points;
}

function computePoint(baseInput: TaxInput, income: number, prevIncome: number): MarginalPoint {
  const delta = income - prevIncome;
  const curr = calculateNetSalary({ ...baseInput, grossSalary: income, salaryMode: 'annual' });
  const prev = prevIncome === 0
    ? null
    : calculateNetSalary({ ...baseInput, grossSalary: prevIncome, salaryMode: 'annual' });

  const raw = (field: 'lohnsteuerAnnual' | 'soliAnnual' | 'kirchensteuerAnnual' | 'krankenversicherungEmployeeAnnual' | 'pflegeversicherungEmployeeAnnual' | 'rentenversicherungEmployeeAnnual' | 'arbeitslosenversicherungEmployeeAnnual') =>
    Math.max(0, (curr[field] - (prev?.[field] ?? 0)) / delta * 100);

  let lohnsteuerRate = raw('lohnsteuerAnnual');
  let soliRate = raw('soliAnnual');
  let kirchensteuerRate = raw('kirchensteuerAnnual');
  let kvRate = raw('krankenversicherungEmployeeAnnual');
  let pvRate = raw('pflegeversicherungEmployeeAnnual');
  let rvRate = raw('rentenversicherungEmployeeAnnual');
  let avRate = raw('arbeitslosenversicherungEmployeeAnnual');

  const totalDeductions = lohnsteuerRate + soliRate + kirchensteuerRate + kvRate + pvRate + rvRate + avRate;
  if (totalDeductions > 100) {
    const scale = 100 / totalDeductions;
    lohnsteuerRate *= scale;
    soliRate *= scale;
    kirchensteuerRate *= scale;
    kvRate *= scale;
    pvRate *= scale;
    rvRate *= scale;
    avRate *= scale;
  }

  const netRate = Math.max(0, 100 - (lohnsteuerRate + soliRate + kirchensteuerRate + kvRate + pvRate + rvRate + avRate));
  return { income, netRate, lohnsteuerRate, soliRate, kirchensteuerRate, kvRate, pvRate, rvRate, avRate };
}

function computeMarginalRates(baseInput: TaxInput, annualPoints: number[]): MarginalPoint[] {
  const results: MarginalPoint[] = [];
  for (let i = 0; i < annualPoints.length; i++) {
    const income = annualPoints[i];
    const prevIncome = i === 0 ? 0 : annualPoints[i - 1];
    const point = computePoint(baseInput, income, prevIncome);
    if (i === 0) {
      results.push({ ...point, income: 0 });
    }
    results.push(point);
  }
  return results;
}

type SeriesKey = 'Netto' | 'Lohnsteuer' | 'Soli' | 'Kirchensteuer' | 'Krankenversicherung' | 'Pflegeversicherung' | 'Rentenversicherung' | 'Arbeitslosenversicherung';

const SERIES_ORDER: { key: SeriesKey; field: keyof MarginalPoint }[] = [
  { key: 'Netto', field: 'netRate' },
  { key: 'Lohnsteuer', field: 'lohnsteuerRate' },
  { key: 'Soli', field: 'soliRate' },
  { key: 'Kirchensteuer', field: 'kirchensteuerRate' },
  { key: 'Krankenversicherung', field: 'kvRate' },
  { key: 'Pflegeversicherung', field: 'pvRate' },
  { key: 'Rentenversicherung', field: 'rvRate' },
  { key: 'Arbeitslosenversicherung', field: 'avRate' },
];

function buildSeries(rates: MarginalPoint[], t: Translations, divisor: number) {
  return SERIES_ORDER.map(({ key, field }) => ({
    id: key,
    label: translateSeriesId(key, t),
    color: CHART_COLORS[key],
    data: rates.map((r) => ({
      x: r.income / divisor,
      y: Number((r[field] as number).toFixed(1)),
    })),
  })).filter((s) => s.data.some((d) => d.y > 0));
}

export default function MarginalRateChart({ baseInput }: MarginalRateChartProps) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const isMonthly = baseInput.salaryMode === 'monthly';
  const divisor = isMonthly ? 12 : 1;
  const annualGross = isMonthly ? baseInput.grossSalary * 12 : baseInput.grossSalary;
  const maxAnnual = Math.min(Math.max(150000, annualGross * 2), 1000000);
  const displayMax = maxAnnual / divisor;
  const userDisplayIncome = annualGross / divisor;
  const xAxisLabel = isMonthly ? t.chart.marginalXAxisMonthly : t.chart.marginalXAxisAnnual;

  const allSeries = useMemo(() => {
    const annualPoints = buildAnnualPoints(maxAnnual);
    const rates = computeMarginalRates(baseInput, annualPoints);
    return buildSeries(rates, t, divisor);
  }, [baseInput, maxAnnual, t, divisor]);

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

  return (
    <div role="figure" aria-labelledby="marginal-chart-caption">
      <span id="marginal-chart-caption" className="sr-only">
        {t.chart.marginalCaption}
      </span>
      <div className="flex flex-col md:flex-row gap-4">
      <div className="md:flex-1 min-w-0" style={{ height: 350 }}>
        <ResponsiveLine
          data={visibleSeries}
          margin={{ top: 20, right: 20, bottom: 50, left: 55 }}
          xScale={{ type: 'linear', min: 0, max: displayMax }}
          yScale={{ type: 'linear', min: 0, max: 100, stacked: true }}
          curve="linear"
          enableArea={true}
          areaOpacity={0.8}
          enablePoints={false}
          colors={(d) => CHART_COLORS[d.id as string] || '#999'}
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
            tickValues: [0, 20, 40, 60, 80, 100],
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
          layers={['grid', 'axes', 'areas', 'crosshair', 'lines', 'markers', 'points', 'slices', 'mesh', 'legends']}
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            const displayIncome = slice.points[0]?.data.x as number;
            return (
              <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm" style={{ minWidth: 220 }}>
                <strong>{formatEur(displayIncome)} {xAxisLabel}</strong>
                <table className="mt-1 w-full">
                  <tbody>
                    {[...slice.points].reverse().map((point, idx) => {
                      const val = point.data.y as number;
                      const pointId = String(point.serieId || point.id || '');
                      const id = pointId.replace(/\.\d+$/, '');
                      const name = translateSeriesId(id, t) || id;
                      const color = CHART_COLORS[id] || point.serieColor || '#999';
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
