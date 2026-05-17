import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../core/PageTemplate', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

describe('ToS', () => {
  it('renders Terms of Data Use heading', async () => {
    const { ToS } = await import('./ToS');
    const { getByText } = render(React.createElement(ToS));
    expect(getByText('Terms of Data Use')).toBeTruthy();
  });

  it('renders Humans and Bots section headings', async () => {
    const { ToS } = await import('./ToS');
    const { getByText } = render(React.createElement(ToS));
    expect(getByText('Humans')).toBeTruthy();
    expect(getByText('Bots & other Non-Humans')).toBeTruthy();
  });
});

describe('BulletPoint', () => {
  it('renders without isNested using list-disc class', async () => {
    const { BulletPoint } = await import('./ToS');
    const { getByText } = render(
      React.createElement(BulletPoint, null, 'Item text')
    );
    const li = getByText('Item text');
    expect(li.className).toContain('list-disc');
  });

  it('renders with isNested using nested-list class', async () => {
    const { BulletPoint } = await import('./ToS');
    const { getByText } = render(
      React.createElement(BulletPoint, { isNested: true }, 'Nested item')
    );
    const li = getByText('Nested item');
    expect(li.className).toContain('nested-list');
  });
});
