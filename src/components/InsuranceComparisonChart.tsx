import { useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { TaxInput } from '../lib/types';
import { calculateNetSalary } from '../lib/tax-engine';
import { formatEur, NIVO_THEME, buildIncomePoints } from '../lib/format';
import { useI18n } from '../i18n/i18n';
import ChartLegend from './ChartLegend';

interface InsuranceComparisonChartProps {
  baseInput: TaxInput;
}

const COLOR_GKV = '#2563eb';
const COLOR_PKV = '#ea580c';
const DEFAULT_PKV_MONTHLY = 400;
const DEFAULT_ZUSATZBEITRAG_PERCENT = 2.5;

const SERIES_KEYS = {
  gkv: 'GKV',
  pkv: 'PKV',
} as const;

interface InsurancePoint {
  income: number;
  gkvNet: number;
  pkvNet: number;
}

function computeInsuranceData(
  baseInput: TaxInput,
  annualPoints: number[],
  divisor: number,
  pkvMonthly: number,
  zusatzbeitragRate: number,
): InsurancePoint[] {
  return annualPoints.map((income) => {
    if (income === 0) {
      return { income: 0, gkvNet: 0, pkvNet: 0 };
    }

    const gkvResult = calculateNetSalary({
      ...baseInput,
      grossSalary: income,
      salaryMode: 'annual',
      healthInsuranceType: 'gesetzlich',
      zusatzbeitragRate,
    });

    const pkvResult = calculateNetSalary({
      ...baseInput,
      grossSalary: income,
      salaryMode: 'annual',
      healthInsuranceType: 'privat',
      privatHealthInsuranceMonthly: pkvMonthly,
    });

    return {
      income,
      gkvNet: Math.round(gkvResult.annualNet / divisor),
      pkvNet: Math.round(pkvResult.annualNet / divisor),
    };
  });
}

export default function InsuranceComparisonChart({ baseInput }: InsuranceComparisonChartProps) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const isUserGkv = baseInput.healthInsuranceType === 'gesetzlich';

  // Local comparison inputs with sensible defaults
  const [compPkvMonthly, setCompPkvMonthly] = useState(
    isUserGkv ? DEFAULT_PKV_MONTHLY : (baseInput.privatHealthInsuranceMonthly ?? DEFAULT_PKV_MONTHLY)
  );
  const [compZusatzbeitragPercent, setCompZusatzbeitragPercent] = useState(
    isUserGkv ? (baseInput.zusatzbeitragRate * 100) : DEFAULT_ZUSATZBEITRAG_PERCENT
  );

  const isMonthly = baseInput.salaryMode === 'monthly';
  const divisor = isMonthly ? 12 : 1;
  const annualGross = isMonthly ? baseInput.grossSalary * 12 : baseInput.grossSalary;
  const maxAnnual = Math.min(Math.max(150000, annualGross * 2), 1000000);
  const displayMax = maxAnnual / divisor;
  const userDisplayIncome = annualGross / divisor;
  const xAxisLabel = isMonthly ? t.chart.incomeBreakdownXAxisMonthly : t.chart.incomeBreakdownXAxisAnnual;

  const pkvMonthly = isUserGkv ? compPkvMonthly : (baseInput.privatHealthInsuranceMonthly ?? DEFAULT_PKV_MONTHLY);
  const zusatzbeitragRate = isUserGkv ? baseInput.zusatzbeitragRate : (compZusatzbeitragPercent / 100);

  const allSeries = useMemo(() => {
    const annualPoints = buildIncomePoints(maxAnnual);
    const data = computeInsuranceData(baseInput, annualPoints, divisor, pkvMonthly, zusatzbeitragRate);

    return [
      {
        id: SERIES_KEYS.gkv,
        label: t.chart.gkvLabel,
        color: COLOR_GKV,
        data: data.map((d) => ({ x: d.income / divisor, y: d.gkvNet })),
      },
      {
        id: SERIES_KEYS.pkv,
        label: t.chart.pkvLabel,
        color: COLOR_PKV,
        data: data.map((d) => ({ x: d.income / divisor, y: d.pkvNet })),
      },
    ];
  }, [baseInput, maxAnnual, divisor, pkvMonthly, zusatzbeitragRate, t]);

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
    [SERIES_KEYS.gkv]: COLOR_GKV,
    [SERIES_KEYS.pkv]: COLOR_PKV,
  };

  const seriesLabelMap: Record<string, string> = {
    [SERIES_KEYS.gkv]: t.chart.gkvLabel,
    [SERIES_KEYS.pkv]: t.chart.pkvLabel,
  };

  return (
    <div role="figure" aria-labelledby="insurance-chart-caption">
      <span id="insurance-chart-caption" className="sr-only">
        {t.chart.insuranceCaption}
      </span>
      <div className="flex flex-wrap gap-4 mb-4">
        {isUserGkv ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-base-content/70">{t.chart.insurancePkvInput}</span>
            <input
              type="number"
              min={0}
              step={50}
              value={compPkvMonthly}
              onChange={(e) => setCompPkvMonthly(Math.max(0, parseFloat(e.target.value) || 0))}
              className="input input-bordered input-sm w-28"
            />
          </label>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-base-content/70">{t.chart.insuranceGkvInput}</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={compZusatzbeitragPercent}
              onChange={(e) => setCompZusatzbeitragPercent(Math.max(0, parseFloat(e.target.value) || 0))}
              className="input input-bordered input-sm w-20"
            />
          </label>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:flex-1 min-w-0" style={{ height: 350 }}>
          <ResponsiveLine
            data={visibleSeries}
            margin={{ top: 20, right: 20, bottom: 50, left: 65 }}
            xScale={{ type: 'linear', min: 0, max: displayMax }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
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
              tickValues: 5,
              format: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
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
              const gkvPoint = slice.points.find((p) => {
                const id = String(p.serieId || p.id || '').replace(/\.\d+$/, '');
                return id === SERIES_KEYS.gkv;
              });
              const pkvPoint = slice.points.find((p) => {
                const id = String(p.serieId || p.id || '').replace(/\.\d+$/, '');
                return id === SERIES_KEYS.pkv;
              });
              const gkvVal = (gkvPoint?.data.y as number) ?? 0;
              const pkvVal = (pkvPoint?.data.y as number) ?? 0;
              const diff = gkvVal - pkvVal;

              return (
                <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm" style={{ minWidth: 240 }}>
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
                            <td className="text-right font-mono py-0.5">{formatEur(val)}</td>
                          </tr>
                        );
                      })}
                      {gkvPoint && pkvPoint && (
                        <tr>
                          <td className="pr-2 py-0.5" />
                          <td className="py-0.5 pr-4">{t.chart.insuranceDifference}</td>
                          <td className="text-right font-mono py-0.5">
                            {diff > 0 ? '+' : ''}{formatEur(diff)}
                          </td>
                        </tr>
                      )}
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
