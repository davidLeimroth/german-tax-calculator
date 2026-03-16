import { ResponsiveBar } from '@nivo/bar';
import type { TaxResult } from '../lib/types';

interface BreakdownBarProps {
  result: TaxResult;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

const COLORS: Record<string, string> = {
  Netto: '#22c55e',
  Lohnsteuer: '#ef4444',
  Soli: '#f97316',
  Kirchensteuer: '#eab308',
  Krankenversicherung: '#3b82f6',
  Pflegeversicherung: '#8b5cf6',
  Rentenversicherung: '#06b6d4',
  Arbeitslosenversicherung: '#ec4899',
};

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

  const data = [
    {
      category: 'Monatlich',
      Netto: Math.round(result.monthlyNet * 100) / 100,
      Lohnsteuer: Math.round((result.lohnsteuerAnnual / 12) * 100) / 100,
      Soli: Math.round((result.soliAnnual / 12) * 100) / 100,
      Kirchensteuer: Math.round((result.kirchensteuerAnnual / 12) * 100) / 100,
      Krankenversicherung: Math.round((result.krankenversicherungEmployeeAnnual / 12) * 100) / 100,
      Pflegeversicherung: Math.round((result.pflegeversicherungEmployeeAnnual / 12) * 100) / 100,
      Rentenversicherung: Math.round((result.rentenversicherungEmployeeAnnual / 12) * 100) / 100,
      Arbeitslosenversicherung: Math.round((result.arbeitslosenversicherungEmployeeAnnual / 12) * 100) / 100,
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
        colors={({ id }) => COLORS[id as string] || '#999'}
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
