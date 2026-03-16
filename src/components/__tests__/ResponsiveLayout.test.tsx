import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TaxCalculator from '../TaxCalculator';

describe('Responsive layout', () => {
  it('uses stacked layout on mobile and side-by-side on desktop via Tailwind classes', () => {
    const { container } = render(<TaxCalculator />);
    const layout = container.firstElementChild;

    expect(layout?.className).toContain('flex-col');
    expect(layout?.className).toContain('lg:flex-row');
  });

  it('form column uses full width on mobile and 1/3 on desktop', () => {
    const { container } = render(<TaxCalculator />);
    const formColumn = container.querySelector('.lg\\:w-1\\/3');

    expect(formColumn).toBeInTheDocument();
    expect(formColumn?.className).toContain('w-full');
    expect(formColumn?.className).toContain('lg:w-1/3');
  });

  it('results column uses full width on mobile and 2/3 on desktop', () => {
    const { container } = render(<TaxCalculator />);
    const resultsColumn = container.querySelector('.lg\\:w-2\\/3');

    expect(resultsColumn).toBeInTheDocument();
    expect(resultsColumn?.className).toContain('w-full');
    expect(resultsColumn?.className).toContain('lg:w-2/3');
  });

  it('stats section is vertical on mobile and horizontal on desktop', () => {
    render(<TaxCalculator />);
    const stats = document.querySelector('.stats');

    expect(stats?.className).toContain('stats-vertical');
    expect(stats?.className).toContain('lg:stats-horizontal');
  });

  it('cards have smooth transition classes for theme changes', () => {
    const { container } = render(<TaxCalculator />);
    const cards = container.querySelectorAll('.card');

    cards.forEach((card) => {
      expect(card.className).toContain('transition-colors');
      expect(card.className).toContain('duration-300');
    });
  });
});
