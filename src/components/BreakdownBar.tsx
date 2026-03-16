import { ResponsiveBar } from '@nivo/bar';
import type { TaxResult } from '../lib/types';
import { formatEur, CHART_COLORS } from '../lib/format';

interface BreakdownBarProps {
  result: TaxResult;
}

export default function BreakdownBar({ result }: BreakdownBarProps) {
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
    const shortName = d.name === 'Solidaritaetszuschlag' ? 'Soli' : d.name;
    deductionMap[shortName] = d.employeeShareMonthly;
  }

  const data = [
    {
      category: 'Monatlich',
      Netto: result.monthlyNet,
      ...deductionMap,
    },
  ];

  // Filter out zero-value keys
  const activeKeys = keys.filter(
    (key) => Number((data[0] as Record<string, number | string>)[key]) > 0
  );

  return (
    <div style={{ height: 200 }} aria-label="Monthly breakdown bar chart" role="img">
      <ResponsiveBar
        data={data}
        keys={activeKeys}
        indexBy="category"
        margin={{ top: 10, right: 20, bottom: 30, left: 80 }}
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={({ id }) => CHART_COLORS[id as string] || '#999'}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          format: (v) => `${Number(v).toLocaleString('de-DE')} EUR`,
        }}
        axisLeft={null}
        enableLabel={false}
        tooltip={({ id, value }) => (
          <div className="bg-base-100 shadow-lg rounded px-3 py-2 text-sm">
            <strong>{id}</strong>: {formatEur(value)}
          </div>
        )}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
