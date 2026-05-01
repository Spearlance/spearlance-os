import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function parseConfigToml(content) {
  const match = content.match(/^project_id\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error('project_id not found in config.toml');
  }
  return match[1];
}

export function getChangedFunctions(gitDiffOutput) {
  if (!gitDiffOutput.trim()) return [];
  const names = new Set();
  for (const line of gitDiffOutput.split('\n')) {
    const match = line.match(/^supabase\/functions\/([^/]+)\//);
    if (match && match[1] !== '_shared') {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

export function detectSharedChanges(gitDiffOutput) {
  return gitDiffOutput.split('\n').some(line =>
    line.startsWith('supabase/functions/_shared/')
  );
}

export function buildDeployList({ repoFunctions, remoteFunctions, changedFunctions, sharedChanged }) {
  // TODO: Task 5
}
