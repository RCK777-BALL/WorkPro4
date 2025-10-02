import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import Dashboard from './Dashboard';

describe('Dashboard page', () => {
  it('renders without throwing', () => {
    expect(() => renderToString(<Dashboard />)).not.toThrow();
  });
});
