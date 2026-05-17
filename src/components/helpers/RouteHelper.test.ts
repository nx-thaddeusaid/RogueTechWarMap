import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RouteHelper', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns "/" when VITE_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_BASE_URL', '');
    const { BASE_ROUTE } = await import('./RouteHelper.ts');
    expect(BASE_ROUTE).toBe('/');
    vi.unstubAllEnvs();
  });

  it('returns the env value when VITE_BASE_URL is set', async () => {
    vi.stubEnv('VITE_BASE_URL', '/roguewar');
    const { BASE_ROUTE } = await import('./RouteHelper.ts');
    expect(BASE_ROUTE).toBe('/roguewar');
    vi.unstubAllEnvs();
  });
});
