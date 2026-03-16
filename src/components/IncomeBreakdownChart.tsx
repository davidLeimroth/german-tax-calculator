import { useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { TaxInput } from '../lib/types';
import { calculateNetSalary } from '../lib/tax-engine';
import { formatEur, CHART_COLORS, NIVO_THEME, buildIncomePoints, translateSeriesId } from '../lib/format';
import { useI18n } from '../i18n/i18n';
import type { Translations } from '../i18n/i18n';
import ChartLegend from './ChartLegend';

interface IncomeBreakdownChartProps {
  baseInput: TaxInput;
}

interface IncomePoint {
  annualIncome: number;
  net: number;
  lohnsteuer: number;
  soli: number;
  kirchensteuer: number;
  kv: number;
  pv: number;
  rv: number;
  av: number;
}

function computeBreakdowns(baseInput: TaxInput, annualPoints: number[], divisor: number): IncomePoint[] {
  return annualPoints.map((annualIncome) => {
    if (annualIncome === 0) {
      return { annualIncome: 0, net: 0, lohnsteuer: 0, soli: 0, kirchensteuer: 0, kv: 0, pv: 0, rv: 0, av: 0 };
    }

    const result = calculateNetSalary({ ...baseInput, grossSalary: annualIncome, salaryMode: 'annual' });

    return {
      annualIncome,
      net: Math.max(0, result.annualNet / divisor),
      lohnsteuer: result.lohnsteuerAnnual / divisor,
      soli: result.soliAnnual / divisor,
      kirchensteuer: result.kirchensteuerAnnual / divisor,
      kv: result.krankenversicherungEmployeeAnnual / divisor,
      pv: result.pflegeversicherungEmployeeAnnual / divisor,
      rv: result.rentenversicherungEmployeeAnnual / divisor,
      av: result.arbeitslosenversicherungEmployeeAnnual / divisor,
    };
  });
}

type SeriesKey = 'Netto' | 'Lohnsteuer' | 'Soli' | 'Kirchensteuer' | 'Krankenversicherung' | 'Pflegeversicherung' | 'Rentenversicherung' | 'Arbeitslosenversicherung';

const SERIES_ORDER: { key: SeriesKey; field: keyof IncomePoint }[] = [
  { key: 'Netto', field: 'net' },
  { key: 'Lohnsteuer', field: 'lohnsteuer' },
  { key: 'Soli', field: 'soli' },
  { key: 'Kirchensteuer', field: 'kirchensteuer' },
  { key: 'Krankenversicherung', field: 'kv' },
  { key: 'Pflegeversicherung', field: 'pv' },
  { key: 'Rentenversicherung', field: 'rv' },
  { key: 'Arbeitslosenversicherung', field: 'av' },
];

function buildSeries(points: IncomePoint[], t: Translations, divisor: number) {
  return SERIES_ORDER.map(({ key, field }) => ({
    id: key,
    label: translateSeriesId(key, t),
    color: CHART_COLORS[key],
    data: points.map((p) => ({
      x: p.annualIncome / divisor,
      y: Math.round(p[field] as number),
    })),
  })).filter((s) => s.data.some((d) => d.y > 0));
}

export default function IncomeBreakdownChart({ baseInput }: IncomeBreakdownChartProps) {
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
    const breakdowns = computeBreakdowns(baseInput, annualPoints, divisor);
    return buildSeries(breakdowns, t, divisor);
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

  return (
    <div role="figure" aria-labelledby="income-breakdown-caption">
      <span id="income-breakdown-caption" className="sr-only">
        {t.chart.incomeBreakdownCaption}
      </span>
      <div className="flex flex-col md:flex-row gap-4">
      <div className="md:flex-1 min-w-0" style={{ height: 350 }}>
        <ResponsiveLine
          data={visibleSeries}
          margin={{ top: 20, right: 20, bottom: 50, left: 65 }}
          xScale={{ type: 'linear', min: 0, max: displayMax }}
          yScale={{ type: 'linear', min: 0, max: 'auto', stacked: true }}
          curve="monotoneX"
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
            tickValues: 5,
            format: (v) => `${(Number(v) / 1000).toFixed(0)}k €`,
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
              <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm" style={{ minWidth: 260 }}>
                <strong>{formatEur(displayIncome)} {xAxisLabel}</strong>
                <table className="mt-1 w-full">
                  <tbody>
                    {[...slice.points].reverse().map((point, idx) => {
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
                          <td className="text-right font-mono py-0.5">{formatEur(point.data.y as number)}</td>
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
