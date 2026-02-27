# Starlight Docs Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build an auto-syncing docs site that transforms SKILL.md, armadillo.json, and CHANGELOG.json into a browsable Starlight site deployed to GitHub Pages.

**Architecture:** A `docs/` Starlight app with generated content pages. A `scripts/build-docs.js` script reads source files, parses Claude Code frontmatter, and writes Starlight-compatible markdown pages. GitHub Actions deploys on push to main.

**Tech Stack:** Astro + @astrojs/starlight, Node.js build script, GitHub Actions, GitHub Pages

**Design doc:** `.claude/docs/plans/2026-02-21-starlight-docs-design.md`

---

### Task 1: Scaffold Starlight Project

**Files:**
- Create: `docs/package.json`
- Create: `docs/astro.config.mjs`
- Create: `docs/src/content.config.ts`
- Create: `docs/src/content/docs/index.md`
- Create: `docs/.gitignore`

**Step 1: Create docs directory and initialize**

```bash
cd docs
npm init -y
```

**Step 2: Install Starlight**

```bash
cd docs
npm install astro @astrojs/starlight
```

**Step 3: Create package.json scripts**

Modify `docs/package.json`:
```json
{
  "name": "armadillo-docs",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/starlight": "^0.32.0"
  }
}
```

**Step 4: Create astro.config.mjs (minimal — sidebar will be wired in Task 7)**

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://filenamedotexe.github.io',
  base: '/armadillo',
  integrations: [
    starlight({
      title: 'armadillo',
      description: 'A skill system for Claude Code',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/filenamedotexe/armadillo' },
      ],
      sidebar: [
        { label: 'Home', slug: '' },
      ],
    }),
  ],
});
```

**Step 5: Create content collection config**

Create `docs/src/content.config.ts`:
```typescript
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
```

**Step 6: Create placeholder index page**

Create `docs/src/content/docs/index.md`:
```markdown
---
title: armadillo
description: A skill system for Claude Code
---

