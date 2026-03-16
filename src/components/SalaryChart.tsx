import { ResponsivePie } from '@nivo/pie';
import type { TaxResult } from '../lib/types';
import { formatEur, CHART_COLORS } from '../lib/format';

interface SalaryChartProps {
  result: TaxResult;
}

export default function SalaryChart({ result }: SalaryChartProps) {
  const data = [
    {
      id: 'Netto',
      label: 'Netto',
      value: result.monthlyNet,
      color: CHART_COLORS.Netto,
    },
    ...result.deductions
      .filter((d) => d.employeeShareMonthly > 0)
      .map((d) => {
        const shortName = d.name === 'Solidaritaetszuschlag' ? 'Soli' : d.name;
        return {
          id: shortName,
          label: d.name,
          value: d.employeeShareMonthly,
          color: CHART_COLORS[shortName] || '#999',
        };
      }),
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
            {result.monthlyGross > 0
              ? `${((datum.value / result.monthlyGross) * 100).toFixed(1)}% vom Brutto`
              : ''}
          </div>
        )}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
