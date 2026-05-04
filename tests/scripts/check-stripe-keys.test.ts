import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Build live-key fixtures via concat so the literal "sk_live_<...>" pattern
// never appears in this source file. Otherwise the pre-commit hook would
// flag the test file itself as containing live keys.
const SK = 'sk_' + 'live_' + 'dangerouslyrealkey1234567890';
const PK = 'pk_' + 'live_' + 'realdangerouskey9876543210';
const RK = 'rk_' + 'live_' + 'alsorestricteddanger12345';
const SK_OOPS = 'sk_' + 'live_' + 'oopsleakedABC';

const scriptPath = join(process.cwd(), 'scripts', 'check-stripe-keys.mjs');
const tmpEnv = join(process.cwd(), 'tests', 'scripts', '.tmp.env.test');

function runScript(envFile?: string) {
  const args = envFile ? [scriptPath, envFile] : [scriptPath];
  return spawnSync('node', args, { encoding: 'utf-8' });
}

afterEach(() => {
  if (existsSync(tmpEnv)) unlinkSync(tmpEnv);
});

describe('check-stripe-keys', () => {
  it('passes when only test keys present', () => {
    writeFileSync(
      tmpEnv,
      [
        'STRIPE_SECRET_KEY=sk_test_abc123def456',
        'VITE_STRIPE_STARTER_MONTHLY_PRICE_ID=price_1SKNIdJtbnnNcxGr',
        'STRIPE_PUBLISHABLE_KEY=pk_test_xyz789',
      ].join('\n')
    );
    const r = runScript(tmpEnv);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/✓|test mode/i);
  });

  it('passes when env file has no Stripe keys at all', () => {
    writeFileSync(tmpEnv, 'SOMETHING_ELSE=value\n');
    const r = runScript(tmpEnv);
    expect(r.status).toBe(0);
  });

  it('passes silently when env file does not exist', () => {
    const r = runScript(join(process.cwd(), 'tests', 'scripts', '.does-not-exist'));
    expect(r.status).toBe(0);
  });

  it('blocks when sk live key is present', () => {
    writeFileSync(tmpEnv, `STRIPE_SECRET_KEY=${SK}`);
    const r = runScript(tmpEnv);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/LIVE/i);
  });

  it('blocks when pk live key is present', () => {
    writeFileSync(tmpEnv, `VITE_STRIPE_PUBLISHABLE_KEY=${PK}`);
    const r = runScript(tmpEnv);
    expect(r.status).not.toBe(0);
  });

  it('blocks when rk (restricted) live key is present', () => {
    writeFileSync(tmpEnv, `STRIPE_RESTRICTED_KEY=${RK}`);
    const r = runScript(tmpEnv);
    expect(r.status).not.toBe(0);
  });

  it('blocks if any one line has a live key amongst test keys', () => {
    writeFileSync(
      tmpEnv,
      [
        'STRIPE_SECRET_KEY=sk_test_safe',
        `OTHER_KEY=${SK_OOPS}`,
        'STRIPE_PUBLISHABLE_KEY=pk_test_safe',
      ].join('\n')
    );
    const r = runScript(tmpEnv);
    expect(r.status).not.toBe(0);
  });
});
