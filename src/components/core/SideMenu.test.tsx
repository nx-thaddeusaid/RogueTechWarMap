import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { SideMenu } from './SideMenu';

describe('SideMenu', () => {
  it('renders nav links for Home and Map', () => {
    const { getByText } = render(
      React.createElement(MemoryRouter, null, React.createElement(SideMenu))
    );
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Map')).toBeTruthy();
  });

  it('renders the Terms of Data Use link', () => {
    const { getByText } = render(
      React.createElement(MemoryRouter, null, React.createElement(SideMenu))
    );
    expect(getByText(/Terms of Data Use/i)).toBeTruthy();
  });
});
