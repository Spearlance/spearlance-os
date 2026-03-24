import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '../useUserRole';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mockSupabaseRole(role: string | null) {
  if (role === null) {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);
    return;
  }
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  } as any);
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role },
          error: null,
        }),
      }),
    }),
  } as any);
}

describe('useUserRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the user role', async () => {
    mockSupabaseRole('admin');
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.role).toBe('admin'));
  });

  it('returns null when no user is logged in', async () => {
    mockSupabaseRole(null);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBeNull();
  });

  it('provides isAdmin convenience flag', async () => {
    mockSupabaseRole('admin');
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });

  it('provides isWebDesigner convenience flag', async () => {
    mockSupabaseRole('web_designer');
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isWebDesigner).toBe(true));
  });
});
