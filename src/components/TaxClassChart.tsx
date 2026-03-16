import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { TaxInput, Steuerklasse } from '../lib/types';
import { calculateNetSalary } from '../lib/tax-engine';
import { formatEur, NIVO_THEME } from '../lib/format';
import { useI18n } from '../i18n/i18n';

interface TaxClassChartProps {
  baseInput: TaxInput;
}

const TAX_CLASSES: Steuerklasse[] = [1, 2, 3, 4, 5, 6];
const BAR_COLOR = '#16a34a';
const BAR_COLOR_DIMMED = 'rgba(22, 163, 74, 0.45)';

interface TaxClassDataPoint {
  taxClass: string;
  net: number;
  isCurrent: boolean;
}

function computeTaxClassData(baseInput: TaxInput): TaxClassDataPoint[] {
  const isMonthly = baseInput.salaryMode === 'monthly';

  return TAX_CLASSES.map((tc) => {
    const result = calculateNetSalary({ ...baseInput, taxClass: tc });
    const net = isMonthly ? result.monthlyNet : result.annualNet;
    return {
      taxClass: String(tc),
      net: Math.round(net),
      isCurrent: tc === baseInput.taxClass,
    };
  });
}

export default function TaxClassChart({ baseInput }: TaxClassChartProps) {
  const { t } = useI18n();

  const data = useMemo(() => computeTaxClassData(baseInput), [baseInput]);

  const currentNet = data.find((d) => d.isCurrent)?.net ?? 0;

  return (
    <div role="figure" aria-labelledby="tax-class-chart-caption">
      <span id="tax-class-chart-caption" className="sr-only">
        {t.chart.taxClassCaption}
      </span>
      <div style={{ height: 350 }}>
        <ResponsiveBar
          data={data}
          keys={['net']}
          indexBy="taxClass"
          margin={{ top: 20, right: 20, bottom: 50, left: 65 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ data: d }) =>
            (d as unknown as TaxClassDataPoint).isCurrent ? BAR_COLOR : BAR_COLOR_DIMMED
          }
          borderWidth={({ data: d }) =>
            (d as unknown as TaxClassDataPoint).isCurrent ? 2 : 0
          }
          borderColor={BAR_COLOR}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            legend: t.input.taxClass,
            legendPosition: 'middle' as const,
            legendOffset: 40,
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
          enableLabel={false}
          layers={['grid', 'axes', 'bars', 'markers', 'legends', ({ bars }) => {
            const currentBar = bars.find(
              (bar) => (bar.data.data as unknown as TaxClassDataPoint).isCurrent
            );
            if (!currentBar) return null;
            return (
              <text
                key="current-label"
                x={currentBar.x + currentBar.width / 2}
                y={currentBar.y + currentBar.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(-90, ${currentBar.x + currentBar.width / 2}, ${currentBar.y + currentBar.height / 2})`}
                fill="#ffffff"
                fontSize={11}
                fontWeight={600}
              >
                {t.chart.taxClassCurrent}
              </text>
            );
          }]}
          tooltip={({ data: d }) => {
            const point = d as unknown as TaxClassDataPoint;
            const diff = point.net - currentNet;
            const diffText = diff === 0
              ? ''
              : `${diff > 0 ? '+' : ''}${formatEur(diff)}`;
            return (
              <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm" style={{ minWidth: 180 }}>
                <strong>
                  {t.input.taxClassOption} {point.taxClass}
                  {point.isCurrent ? ` (${t.chart.taxClassCurrent})` : ''}
                </strong>
                <table className="mt-1 w-full">
                  <tbody>
                    <tr>
                      <td className="pr-2 py-0.5">
                        <span
                          className="inline-block w-3 h-3 rounded-sm"
                          style={{ backgroundColor: point.isCurrent ? BAR_COLOR : BAR_COLOR_DIMMED }}
                        />
                      </td>
                      <td className="py-0.5 pr-4">{t.chart.netto}</td>
                      <td className="text-right font-mono py-0.5">{formatEur(point.net)}</td>
                    </tr>
                    {diffText && (
                      <tr>
                        <td className="pr-2 py-0.5" />
                        <td className="py-0.5 pr-4">{t.chart.taxClassDifference}</td>
                        <td className="text-right font-mono py-0.5">{diffText}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
