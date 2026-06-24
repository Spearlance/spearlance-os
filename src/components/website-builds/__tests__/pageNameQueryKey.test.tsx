import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Track which selects ran so the test can wait for the overview query to settle.
let statusOnlyRequested = false;

const FULL_PAGES = [
  {
    id: "p1",
    build_id: "b1",
    page_name: "Home",
    page_type: "content",
    status: "in_progress",
    sort_order: 0,
    content_notes: null,
    dev_notes: null,
    ai_content: null,
  },
];

const STATUS_ONLY = [{ status: "in_progress" }];

function resolveData(table: string, select: string | undefined) {
  if (table === "website_build_pages") {
    if (select === "*" || (select ?? "").includes("page_name")) {
      return { data: FULL_PAGES, error: null };
    }
    statusOnlyRequested = true;
    return { data: STATUS_ONLY, error: null };
  }
  // clients (.maybeSingle) -> null; services (list) -> []
  return { data: table === "services" ? [] : null, error: null };
}

function makeBuilder(table: string) {
  const builder: any = {
    _table: table,
    _select: undefined as string | undefined,
    select(cols: string) {
      this._select = cols;
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    not() {
      return this;
    },
    maybeSingle() {
      return Promise.resolve(resolveData(this._table, this._select));
    },
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(resolveData(this._table, this._select)).then(
        onFulfilled,
        onRejected
      );
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
}));

import { BuildOverviewTab } from "@/components/website-builds/BuildOverviewTab";
import { BuildPagesTab } from "@/components/website-builds/BuildPagesTab";

const build = {
  id: "b1",
  name: "Website Redesign",
  status: "in_progress",
  target_launch_date: null,
  scope_summary: null,
};

beforeEach(() => {
  statusOnlyRequested = false;
});

describe("website build pages query-key isolation", () => {
  it("renders page names on the Pages tab even after the Overview tab loaded its status-only query", async () => {
    // A single shared client with the app's fresh window: cached data is not refetched.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });

    // 1. Overview tab mounts first (it is the default tab) and populates the cache.
    const overview = render(
      <QueryClientProvider client={queryClient}>
        <BuildOverviewTab build={build} onUpdate={vi.fn()} />
      </QueryClientProvider>
    );
    await waitFor(() => expect(statusOnlyRequested).toBe(true));

    // 2. User switches to the Pages tab (Radix unmounts the inactive Overview).
    overview.unmount();
    render(
      <QueryClientProvider client={queryClient}>
        <BuildPagesTab buildId="b1" clientId="c1" />
      </QueryClientProvider>
    );

    // The page name must show. If Overview's status-only query shares the cache
    // key, the cached rows have no page_name and this never appears.
    expect(await screen.findByText("Home")).toBeInTheDocument();
  });
});
