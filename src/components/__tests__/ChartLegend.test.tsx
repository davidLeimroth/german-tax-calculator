import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ChartLegend from '../ChartLegend';

const SAMPLE_SERIES = [
  { id: 'Netto', label: 'Netto', color: '#4caf50' },
  { id: 'Lohnsteuer', label: 'Lohnsteuer', color: '#f44336' },
  { id: 'Krankenversicherung', label: 'Krankenversicherung', color: '#2196f3' },
];

describe('ChartLegend', () => {
  it('renders all series items', () => {
    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={() => {}} />,
    );

    expect(screen.getByRole('switch', { name: 'Netto' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Lohnsteuer' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Krankenversicherung' })).toBeInTheDocument();
  });

  it('marks visible items as aria-checked true', () => {
    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={() => {}} />,
    );

    const nettoButton = screen.getByRole('switch', { name: 'Netto' });
    expect(nettoButton).toHaveAttribute('aria-checked', 'true');
  });

  it('marks hidden items as aria-checked false', () => {
    render(
      <ChartLegend
        series={SAMPLE_SERIES}
        hidden={new Set(['Lohnsteuer'])}
        onToggle={() => {}}
      />,
    );

    const lohnsteuerButton = screen.getByRole('switch', { name: 'Lohnsteuer' });
    expect(lohnsteuerButton).toHaveAttribute('aria-checked', 'false');
  });

  it('applies line-through styling to hidden items', () => {
    render(
      <ChartLegend
        series={SAMPLE_SERIES}
        hidden={new Set(['Netto'])}
        onToggle={() => {}}
      />,
    );

    const nettoButton = screen.getByRole('switch', { name: 'Netto' });
    expect(nettoButton.className).toContain('line-through');
  });

  it('does not apply line-through styling to visible items', () => {
    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={() => {}} />,
    );

    const nettoButton = screen.getByRole('switch', { name: 'Netto' });
    expect(nettoButton.className).not.toContain('line-through');
  });

  it('calls onToggle with the series id when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={onToggle} />,
    );

    await user.click(screen.getByRole('switch', { name: 'Lohnsteuer' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('Lohnsteuer');
  });

  it('calls onToggle for a hidden item to re-enable it', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ChartLegend
        series={SAMPLE_SERIES}
        hidden={new Set(['Netto'])}
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByRole('switch', { name: 'Netto' }));
    expect(onToggle).toHaveBeenCalledWith('Netto');
  });

  it('renders color swatches with correct background colors', () => {
    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={() => {}} />,
    );

    const buttons = screen.getAllByRole('switch');
    buttons.forEach((button, idx) => {
      const swatch = button.querySelector('span');
      expect(swatch).toHaveStyle({ backgroundColor: SAMPLE_SERIES[idx].color });
    });
  });

  it('applies grayscale to hidden item swatches', () => {
    render(
      <ChartLegend
        series={SAMPLE_SERIES}
        hidden={new Set(['Krankenversicherung'])}
        onToggle={() => {}}
      />,
    );

    const kvButton = screen.getByRole('switch', { name: 'Krankenversicherung' });
    const swatch = kvButton.querySelector('span');
    expect(swatch?.className).toContain('grayscale');
  });

  it('renders a navigation landmark', () => {
    render(
      <ChartLegend series={SAMPLE_SERIES} hidden={new Set()} onToggle={() => {}} />,
    );

    expect(screen.getByRole('navigation', { name: /chart legend/i })).toBeInTheDocument();
  });

  it('renders nothing when series is empty', () => {
    const { container } = render(
      <ChartLegend series={[]} hidden={new Set()} onToggle={() => {}} />,
    );

    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
