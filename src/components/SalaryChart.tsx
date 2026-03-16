import { ResponsivePie } from '@nivo/pie';
import type { TaxResult } from '../lib/types';

interface SalaryChartProps {
  result: TaxResult;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

const COLORS: Record<string, string> = {
  netto: '#22c55e',        // green for net pay
  lohnsteuer: '#ef4444',   // red
  soli: '#f97316',         // orange
  kirchensteuer: '#eab308',// yellow
  kv: '#3b82f6',           // blue
  pv: '#8b5cf6',           // purple
  rv: '#06b6d4',           // cyan
  av: '#ec4899',           // pink
};

export default function SalaryChart({ result }: SalaryChartProps) {
  const data = [
    {
      id: 'Netto',
      label: 'Netto',
      value: Math.round(result.monthlyNet * 100) / 100,
      color: COLORS.netto,
    },
    {
      id: 'Lohnsteuer',
      label: 'Lohnsteuer',
      value: Math.round((result.lohnsteuerAnnual / 12) * 100) / 100,
      color: COLORS.lohnsteuer,
    },
    {
      id: 'Soli',
      label: 'Solidaritaetszuschlag',
      value: Math.round((result.soliAnnual / 12) * 100) / 100,
      color: COLORS.soli,
    },
    {
      id: 'Kirchensteuer',
      label: 'Kirchensteuer',
      value: Math.round((result.kirchensteuerAnnual / 12) * 100) / 100,
      color: COLORS.kirchensteuer,
    },
    {
      id: 'Krankenversicherung',
      label: 'Krankenversicherung',
      value: Math.round((result.krankenversicherungEmployeeAnnual / 12) * 100) / 100,
      color: COLORS.kv,
    },
    {
      id: 'Pflegeversicherung',
      label: 'Pflegeversicherung',
      value: Math.round((result.pflegeversicherungEmployeeAnnual / 12) * 100) / 100,
      color: COLORS.pv,
    },
    {
      id: 'Rentenversicherung',
      label: 'Rentenversicherung',
      value: Math.round((result.rentenversicherungEmployeeAnnual / 12) * 100) / 100,
      color: COLORS.rv,
    },
    {
      id: 'Arbeitslosenversicherung',
      label: 'Arbeitslosenversicherung',
      value: Math.round((result.arbeitslosenversicherungEmployeeAnnual / 12) * 100) / 100,
      color: COLORS.av,
    },
  ].filter((d) => d.value > 0);

  return (
    <div style={{ height: 350 }} aria-label="Salary breakdown pie chart" role="img">
      <ResponsivePie
        data={data}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={true}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="currentColor"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        tooltip={({ datum }) => (
          <div className="bg-base-100 shadow-lg rounded px-3 py-2 text-sm">
            <strong>{datum.label}</strong>
            <br />
            {formatEur(datum.value)}
            <br />
            {((datum.value / result.monthlyGross) * 100).toFixed(1)}% vom Brutto
          </div>
        )}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
