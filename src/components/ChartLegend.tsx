export interface ChartLegendSeries {
  id: string;
  label: string;
  color: string;
}

interface ChartLegendProps {
  series: ChartLegendSeries[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}

export default function ChartLegend({ series, hidden, onToggle }: ChartLegendProps) {
  return (
    <nav
      aria-label="Chart legend"
      className="flex flex-row flex-wrap gap-x-3 gap-y-1 justify-center md:flex-col md:flex-nowrap md:justify-center md:gap-1.5 md:self-center md:py-2"
    >
      {series.map((s) => {
        const isHidden = hidden.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            role="switch"
            aria-checked={!isHidden}
            aria-label={s.label}
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium',
              'cursor-pointer select-none transition-all duration-150',
              'hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
              isHidden
                ? 'text-base-content/40 line-through decoration-base-content/25'
                : 'text-base-content',
            ].join(' ')}
            onClick={() => onToggle(s.id)}
          >
            <span
              className={[
                'inline-block h-3 w-3 flex-shrink-0 rounded-sm border transition-all duration-150',
                isHidden
                  ? 'border-base-content/20 grayscale opacity-40'
                  : 'border-transparent',
              ].join(' ')}
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
