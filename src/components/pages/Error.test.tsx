import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../core/PageTemplate', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'page-template' }, children),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: vi.fn(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
      React.createElement('a', { href: String(to) }, children),
  };
});

describe('ErrorPage', () => {
  it('shows route error message with home link when isRouteErrorResponse is true', async () => {
    const { useRouteError, isRouteErrorResponse } = await import('react-router-dom');
    vi.mocked(useRouteError).mockReturnValue({ status: 404 });
    vi.mocked(isRouteErrorResponse).mockReturnValue(true);

    const ErrorPage = (await import('./Error')).default;
    const { getByText } = render(React.createElement(ErrorPage));
    expect(getByText(/Click here to return Home/i)).toBeTruthy();
  });

  it('shows error message when error is an Error instance', async () => {
    const { useRouteError, isRouteErrorResponse } = await import('react-router-dom');
    vi.mocked(useRouteError).mockReturnValue(new Error('something broke'));
    vi.mocked(isRouteErrorResponse).mockReturnValue(false);

    const ErrorPage = (await import('./Error')).default;
    const { getByText } = render(React.createElement(ErrorPage));
    expect(getByText('something broke')).toBeTruthy();
    expect(getByText(/Unexpected Error/i)).toBeTruthy();
  });

  it('shows "Unknown error" for unrecognised error types', async () => {
    const { useRouteError, isRouteErrorResponse } = await import('react-router-dom');
    vi.mocked(useRouteError).mockReturnValue('a string error');
    vi.mocked(isRouteErrorResponse).mockReturnValue(false);

    const ErrorPage = (await import('./Error')).default;
    const { getByText } = render(React.createElement(ErrorPage));
    expect(getByText('Unknown error')).toBeTruthy();
  });
});
