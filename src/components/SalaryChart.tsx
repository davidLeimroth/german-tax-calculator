import { useState, useCallback } from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { TaxResult } from '../lib/types';
import { formatEur, CHART_COLORS, NIVO_THEME, toChartKey } from '../lib/format';
import { useI18n } from '../i18n/i18n';

interface SalaryChartProps {
  result: TaxResult;
}

export default function SalaryChart({ result }: SalaryChartProps) {
  const { t } = useI18n();
  const [containerWidth, setContainerWidth] = useState(800);
  const isMonthly = result.input.salaryMode === 'monthly';
  const netValue = Math.max(0, isMonthly ? result.monthlyNet : result.annualNet);
  const grossValue = isMonthly ? result.monthlyGross : result.annualGross;

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setContainerWidth(node.clientWidth);
  }, []);

  const isNarrow = containerWidth < 450;

  const data = [
    {
      id: 'Netto',
      label: t.chart.netto,
      value: netValue,
      color: CHART_COLORS.Netto,
    },
    ...result.deductions
      .filter((d) => (isMonthly ? d.employeeShareMonthly : d.employeeShareAnnual) > 0)
      .map((d) => {
        const shortName = toChartKey(d.name);
        return {
          id: shortName,
          label: t.deductions[d.name as keyof typeof t.deductions] || d.name,
          value: isMonthly ? d.employeeShareMonthly : d.employeeShareAnnual,
          color: CHART_COLORS[shortName] || '#999',
        };
      }),
  ].filter((d) => d.value > 0);

  return (
    <div ref={containerRef} style={{ height: isNarrow ? 280 : 350 }} role="figure" aria-labelledby="salary-chart-caption">
      <span id="salary-chart-caption" className="sr-only">
        {t.chart.pieCaption}
      </span>
      <table className="sr-only">
        <caption>{t.chart.pieTableCaption}</caption>
        <thead>
          <tr><th>{t.chart.category}</th><th>{t.chart.amount}</th><th>{t.chart.percentage}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td>{d.label}</td>
              <td>{formatEur(d.value)}</td>
              <td>{grossValue > 0 ? `${((d.value / grossValue) * 100).toFixed(1)}%` : '0%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ResponsivePie
        data={data}
        margin={isNarrow
          ? { top: 15, right: 40, bottom: 15, left: 40 }
          : { top: 20, right: 80, bottom: 20, left: 80 }
        }
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={!isNarrow}
        arcLinkLabel="label"
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="currentColor"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={isNarrow ? 15 : 10}
        arcLabelsTextColor="#ffffff"
        tooltip={({ datum }) => (
          <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm">
            <strong>{datum.label}</strong>
            <br />
            {formatEur(datum.value)}
            <br />
            {grossValue > 0
              ? `${((datum.value / grossValue) * 100).toFixed(1)}% ${t.chart.ofGross}`
              : ''}
          </div>
        )}
        theme={NIVO_THEME}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