Docs are auto-generated. Run `node scripts/build-docs.js` to populate.
```

**Step 7: Create docs .gitignore**

Create `docs/.gitignore`:
```
node_modules/
dist/
.astro/
# Generated content pages (build artifact from build-docs.js)
src/content/docs/skills/
src/content/docs/packs/
src/content/docs/rules/
src/content/docs/agents/
src/content/docs/hooks/
src/content/docs/changelog.md
src/content/docs/getting-started/
```

**Step 8: Verify Starlight builds**

```bash
cd docs && npm run build
```

Expected: Build succeeds with placeholder page.

**Step 9: Commit**

```bash
git add docs/
git commit -m "chore: scaffold starlight docs project"
```

---

### Task 2: Write Frontmatter Parser (with tests)

**Files:**
- Create: `scripts/lib/parse-frontmatter.js`
- Create: `tests/parse-frontmatter.test.js`

The parser must handle both skill frontmatter (YAML with `model`, `name`, `description`, `allowed-tools`, `context`, `depends`) and agent frontmatter (YAML with `name`, `description`, `model`, `memory`, `maxTurns`, `skills`), and rule frontmatter (`paths`).

**Step 1: Write the failing tests**

Create `tests/parse-frontmatter.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses skill frontmatter correctly', () => {
    const content = `---
model: claude-opus-4-6
name: brainstorming
description: "Collaborative design sessions"
allowed-tools: Read, Glob, Grep
---

# Brainstorming

Body content here.`;

    const result = parseFrontmatter(content);
    expect(result.metadata.model).toBe('claude-opus-4-6');
    expect(result.metadata.name).toBe('brainstorming');
    expect(result.metadata.description).toBe('Collaborative design sessions');
    expect(result.metadata['allowed-tools']).toBe('Read, Glob, Grep');
    expect(result.body).toContain('# Brainstorming');
    expect(result.body).toContain('Body content here.');
  });

  it('parses agent frontmatter with multiline description', () => {
    const content = `---
name: code-reviewer
description: |
  Multi-line description
  that spans lines.
model: claude-opus-4-6
---

Agent body.`;

    const result = parseFrontmatter(content);
    expect(result.metadata.name).toBe('code-reviewer');
    expect(result.metadata.description).toContain('Multi-line description');
    expect(result.metadata.model).toBe('claude-opus-4-6');
    expect(result.body).toContain('Agent body.');
  });

  it('parses rule frontmatter with paths array', () => {
    const content = `---
paths:
  - "**/*.js"
  - "**/*.ts"
---

# Rule Title

Rule content.`;

    const result = parseFrontmatter(content);
    expect(result.metadata.paths).toEqual(['**/*.js', '**/*.ts']);
    expect(result.body).toContain('# Rule Title');
  });

  it('handles files with no frontmatter', () => {
    const content = `# Just markdown

No frontmatter here.`;

    const result = parseFrontmatter(content);
    expect(result.metadata).toEqual({});
    expect(result.body).toContain('# Just markdown');
  });

  it('handles empty body after frontmatter', () => {
    const content = `---
name: empty
---`;

    const result = parseFrontmatter(content);
    expect(result.metadata.name).toBe('empty');
    expect(result.body.trim()).toBe('');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parse-frontmatter.test.js
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `scripts/lib/parse-frontmatter.js`:
```javascript
/**
 * Parse YAML frontmatter from markdown content.
 * Handles Claude Code skill, agent, and rule frontmatter formats.
 *
 * @param {string} content - Raw file content
 * @returns {{ metadata: object, body: string }}
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, yamlBlock, body] = match;
  const metadata = parseYaml(yamlBlock);
  return { metadata, body: body.trimStart() };
}

/**
 * Minimal YAML parser — handles the subset used in Claude Code frontmatter:
 * - Simple key: value pairs
 * - Quoted strings
 * - Multiline strings (|)
 * - Arrays (- item)
 * - Nested arrays under a key
 */
function parseYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') { i++; continue; }

    // Key: value or Key: | or Key:
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!keyMatch) { i++; continue; }

    const [, key, rawValue] = keyMatch;
    const value = rawValue.trim();

    if (value === '|') {
      // Multiline string — collect indented lines
      const parts = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        parts.push(lines[i].replace(/^  /, ''));
        i++;
      }
      result[key] = parts.join('\n').trim();
    } else if (value === '') {
      // Could be an array or empty value — peek at next line
      if (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
        // Array
        const items = [];
        i++;
        while (i < lines.length && lines[i].match(/^\s+-\s/)) {
          const itemMatch = lines[i].match(/^\s+-\s+(.*)$/);
          if (itemMatch) {
            items.push(unquote(itemMatch[1].trim()));
          }
          i++;
        }
        result[key] = items;
      } else {
        result[key] = '';
        i++;
      }
    } else {
      // Simple value
      result[key] = unquote(value);
      i++;
    }
  }

  return result;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parse-frontmatter.test.js
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add scripts/lib/parse-frontmatter.js tests/parse-frontmatter.test.js
git commit -m "feat(docs): add frontmatter parser with tests"
```

---

### Task 3: Write Skill Page Generator (with tests)

**Files:**
- Create: `scripts/lib/generate-skill-page.js`
- Create: `tests/generate-skill-page.test.js`

**Step 1: Write the failing tests**

Create `tests/generate-skill-page.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { generateSkillPage } from '../scripts/lib/generate-skill-page.js';

describe('generateSkillPage', () => {
  const metadata = {
    name: 'brainstorming',
    model: 'claude-opus-4-6',
    description: 'Collaborative design sessions before implementation',
    'allowed-tools': 'Read, Glob, Grep, Bash, Task, AskUserQuestion, Skill',
  };

  const body = `# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs.

## Key Principles

- One question at a time
- YAGNI ruthlessly
- Always propose 2-3 approaches

## The Process

Detailed process steps here...

## After the Design

Write the validated design doc.`;

  it('generates valid Starlight frontmatter', () => {
    const page = generateSkillPage(metadata, body, { category: 'Workflow', pack: null });
    expect(page).toContain('---');
    expect(page).toContain('title: brainstorming');
    expect(page).toContain('description: Collaborative design sessions before implementation');
  });

  it('includes metadata badges section', () => {
    const page = generateSkillPage(metadata, body, { category: 'Workflow', pack: null });
    expect(page).toContain('opus');
    expect(page).toContain('Workflow');
  });

  it('includes summary section extracted from body', () => {
    const page = generateSkillPage(metadata, body, { category: 'Workflow', pack: null });
    expect(page).toContain('One question at a time');
  });

  it('includes collapsible full reference', () => {
    const page = generateSkillPage(metadata, body, { category: 'Workflow', pack: null });
    expect(page).toContain('<details>');
    expect(page).toContain('Full Reference');
    expect(page).toContain('Detailed process steps here');
  });

  it('marks pack skills with pack name', () => {
    const page = generateSkillPage(metadata, body, { category: null, pack: 'frontend' });
    expect(page).toContain('frontend');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/generate-skill-page.test.js
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `scripts/lib/generate-skill-page.js`:
```javascript
/**
 * Generate a Starlight-compatible markdown page from a parsed skill.
 *
 * @param {object} metadata - Parsed frontmatter metadata
 * @param {string} body - Skill body content (markdown)
 * @param {{ category: string|null, pack: string|null }} context
 * @returns {string} - Complete Starlight page content
 */
export function generateSkillPage(metadata, body, context) {
  const name = metadata.name || 'unknown';
  const description = metadata.description || '';
  const model = metadata.model || 'inherit';

  // Model tier badge
  const modelBadge = model.includes('opus') ? 'opus'
    : model.includes('sonnet') ? 'sonnet'
    : model.includes('haiku') ? 'haiku'
    : 'inherit';

  // Source badge
  const source = context.pack ? `pack: ${context.pack}` : 'core';
  const categoryLine = context.category ? `**Category:** ${context.category}` : '';

  // Extract summary content from body
  const summary = extractSummary(body);

  // Build the page
  const lines = [
    '---',
    `title: ${name}`,
    `description: ${escapeYaml(description)}`,
    '---',
    '',
    `> ${description}`,
    '',
    `| Model | Source | ${context.category ? 'Category |' : ''}`,
    `|-------|--------|${context.category ? '----------|' : ''}`,
    `| ${modelBadge} | ${source} | ${context.category ? context.category + ' |' : ''}`,
    '',
  ];

  // Allowed tools
  if (metadata['allowed-tools']) {
    lines.push(`**Tools:** \`${metadata['allowed-tools']}\``, '');
  }

  // Context and depends
  if (metadata.context) {
    lines.push(`**Context:** \`${metadata.context}\``, '');
  }
  if (metadata.depends) {
    lines.push(`**Depends on:** ${metadata.depends}`, '');
  }

  // Summary section
  if (summary) {
    lines.push('## Overview', '', summary, '');
  }

  // Full reference (collapsible)
  lines.push(
    '<details>',
    '<summary><strong>Full Reference</strong></summary>',
    '',
    body,
    '',
    '</details>',
  );

  return lines.join('\n');
}

/**
 * Extract a summary from the skill body — first 2 sections or key principles.
 */
function extractSummary(body) {
  const sections = body.split(/^## /m).filter(Boolean);
  const summaryParts = [];

  for (const section of sections) {
    const title = section.split('\n')[0].trim().toLowerCase();
    if (title.includes('overview') || title.includes('key principles') || title.includes('when to use')) {
      // Include first section content up to ~500 chars
      const content = section.split('\n').slice(1).join('\n').trim();
      if (content) {
        summaryParts.push(content.slice(0, 500));
      }
    }
    if (summaryParts.length >= 2) break;
  }

  return summaryParts.join('\n\n');
}

function escapeYaml(s) {
  if (s.includes(':') || s.includes('#') || s.includes("'") || s.includes('"')) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/generate-skill-page.test.js
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add scripts/lib/generate-skill-page.js tests/generate-skill-page.test.js
git commit -m "feat(docs): add skill page generator with tests"
```

---

### Task 4: Write Content Generators (pack, rule, agent, hook, changelog)

**Files:**
- Create: `scripts/lib/generate-pages.js`
- Create: `tests/generate-pages.test.js`

**Step 1: Write the failing tests**

Create `tests/generate-pages.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import {
  generatePackPage,
  generateRulePage,
  generateAgentPage,
  generateHooksPage,
  generateChangelogPage,
} from '../scripts/lib/generate-pages.js';

describe('generatePackPage', () => {
  it('generates pack overview with skill list', () => {
    const page = generatePackPage('frontend', {
      description: 'Tailwind, shadcn, Next.js',
      skills: ['tailwind-css', 'shadcn-ui', 'nextjs'],
    });
    expect(page).toContain('title: frontend');
    expect(page).toContain('Tailwind, shadcn, Next.js');
    expect(page).toContain('tailwind-css');
    expect(page).toContain('3 skills');
  });
});

describe('generateRulePage', () => {
  it('generates rule page from markdown', () => {
    const page = generateRulePage('coding-standards', {
      paths: ['**/*.js'],
    }, '# Coding Standards\n\nDRY, YAGNI, TDD.');
    expect(page).toContain('title: coding-standards');
    expect(page).toContain('DRY, YAGNI, TDD');
  });
});

describe('generateAgentPage', () => {
  it('generates agent page from metadata', () => {
    const page = generateAgentPage({
      name: 'code-reviewer',
      model: 'claude-opus-4-6',
      description: 'Reviews completed work',
    }, 'Full agent prompt body.');
    expect(page).toContain('title: code-reviewer');
    expect(page).toContain('opus');
    expect(page).toContain('Reviews completed work');
  });
});

describe('generateHooksPage', () => {
  it('generates hooks reference page', () => {
    const hooks = [
      { name: 'session-start.sh', event: 'SessionStart', description: 'Injects skill awareness' },
      { name: 'enforce-skills.sh', event: 'PreToolUse', description: 'Blocks Plan agents' },
    ];
    const page = generateHooksPage(hooks);
    expect(page).toContain('title: Hooks');
    expect(page).toContain('session-start.sh');
    expect(page).toContain('SessionStart');
    expect(page).toContain('enforce-skills.sh');
  });
});

describe('generateChangelogPage', () => {
  it('generates changelog from JSON', () => {
    const changelog = {
      '2.8.0': {
        date: '2026-02-21',
        changes: [
          { type: 'added', summary: 'new feature', breaking: false },
          { type: 'fixed', summary: 'bug fix', breaking: false },
        ],
      },
      '2.7.0': {
        date: '2026-02-20',
        changes: [
          { type: 'added', summary: 'another feature', breaking: true },
        ],
      },
    };
    const page = generateChangelogPage(changelog);
    expect(page).toContain('title: Changelog');
    expect(page).toContain('2.8.0');
    expect(page).toContain('2026-02-21');
    expect(page).toContain('new feature');
    expect(page).toContain('BREAKING');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/generate-pages.test.js
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `scripts/lib/generate-pages.js`:
```javascript
/**
 * Generate a Starlight page for a skill pack overview.
 */
export function generatePackPage(packName, packData) {
  const count = packData.skills.length;
  const skillLinks = packData.skills
    .map(s => `- [${s}](/armadillo/packs/${packName}/${s}/)`)
    .join('\n');

  return [
    '---',
    `title: ${packName}`,
    `description: "${packData.description}"`,
    '---',
    '',
    `> ${packData.description}`,
    '',
    `**${count} skills** in this pack:`,
    '',
    skillLinks,
  ].join('\n');
}

/**
 * Generate a Starlight page for a rule.
 */
export function generateRulePage(ruleName, metadata, body) {
  const scopeLine = metadata.paths
    ? `**Applies to:** \`${metadata.paths.join('`, `')}\``
    : '';

  return [
    '---',
    `title: ${ruleName}`,
    `description: "${ruleName} rule"`,
    '---',
    '',
    scopeLine,
    '',
    body,
  ].join('\n');
}

/**
 * Generate a Starlight page for an agent.
 */
export function generateAgentPage(metadata, body) {
  const name = metadata.name || 'unknown';
  const model = metadata.model || 'inherit';
  const description = metadata.description || '';
  const modelBadge = model.includes('opus') ? 'opus'
    : model.includes('sonnet') ? 'sonnet'
    : model.includes('haiku') ? 'haiku'
    : 'inherit';

  // Truncate description for frontmatter (may be multiline)
  const shortDesc = description.split('\n')[0].trim().slice(0, 120);

  return [
    '---',
    `title: ${name}`,
    `description: "${shortDesc.replace(/"/g, '\\"')}"`,
    '---',
    '',
    `> ${shortDesc}`,
    '',
    `| Model |`,
    `|-------|`,
    `| ${modelBadge} |`,
    '',
    '<details>',
    '<summary><strong>Full Agent Prompt</strong></summary>',
    '',
    body,
    '',
    '</details>',
  ].join('\n');
}

/**
 * Generate a single hooks reference page.
 */
export function generateHooksPage(hooks) {
  const rows = hooks.map(h =>
    `| \`${h.name}\` | ${h.event} | ${h.description} |`
  ).join('\n');

  return [
    '---',
    'title: Hooks',
    'description: Runtime hooks that fire at lifecycle events',
    '---',
    '',
    'Hooks fire at lifecycle events. No manual intervention needed.',
    '',
    '| Hook | Event | What it does |',
    '|------|-------|-------------|',
    rows,
  ].join('\n');
}

/**
 * Generate a changelog page from CHANGELOG.json.
 */
export function generateChangelogPage(changelog) {
  const lines = [
    '---',
    'title: Changelog',
    'description: Version history',
    '---',
    '',
  ];

  for (const [version, data] of Object.entries(changelog)) {
    lines.push(`## ${version}`);
    lines.push(`*${data.date}*`, '');

    for (const change of data.changes) {
      const breaking = change.breaking ? ' **BREAKING**' : '';
      const prefix = change.type === 'added' ? 'Added'
        : change.type === 'fixed' ? 'Fixed'
        : change.type === 'improved' ? 'Improved'
        : change.type;
      lines.push(`- **${prefix}:** ${change.summary}${breaking}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/generate-pages.test.js
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add scripts/lib/generate-pages.js tests/generate-pages.test.js
git commit -m "feat(docs): add pack, rule, agent, hook, changelog page generators"
```

---

### Task 5: Write Sidebar Generator (with tests)

**Files:**
- Create: `scripts/lib/generate-sidebar.js`
- Create: `tests/generate-sidebar.test.js`

**Step 1: Write the failing tests**

Create `tests/generate-sidebar.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { generateSidebar } from '../scripts/lib/generate-sidebar.js';

describe('generateSidebar', () => {
  const manifest = {
    core: {
      skills: ['brainstorming', 'writing-plans', 'test-driven-development', 'playwright'],
      rules: ['coding-standards.md', 'git-workflow.md'],
      agents: ['code-reviewer.md', 'brand-strategist.md'],
    },
    packs: {
      frontend: {
        description: 'Frontend skills',
        skills: ['tailwind-css', 'nextjs'],
      },
      database: {
        description: 'Database skills',
        skills: ['supabase', 'neon'],
      },
    },
  };

  it('generates sidebar with core skill groups', () => {
    const sidebar = generateSidebar(manifest);
    // Should have top-level groups
    const labels = sidebar.map(g => g.label);
    expect(labels).toContain('Getting Started');
    expect(labels).toContain('Core Skills');
    expect(labels).toContain('Skill Packs');
  });

  it('groups core skills by category', () => {
    const sidebar = generateSidebar(manifest);
    const coreGroup = sidebar.find(g => g.label === 'Core Skills');
    expect(coreGroup.items).toBeDefined();
    // Should have subcategories
    const subLabels = coreGroup.items.map(i => i.label);
    expect(subLabels).toContain('Workflow');
    expect(subLabels).toContain('Testing');
  });

  it('includes pack groups with skills', () => {
    const sidebar = generateSidebar(manifest);
    const packsGroup = sidebar.find(g => g.label === 'Skill Packs');
    expect(packsGroup.items).toBeDefined();
    const packLabels = packsGroup.items.map(i => i.label);
    expect(packLabels).toContain('frontend');
    expect(packLabels).toContain('database');
  });

  it('includes rules and agents sections', () => {
    const sidebar = generateSidebar(manifest);
    const labels = sidebar.map(g => g.label);
    expect(labels).toContain('Rules');
    expect(labels).toContain('Agents');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/generate-sidebar.test.js
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `scripts/lib/generate-sidebar.js`:
```javascript
// Core skill categories — same as build-claude-md.js
const CORE_CATEGORIES = {
  'Workflow': [
    'brainstorming', 'writing-plans', 'executing-plans', 'test-driven-development',
    'systematic-debugging', 'verification-before-completion',
  ],
  'Collaboration': [
    'requesting-code-review', 'receiving-code-review',
    'subagent-driven-development', 'dispatching-parallel-agents',
  ],
  'Git': [
    'using-git-worktrees', 'finishing-a-development-branch', 'writing-prs',
  ],
  'Testing': [
    'playwright', 'puppeteer', 'cypress', 'vitest',
  ],
  'Meta': [
    'armadillo-shepherd', 'onboarding', 'updating-armadillo',
    'writing-skills', 'writing-reference-skills',
  ],
  'Data Quality': [
    'nap-ninja', 'env-ninja',
  ],
};

/**
 * Generate Starlight sidebar config from armadillo.json manifest.
 *
 * @param {object} manifest - Parsed armadillo.json
 * @returns {Array} - Starlight sidebar config array
 */
export function generateSidebar(manifest) {
  const coreSkills = manifest.core.skills;
  const packs = manifest.packs || {};

  const sidebar = [];

  // Getting Started
  sidebar.push({
    label: 'Getting Started',
    items: [
      { slug: '' },
      { slug: 'getting-started/install' },
      { slug: 'getting-started/configuration' },
    ],
  });

  // Core Skills — grouped by category
  const coreItems = [];
  for (const [category, categorySkills] of Object.entries(CORE_CATEGORIES)) {
    const present = categorySkills.filter(s => coreSkills.includes(s));
    if (present.length === 0) continue;
    coreItems.push({
      label: category,
      collapsed: true,
      items: present.map(s => ({ slug: `skills/core/${s}` })),
    });
  }

  // Uncategorized core skills
  const categorized = new Set(Object.values(CORE_CATEGORIES).flat());
  const uncategorized = coreSkills.filter(s => !categorized.has(s));
  if (uncategorized.length > 0) {
    coreItems.push({
      label: 'Other',
      collapsed: true,
      items: uncategorized.map(s => ({ slug: `skills/core/${s}` })),
    });
  }

  sidebar.push({ label: 'Core Skills', items: coreItems });

  // Skill Packs
  const packItems = Object.entries(packs).map(([packName, packData]) => ({
    label: packName,
    collapsed: true,
    items: [
      { slug: `packs/${packName}` },
      ...packData.skills.map(s => ({ slug: `packs/${packName}/${s}` })),
    ],
  }));
  sidebar.push({ label: 'Skill Packs', collapsed: true, items: packItems });

  // Rules
  const ruleNames = (manifest.core.rules || []).map(f => f.replace('.md', ''));
  sidebar.push({
    label: 'Rules',
    collapsed: true,
    items: ruleNames.map(r => ({ slug: `rules/${r}` })),
  });

  // Agents
  const agentNames = (manifest.core.agents || []).map(f => f.replace('.md', ''));
  sidebar.push({
    label: 'Agents',
    collapsed: true,
    items: agentNames.map(a => ({ slug: `agents/${a}` })),
  });

  // Hooks
  sidebar.push({
    label: 'Hooks',
    items: [{ slug: 'hooks' }],
  });

  // Changelog
  sidebar.push({
    label: 'Changelog',
    items: [{ slug: 'changelog' }],
  });

  return sidebar;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/generate-sidebar.test.js
```

Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add scripts/lib/generate-sidebar.js tests/generate-sidebar.test.js
git commit -m "feat(docs): add sidebar generator with tests"
```

---

### Task 6: Write Main build-docs.js Orchestrator

**Files:**
- Create: `scripts/build-docs.js` (wait — this already exists as `build-claude-md.js`. Create new file.)
- Modify: existing `scripts/` directory

**Step 1: Write the main script**

Create `scripts/build-docs.js`:
```javascript
#!/usr/bin/env node
/**
 * build-docs.js
 * Transforms armadillo source files into Starlight-compatible pages.
 * Reads SKILL.md files, armadillo.json, CHANGELOG.json, rules, agents.
 * Writes to docs/src/content/docs/.
 *
 * Usage:
 *   node scripts/build-docs.js           — generates all docs pages
 *   node scripts/build-docs.js --dry-run — prints stats without writing
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './lib/parse-frontmatter.js';
import { generateSkillPage } from './lib/generate-skill-page.js';
import {
  generatePackPage,
  generateRulePage,
  generateAgentPage,
  generateHooksPage,
  generateChangelogPage,
} from './lib/generate-pages.js';
import { generateSidebar } from './lib/generate-sidebar.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_CONTENT = join(ROOT, 'docs', 'src', 'content', 'docs');
const DRY_RUN = process.argv.includes('--dry-run');

// Category map for core skills (same source as build-claude-md.js)
const CORE_CATEGORIES = {
  'Workflow': [
    'brainstorming', 'writing-plans', 'executing-plans', 'test-driven-development',
    'systematic-debugging', 'verification-before-completion',
  ],
  'Collaboration': [
    'requesting-code-review', 'receiving-code-review',
    'subagent-driven-development', 'dispatching-parallel-agents',
  ],
  'Git': [
    'using-git-worktrees', 'finishing-a-development-branch', 'writing-prs',
  ],
  'Testing': ['playwright', 'puppeteer', 'cypress', 'vitest'],
  'Meta': [
    'armadillo-shepherd', 'onboarding', 'updating-armadillo',
    'writing-skills', 'writing-reference-skills',
  ],
  'Data Quality': ['nap-ninja', 'env-ninja'],
};

function categoryForSkill(skillName) {
  for (const [cat, skills] of Object.entries(CORE_CATEGORIES)) {
    if (skills.includes(skillName)) return cat;
  }
  return 'Other';
}

function ensureDir(dir) {
  if (!DRY_RUN) mkdirSync(dir, { recursive: true });
}

function writePage(path, content) {
  if (DRY_RUN) {
    console.log(`  [dry-run] Would write: ${path}`);
    return;
  }
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf8');
}

function main() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
  const changelog = JSON.parse(readFileSync(join(ROOT, 'CHANGELOG.json'), 'utf8'));
  let stats = { skills: 0, packs: 0, rules: 0, agents: 0, hooks: 0 };

  console.log('Building armadillo docs...');

  // ── Core Skills ────────────────────────────────────────────────
  for (const skillName of manifest.core.skills) {
    const skillPath = join(ROOT, '.claude', 'skills', skillName, 'SKILL.md');
    if (!existsSync(skillPath)) {
      console.warn(`  ⚠ Skill not found: ${skillName}`);
      continue;
    }
    const raw = readFileSync(skillPath, 'utf8');
    const { metadata, body } = parseFrontmatter(raw);
    const category = categoryForSkill(skillName);
    const page = generateSkillPage(
      { ...metadata, name: metadata.name || skillName },
      body,
      { category, pack: null }
    );
    writePage(join(DOCS_CONTENT, 'skills', 'core', `${skillName}.md`), page);
    stats.skills++;
  }

  // ── Pack Skills ────────────────────────────────────────────────
  for (const [packName, packData] of Object.entries(manifest.packs || {})) {
    // Pack overview page
    writePage(
      join(DOCS_CONTENT, 'packs', packName, 'index.md'),
      generatePackPage(packName, packData)
    );
    stats.packs++;

    // Individual pack skill pages
    for (const skillName of packData.skills) {
      const skillPath = join(ROOT, 'packs', packName, 'skills', skillName, 'SKILL.md');
      if (!existsSync(skillPath)) {
        console.warn(`  ⚠ Pack skill not found: ${packName}/${skillName}`);
        continue;
      }
      const raw = readFileSync(skillPath, 'utf8');
      const { metadata, body } = parseFrontmatter(raw);
      const page = generateSkillPage(
        { ...metadata, name: metadata.name || skillName },
        body,
        { category: null, pack: packName }
      );
      writePage(join(DOCS_CONTENT, 'packs', packName, `${skillName}.md`), page);
      stats.skills++;
    }
  }

  // ── Rules ──────────────────────────────────────────────────────
  for (const ruleFile of manifest.core.rules || []) {
    const rulePath = join(ROOT, '.claude', 'rules', ruleFile);
    if (!existsSync(rulePath)) continue;
    const raw = readFileSync(rulePath, 'utf8');
    const { metadata, body } = parseFrontmatter(raw);
    const ruleName = ruleFile.replace('.md', '');
    writePage(
      join(DOCS_CONTENT, 'rules', `${ruleName}.md`),
      generateRulePage(ruleName, metadata, body)
    );
    stats.rules++;
  }

  // ── Agents ─────────────────────────────────────────────────────
  for (const agentFile of manifest.core.agents || []) {
    const agentPath = join(ROOT, '.claude', 'agents', agentFile);
    if (!existsSync(agentPath)) continue;
    const raw = readFileSync(agentPath, 'utf8');
    const { metadata, body } = parseFrontmatter(raw);
    const agentName = agentFile.replace('.md', '');
    writePage(
      join(DOCS_CONTENT, 'agents', `${agentName}.md`),
      generateAgentPage({ ...metadata, name: metadata.name || agentName }, body)
    );
    stats.agents++;
  }

  // ── Hooks ──────────────────────────────────────────────────────
  const hooksJsonPath = join(ROOT, '.claude', 'hooks', 'hooks.json');
  if (existsSync(hooksJsonPath)) {
    const hooksConfig = JSON.parse(readFileSync(hooksJsonPath, 'utf8'));
    const hooksList = [];

    for (const [event, handlers] of Object.entries(hooksConfig)) {
      for (const handler of (Array.isArray(handlers) ? handlers : [handlers])) {
        const cmd = typeof handler === 'string' ? handler : handler.command;
        if (!cmd) continue;
        // Extract script name from command
        const scriptMatch = cmd.match(/([a-z-]+\.sh)/);
        const scriptName = scriptMatch ? scriptMatch[1] : cmd.slice(0, 40);
        hooksList.push({ name: scriptName, event, description: '' });
      }
    }

    writePage(join(DOCS_CONTENT, 'hooks.md'), generateHooksPage(hooksList));
    stats.hooks = hooksList.length;
  }

  // ── Changelog ──────────────────────────────────────────────────
  writePage(join(DOCS_CONTENT, 'changelog.md'), generateChangelogPage(changelog));

  // ── Getting Started pages ──────────────────────────────────────
  const installPath = join(ROOT, 'INSTALL.md');
  if (existsSync(installPath)) {
    const installContent = readFileSync(installPath, 'utf8');
    writePage(join(DOCS_CONTENT, 'getting-started', 'install.md'), [
      '---',
      'title: Install',
      'description: How to install armadillo in your project',
      '---',
      '',
      installContent,
    ].join('\n'));
  }

  // Configuration page (from README sections)
  writePage(join(DOCS_CONTENT, 'getting-started', 'configuration.md'), [
    '---',
    'title: Configuration',
    'description: Permissions, tuning, and settings',
    '---',
    '',
    '## Permissions',
    '',
    'Default mode: `acceptEdits` — Claude can read, search, and edit files without prompting.',
    '',
    '| Mode | Behavior | Risk |',
    '|------|----------|------|',
    '| `acceptEdits` | Auto-approves reads + edits, prompts for unknown Bash | Low |',
    '| `bypassPermissions` | Auto-approves everything except deny-list | Low — deny-list blocks catastrophic commands |',
    '| `plan` | Read-only, no writes | Zero |',
    '',
    'Toggle in `.claude/settings.json` → `permissions.defaultMode`.',
    '',
    '## Tuning',
    '',
    '| Variable | Default | Recommendation |',
    '|----------|---------|----------------|',
    '| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | ~95% | `80` |',
    '| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 32,000 | `64000` |',
  ].join('\n'));

  // ── Sidebar config ─────────────────────────────────────────────
  const sidebar = generateSidebar(manifest);
  const sidebarPath = join(ROOT, 'docs', 'sidebar.json');
  if (!DRY_RUN) {
    writeFileSync(sidebarPath, JSON.stringify(sidebar, null, 2), 'utf8');
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log(`✓ ${stats.skills} skill pages`);
  console.log(`✓ ${stats.packs} pack overviews`);
  console.log(`✓ ${stats.rules} rule pages`);
  console.log(`✓ ${stats.agents} agent pages`);
  console.log(`✓ ${stats.hooks} hooks documented`);
  console.log(`✓ changelog + getting started + sidebar config`);
  console.log(`✓ Docs build complete`);
}

main();
```

**Step 2: Run the script in dry-run mode**

```bash
node scripts/build-docs.js --dry-run
```

Expected: Lists all pages that would be written with correct paths.

**Step 3: Run the script for real**

```bash
node scripts/build-docs.js
```

Expected: All pages written to `docs/src/content/docs/`.

**Step 4: Commit**

```bash
git add scripts/build-docs.js
git commit -m "feat(docs): add main build-docs orchestrator"
```

---

### Task 7: Wire Sidebar into Starlight Config

**Files:**
- Modify: `docs/astro.config.mjs`

**Step 1: Update astro.config.mjs to read generated sidebar**

Replace the minimal config with:
```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarPath = join(__dirname, 'sidebar.json');

// Read generated sidebar (from build-docs.js)
let sidebar;
try {
  sidebar = JSON.parse(readFileSync(sidebarPath, 'utf8'));
} catch {
  // Fallback for first build before build-docs.js runs
  sidebar = [{ label: 'Home', slug: '' }];
}

export default defineConfig({
  site: 'https://filenamedotexe.github.io',
  base: '/armadillo',
  integrations: [
    starlight({
      title: 'armadillo',
      description: 'A skill system for Claude Code',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/filenamedotexe/armadillo' },
      ],
      editLink: {
        baseUrl: 'https://github.com/filenamedotexe/armadillo/edit/main/',
      },
      sidebar,
    }),
  ],
});
```

**Step 2: Verify full build works**

```bash
node scripts/build-docs.js && cd docs && npm run build
```

Expected: Starlight builds successfully with all generated pages.

**Step 3: Commit**

```bash
git add docs/astro.config.mjs docs/sidebar.json
git commit -m "feat(docs): wire generated sidebar into starlight config"
```

---

### Task 8: Write GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/docs.yml`

**Step 1: Create the workflow**

Create `.github/workflows/docs.yml`:
```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Generate docs content
        run: node scripts/build-docs.js

      - name: Install docs dependencies
        working-directory: docs
        run: npm ci

      - name: Build Starlight
        uses: withastro/action@v3
        with:
          path: docs

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: add github actions workflow for docs deployment"
```

---

### Task 9: Local Smoke Test + Polish

**Step 1: Run full pipeline locally**

```bash
node scripts/build-docs.js && cd docs && npm run dev
```

Open `http://localhost:4321/armadillo/` in browser. Verify:
- Home page loads
- Sidebar shows all categories
- Core skills navigable
- Pack pages show skill lists
- Rules render correctly
- Agents show metadata
- Hooks reference page works
- Changelog renders
- Search works (type a skill name)

**Step 2: Fix any rendering issues found during smoke test**

Address issues found — likely candidates:
- Markdown rendering quirks in skill bodies
- Sidebar ordering
- Missing descriptions on some pages

**Step 3: Update docs index page with real content**

Replace placeholder `docs/src/content/docs/index.md` with auto-generated overview:
```markdown
---
title: armadillo
description: A skill system for Claude Code
---

A skill system for [Claude Code](https://code.claude.com). 130+ skills across 30 packs covering the full development lifecycle.

## Quick Start

1. Open [Claude Code](https://claude.ai/download) in your project
2. Tell Claude: `Install armadillo from https://github.com/filenamedotexe/armadillo`
3. Exit your session and start a new one
4. Tell Claude: `/onboarding`
```

**Step 4: Run full build one more time**

```bash
node scripts/build-docs.js && cd docs && npm run build
```

Expected: Clean build, no errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(docs): complete starlight docs site with full build pipeline"
```
