#!/usr/bin/env node
// Auto-installs project git hooks. Runs via `npm install` (lifecycle: prepare).
// Idempotent — safe to run repeatedly.

import { existsSync, copyFileSync, chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const gitDir = join(repoRoot, '.git');

if (!existsSync(gitDir)) {
  console.log('▸ No .git directory — skipping hook install (likely a clone with --no-checkout or CI shallow clone)');
  process.exit(0);
}

const hooksDir = join(gitDir, 'hooks');
if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

const hooks = [
  { src: join('scripts', 'pre-commit-secrets.sh'), dest: join(hooksDir, 'pre-commit') },
  { src: join('scripts', 'pre-push-protect-main.sh'), dest: join(hooksDir, 'pre-push') },
];

for (const { src, dest } of hooks) {
  const srcPath = join(repoRoot, src);
  if (!existsSync(srcPath)) {
    console.warn(`▸ Hook source missing: ${src} — skipping`);
    continue;
  }
  copyFileSync(srcPath, dest);
  try {
    chmodSync(dest, 0o755);
  } catch {
    // chmod fails on Windows but the hook still runs via git-bash
  }
  console.log(`✓ Installed ${dest}`);
}
