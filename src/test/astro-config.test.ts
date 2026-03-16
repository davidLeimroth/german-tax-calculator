// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('Astro configuration', () => {
  it('exports a valid config with static output and correct base path', async () => {
    const config = await import('../../astro.config.mjs');
    const resolved = config.default;

    expect(resolved).toBeDefined();
    expect(resolved.output).toBe('static');
    expect(resolved.base).toBe('/steuerrechner');
  });

  it('includes React integration', async () => {
    const config = await import('../../astro.config.mjs');
    const resolved = config.default;

    expect(resolved.integrations).toBeDefined();
    expect(resolved.integrations.length).toBeGreaterThanOrEqual(1);

    const reactIntegration = resolved.integrations.find(
      (i: { name: string }) => i.name === '@astrojs/react'
    );
    expect(reactIntegration).toBeDefined();
  });

  it('includes Tailwind CSS vite plugin', async () => {
    const config = await import('../../astro.config.mjs');
    const resolved = config.default;

    expect(resolved.vite).toBeDefined();
    expect(resolved.vite.plugins).toBeDefined();
    expect(resolved.vite.plugins.length).toBeGreaterThanOrEqual(1);
  });
});
