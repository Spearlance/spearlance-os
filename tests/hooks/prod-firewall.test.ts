import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const hookPath = join(process.cwd(), '.claude', 'hooks', 'prod-firewall.sh');

function runHook(command: string, env: Record<string, string> = {}): { code: number; stderr: string; stdout: string } {
  const input = JSON.stringify({ tool_input: { command } });
  const result = spawnSync('bash', [hookPath], {
    input,
    encoding: 'utf-8',
    env: { ...process.env, ...env, ARMADILLO_PROD_CONFIRMED: env.ARMADILLO_PROD_CONFIRMED ?? '' },
  });
  return {
    code: result.status ?? -1,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
}

describe('prod-firewall hook', () => {
  it('hook script exists and is readable', () => {
    expect(existsSync(hookPath)).toBe(true);
  });

  // ----- BLOCK rules -----

  it('blocks supabase db reset against prod ref', () => {
    const r = runHook('npx supabase db reset --project-ref chikljxwgiskyjsnjelf');
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/PROD/i);
  });

  it('blocks supabase db push against prod ref without confirmation', () => {
    const r = runHook('npx supabase db push --project-ref chikljxwgiskyjsnjelf');
    expect(r.code).toBe(2);
  });

  it('blocks db reset --linked (linked state too risky)', () => {
    const r = runHook('npx supabase db reset --linked');
    expect(r.code).toBe(2);
  });

  it('blocks db push --linked without confirmation', () => {
    const r = runHook('npx supabase db push --linked');
    expect(r.code).toBe(2);
  });

  it('blocks deploy-functions --env prod --all without confirmation', () => {
    const r = runHook('node scripts/deploy-functions.mjs --env prod --all');
    expect(r.code).toBe(2);
  });

  it('blocks DROP TABLE against prod ref', () => {
    const r = runHook('npx supabase db query --linked "DROP TABLE clients" # via chikljxwgiskyjsnjelf');
    expect(r.code).toBe(2);
  });

  it('blocks TRUNCATE against prod ref', () => {
    const r = runHook('echo "TRUNCATE clients" | psql postgres://chikljxwgiskyjsnjelf');
    expect(r.code).toBe(2);
  });

  // ----- ALLOW rules -----

  it('allows db push against branch dev ref', () => {
    const r = runHook('npx supabase db push --project-ref zlljsdaxsggkasvympku');
    expect(r.code).toBe(0);
  });

  it('allows read-only db query against prod ref', () => {
    const r = runHook('npx supabase db query --project-ref chikljxwgiskyjsnjelf "SELECT 1"');
    expect(r.code).toBe(0);
  });

  it('allows deploy-functions single function against prod', () => {
    const r = runHook('node scripts/deploy-functions.mjs --env prod --function send-magic-link');
    expect(r.code).toBe(0);
  });

  it('allows unrelated bash commands', () => {
    const r = runHook('git status');
    expect(r.code).toBe(0);
  });

  it('allows git commit even when message text contains dangerous-looking patterns', () => {
    const msg = 'feat: add deploy-functions --env prod --all firewall + db reset chikljxwgiskyjsnjelf coverage';
    const r = runHook(`git commit -m "${msg}"`);
    expect(r.code).toBe(0);
  });

  it('allows db push --linked when ARMADILLO_PROD_CONFIRMED=1', () => {
    const r = runHook('npx supabase db push --linked', { ARMADILLO_PROD_CONFIRMED: '1' });
    expect(r.code).toBe(0);
  });

  it('allows db push against prod ref when ARMADILLO_PROD_CONFIRMED=1', () => {
    const r = runHook('npx supabase db push --project-ref chikljxwgiskyjsnjelf', { ARMADILLO_PROD_CONFIRMED: '1' });
    expect(r.code).toBe(0);
  });

  it('still blocks db reset against prod even with confirmation flag', () => {
    const r = runHook('npx supabase db reset --project-ref chikljxwgiskyjsnjelf', { ARMADILLO_PROD_CONFIRMED: '1' });
    expect(r.code).toBe(2);
  });
});
