#!/usr/bin/env node
/**
 * doctor.js — Standalone health check for armadillo installations.
 * Run: node .claude/lib/doctor.js
 * No AI tokens needed. No dependencies.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = join(__dirname, '..');
const PROJECT_ROOT = join(CLAUDE_DIR, '..');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg) { console.log(`  ✓  ${msg}`); passed++; }
function fail(msg) { console.log(`  ✗  ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠  ${msg}`); warnings++; }

console.log('\n  armadillo doctor\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Manifest check
const manifestPath = join(CLAUDE_DIR, '.armadillo-manifest.json');
let manifest = null;
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    ok(`Manifest valid (v${manifest.version})`);
    if (!manifest.completed) warn('Manifest shows incomplete onboarding');
  } catch (e) {
    fail(`Manifest exists but invalid JSON: ${e.message}`);
  }
} else {
  fail('No .armadillo-manifest.json found — run onboarding');
}

// 2. File presence
if (manifest && manifest.files) {
  const files = Object.keys(manifest.files);
  let missing = 0;
  for (const f of files) {
    if (!existsSync(join(CLAUDE_DIR, f))) missing++;
  }
  if (missing === 0) {
    ok(`All ${files.length} tracked files present`);
  } else {
    fail(`${missing} of ${files.length} tracked files missing`);
  }
}

// 3. Hooks config
const hooksPath = join(CLAUDE_DIR, 'hooks', 'hooks.json');
if (existsSync(hooksPath)) {
  try {
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf8'));
    const eventCount = Object.keys(hooks.hooks || {}).length;
    ok(`hooks.json valid (${eventCount} event types)`);
  } catch (e) {
    fail(`hooks.json invalid: ${e.message}`);
  }
} else {
  fail('hooks/hooks.json not found');
}

// 4. Hook scripts executable
const hookDir = join(CLAUDE_DIR, 'hooks');
if (existsSync(hookDir)) {
  const scripts = readdirSync(hookDir).filter(f => f.endsWith('.sh'));
  let nonExec = 0;
  for (const s of scripts) {
    try {
      execSync(`test -x "${join(hookDir, s)}"`, { stdio: 'pipe' });
    } catch {
      nonExec++;
      warn(`${s} is not executable — run: chmod +x .claude/hooks/${s}`);
    }
  }
  if (nonExec === 0) ok(`All ${scripts.length} hook scripts executable`);
}

// 4b. Settings↔hooks.json drift check
const settingsPath = join(CLAUDE_DIR, 'settings.json');
if (existsSync(hooksPath) && existsSync(settingsPath)) {
  try {
    const hooksData = JSON.parse(readFileSync(hooksPath, 'utf8'));
    const settingsData = JSON.parse(readFileSync(settingsPath, 'utf8'));

    const extract = (obj) => {
      const scripts = new Set();
      for (const [event, groups] of Object.entries(obj.hooks || {})) {
        for (const group of groups) {
          for (const hook of (group.hooks || [])) {
            if (hook.command) {
              const match = hook.command.match(/([a-z-]+\.sh)/);
              if (match) scripts.add(`${event}:${match[1]}`);
            }
          }
        }
      }
      return scripts;
    };

    const hooksScripts = extract(hooksData);
    const settingsScripts = extract(settingsData);
    const drift = [];
    for (const entry of hooksScripts) {
      if (!settingsScripts.has(entry)) drift.push(entry);
    }
    if (drift.length === 0) {
      ok('No settings.json ↔ hooks.json drift');
    } else {
      fail(`${drift.length} hook(s) in hooks.json missing from settings.json (drift)`);
      drift.forEach(d => console.log(`       ↳ ${d}`));
    }
  } catch (e) {
    warn(`Could not check drift: ${e.message}`);
  }
}

// 4c. Permission mode check
if (existsSync(settingsPath)) {
  try {
    const settingsData = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const mode = settingsData?.permissions?.defaultMode;
    if (mode === 'bypassPermissions') {
      ok('Permission mode: bypassPermissions');
    } else {
      warn(`Permission mode is "${mode || 'not set'}" — armadillo recommends bypassPermissions`);
    }
  } catch {
    warn('Could not read settings.json permissions');
  }
}

// 4d. Git workflow rule check
const rulesDir = join(CLAUDE_DIR, 'rules');
const gitWorkflowPath = join(rulesDir, 'git-workflow.md');
if (existsSync(gitWorkflowPath)) {
  const gwContent = readFileSync(gitWorkflowPath, 'utf8');
  if (gwContent.includes('gh api') && gwContent.includes('REST')) {
    ok('git-workflow.md has REST-first mandate');
  } else {
    warn('git-workflow.md missing REST-first mandate — run updating-armadillo to sync');
  }
} else {
  warn('git-workflow.md rule missing');
}

// 5. CLAUDE.md markers
const claudeMdPath = join(CLAUDE_DIR, 'CLAUDE.md');
if (existsSync(claudeMdPath)) {
  const content = readFileSync(claudeMdPath, 'utf8');
  if (content.includes('<!-- armadillo:start -->') && content.includes('<!-- armadillo:end -->')) {
    ok('CLAUDE.md armadillo markers intact');
  } else {
    fail('CLAUDE.md missing armadillo:start/end markers');
  }
} else {
  fail('CLAUDE.md not found');
}

// 6. Settings check
if (existsSync(settingsPath)) {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const mode = settings?.permissions?.defaultMode || 'unknown';
    ok(`settings.json valid (mode: ${mode})`);
  } catch (e) {
    fail(`settings.json invalid: ${e.message}`);
  }
} else {
  warn('settings.json not found');
}

// 7. Orphaned files
if (manifest && manifest.files) {
  const tracked = new Set(Object.keys(manifest.files));
  const skipDirs = new Set(['.armadillo-manifest.json', '.DS_Store']);

  function scanDir(dir, prefix) {
    const orphaned = [];
    if (!existsSync(dir)) return orphaned;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        orphaned.push(...scanDir(join(dir, entry.name), relPath));
      } else if (!tracked.has(relPath)) {
        orphaned.push(relPath);
      }
    }
    return orphaned;
  }

  const orphaned = scanDir(CLAUDE_DIR, '');
  if (orphaned.length === 0) {
    ok('No orphaned files');
  } else {
    warn(`${orphaned.length} orphaned file(s) not in manifest`);
    orphaned.slice(0, 5).forEach(f => console.log(`       ↳ ${f}`));
    if (orphaned.length > 5) console.log(`       ↳ ... and ${orphaned.length - 5} more`);
  }
}

// 8. Version check
if (manifest && manifest.version) {
  try {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    if (pkg.version === manifest.version) {
      ok(`Version match: ${manifest.version}`);
    }
  } catch {
    // Not an error — user project may not have package.json
  }
}

// 9. Stale local branch check
try {
  const currentBranch = execSync('git branch --show-current', { stdio: 'pipe', encoding: 'utf8' }).trim();
  const mainBranch = 'main';
  const mergedRaw = execSync(`git branch --merged ${mainBranch} 2>/dev/null`, { stdio: 'pipe', encoding: 'utf8' });
  const stale = mergedRaw
    .split('\n')
    .map(b => b.trim().replace(/^\*\s*/, ''))
    .filter(b => b && b !== mainBranch && b !== 'master' && b !== currentBranch);
  if (stale.length === 0) {
    ok('No stale merged local branches');
  } else {
    warn(`${stale.length} stale merged branch(es) — already merged into main`);
    stale.forEach(b => console.log(`       ↳ ${b}  →  git branch -d ${b}`));
  }
} catch {
  // Not a git repo or git unavailable — skip silently
}

// Summary
console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ${passed} passed · ${failed} failed · ${warnings} warning(s)\n`);
process.exit(failed > 0 ? 1 : 0);
