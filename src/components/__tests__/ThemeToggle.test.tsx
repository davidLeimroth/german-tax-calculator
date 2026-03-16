import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '../ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('renders toggle with sun/moon icons', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it('toggles from light to dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByTestId('theme-toggle');
    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles back to light on second click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByTestId('theme-toggle');
    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);

    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to light when localStorage is empty', () => {
    render(<ThemeToggle />);

    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).not.toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('has accessible label', () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });
});
