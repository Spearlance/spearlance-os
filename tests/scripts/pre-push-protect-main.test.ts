import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const hookPath = join(process.cwd(), 'scripts', 'pre-push-protect-main.sh');

const ZERO = '0000000000000000000000000000000000000000';
const SHA = 'abcdef1234567890abcdef1234567890abcdef12';

function runHook(stdinLines: string[]): { code: number; stderr: string; stdout: string } {
  const input = stdinLines.join('\n') + (stdinLines.length ? '\n' : '');
  const r = spawnSync('bash', [hookPath, 'origin', 'https://github.com/garrett-handley/spearlance-os.git'], {
    input,
    encoding: 'utf-8',
  });
  return {
    code: r.status ?? -1,
    stderr: r.stderr ?? '',
    stdout: r.stdout ?? '',
  };
}

describe('pre-push-protect-main hook', () => {
  it('hook script exists and is readable', () => {
    expect(existsSync(hookPath)).toBe(true);
  });

  it('allows push of feature branch to feature branch', () => {
    const r = runHook([`refs/heads/feat/foo ${SHA} refs/heads/feat/foo ${ZERO}`]);
    expect(r.code).toBe(0);
  });

  it('blocks direct push to refs/heads/main', () => {
    const r = runHook([`refs/heads/main ${SHA} refs/heads/main ${ZERO}`]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/main/i);
  });

  it('blocks cross-ref push from feature branch to main', () => {
    const r = runHook([`refs/heads/feat/foo ${SHA} refs/heads/main ${ZERO}`]);
    expect(r.code).not.toBe(0);
  });

  it('blocks push to refs/heads/master', () => {
    const r = runHook([`refs/heads/master ${SHA} refs/heads/master ${ZERO}`]);
    expect(r.code).not.toBe(0);
  });

  it('does not match branches that merely contain "main" as a substring', () => {
    const r = runHook([`refs/heads/mainstream ${SHA} refs/heads/mainstream ${ZERO}`]);
    expect(r.code).toBe(0);
  });

  it('does not match branches starting with "main/"', () => {
    const r = runHook([`refs/heads/main/sub ${SHA} refs/heads/main/sub ${ZERO}`]);
    expect(r.code).toBe(0);
  });

  it('blocks when one of multiple refs targets main', () => {
    const r = runHook([
      `refs/heads/feat/a ${SHA} refs/heads/feat/a ${ZERO}`,
      `refs/heads/x ${SHA} refs/heads/main ${ZERO}`,
    ]);
    expect(r.code).not.toBe(0);
  });

  it('allows empty stdin (nothing to push)', () => {
    const r = runHook([]);
    expect(r.code).toBe(0);
  });

  it('error message names the offending ref', () => {
    const r = runHook([`refs/heads/main ${SHA} refs/heads/main ${ZERO}`]);
    expect(r.stderr).toMatch(/refs\/heads\/main|main/i);
  });

  it('mentions --no-verify bypass in error output', () => {
    const r = runHook([`refs/heads/main ${SHA} refs/heads/main ${ZERO}`]);
    expect(r.stderr).toMatch(/--no-verify/);
  });
});
