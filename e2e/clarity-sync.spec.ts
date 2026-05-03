import { test, expect } from '@playwright/test';

const SPEARLANCE_MEDIA_ID = '8327443d-1552-498d-bc7d-28a315512b86';

// Regression test for the edge-function deployment gap.
// Originally surfaced 2026-05-03 — the clarity-* edge functions existed in the
// repo but were never deployed to Supabase Cloud, so the admin "Sync Now" button
// failed with FunctionsFetchError. After deploying via `npm run deploy:functions`,
// these calls succeed.
test.describe('Clarity edge functions (deployment gap regression)', () => {
  // Auth is provided by e2e/auth.setup.ts via the chromium project's storageState.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const combobox = page.getByRole('combobox').first();
    await expect(combobox).toBeVisible({ timeout: 10_000 });

    const currentClient = await combobox.innerText();
    if (!/spearlance/i.test(currentClient)) {
      await combobox.click();
      const sm = page.getByRole('option', { name: /spearlance/i });
      if ((await sm.count()) === 0) {
        test.skip(true, 'BLOCKED: dev account does not have Spearlance Media in associated_client_ids');
        return;
      }
      await sm.click();
      await page.waitForTimeout(1000);
    }
  });

  test('clarity-sync-daily edge function is reachable and returns success', async ({ page }) => {
    const result = await page.evaluate(async (clientId) => {
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data, error } = await supabase.functions.invoke('clarity-sync-daily', {
        body: { client_id: clientId },
      });
      return {
        ok: !error,
        success: data?.success === true,
        errorMessage: error?.message ?? null,
        synced: data?.synced ?? null,
        failed: data?.failed ?? null,
      };
    }, SPEARLANCE_MEDIA_ID);

    expect(result.errorMessage, 'edge function should be reachable').toBeNull();
    expect(result.ok).toBe(true);
    expect(result.success, 'edge function should return success: true').toBe(true);
  });

  test('clarity-test-connection edge function is reachable', async ({ page }) => {
    const result = await page.evaluate(async (clientId) => {
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data: config } = await supabase
        .from('clarity_configs')
        .select('project_id, api_token')
        .eq('client_id', clientId)
        .maybeSingle();

      if (!config) return { skipped: true, reason: 'No clarity_configs row for client' };

      const { data, error } = await supabase.functions.invoke('clarity-test-connection', {
        body: { projectId: config.project_id, apiToken: config.api_token },
      });

      return {
        skipped: false,
        ok: !error,
        success: data?.success === true,
        errorMessage: error?.message ?? null,
      };
    }, SPEARLANCE_MEDIA_ID);

    if ('skipped' in result && result.skipped) {
      test.skip(true, result.reason);
      return;
    }

    // The deployment gap check — function must be reachable (errorMessage null = no FunctionsFetchError).
    // Token validity is an operational concern, not tested here.
    expect(
      result.errorMessage,
      'FunctionsFetchError means the function is not deployed — run npm run deploy:functions'
    ).toBeNull();
    expect(result.ok, 'edge function should respond without a network error').toBe(true);
  });
});
