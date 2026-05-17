import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../core/PageTemplate', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

describe('Home', () => {
  it('renders the welcome heading', async () => {
    const { Home } = await import('./Home');
    const { getByText } = render(React.createElement(Home));
    expect(getByText(/Welcome to the War Commander/i)).toBeTruthy();
  });

  it('renders the HomeCard components with headings', async () => {
    const { Home } = await import('./Home');
    const { getAllByText } = render(React.createElement(Home));
    expect(getAllByText('RogueWar Discord').length).toBeGreaterThan(0);
    expect(getAllByText('Get RogueTech').length).toBeGreaterThan(0);
    expect(getAllByText('Need Support').length).toBeGreaterThan(0);
  });

  it('renders HomeCard with both Primary and Info styles', async () => {
    const { HomeCard } = await import('./Home');
    const primary = render(
      React.createElement(
        HomeCard,
        {
          style: { toString: () => '-primary' } as any,
          heading: 'Test',
          buttonLabel: 'Go',
          buttonUri: 'https://example.com',
        },
        'Child content'
      )
    );
    expect(primary.getByText('Test')).toBeTruthy();
    primary.unmount();
  });
});
