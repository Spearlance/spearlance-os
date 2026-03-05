import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeatureFlagProvider, useFeatureFlags, useFeatureFlag } from '../FeatureFlagContext';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

function mockFlags(flags: { key: string; enabled: boolean }[], error?: object) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: error ? null : flags, error: error ?? null }),
  } as any);
}

function FlagsDisplay({ flagKey }: { flagKey: string }) {
  const { flags, isLoading, isEnabled } = useFeatureFlags();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'done'}</span>
      <span data-testid="flag-value">{isEnabled(flagKey) ? 'on' : 'off'}</span>
      <span data-testid="all-flags">{JSON.stringify(flags)}</span>
    </div>
  );
}

function SingleFlagDisplay({ flagKey }: { flagKey: string }) {
  const enabled = useFeatureFlag(flagKey);
  return <span data-testid="single-flag">{enabled ? 'on' : 'off'}</span>;
}

describe('FeatureFlagProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset channel mock
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);
  });

  it('starts in loading state', async () => {
    // Never resolve to keep it loading
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(new Promise(() => {})),
    } as any);

    render(
      <FeatureFlagProvider>
        <FlagsDisplay flagKey="test_flag" />
      </FeatureFlagProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('loading');
  });

  it('populates flags from supabase', async () => {
    mockFlags([
      { key: 'feature_a', enabled: true },
      { key: 'feature_b', enabled: false },
    ]);

    render(
      <FeatureFlagProvider>
        <FlagsDisplay flagKey="feature_a" />
      </FeatureFlagProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
    });
    expect(screen.getByTestId('flag-value').textContent).toBe('on');
  });

  it('isEnabled returns false for disabled flags', async () => {
    mockFlags([{ key: 'feature_b', enabled: false }]);

    render(
      <FeatureFlagProvider>
        <FlagsDisplay flagKey="feature_b" />
      </FeatureFlagProvider>
    );

    await waitFor(() => screen.getByTestId('loading').textContent === 'done');
    expect(screen.getByTestId('flag-value').textContent).toBe('off');
  });

  it('isEnabled returns false for unknown flag keys', async () => {
    mockFlags([]);

    render(
      <FeatureFlagProvider>
        <FlagsDisplay flagKey="nonexistent_flag" />
      </FeatureFlagProvider>
    );

    await waitFor(() => screen.getByTestId('loading').textContent === 'done');
    expect(screen.getByTestId('flag-value').textContent).toBe('off');
  });

  it('handles supabase error gracefully — remains done with empty flags', async () => {
    mockFlags([], { message: 'DB error' });

    render(
      <FeatureFlagProvider>
        <FlagsDisplay flagKey="any_flag" />
      </FeatureFlagProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
    });
    expect(screen.getByTestId('flag-value').textContent).toBe('off');
  });

  it('throws when useFeatureFlags is used outside provider', () => {
    // Suppress React error boundary console output
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<FlagsDisplay flagKey="x" />);
    }).toThrow('useFeatureFlags must be used within FeatureFlagProvider');

    console.error = originalError;
  });
});

describe('useFeatureFlag (convenience hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);
  });

  it('returns true for an enabled flag', async () => {
    mockFlags([{ key: 'my_flag', enabled: true }]);

    render(
      <FeatureFlagProvider>
        <SingleFlagDisplay flagKey="my_flag" />
      </FeatureFlagProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('single-flag').textContent).toBe('on');
    });
  });

  it('returns false for a disabled flag', async () => {
    mockFlags([{ key: 'my_flag', enabled: false }]);

    render(
      <FeatureFlagProvider>
        <SingleFlagDisplay flagKey="my_flag" />
      </FeatureFlagProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('single-flag').textContent).toBe('off');
    });
  });
});
