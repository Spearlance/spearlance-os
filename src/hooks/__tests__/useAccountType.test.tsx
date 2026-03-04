import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAccountType } from '../useAccountType';

// Mock the ClientContext
vi.mock('@/contexts/ClientContext', () => ({
  useClient: vi.fn(),
}));

import { useClient } from '@/contexts/ClientContext';

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    account_type: 'self_service',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_123',
    billing_method: 'stripe',
    trial_end_date: null,
    grace_period_end: null,
    access_locked: false,
    ...overrides,
  };
}

describe('useAccountType', () => {
  it('identifies self_service account type', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ account_type: 'self_service' }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isSelfService).toBe(true);
    expect(result.current.isManaged).toBe(false);
  });

  it('identifies managed account type', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ account_type: 'managed' }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isManaged).toBe(true);
    expect(result.current.isSelfService).toBe(false);
  });

  it('reports isInTrial when subscription_status is trialing', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ subscription_status: 'trialing' }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isInTrial).toBe(true);
  });

  it('reports isActive when subscription_status is active', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ subscription_status: 'active' }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isActive).toBe(true);
  });

  it('reports isPaused when subscription_status is paused', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ subscription_status: 'paused' }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isPaused).toBe(true);
  });

  it('calculates trialDaysRemaining from trial_end_date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    vi.mocked(useClient).mockReturnValue({
      selectedClient: makeClient({ trial_end_date: futureDate.toISOString() }),
    } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.trialDaysRemaining).toBeGreaterThanOrEqual(6);
    expect(result.current.trialDaysRemaining).toBeLessThanOrEqual(7);
  });

  it('returns trialDaysRemaining of 0 when no trial_end_date', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: makeClient({ trial_end_date: null }) } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.trialDaysRemaining).toBe(0);
  });

  it('hasAccess is true when billing_method is "free"', () => {
    vi.mocked(useClient).mockReturnValue({
      selectedClient: makeClient({ billing_method: 'free', subscription_status: 'active' }),
    } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.hasAccess).toBe(true);
  });

  it('hasAccess is false when access_locked is true', () => {
    vi.mocked(useClient).mockReturnValue({
      selectedClient: makeClient({ access_locked: true }),
    } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.isAccessLocked).toBe(true);
  });

  it('isInGracePeriod when past_due with future grace_period_end and not locked', () => {
    const futureGrace = new Date();
    futureGrace.setDate(futureGrace.getDate() + 3);
    vi.mocked(useClient).mockReturnValue({
      selectedClient: makeClient({
        subscription_status: 'past_due',
        grace_period_end: futureGrace.toISOString(),
        access_locked: false,
      }),
    } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isInGracePeriod).toBe(true);
    expect(result.current.graceDaysRemaining).toBeGreaterThan(0);
  });

  it('isAccessLocked when past_due with expired grace period', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    vi.mocked(useClient).mockReturnValue({
      selectedClient: makeClient({
        subscription_status: 'past_due',
        grace_period_end: pastDate.toISOString(),
        access_locked: false,
      }),
    } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isAccessLocked).toBe(true);
    expect(result.current.graceDaysRemaining).toBe(0);
  });

  it('handles null selectedClient gracefully', () => {
    vi.mocked(useClient).mockReturnValue({ selectedClient: null } as any);
    const { result } = renderHook(() => useAccountType());
    expect(result.current.isSelfService).toBe(false);
    expect(result.current.isManaged).toBe(false);
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.trialDaysRemaining).toBe(0);
  });
});
