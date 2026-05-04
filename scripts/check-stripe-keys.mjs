#!/usr/bin/env node
// Blocks dev startup if .env.local contains live Stripe keys.
// Wired as `predev` so `npm run dev` runs this first.
//
// Usage:
//   node scripts/check-stripe-keys.mjs              # checks .env.local
//   node scripts/check-stripe-keys.mjs <path>       # checks given file

import { readFileSync, existsSync } from 'node:fs';

const path = process.argv[2] || '.env.local';

if (!existsSync(path)) {
  console.log(`▸ No ${path} found — skipping Stripe live-key check`);
  process.exit(0);
}

const content = readFileSync(path, 'utf-8');

// Stripe live keys: sk_live_*, pk_live_*, rk_live_* (restricted)
// Match enough chars after the prefix to avoid matching `sk_live_*` as a literal placeholder.
const liveKeyPattern = /(sk|pk|rk)_live_[A-Za-z0-9]{4,}/g;
const matches = content.match(liveKeyPattern) || [];

if (matches.length > 0) {
  // Mask the matched keys so they don't get echoed in full
  const masked = matches.map((m) => `${m.slice(0, 11)}…${m.slice(-4)}`);
  console.error('');
  console.error('🛑 STRIPE LIVE KEY DETECTED IN DEV ENV');
  console.error('');
  console.error(`File: ${path}`);
  console.error(`Found ${matches.length} live key(s):`);
  for (const m of masked) {
    console.error(`  - ${m}`);
  }
  console.error('');
  console.error('Live keys belong in production only. Replace with TEST keys:');
  console.error('  https://dashboard.stripe.com/test/apikeys');
  console.error('  Test keys start with sk_test_ / pk_test_');
  console.error('');
  process.exit(1);
}

console.log('✓ Stripe keys validated (test mode only)');
process.exit(0);
