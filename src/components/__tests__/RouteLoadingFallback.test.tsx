import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteLoadingFallback } from '../RouteLoadingFallback';

describe('RouteLoadingFallback', () => {
  it('renders a loading spinner', () => {
    render(<RouteLoadingFallback />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
