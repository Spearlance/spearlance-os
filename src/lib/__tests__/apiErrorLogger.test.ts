import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isQuotaError, logApiError } from '../apiErrorLogger';

// Mock the entire supabase module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('isQuotaError', () => {
  it('detects "rate limit" phrasing', () => {
    expect(isQuotaError('You have exceeded the rate limit')).toBe(true);
  });

  it('detects "quota" keyword', () => {
    expect(isQuotaError('Your quota has been reached')).toBe(true);
  });

  it('detects HTTP 429 status code in message', () => {
    expect(isQuotaError('Request failed with status 429')).toBe(true);
  });

  it('detects "exceeded" keyword', () => {
    expect(isQuotaError('Token limit exceeded')).toBe(true);
  });

  it('detects "insufficient_quota" error code', () => {
    expect(isQuotaError('Error code: insufficient_quota')).toBe(true);
  });

  it('detects "billing" keyword', () => {
    expect(isQuotaError('Check your billing details')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isQuotaError('RATE LIMIT EXCEEDED')).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isQuotaError('Network connection refused')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isQuotaError('')).toBe(false);
  });

  it('returns false for generic server error', () => {
    expect(isQuotaError('Internal server error')).toBe(false);
  });
});

describe('logApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase insert with correct shape', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await logApiError({
      functionName: 'test-function',
      errorMessage: 'something failed',
      errorType: 'network_error',
      clientId: 'client-abc',
    });

    expect(supabase.from).toHaveBeenCalledWith('api_error_logs');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          function_name: 'test-function',
          error_message: 'something failed',
          error_type: 'network_error',
          client_id: 'client-abc',
        }),
      ])
    );
  });

  it('defaults error_type to "unknown" when not provided', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await logApiError({
      functionName: 'test-function',
      errorMessage: 'oops',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ error_type: 'unknown' }),
      ])
    );
  });

  it('does not throw if supabase insert fails', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('DB down')),
    } as any);

    // Should silently swallow the error
    await expect(
      logApiError({ functionName: 'fn', errorMessage: 'err' })
    ).resolves.toBeUndefined();
  });
});
