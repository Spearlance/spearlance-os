// Pulls Search Console + Google Ads data from Windsor.ai into the reporting
// schema. One WINDSOR_API_KEY covers every connected account, and Windsor's
// select_accounts param scopes a single call to many accounts — so each
// connector needs only a few HTTP calls for ALL clients, fanned out per
// account at write time.
//
// Body (all optional): { connector: 'searchconsole' | 'google_ads',
//   client_id: uuid, days: number }. days overrides the trailing re-pull
// window (GSC defaults to 14 because its data lags ~2 days; Ads to 7) —
// pass e.g. 90 for an initial backfill.
//
// Auth: verify_jwt = true. The nightly pg_cron job calls with the project's
// service-role JWT (no user); manual "Refresh now" calls from the app carry a
// user JWT and must be admin/FMM.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders, json, reportingClient } from '../_shared/reporting.ts';

type Connector = 'searchconsole' | 'google_ads';

interface AccountRow {
  id: string;
  client_id: string;
  connector: Connector;
  account_id: string;
}

const TOP_N = 50;

// GSC site URLs arrive with varying trailing slash / case; Ads customer ids
// are stable ("960-512-0559"). Normalize both sides before matching.
const normalizeAccountKey = (value: string) =>
  value.trim().toLowerCase().replace(/\/+$/, '');

async function fetchWindsor(
  connector: Connector,
  apiKey: string,
  dateFrom: string,
  dateTo: string,
  fields: string,
  selectAccounts: string,
): Promise<Record<string, unknown>[]> {
  const url = new URL(`https://connectors.windsor.ai/${connector}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('date_from', dateFrom);
  url.searchParams.set('date_to', dateTo);
  url.searchParams.set('fields', fields);
  url.searchParams.set('select_accounts', selectAccounts);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Windsor ${connector} ${res.status}: ${body.slice(0, 300)}`);
  }
  const payload = await res.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const numOrNull = (v: unknown): number | null =>
  v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

/** Group Windsor rows by mapped connector account; unknown accounts are skipped. */
function groupByAccount(
  rows: Record<string, unknown>[],
  keyField: string,
  byAccountKey: Map<string, AccountRow>,
): Map<AccountRow, Record<string, unknown>[]> {
  const grouped = new Map<AccountRow, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = normalizeAccountKey(String(row[keyField] ?? ''));
    const account = byAccountKey.get(key);
    if (!account || !row.date) continue;
    const list = grouped.get(account) ?? [];
    list.push(row);
    grouped.set(account, list);
  }
  return grouped;
}

