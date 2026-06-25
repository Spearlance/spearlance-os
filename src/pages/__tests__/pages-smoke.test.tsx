import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Node 25+ ships a native localStorage that shadows jsdom's when
// --localstorage-file isn't set (methods are undefined). Stub it.
// jsdom also lacks ResizeObserver which Radix UI Checkbox requires.
beforeAll(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  });

  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

// Mock supabase globally for all page tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin', associated_client_ids: null }, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// Mock CalProvider to avoid importing @calcom/atoms (5MB chunk)
vi.mock('@/components/CalProvider', () => ({
  CalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useCalReady: () => ({ isCalReady: false, isLoading: false }),
}));

function renderPage(element: ReactNode, route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        {element}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Page smoke tests', () => {
  it('Auth page renders without crashing', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    renderPage(<Auth />);
    expect(document.body).toBeTruthy();
  });

  it('NotFound page renders 404 message', async () => {
    const NotFound = (await import('@/pages/NotFound')).default;
    renderPage(<NotFound />);
    expect(screen.getByText(/not found|404/i)).toBeTruthy();
  });

  it('ResetPassword page renders without crashing', async () => {
    const ResetPassword = (await import('@/pages/ResetPassword')).default;
    renderPage(<ResetPassword />);
    expect(document.body).toBeTruthy();
  });
});
