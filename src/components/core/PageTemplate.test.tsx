import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import PageTemplate from './PageTemplate';

vi.mock('./SideMenu', () => ({
  SideMenu: () => React.createElement('nav', { 'data-testid': 'side-menu' }),
}));

describe('PageTemplate', () => {
  it('renders children inside the layout', () => {
    const { getByText, getByTestId } = render(
      React.createElement(PageTemplate, null, React.createElement('p', null, 'hello world'))
    );
    expect(getByText('hello world')).toBeTruthy();
    expect(getByTestId('side-menu')).toBeTruthy();
  });
});
