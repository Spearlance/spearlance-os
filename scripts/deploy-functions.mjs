import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function parseConfigToml(content) {
  // TODO: Task 2
}

export function getChangedFunctions(gitDiffOutput) {
  // TODO: Task 3
}

export function detectSharedChanges(gitDiffOutput) {
  // TODO: Task 4
}

export function buildDeployList({ repoFunctions, remoteFunctions, changedFunctions, sharedChanged }) {
  // TODO: Task 5
}
