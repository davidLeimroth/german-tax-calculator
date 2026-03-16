import { ResponsiveBar } from '@nivo/bar';
import type { TaxResult } from '../lib/types';
import { formatEur, CHART_COLORS, SHORT_LABELS, NIVO_THEME, toChartKey } from '../lib/format';
import { useI18n } from '../i18n/i18n';

interface BreakdownBarProps {
  result: TaxResult;
}

export default function BreakdownBar({ result }: BreakdownBarProps) {
  const { t } = useI18n();
  const keys = [
    'Netto',
    'Lohnsteuer',
    'Soli',
    'Kirchensteuer',
    'Krankenversicherung',
    'Pflegeversicherung',
    'Rentenversicherung',
    'Arbeitslosenversicherung',
  ];

  const deductionMap: Record<string, number> = {};
  for (const d of result.deductions) {
    const shortName = toChartKey(d.name);
    deductionMap[shortName] = d.employeeShareMonthly;
  }

  const baseData = {
    category: t.chart.monthlyCategory,
    Netto: result.monthlyNet,
    ...deductionMap,
  };

  // Filter out zero-value keys
  const activeKeys = keys.filter(
    (key) => Number((baseData as Record<string, number | string>)[key]) > 0
  );

  // Translate a chart key to its display name
  const translateKey = (key: string): string => {
    if (key === 'Netto') return t.chart.netto;
    if (key === 'Soli') return t.deductions['Solidaritätszuschlag'] || key;
    return t.deductions[key as keyof typeof t.deductions] || key;
  };

  const data = activeKeys.map((key) => ({
    category: SHORT_LABELS[key] || key,
    fullName: key,
    value: Number((baseData as Record<string, number | string>)[key]),
  }));

  return (
    <div style={{ height: 300 }} role="figure" aria-labelledby="bar-chart-caption">
      <span id="bar-chart-caption" className="sr-only">
        {t.chart.barCaption}
      </span>
      <dl className="sr-only">
        {activeKeys.map((key) => (
          <div key={key}>
            <dt>{translateKey(key)}</dt>
            <dd>{formatEur(Number((baseData as Record<string, number | string>)[key]))}</dd>
          </div>
        ))}
      </dl>
      <ResponsiveBar
        data={data}
        keys={['value']}
        indexBy="category"
        margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
        padding={0.3}
        layout="vertical"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={({ data: d }) => CHART_COLORS[(d as Record<string, string | number>).fullName] || '#999'}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{ tickSize: 0, tickPadding: 5 }}
        axisLeft={{ tickSize: 0, tickPadding: 5, format: (v) => `${Number(v).toLocaleString('de-DE')}` }}
        theme={{
          ...NIVO_THEME,
          text: { ...NIVO_THEME.text, fontSize: 12 },
        }}
        enableLabel={false}
        tooltip={({ data: d, value }) => (
          <div className="bg-base-100 shadow-lg rounded-lg px-3 py-2 text-sm">
            <strong>{translateKey(String((d as Record<string, string | number>).fullName))}</strong>: {formatEur(value)}
          </div>
        )}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