const baseRow = (account: AccountRow, row: Record<string, unknown>) => ({
  client_id: account.client_id,
  connector_account_id: account.id,
  metric_date: String(row.date),
  clicks: num(row.clicks),
  impressions: num(row.impressions),
  ctr: numOrNull(row.ctr),
  synced_at: new Date().toISOString(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // A token that resolves to a user is a manual trigger from the app — gate on
  // admin/FMM. The cron job's service-role JWT resolves to no user and passes.
  const { data: userData } = await adminClient.auth.getUser(token).catch(() => ({ data: { user: null } }));
  if (userData?.user) {
    const { data: profile } = await adminClient
      .from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
    if (!['admin', 'fmm'].includes(profile?.role ?? '')) {
      return json({ error: 'forbidden' }, 403);
    }
  }

  const apiKey = Deno.env.get('WINDSOR_API_KEY');
  if (!apiKey) return json({ error: 'WINDSOR_API_KEY is not configured' }, 500);

  const body = await req.json().catch(() => ({}));
  const connectors: Connector[] =
    body.connector === 'searchconsole' || body.connector === 'google_ads'
      ? [body.connector]
      : ['searchconsole', 'google_ads'];

  const db = reportingClient();
  const results: Record<string, { accounts: number; errors: string[] }> = {};

  for (const connector of connectors) {
    let accountsQuery = db
      .from('connector_accounts')
      .select('id, client_id, connector, account_id')
      .eq('connector', connector)
      .eq('is_active', true);
    if (body.client_id) accountsQuery = accountsQuery.eq('client_id', body.client_id);
    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) {
      results[connector] = { accounts: 0, errors: [accountsError.message] };
      continue;
    }
    if (!accounts?.length) {
      results[connector] = { accounts: 0, errors: [] };
      continue;
    }

    const byAccountKey = new Map<string, AccountRow>(
      accounts.map((a: AccountRow) => [normalizeAccountKey(a.account_id), a]),
    );
    const days = num(body.days) || (connector === 'searchconsole' ? 14 : 7);
    const dateFrom = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const dateTo = new Date().toISOString().slice(0, 10);
    const selectAccounts = accounts.map((a: AccountRow) => a.account_id).join(',');

    const errors: string[] = [];
    const syncedAccountIds = new Set<string>();

    try {
      if (connector === 'searchconsole') {
        await syncSearchConsole(db, apiKey, dateFrom, dateTo, selectAccounts, byAccountKey, errors, syncedAccountIds);
      } else {
        await syncGoogleAds(db, apiKey, dateFrom, dateTo, selectAccounts, byAccountKey, errors, syncedAccountIds);
      }
      if (syncedAccountIds.size > 0) {
        await db.from('connector_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .in('id', [...syncedAccountIds]);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    results[connector] = { accounts: accounts.length, errors };
  }

  const failed = Object.values(results).some((r) => r.errors.length > 0);
  return json({ success: !failed, results }, failed ? 502 : 200);
});

async function syncSearchConsole(
  db: SupabaseClient,
  apiKey: string,
  dateFrom: string,
  dateTo: string,
  selectAccounts: string,
  byAccountKey: Map<string, AccountRow>,
  errors: string[],
  syncedAccountIds: Set<string>,
) {
  const totals = await fetchWindsor('searchconsole', apiKey, dateFrom, dateTo,
    'date,clicks,impressions,ctr,position,account_name', selectAccounts);
  for (const [account, rows] of groupByAccount(totals, 'account_name', byAccountKey)) {
    try {
      const { error } = await db.from('gsc_daily').upsert(
        rows.map((row) => ({ ...baseRow(account, row), position: numOrNull(row.position) })),
        { onConflict: 'client_id,connector_account_id,metric_date' },
      );
      if (error) throw new Error(error.message);
      syncedAccountIds.add(account.id);
    } catch (e) {
      errors.push(`gsc_daily ${account.account_id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  for (const [table, dimension] of [['gsc_queries_daily', 'query'], ['gsc_pages_daily', 'page']] as const) {
    const rows = await fetchWindsor('searchconsole', apiKey, dateFrom, dateTo,
      `date,${dimension},clicks,impressions,ctr,position,account_name`, selectAccounts);
    for (const [account, accountRows] of groupByAccount(rows, 'account_name', byAccountKey)) {
      // Top-N snapshot per day: replace the day's rows wholesale.
      const byDate = new Map<string, Record<string, unknown>[]>();
      for (const row of accountRows) {
        if (!row[dimension]) continue;
        const list = byDate.get(String(row.date)) ?? [];
        list.push(row);
        byDate.set(String(row.date), list);
      }
      for (const [date, dayRows] of byDate) {
        try {
          const topN = dayRows
            .sort((a, b) => num(b.clicks) - num(a.clicks) || num(b.impressions) - num(a.impressions))
            .slice(0, TOP_N)
            .map((row) => ({
              ...baseRow(account, row),
              position: numOrNull(row.position),
              [dimension]: String(row[dimension]),
            }));
          const del = await db.from(table).delete()
            .eq('connector_account_id', account.id).eq('metric_date', date);
          if (del.error) throw new Error(del.error.message);
          const ins = await db.from(table).insert(topN);
          if (ins.error) throw new Error(ins.error.message);
          syncedAccountIds.add(account.id);
        } catch (e) {
          errors.push(`${table} ${account.account_id} ${date}: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }
}

async function syncGoogleAds(
  db: SupabaseClient,
  apiKey: string,
  dateFrom: string,
  dateTo: string,
  selectAccounts: string,
  byAccountKey: Map<string, AccountRow>,
  errors: string[],
  syncedAccountIds: Set<string>,
) {
  const adsFields = 'clicks,impressions,spend,conversions,cost_per_conversion,ctr,cpc,search_impression_share';
  const adsRow = (account: AccountRow, row: Record<string, unknown>) => ({
    ...baseRow(account, row),
    spend: num(row.spend),
    conversions: num(row.conversions),
    cost_per_conversion: numOrNull(row.cost_per_conversion),
    cpc: numOrNull(row.cpc),
    search_impression_share: numOrNull(row.search_impression_share),
  });

  const totals = await fetchWindsor('google_ads', apiKey, dateFrom, dateTo,
    `date,account_id,${adsFields}`, selectAccounts);
  for (const [account, rows] of groupByAccount(totals, 'account_id', byAccountKey)) {
    try {
      const { error } = await db.from('google_ads_daily').upsert(
        rows.map((row) => adsRow(account, row)),
        { onConflict: 'client_id,connector_account_id,metric_date' },
      );
      if (error) throw new Error(error.message);
      syncedAccountIds.add(account.id);
    } catch (e) {
      errors.push(`google_ads_daily ${account.account_id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const campaigns = await fetchWindsor('google_ads', apiKey, dateFrom, dateTo,
    `date,account_id,campaign,${adsFields}`, selectAccounts);
  for (const [account, rows] of groupByAccount(campaigns, 'account_id', byAccountKey)) {
    try {
      const { error } = await db.from('google_ads_campaigns_daily').upsert(
        rows.filter((row) => row.campaign)
          .map((row) => ({ ...adsRow(account, row), campaign: String(row.campaign) })),
        { onConflict: 'client_id,connector_account_id,metric_date,campaign' },
      );
      if (error) throw new Error(error.message);
      syncedAccountIds.add(account.id);
    } catch (e) {
      errors.push(`google_ads_campaigns_daily ${account.account_id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
