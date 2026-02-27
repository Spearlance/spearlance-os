# Armadillo NPM Package — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build `armadillo`, an npm CLI tool that scaffolds Claude Code skills/agents/knowledge base into any project with interactive onboarding, smart updates, and skill management.

**Architecture:** Node.js CLI using commander for arg parsing, @clack/prompts for interactive UI, and a skills.json registry that maps skills to bundles and tracks file ownership. A manifest file (.armadillo-manifest.json) enables smart updates by tracking installed versions and file hashes.

**Tech Stack:** Node.js >=18, commander, @clack/prompts, picocolors, diff (npm)

**Important:** This is a NEW standalone repo, not part of the Astro site. Create it at a sibling directory. All template files are copied from the existing `.claude/` directory in the armadillo-new project.

---

### Task 1: Initialize the Repo and Package

**Files:**
- Create: `armadillo/package.json`
- Create: `armadillo/.gitignore`
- Create: `armadillo/bin/cli.js`

**Step 1: Create the repo directory**

Run: `mkdir -p "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo" && cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo" && git init`
Expected: Initialized empty Git repository

**Step 2: Create package.json**

```json
{
  "name": "@anthropic-zach/armadillo",
  "version": "0.1.0",
  "description": "Interactive CLI that scaffolds a complete Claude Code skill toolkit into any project",
  "type": "module",
  "bin": {
    "armadillo": "./bin/cli.js"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": [
    "claude-code",
    "skills",
    "cli",
    "scaffolding",
    "developer-tools"
  ],
  "license": "MIT",
  "dependencies": {
    "@clack/prompts": "^0.10.0",
    "commander": "^13.0.0",
    "diff": "^7.0.0",
    "picocolors": "^1.1.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
.DS_Store
```

**Step 4: Create the CLI entry point**

Create `bin/cli.js`:

```js
#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

program
  .name('armadillo')
  .description('Claude Code skill toolkit')
  .version(pkg.version);

program
  .command('init')
  .description('Interactive onboarding — pick bundles, set up KB, generate CLAUDE.md')
  .action(async () => {
    const { run } = await import('../src/commands/init.js');
    await run();
  });

program
  .command('update')
  .description('Pull latest skills, smart merge, walk through conflicts')
  .action(async () => {
    const { run } = await import('../src/commands/update.js');
    await run();
  });

program
  .command('list')
  .description('Show available and installed skills/bundles')
  .option('--all', 'Show individual skills within each bundle')
  .action(async (opts) => {
    const { run } = await import('../src/commands/list.js');
    await run(opts);
  });

program
  .command('add <name>')
  .description('Install a skill or bundle')
  .action(async (name) => {
    const { run } = await import('../src/commands/add.js');
    await run(name);
  });

program
  .command('remove <name>')
  .description('Remove a skill')
  .action(async (name) => {
    const { run } = await import('../src/commands/remove.js');
    await run(name);
  });

program
  .command('doctor')
  .description('Verify installation integrity')
  .action(async () => {
    const { run } = await import('../src/commands/doctor.js');
    await run();
  });

program.parse();
```

**Step 5: Install dependencies**

Run: `cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo" && npm install`
Expected: added N packages

**Step 6: Verify CLI boots**

Run: `cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo" && node bin/cli.js --version`
Expected: `0.1.0`

**Step 7: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add package.json package-lock.json .gitignore bin/cli.js
git commit -m "feat: initialize armadillo CLI with commander setup"
```

---

### Task 2: Copy Template Files from Existing .claude/

**Files:**
- Create: `armadillo/templates/` (entire directory tree)

This task copies all the skill/agent/hook/test/lib/knowledge files from the existing `.claude/` directory into the `templates/` folder inside the armadillo package. These are the files that get installed into target projects.

**Step 1: Create template directory structure**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
mkdir -p templates
```

**Step 2: Copy skills, agents, knowledge, hooks, lib, tests**

```bash
SRC="/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo new/.claude"
DEST="/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/templates"

cp -r "$SRC/skills" "$DEST/skills"
cp -r "$SRC/agents" "$DEST/agents"
cp -r "$SRC/knowledge" "$DEST/knowledge"
cp -r "$SRC/hooks" "$DEST/hooks"
cp -r "$SRC/lib" "$DEST/lib"
cp -r "$SRC/tests" "$DEST/tests"
cp "$SRC/settings.json" "$DEST/settings.json"
```

**Step 3: Clean up .DS_Store files**

Run: `find "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/templates" -name ".DS_Store" -delete`

**Step 4: Create the CLAUDE.md template**

Create `templates/CLAUDE.md`:

```markdown
<!-- armadillo:start -->
# Claude Code Configuration

## Skills

This project uses [Armadillo](https://github.com/yourorg/armadillo) skills. Use the Skill tool to invoke them.

### Workflow
- **brainstorming** — Start here before any creative/feature work
- **writing-plans** — Create implementation plans from designs
- **executing-plans** — Execute plans task-by-task with review checkpoints
- **test-driven-development** — RED/GREEN/REFACTOR cycle for all code
- **systematic-debugging** — Root cause analysis before fixing bugs
- **verification-before-completion** — Verify before claiming done

### Collaboration
- **requesting-code-review** — Request review after completing work
- **receiving-code-review** — Process review feedback with rigor
- **subagent-driven-development** — Dispatch subagents per task
- **dispatching-parallel-agents** — Run independent tasks in parallel

### Git
- **using-git-worktrees** — Isolated feature branches
- **finishing-a-development-branch** — Merge/PR/cleanup guidance

### Meta
- **using-armadillo** — Discover and invoke skills
- **writing-skills** — Create new skills (TDD cycle)
- **writing-reference-skills** — API/tool reference skills with web research

## Principles
- DRY, YAGNI, TDD
- One question at a time
- Verify before claiming done
- Frequent commits
<!-- armadillo:end -->

<!-- Add your project-specific instructions below this line -->
```

**Step 5: Verify the template tree**

Run: `find "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/templates" -type f | wc -l`
Expected: ~80+ files

**Step 6: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add templates/
git commit -m "feat: add all template files (skills, agents, hooks, knowledge, tests)"
```

---

### Task 3: Rename superpowers → armadillo Across All Template Files

**Files:**
- Modify: All files in `armadillo/templates/` that reference `superpowers:`
- Rename: `armadillo/templates/skills/using-superpowers/` → `armadillo/templates/skills/using-armadillo/`

The existing skill files use `superpowers:` as the namespace prefix (e.g., `superpowers:executing-plans`). Since the package is now called armadillo, all references must be updated.

**Step 1: Rename the `using-superpowers` skill directory**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
mv templates/skills/using-superpowers templates/skills/using-armadillo
```

**Step 2: Update the skill frontmatter in the renamed skill**

In `templates/skills/using-armadillo/SKILL.md`, change `name: using-superpowers` to `name: using-armadillo`.

**Step 3: Global find-and-replace `superpowers:` → `armadillo:` across all template skill/test/hook files**

Run in the templates directory:

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/templates"

# Replace superpowers: prefix in all .md, .sh, .js, .txt files
find . -type f \( -name "*.md" -o -name "*.sh" -o -name "*.js" -o -name "*.txt" \) \
  -exec sed -i '' 's/superpowers:/armadillo:/g' {} +
```

**Step 4: Update plugin.json**

In `templates/.claude-plugin/plugin.json` (if copied), change `"name": "superpowers"` to `"name": "armadillo"`.

**Note:** We do NOT copy plugin.json or settings.local.json into templates — those are plugin infrastructure files, not template files. Skip this step if those files aren't in templates/.

**Step 5: Update session-start.sh hook**

In `templates/hooks/session-start.sh`, update:
- `using-superpowers` directory reference → `using-armadillo`
- `using_superpowers_content` variable → `using_armadillo_content`
- `using_superpowers_escaped` variable → `using_armadillo_escaped`
- `superpowers:using-superpowers` → `armadillo:using-armadillo`
- `"You have superpowers."` → `"You have armadillo skills."`

**Step 6: Update skills-core.js**

In `templates/lib/skills-core.js`, update:
- `superpowers:` prefix stripping logic → `armadillo:`
- Comments referencing `superpowers:brainstorming` → `armadillo:brainstorming`
- Variable names: `forceSuperpowers` → `forceArmadillo`

**Step 7: Update RELEASE-NOTES.md** (if included in templates)

In `templates/RELEASE-NOTES.md`, do a global `superpowers` → `armadillo` replace. This is historical documentation that should reflect the current branding.

**Step 8: Update README.md** (if included in templates)

In `templates/README.md`, replace `using-superpowers` → `using-armadillo` and any other `superpowers` references.

**Step 9: Verify no `superpowers:` references remain**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/templates"
grep -r "superpowers:" --include="*.md" --include="*.sh" --include="*.js" --include="*.txt" .
```

Expected: No output (no remaining `superpowers:` references)

**Step 10: Verify no `using-superpowers` directory/references remain**

```bash
grep -r "using-superpowers" --include="*.md" --include="*.sh" --include="*.js" .
ls templates/skills/ | grep superpowers
```

Expected: No output for both commands

**Step 11: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add templates/
git commit -m "refactor: rename superpowers → armadillo across all template files"
```

---

### Task 4: Build the Skills Registry (skills.json)

**Files:**
- Create: `armadillo/skills.json`

**Step 1: Write the complete registry**

Create `skills.json` with every skill, its files, its agent dependencies, and its bundle. The file lists below come from the actual template file inventory.

```json
{
  "bundles": {
    "core": {
      "name": "Core Workflows",
      "description": "Essential development skills — TDD, debugging, planning, code review, and more",
      "default": true,
      "skills": [
        "brainstorming",
        "dispatching-parallel-agents",
        "executing-plans",
        "finishing-a-development-branch",
        "receiving-code-review",
        "requesting-code-review",
        "subagent-driven-development",
        "systematic-debugging",
        "test-driven-development",
        "using-git-worktrees",
        "using-armadillo",
        "verification-before-completion",
        "writing-plans",
        "writing-reference-skills",
        "writing-skills"
      ]
    },
    "google-apis": {
      "name": "Google APIs",
      "description": "GA4, Ads, Search Console, Business Profile, Lighthouse, YouTube, Places",
      "default": false,
      "skills": [
        "ga4-api",
        "google-ads-api",
        "google-business-profile-api",
        "google-places-api",
        "google-search-console-api",
        "lighthouse-api",
        "youtube-data-api"
      ]
    },
    "payments": {
      "name": "Payments",
      "description": "Stripe API reference — endpoints, webhooks, Checkout, subscriptions",
      "default": false,
      "skills": ["stripe-api"]
    },
    "video": {
      "name": "Video Production",
      "description": "Remotion programmatic video creation and animation",
      "default": false,
      "skills": ["remotion"]
    },
    "brand": {
      "name": "Brand & Content",
      "description": "Knowledge base builder and Deepgram audio transcription",
      "default": false,
      "skills": ["brand-knowledge-builder", "deepgram-transcription"]
    },
    "web-migration": {
      "name": "Web Migration",
      "description": "Duda-to-Astro website migration toolkit",
      "default": false,
      "skills": ["duda-to-astro-migration"]
    }
  },
  "skills": {
    "brainstorming": {
      "name": "Brainstorming",
      "description": "Collaborative design sessions before implementation",
      "files": ["skills/brainstorming/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "dispatching-parallel-agents": {
      "name": "Dispatching Parallel Agents",
      "description": "Run 2+ independent tasks concurrently with subagents",
      "files": ["skills/dispatching-parallel-agents/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "executing-plans": {
      "name": "Executing Plans",
      "description": "Execute implementation plans task-by-task with review checkpoints",
      "files": ["skills/executing-plans/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "finishing-a-development-branch": {
      "name": "Finishing a Development Branch",
      "description": "Guides completion — merge, PR, or cleanup options",
      "files": ["skills/finishing-a-development-branch/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "receiving-code-review": {
      "name": "Receiving Code Review",
      "description": "Process review feedback with technical rigor",
      "files": ["skills/receiving-code-review/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "requesting-code-review": {
      "name": "Requesting Code Review",
      "description": "Request and manage code review after completing work",
      "files": [
        "skills/requesting-code-review/SKILL.md",
        "skills/requesting-code-review/code-reviewer.md"
      ],
      "agents": ["agents/code-reviewer.md"],
      "bundle": "core"
    },
    "subagent-driven-development": {
      "name": "Subagent-Driven Development",
      "description": "Dispatch fresh subagent per task with code review between",
      "files": [
        "skills/subagent-driven-development/SKILL.md",
        "skills/subagent-driven-development/code-quality-reviewer-prompt.md",
        "skills/subagent-driven-development/implementer-prompt.md",
        "skills/subagent-driven-development/spec-reviewer-prompt.md"
      ],
      "agents": [],
      "bundle": "core"
    },
    "systematic-debugging": {
      "name": "Systematic Debugging",
      "description": "Root cause analysis — trace, reproduce, fix, verify",
      "files": [
        "skills/systematic-debugging/SKILL.md",
        "skills/systematic-debugging/CREATION-LOG.md",
        "skills/systematic-debugging/condition-based-waiting.md",
        "skills/systematic-debugging/condition-based-waiting-example.ts",
        "skills/systematic-debugging/defense-in-depth.md",
        "skills/systematic-debugging/find-polluter.sh",
        "skills/systematic-debugging/root-cause-tracing.md",
        "skills/systematic-debugging/test-academic.md",
        "skills/systematic-debugging/test-pressure-1.md",
        "skills/systematic-debugging/test-pressure-2.md",
        "skills/systematic-debugging/test-pressure-3.md"
      ],
      "agents": [],
      "bundle": "core"
    },
    "test-driven-development": {
      "name": "Test-Driven Development",
      "description": "RED/GREEN/REFACTOR cycle for all code changes",
      "files": [
        "skills/test-driven-development/SKILL.md",
        "skills/test-driven-development/testing-anti-patterns.md"
      ],
      "agents": [],
      "bundle": "core"
    },
    "using-git-worktrees": {
      "name": "Using Git Worktrees",
      "description": "Isolated feature branches with smart directory selection",
      "files": ["skills/using-git-worktrees/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "using-armadillo": {
      "name": "Using Armadillo",
      "description": "Discover and invoke skills via the Skill tool",
      "files": ["skills/using-armadillo/SKILL.md"],
      "agents": ["agents/claude-code-guide.md"],
      "bundle": "core"
    },
    "verification-before-completion": {
      "name": "Verification Before Completion",
      "description": "Run verification commands before claiming work is done",
      "files": ["skills/verification-before-completion/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "writing-plans": {
      "name": "Writing Plans",
      "description": "Create detailed implementation plans from designs",
      "files": ["skills/writing-plans/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "writing-reference-skills": {
      "name": "Writing Reference Skills",
      "description": "Create API/tool reference skills with mandatory web research",
      "files": ["skills/writing-reference-skills/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "writing-skills": {
      "name": "Writing Skills",
      "description": "Create and test new skills using the TDD cycle",
      "files": [
        "skills/writing-skills/SKILL.md",
        "skills/writing-skills/anthropic-best-practices.md",
        "skills/writing-skills/examples/CLAUDE_MD_TESTING.md",
        "skills/writing-skills/graphviz-conventions.dot",
        "skills/writing-skills/persuasion-principles.md",
        "skills/writing-skills/render-graphs.js",
        "skills/writing-skills/testing-skills-with-subagents.md"
      ],
      "agents": [],
      "bundle": "core"
    },
    "ga4-api": {
      "name": "GA4 API",
      "description": "Google Analytics 4 — reporting, Measurement Protocol, event tracking",
      "files": ["skills/ga4-api/SKILL.md", "skills/ga4-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "google-ads-api": {
      "name": "Google Ads API",
      "description": "Campaign management, GAQL queries, bidding strategies",
      "files": ["skills/google-ads-api/SKILL.md", "skills/google-ads-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "google-business-profile-api": {
      "name": "Google Business Profile API",
      "description": "Business listings, reviews, posts, local business data",
      "files": ["skills/google-business-profile-api/SKILL.md", "skills/google-business-profile-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "google-places-api": {
      "name": "Google Places API",
      "description": "Place search, details, autocomplete, photos",
      "files": ["skills/google-places-api/SKILL.md", "skills/google-places-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "google-search-console-api": {
      "name": "Google Search Console API",
      "description": "Search analytics, URL inspection, indexing, sitemaps",
      "files": ["skills/google-search-console-api/SKILL.md", "skills/google-search-console-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "lighthouse-api": {
      "name": "Lighthouse API",
      "description": "Performance audits, Web Vitals, PageSpeed Insights",
      "files": ["skills/lighthouse-api/SKILL.md", "skills/lighthouse-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "youtube-data-api": {
      "name": "YouTube Data API",
      "description": "Video management, channels, playlists, search, uploads",
      "files": ["skills/youtube-data-api/SKILL.md", "skills/youtube-data-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    },
    "stripe-api": {
      "name": "Stripe API",
      "description": "Payments, subscriptions, Checkout, webhooks, billing",
      "files": ["skills/stripe-api/SKILL.md", "skills/stripe-api/reference.md"],
      "agents": [],
      "bundle": "payments"
    },
    "remotion": {
      "name": "Remotion",
      "description": "Programmatic video creation, animation, rendering pipelines",
      "files": ["skills/remotion/SKILL.md", "skills/remotion/reference.md"],
      "agents": ["agents/remotion-creator.md"],
      "bundle": "video"
    },
    "brand-knowledge-builder": {
      "name": "Brand Knowledge Builder",
      "description": "Build per-project brand KB with templates and guided interviews",
      "files": ["skills/brand-knowledge-builder/SKILL.md"],
      "agents": ["agents/brand-strategist.md"],
      "bundle": "brand"
    },
    "deepgram-transcription": {
      "name": "Deepgram Transcription",
      "description": "Nova-3 speech-to-text — audio transcription at $0.0077/min",
      "files": ["skills/deepgram-transcription/SKILL.md", "skills/deepgram-transcription/reference.md"],
      "agents": [],
      "bundle": "brand"
    },
    "duda-to-astro-migration": {
      "name": "Duda-to-Astro Migration",
      "description": "Parse Duda exports, map dm-classes, extract CSS, build Astro 5 components",
      "files": ["skills/duda-to-astro-migration/SKILL.md", "skills/duda-to-astro-migration/reference.md"],
      "agents": ["agents/duda-migration-agent.md"],
      "bundle": "web-migration"
    }
  },
  "sharedFiles": {
    "hooks": [
      "hooks/hooks.json",
      "hooks/reinject-after-compact.sh",
      "hooks/run-hook.cmd",
      "hooks/session-start.sh"
    ],
    "lib": ["lib/skills-core.js"],
    "tests": [
      "tests/claude-code/README.md",
      "tests/claude-code/analyze-token-usage.py",
      "tests/claude-code/run-skill-tests.sh",
      "tests/claude-code/test-helpers.sh",
      "tests/claude-code/test-subagent-driven-development-integration.sh",
      "tests/claude-code/test-subagent-driven-development.sh",
      "tests/explicit-skill-requests/prompts/action-oriented.txt",
      "tests/explicit-skill-requests/prompts/after-planning-flow.txt",
      "tests/explicit-skill-requests/prompts/claude-suggested-it.txt",
      "tests/explicit-skill-requests/prompts/i-know-what-sdd-means.txt",
      "tests/explicit-skill-requests/prompts/mid-conversation-execute-plan.txt",
      "tests/explicit-skill-requests/prompts/please-use-brainstorming.txt",
      "tests/explicit-skill-requests/prompts/skip-formalities.txt",
      "tests/explicit-skill-requests/prompts/subagent-driven-development-please.txt",
      "tests/explicit-skill-requests/prompts/use-systematic-debugging.txt",
      "tests/explicit-skill-requests/run-all.sh",
      "tests/explicit-skill-requests/run-claude-describes-sdd.sh",
      "tests/explicit-skill-requests/run-extended-multiturn-test.sh",
      "tests/explicit-skill-requests/run-haiku-test.sh",
      "tests/explicit-skill-requests/run-multiturn-test.sh",
      "tests/explicit-skill-requests/run-test.sh",
      "tests/skill-triggering/prompts/dispatching-parallel-agents.txt",
      "tests/skill-triggering/prompts/executing-plans.txt",
      "tests/skill-triggering/prompts/requesting-code-review.txt",
      "tests/skill-triggering/prompts/systematic-debugging.txt",
      "tests/skill-triggering/prompts/test-driven-development.txt",
      "tests/skill-triggering/prompts/writing-plans.txt",
      "tests/skill-triggering/run-all.sh",
      "tests/skill-triggering/run-test.sh",
      "tests/subagent-driven-dev/go-fractals/design.md",
      "tests/subagent-driven-dev/go-fractals/plan.md",
      "tests/subagent-driven-dev/go-fractals/scaffold.sh",
      "tests/subagent-driven-dev/run-test.sh",
      "tests/subagent-driven-dev/svelte-todo/design.md",
      "tests/subagent-driven-dev/svelte-todo/plan.md",
      "tests/subagent-driven-dev/svelte-todo/scaffold.sh"
    ],
    "settings": ["settings.json"]
  }
}
```

**Step 2: Validate the registry matches template files**

Run a quick script to verify every file in skills.json actually exists in `templates/`:

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
node -e "
const reg = JSON.parse(require('fs').readFileSync('skills.json','utf-8'));
let missing = 0;
for (const [id, skill] of Object.entries(reg.skills)) {
  for (const f of skill.files) {
    if (!require('fs').existsSync('templates/' + f)) {
      console.log('MISSING:', f);
      missing++;
    }
  }
}
console.log(missing ? missing + ' files missing' : 'All files present');
"
```

Expected: `All files present`

**Step 3: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add skills.json
git commit -m "feat: add skills registry with bundle definitions and file mappings"
```

---

### Task 5: Build the Manifest Module

**Files:**
- Create: `armadillo/src/manifest.js`

This module reads/writes `.claude/.armadillo-manifest.json` and provides hash-based file tracking.

**Step 1: Write the manifest module**

Create `src/manifest.js`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const MANIFEST_FILE = '.armadillo-manifest.json';

export function hashFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function getManifestPath(targetDir) {
  return join(targetDir, '.claude', MANIFEST_FILE);
}

export function readManifest(targetDir) {
  const manifestPath = getManifestPath(targetDir);
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

export function writeManifest(targetDir, manifest) {
  const manifestPath = getManifestPath(targetDir);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

export function createManifest(version, bundles) {
  return {
    version,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bundles,
    files: {}
  };
}

export function addFileToManifest(manifest, relativePath, owner) {
  manifest.files[relativePath] = { owner };
}

export function isFileModified(targetDir, relativePath, manifest) {
  const entry = manifest.files[relativePath];
  if (!entry || !entry.hash) return false;
  const filePath = join(targetDir, '.claude', relativePath);
  if (!existsSync(filePath)) return true;
  return hashFile(filePath) !== entry.hash;
}

export function stampFileHash(targetDir, manifest, relativePath) {
  const filePath = join(targetDir, '.claude', relativePath);
  if (existsSync(filePath)) {
    manifest.files[relativePath].hash = hashFile(filePath);
  }
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/manifest.js
git commit -m "feat: add manifest module for file tracking and hash comparison"
```

---

### Task 6: Build the Registry Module

**Files:**
- Create: `armadillo/src/registry.js`

This module reads skills.json and resolves bundles to file lists.

**Step 1: Write the registry module**

Create `src/registry.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, '..', 'skills.json');

let _registry = null;

export function getRegistry() {
  if (!_registry) {
    _registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  }
  return _registry;
}

export function getBundles() {
  return getRegistry().bundles;
}

export function getDefaultBundles() {
  const bundles = getBundles();
  return Object.entries(bundles)
    .filter(([, b]) => b.default)
    .map(([id]) => id);
}

export function getOptionalBundles() {
  const bundles = getBundles();
  return Object.entries(bundles)
    .filter(([, b]) => !b.default)
    .map(([id, b]) => ({ id, ...b }));
}

export function getSkill(skillId) {
  return getRegistry().skills[skillId] || null;
}

export function getSkillsForBundles(bundleIds) {
  const bundles = getBundles();
  const skillIds = new Set();
  for (const id of bundleIds) {
    if (bundles[id]) {
      for (const s of bundles[id].skills) {
        skillIds.add(s);
      }
    }
  }
  return [...skillIds];
}

export function getFilesForSkills(skillIds) {
  const registry = getRegistry();
  const files = new Set();
  const agents = new Set();

  for (const id of skillIds) {
    const skill = registry.skills[id];
    if (!skill) continue;
    for (const f of skill.files) files.add(f);
    for (const a of skill.agents) agents.add(a);
  }

  return { files: [...files], agents: [...agents] };
}

export function getSharedFiles() {
  const registry = getRegistry();
  return registry.sharedFiles || {};
}

export function getAllSharedFilePaths() {
  const shared = getSharedFiles();
  return Object.values(shared).flat();
}

export function getTemplatesDir() {
  return join(__dirname, '..', 'templates');
}

export function findSkillOrBundle(name) {
  const registry = getRegistry();
  if (registry.bundles[name]) return { type: 'bundle', id: name, data: registry.bundles[name] };
  if (registry.skills[name]) return { type: 'skill', id: name, data: registry.skills[name] };
  return null;
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/registry.js
git commit -m "feat: add registry module for bundle/skill resolution"
```

---

### Task 7: Build the Installer Module

**Files:**
- Create: `armadillo/src/installer.js`

Handles copying files from templates/ to the target project's .claude/ directory.

**Step 1: Write the installer module**

Create `src/installer.js`:

```js
import { copyFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getTemplatesDir } from './registry.js';
import { addFileToManifest, stampFileHash } from './manifest.js';

export function installFiles(targetDir, filePaths, manifest, owner = 'armadillo') {
  const templatesDir = getTemplatesDir();
  const claudeDir = join(targetDir, '.claude');
  const installed = [];

  for (const relativePath of filePaths) {
    const src = join(templatesDir, relativePath);
    const dest = join(claudeDir, relativePath);

    if (!existsSync(src)) continue;

    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);

    addFileToManifest(manifest, relativePath, owner);
    stampFileHash(targetDir, manifest, relativePath);
    installed.push(relativePath);
  }

  return installed;
}

export function removeFiles(targetDir, filePaths, manifest) {
  const claudeDir = join(targetDir, '.claude');
  const removed = [];

  for (const relativePath of filePaths) {
    const dest = join(claudeDir, relativePath);
    if (existsSync(dest)) {
      rmSync(dest);
      removed.push(relativePath);
    }
    delete manifest.files[relativePath];
  }

  return removed;
}

export function installKnowledgeBase(targetDir, type, manifest) {
  const templatesDir = getTemplatesDir();
  const claudeDir = join(targetDir, '.claude');
  const installed = [];

  // Always install config.json
  const configSrc = join(templatesDir, 'knowledge', 'config.json');
  const configDest = join(claudeDir, 'knowledge', 'config.json');
  mkdirSync(dirname(configDest), { recursive: true });
  copyFileSync(configSrc, configDest);
  addFileToManifest(manifest, 'knowledge/config.json', 'user');
  installed.push('knowledge/config.json');

  const dirs = [];
  if (type === 'agency' || type === 'both') dirs.push('agency');
  if (type === 'client' || type === 'both') dirs.push('client');

  for (const dir of dirs) {
    const srcDir = join(templatesDir, 'knowledge', dir);
    if (!existsSync(srcDir)) continue;

    const { readdirSync } = await import('node:fs');
    // Use sync readdir
    const files = readdirSync(srcDir);
    for (const file of files) {
      const relativePath = `knowledge/${dir}/${file}`;
      const src = join(srcDir, file);
      const dest = join(claudeDir, relativePath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      addFileToManifest(manifest, relativePath, 'user');
      installed.push(relativePath);
    }
  }

  return installed;
}

export function installClaudeMd(targetDir, manifest) {
  const templatesDir = getTemplatesDir();
  const src = join(templatesDir, 'CLAUDE.md');
  const dest = join(targetDir, 'CLAUDE.md');

  if (!existsSync(src)) return null;

  copyFileSync(src, dest);
  addFileToManifest(manifest, 'CLAUDE.md', 'armadillo');
  stampFileHash(targetDir, manifest, 'CLAUDE.md');
  return 'CLAUDE.md';
}
```

**Note:** The `installKnowledgeBase` function has a bug — it uses a dynamic `await import` inside a non-async function and mixes sync/async. Fix during implementation: use `readdirSync` imported at the top of the file. The implementer should add `import { readdirSync } from 'node:fs';` to the existing import and remove the inline import.

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/installer.js
git commit -m "feat: add installer module for file copy and KB scaffolding"
```

---

### Task 8: Build the UI Helpers (prompts.js)

**Files:**
- Create: `armadillo/src/ui.js`

Centralizes styling and reusable UI patterns using @clack/prompts and picocolors.

**Step 1: Write the UI module**

Create `src/ui.js`:

```js
import * as p from '@clack/prompts';
import pc from 'picocolors';

export function banner(version) {
  console.log('');
  p.intro(pc.bgCyan(pc.black(` armadillo v${version} `)));
}

export function section(title) {
  console.log('');
  console.log(pc.dim('───') + ' ' + pc.bold(title) + ' ' + pc.dim('─'.repeat(Math.max(0, 44 - title.length))));
  console.log('');
}

export function success(msg) {
  p.log.success(msg);
}

export function info(msg) {
  p.log.info(msg);
}

export function warn(msg) {
  p.log.warn(msg);
}

export function fileInstalled(relativePath) {
  p.log.step(pc.green('+ ') + pc.dim(relativePath));
}

export function fileUpdated(relativePath) {
  p.log.step(pc.blue('~ ') + pc.dim(relativePath));
}

export function fileRemoved(relativePath) {
  p.log.step(pc.red('- ') + pc.dim(relativePath));
}

export function fileSkipped(relativePath, reason) {
  p.log.step(pc.yellow('○ ') + pc.dim(relativePath) + pc.dim(` — ${reason}`));
}

export function skillLine(name, description) {
  return `${pc.cyan(name)}  ${pc.dim(description)}`;
}

export function bundleLine(name, skillCount, description, installed = false) {
  const marker = installed ? pc.green('●') : pc.dim('○');
  const count = pc.dim(`${skillCount} skill${skillCount !== 1 ? 's' : ''}`);
  return `${marker} ${pc.bold(name)}  ${count}\n  ${pc.dim(description)}`;
}

export async function confirmAction(message, initial = true) {
  const result = await p.confirm({ message, initialValue: initial });
  if (p.isCancel(result)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return result;
}

export async function selectOption(message, options) {
  const result = await p.select({ message, options });
  if (p.isCancel(result)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return result;
}

export async function multiSelect(message, options) {
  const result = await p.multiselect({ message, options, required: false });
  if (p.isCancel(result)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return result;
}

export function outro(msg) {
  p.outro(msg);
}

export { p, pc };
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/ui.js
git commit -m "feat: add UI module with @clack/prompts styling helpers"
```

---

### Task 9: Build the `init` Command

**Files:**
- Create: `armadillo/src/commands/init.js`

This is the main interactive onboarding flow.

**Step 1: Write the init command**

Create `src/commands/init.js`:

```js
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  banner, section, success, info, warn, outro,
  confirmAction, selectOption, multiSelect, bundleLine, pc
} from '../ui.js';
import {
  getBundles, getDefaultBundles, getOptionalBundles,
  getSkillsForBundles, getFilesForSkills, getAllSharedFilePaths
} from '../registry.js';
import { installFiles, installKnowledgeBase, installClaudeMd } from '../installer.js';
import { createManifest, writeManifest, readManifest } from '../manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

export async function run() {
  const targetDir = process.cwd();
  banner(pkg.version);

  // Pre-flight checks
  section('Pre-flight');

  const claudeDir = join(targetDir, '.claude');
  if (existsSync(claudeDir)) {
    const existing = readManifest(targetDir);
    if (existing) {
      warn(`Found existing armadillo installation (v${existing.version}).`);
      info(`Run ${pc.cyan('armadillo update')} to pull the latest skills.`);
      return;
    } else {
      warn('Found existing .claude/ directory without armadillo manifest.');
      const proceed = await confirmAction('Continue and add armadillo to this project?', false);
      if (!proceed) return;
    }
  }

  info('Setting up in ' + pc.cyan(targetDir));

  // Bundle selection
  section('Bundle Selection');

  const defaultBundles = getDefaultBundles();
  const optionalBundles = getOptionalBundles();

  info(`${pc.bold('Core Workflows')} will be installed automatically.`);
  info(pc.dim('15 skills: TDD, debugging, planning, code review, and more'));
  console.log('');

  const selectedOptional = await multiSelect(
    'Select additional bundles to install:',
    optionalBundles.map(b => ({
      value: b.id,
      label: b.name,
      hint: `${b.skills.length} skill${b.skills.length !== 1 ? 's' : ''} — ${b.description}`
    }))
  );

  const allBundles = [...defaultBundles, ...selectedOptional];

  // Knowledge base
  section('Knowledge Base');

  let kbType = null;
  const setupKb = await confirmAction('Set up brand knowledge base templates?');

  if (setupKb) {
    kbType = await selectOption('What type of knowledge base?', [
      { value: 'agency', label: 'Agency', hint: 'Brand identity, services, positioning (3 templates)' },
      { value: 'client', label: 'Client', hint: 'Brand identity, audience, messaging, content, competitive, business model, voice & tone (7 templates)' },
      { value: 'both', label: 'Both', hint: 'Full agency + client template set (10 templates)' }
    ]);
  }

  // CLAUDE.md
  section('CLAUDE.md');

  const claudeMdChoice = await selectOption('Generate CLAUDE.md?', [
    { value: 'full', label: 'Smart defaults', hint: 'Skill instructions, workflow guidance, principles' },
    { value: 'minimal', label: 'Minimal skeleton', hint: 'Commented template — you fill it in' },
    { value: 'skip', label: 'Skip', hint: 'Manage CLAUDE.md yourself' }
  ]);

  // Install
  section('Installing');

  mkdirSync(claudeDir, { recursive: true });
  const manifest = createManifest(pkg.version, allBundles);

  // Install skills + agents
  const skillIds = getSkillsForBundles(allBundles);
  const { files: skillFiles, agents: agentFiles } = getFilesForSkills(skillIds);
  const allFiles = [...skillFiles, ...agentFiles];

  const installed = installFiles(targetDir, allFiles, manifest);
  success(`${skillIds.length} skills installed`);
  if (agentFiles.length > 0) {
    success(`${agentFiles.length} agent${agentFiles.length !== 1 ? 's' : ''} installed`);
  }

  // Install shared files (hooks, lib, tests, settings)
  const sharedFiles = getAllSharedFilePaths();
  installFiles(targetDir, sharedFiles, manifest);
  success('Hooks, lib, and tests configured');

  // Knowledge base
  if (kbType) {
    installKnowledgeBase(targetDir, kbType, manifest);
    success(`Knowledge base templates created (${kbType})`);
    info(pc.dim('Tip: Use the brand-knowledge-builder skill in Claude Code to fill them in'));
  }

  // CLAUDE.md
  if (claudeMdChoice === 'full') {
    installClaudeMd(targetDir, manifest);
    success('CLAUDE.md generated with smart defaults');
  } else if (claudeMdChoice === 'minimal') {
    // Write a minimal skeleton — implementer should create a minimal CLAUDE.md template
    success('CLAUDE.md skeleton created');
  }

  // Write manifest
  writeManifest(targetDir, manifest);
  success('Manifest written');

  // Summary
  section('Done');

  outro(`Start a Claude Code session to use your new skills.\n  Run ${pc.cyan('armadillo list')} to see what's installed.`);
}
```

**Step 2: Smoke test**

Run: `cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo" && node bin/cli.js init --help`
Expected: Shows the init command help text

**Step 3: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/init.js
git commit -m "feat: add init command with interactive onboarding flow"
```

---

### Task 10: Build the `list` Command

**Files:**
- Create: `armadillo/src/commands/list.js`

**Step 1: Write the list command**

Create `src/commands/list.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { banner, section, info, outro, pc } from '../ui.js';
import { getBundles, getRegistry } from '../registry.js';
import { readManifest } from '../manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

export async function run(opts = {}) {
  const targetDir = process.cwd();
  banner(pkg.version);

  const manifest = readManifest(targetDir);
  const installedBundles = manifest ? manifest.bundles : [];
  const bundles = getBundles();
  const registry = getRegistry();

  // Installed bundles
  const installed = Object.entries(bundles).filter(([id]) => installedBundles.includes(id));
  const available = Object.entries(bundles).filter(([id]) => !installedBundles.includes(id));

  if (installed.length > 0) {
    section('Installed');
    for (const [id, bundle] of installed) {
      console.log(`  ${pc.green('●')} ${pc.bold(bundle.name)}  ${pc.dim(`${bundle.skills.length} skill${bundle.skills.length !== 1 ? 's' : ''}`)}`);
      console.log(`    ${pc.dim(bundle.description)}`);

      if (opts.all) {
        for (const skillId of bundle.skills) {
          const skill = registry.skills[skillId];
          if (skill) {
            console.log(`      ${pc.dim('·')} ${pc.cyan(skillId)}  ${pc.dim(skill.description)}`);
          }
        }
      }
      console.log('');
    }
  }

  if (available.length > 0) {
    section('Available');
    for (const [id, bundle] of available) {
      console.log(`  ${pc.dim('○')} ${pc.bold(bundle.name)}  ${pc.dim(`${bundle.skills.length} skill${bundle.skills.length !== 1 ? 's' : ''}`)}`);
      console.log(`    ${pc.dim(bundle.description)}`);

      if (opts.all) {
        for (const skillId of bundle.skills) {
          const skill = registry.skills[skillId];
          if (skill) {
            console.log(`      ${pc.dim('·')} ${pc.cyan(skillId)}  ${pc.dim(skill.description)}`);
          }
        }
      }
      console.log('');
    }
  }

  if (!manifest) {
    info(`Run ${pc.cyan('armadillo init')} to get started.`);
  } else {
    info(`Run ${pc.cyan('armadillo add <bundle>')} to install more.`);
  }

  console.log('');
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/list.js
git commit -m "feat: add list command showing installed and available bundles"
```

---

### Task 11: Build the `add` Command

**Files:**
- Create: `armadillo/src/commands/add.js`

**Step 1: Write the add command**

Create `src/commands/add.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { banner, section, success, warn, info, outro, pc } from '../ui.js';
import { findSkillOrBundle, getSkillsForBundles, getFilesForSkills, getSkill } from '../registry.js';
import { installFiles } from '../installer.js';
import { readManifest, writeManifest } from '../manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

export async function run(name) {
  const targetDir = process.cwd();
  banner(pkg.version);

  const manifest = readManifest(targetDir);
  if (!manifest) {
    warn('No armadillo installation found.');
    info(`Run ${pc.cyan('armadillo init')} first.`);
    return;
  }

  const match = findSkillOrBundle(name);
  if (!match) {
    warn(`"${name}" is not a recognized skill or bundle.`);
    info(`Run ${pc.cyan('armadillo list --all')} to see available options.`);
    return;
  }

  section(`Adding ${match.data.name || name}`);

  let skillIds;
  if (match.type === 'bundle') {
    if (manifest.bundles.includes(match.id)) {
      info(`${match.data.name} is already installed.`);
      return;
    }
    skillIds = getSkillsForBundles([match.id]);
    manifest.bundles.push(match.id);
  } else {
    skillIds = [match.id];
  }

  // Show what's being installed
  for (const id of skillIds) {
    const skill = getSkill(id);
    if (skill) {
      console.log(`  ${pc.cyan(skill.name)}  ${pc.dim(skill.description)}`);
    }
  }
  console.log('');

  const { files, agents } = getFilesForSkills(skillIds);
  const allFiles = [...files, ...agents];

  const installed = installFiles(targetDir, allFiles, manifest);
  writeManifest(targetDir, manifest);

  success(`${skillIds.length} skill${skillIds.length !== 1 ? 's' : ''} installed`);
  if (agents.length > 0) {
    success(`${agents.length} agent${agents.length !== 1 ? 's' : ''} added`);
  }

  outro('Ready to use!');
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/add.js
git commit -m "feat: add command for installing individual skills and bundles"
```

---

### Task 12: Build the `remove` Command

**Files:**
- Create: `armadillo/src/commands/remove.js`

**Step 1: Write the remove command**

Create `src/commands/remove.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { banner, section, success, warn, info, outro, confirmAction, pc } from '../ui.js';
import {
  findSkillOrBundle, getSkill, getFilesForSkills,
  getSkillsForBundles, getRegistry
} from '../registry.js';
import { removeFiles } from '../installer.js';
import { readManifest, writeManifest } from '../manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

function getAgentUsageCount(agentPath, manifest, excludeSkillIds) {
  const registry = getRegistry();
  let count = 0;
  for (const [id, skill] of Object.entries(registry.skills)) {
    if (excludeSkillIds.includes(id)) continue;
    // Check if this skill is installed
    const isInstalled = skill.files.some(f => manifest.files[f]);
    if (isInstalled && skill.agents.includes(agentPath)) {
      count++;
    }
  }
  return count;
}

export async function run(name) {
  const targetDir = process.cwd();
  banner(pkg.version);

  const manifest = readManifest(targetDir);
  if (!manifest) {
    warn('No armadillo installation found.');
    return;
  }

  const match = findSkillOrBundle(name);
  if (!match) {
    warn(`"${name}" is not a recognized skill or bundle.`);
    return;
  }

  let skillIds;
  if (match.type === 'bundle') {
    if (match.data.default) {
      warn('Cannot remove core bundle.');
      return;
    }
    skillIds = match.data.skills;
  } else {
    skillIds = [match.id];
  }

  section(`Removing ${match.data.name || name}`);

  for (const id of skillIds) {
    const skill = getSkill(id);
    if (skill) {
      console.log(`  ${pc.red(skill.name)}  ${pc.dim(skill.description)}`);
    }
  }
  console.log('');

  // Check agent dependencies
  const { files, agents } = getFilesForSkills(skillIds);
  const agentsToRemove = [];
  const agentsToKeep = [];

  for (const agentPath of agents) {
    const usageCount = getAgentUsageCount(agentPath, manifest, skillIds);
    if (usageCount === 0) {
      agentsToRemove.push(agentPath);
    } else {
      agentsToKeep.push({ path: agentPath, usedBy: usageCount });
    }
  }

  if (agentsToKeep.length > 0) {
    for (const agent of agentsToKeep) {
      const agentName = agent.path.split('/').pop().replace('.md', '');
      info(`${pc.dim(agentName)} agent is shared with ${agent.usedBy} other skill${agent.usedBy !== 1 ? 's' : ''} — keeping it.`);
    }
    console.log('');
  }

  const proceed = await confirmAction('Continue?');
  if (!proceed) return;

  const allFiles = [...files, ...agentsToRemove];
  removeFiles(targetDir, allFiles, manifest);

  // Remove bundle from manifest if it was a bundle removal
  if (match.type === 'bundle') {
    manifest.bundles = manifest.bundles.filter(b => b !== match.id);
  }

  writeManifest(targetDir, manifest);

  success(`${skillIds.length} skill${skillIds.length !== 1 ? 's' : ''} removed`);
  if (agentsToRemove.length > 0) {
    success(`${agentsToRemove.length} agent${agentsToRemove.length !== 1 ? 's' : ''} cleaned up`);
  }

  outro('Done!');
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/remove.js
git commit -m "feat: add remove command with shared agent dependency awareness"
```

---

### Task 13: Build the `update` Command

**Files:**
- Create: `armadillo/src/commands/update.js`

This is the most complex command — smart merge + interactive conflict walkthrough.

**Step 1: Write the update command**

Create `src/commands/update.js`:

```js
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createTwoFilesPatch } from 'diff';

import {
  banner, section, success, warn, info, outro,
  confirmAction, selectOption, fileUpdated, fileSkipped, pc
} from '../ui.js';
import {
  getSkillsForBundles, getFilesForSkills, getAllSharedFilePaths,
  getOptionalBundles, getBundles
} from '../registry.js';
import { installFiles } from '../installer.js';
import {
  readManifest, writeManifest, hashFile, isFileModified, stampFileHash
} from '../manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

async function handleConflict(targetDir, relativePath, manifest) {
  const claudeDir = join(targetDir, '.claude');
  const localPath = join(claudeDir, relativePath);
  const templatePath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates', relativePath);

  const localContent = existsSync(localPath) ? readFileSync(localPath, 'utf-8') : '';
  const incomingContent = existsSync(templatePath) ? readFileSync(templatePath, 'utf-8') : '';

  console.log('');
  info(`${pc.bold(relativePath)} has local changes.`);
  console.log('');

  const choice = await selectOption('How would you like to handle this?', [
    { value: 'keep', label: 'Keep mine', hint: 'Skip this update, keep your local version' },
    { value: 'theirs', label: 'Use armadillo\'s version', hint: 'Overwrite with the latest from armadillo' },
    { value: 'diff', label: 'Show diff first', hint: 'View the differences, then decide' }
  ]);

  if (choice === 'diff') {
    const patch = createTwoFilesPatch(
      `${relativePath} (yours)`,
      `${relativePath} (armadillo)`,
      localContent,
      incomingContent
    );
    console.log('');
    console.log(pc.dim(patch));
    console.log('');

    const afterDiff = await selectOption('What now?', [
      { value: 'keep', label: 'Keep mine' },
      { value: 'theirs', label: 'Use armadillo\'s version' }
    ]);

    if (afterDiff === 'theirs') {
      installFiles(targetDir, [relativePath], manifest);
      fileUpdated(relativePath);
      return 'updated';
    }
    fileSkipped(relativePath, 'kept local version');
    return 'skipped';
  }

  if (choice === 'theirs') {
    installFiles(targetDir, [relativePath], manifest);
    fileUpdated(relativePath);
    return 'updated';
  }

  // Stamp current hash so we don't ask again until next real change
  stampFileHash(targetDir, manifest, relativePath);
  fileSkipped(relativePath, 'kept local version');
  return 'skipped';
}

export async function run() {
  const targetDir = process.cwd();
  banner(pkg.version);

  const manifest = readManifest(targetDir);
  if (!manifest) {
    warn('No armadillo installation found.');
    info(`Run ${pc.cyan('armadillo init')} first.`);
    return;
  }

  const oldVersion = manifest.version;
  info(`Updating from v${oldVersion} to v${pkg.version}`);

  // Gather all files that should be installed for current bundles
  const skillIds = getSkillsForBundles(manifest.bundles);
  const { files: skillFiles, agents: agentFiles } = getFilesForSkills(skillIds);
  const sharedFiles = getAllSharedFilePaths();
  const allArmadilloFiles = [...skillFiles, ...agentFiles, ...sharedFiles];

  let autoUpdated = 0;
  let conflicts = 0;
  let skipped = 0;

  // Auto-update unmodified files
  section('Checking for changes');

  const conflictFiles = [];
  const autoUpdateFiles = [];

  for (const relativePath of allArmadilloFiles) {
    const entry = manifest.files[relativePath];
    if (!entry) {
      // New file — auto-install
      autoUpdateFiles.push(relativePath);
      continue;
    }
    if (entry.owner === 'user') {
      skipped++;
      continue;
    }
    if (isFileModified(targetDir, relativePath, manifest)) {
      conflictFiles.push(relativePath);
    } else {
      autoUpdateFiles.push(relativePath);
    }
  }

  if (autoUpdateFiles.length > 0) {
    section('Auto-updating');
    installFiles(targetDir, autoUpdateFiles, manifest);
    for (const f of autoUpdateFiles) {
      fileUpdated(f);
    }
    autoUpdated = autoUpdateFiles.length;
  }

  // Check for new bundles
  const bundles = getBundles();
  const newBundles = Object.entries(bundles)
    .filter(([id, b]) => !b.default && !manifest.bundles.includes(id));

  if (newBundles.length > 0) {
    section('New in v' + pkg.version);
    for (const [id, bundle] of newBundles) {
      const install = await confirmAction(
        `New bundle: ${pc.bold(bundle.name)} — ${bundle.description}\n  Install?`,
        false
      );
      if (install) {
        const newSkillIds = getSkillsForBundles([id]);
        const { files, agents } = getFilesForSkills(newSkillIds);
        installFiles(targetDir, [...files, ...agents], manifest);
        manifest.bundles.push(id);
        success(`${bundle.name} installed`);
      } else {
        info('Skipped.');
      }
    }
  }

  // Handle conflicts
  if (conflictFiles.length > 0) {
    section('Needs your review');
    for (const relativePath of conflictFiles) {
      await handleConflict(targetDir, relativePath, manifest);
      conflicts++;
    }
  }

  // Update manifest version
  manifest.version = pkg.version;
  manifest.updatedAt = new Date().toISOString();
  writeManifest(targetDir, manifest);

  // Summary
  section('Summary');

  if (autoUpdated > 0) success(`${autoUpdated} files auto-updated`);
  if (conflicts > 0) info(`${conflicts} files reviewed`);
  if (skipped > 0) info(`${skipped} user-owned files skipped`);
  success(`Manifest updated to v${pkg.version}`);

  console.log('');
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/update.js
git commit -m "feat: add update command with smart merge and conflict walkthrough"
```

---

### Task 14: Build the `doctor` Command

**Files:**
- Create: `armadillo/src/commands/doctor.js`

**Step 1: Write the doctor command**

Create `src/commands/doctor.js`:

```js
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { banner, section, success, warn, info, pc } from '../ui.js';
import { readManifest } from '../manifest.js';
import { getSkillsForBundles, getFilesForSkills, getRegistry } from '../registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

export async function run() {
  const targetDir = process.cwd();
  banner(pkg.version);

  section('Checking installation health');

  let issues = 0;

  // Check .claude/ exists
  const claudeDir = join(targetDir, '.claude');
  if (!existsSync(claudeDir)) {
    warn('.claude/ directory not found');
    info(`Run ${pc.cyan('armadillo init')} to get started.`);
    return;
  }
  success('.claude/ directory exists');

  // Check manifest
  const manifest = readManifest(targetDir);
  if (!manifest) {
    warn('No manifest found — was armadillo used to set this up?');
    info(`Run ${pc.cyan('armadillo init')} to create a managed installation.`);
    return;
  }
  success(`Manifest found (v${manifest.version})`);

  // Version check
  if (manifest.version !== pkg.version) {
    warn(`Installed v${manifest.version}, latest is v${pkg.version}`);
    info(`Run ${pc.cyan('armadillo update')} to get the latest.`);
    issues++;
  }

  // Check all skill files exist
  const skillIds = getSkillsForBundles(manifest.bundles);
  const { files: skillFiles, agents: agentFiles } = getFilesForSkills(skillIds);
  const allFiles = [...skillFiles, ...agentFiles];

  let missingFiles = 0;
  for (const relativePath of allFiles) {
    const fullPath = join(claudeDir, relativePath);
    if (!existsSync(fullPath)) {
      warn(`Missing: ${relativePath}`);
      missingFiles++;
    }
  }

  if (missingFiles === 0) {
    success(`${skillIds.length} skills — all files present`);
    if (agentFiles.length > 0) {
      success(`${agentFiles.length} agents — all files present`);
    }
  } else {
    warn(`${missingFiles} file${missingFiles !== 1 ? 's' : ''} missing`);
    info(`Run ${pc.cyan('armadillo update')} to restore missing files.`);
    issues += missingFiles;
  }

  // Check hooks
  const hooksFile = join(claudeDir, 'hooks', 'hooks.json');
  if (existsSync(hooksFile)) {
    success('Hooks configured');
  } else {
    warn('Hooks not found');
    issues++;
  }

  // Check CLAUDE.md
  const claudeMd = join(targetDir, 'CLAUDE.md');
  if (existsSync(claudeMd)) {
    const content = readFileSync(claudeMd, 'utf-8');
    if (content.includes('<!-- armadillo:start -->') && content.includes('<!-- armadillo:end -->')) {
      success('CLAUDE.md — armadillo sections intact');
    } else {
      warn('CLAUDE.md exists but missing armadillo markers');
      issues++;
    }
  } else {
    info('No CLAUDE.md found');
  }

  // Check knowledge base
  const kbDir = join(claudeDir, 'knowledge');
  if (existsSync(kbDir)) {
    const registry = getRegistry();
    const configPath = join(kbDir, 'config.json');
    if (existsSync(configPath)) {
      // Count empty templates
      let emptyCount = 0;
      let totalCount = 0;
      for (const [relPath, entry] of Object.entries(manifest.files)) {
        if (relPath.startsWith('knowledge/') && relPath !== 'knowledge/config.json') {
          totalCount++;
          const fullPath = join(claudeDir, relPath);
          if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf-8').trim();
            // Check if it's still a template (has unfilled placeholders)
            if (content.includes('[') && content.includes(']')) {
              emptyCount++;
            }
          }
        }
      }
      if (emptyCount > 0) {
        warn(`Knowledge base — ${emptyCount} of ${totalCount} templates still empty`);
        info(pc.dim('Tip: Run brand-knowledge-builder skill to fill them in'));
        issues++;
      } else {
        success('Knowledge base configured');
      }
    }
  }

  // Final verdict
  console.log('');
  if (issues === 0) {
    success(pc.green('Everything looks good!'));
  } else {
    info(`${issues} issue${issues !== 1 ? 's' : ''} found — see above for fixes.`);
  }
  console.log('');
}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add src/commands/doctor.js
git commit -m "feat: add doctor command for installation health checks"
```

---

### Task 15: Create the GitHub Action for Auto-Publishing

**Files:**
- Create: `armadillo/.github/workflows/publish.yml`

**Step 1: Write the publish workflow**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to GitHub Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'

      - run: npm ci

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
mkdir -p .github/workflows
git add .github/workflows/publish.yml
git commit -m "ci: add GitHub Action for auto-publishing on version tags"
```

---

### Task 16: End-to-End Smoke Test

**Files:** None (test only)

**Step 1: Create a temporary test directory**

```bash
mkdir -p /tmp/armadillo-test-project
cd /tmp/armadillo-test-project
npm init -y
```

**Step 2: Run init from the local package**

```bash
cd /tmp/armadillo-test-project
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" init
```

Walk through the interactive prompts. Select core + google-apis bundles, agency KB, full CLAUDE.md.

**Step 3: Verify the installation**

```bash
ls -la /tmp/armadillo-test-project/.claude/
ls /tmp/armadillo-test-project/.claude/skills/ | wc -l
cat /tmp/armadillo-test-project/.claude/.armadillo-manifest.json | head -5
cat /tmp/armadillo-test-project/CLAUDE.md | head -5
```

Expected:
- `.claude/` directory exists with skills/, agents/, hooks/, lib/, knowledge/
- Correct number of skill directories for selected bundles
- Manifest file with version and file hashes
- CLAUDE.md with armadillo markers

**Step 4: Test list command**

```bash
cd /tmp/armadillo-test-project
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" list
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" list --all
```

Expected: Shows installed (core, google-apis) and available (payments, video, brand, web-migration) bundles

**Step 5: Test add command**

```bash
cd /tmp/armadillo-test-project
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" add payments
ls /tmp/armadillo-test-project/.claude/skills/stripe-api/
```

Expected: stripe-api skill files installed, manifest updated

**Step 6: Test remove command**

```bash
cd /tmp/armadillo-test-project
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" remove stripe-api
```

Expected: stripe-api removed, confirm prompt shown

**Step 7: Test doctor command**

```bash
cd /tmp/armadillo-test-project
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" doctor
```

Expected: All checks pass (or show expected warnings for empty KB templates)

**Step 8: Test update command**

Modify a skill file to simulate a local change, then run update:

```bash
cd /tmp/armadillo-test-project
echo "# modified" >> .claude/skills/brainstorming/SKILL.md
node "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo/bin/cli.js" update
```

Expected: brainstorming/SKILL.md flagged as conflict, walkthrough shown

**Step 9: Clean up**

```bash
rm -rf /tmp/armadillo-test-project
```

**Step 10: Commit any fixes from smoke testing**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

### Task 17: Create README and Tag v0.1.0

**Files:**
- Create: `armadillo/README.md`

**Step 1: Write a concise README**

The README should cover: what armadillo is, installation (GitHub Packages auth), quick start (`npx armadillo init`), commands reference, and bundle list. Keep it under 100 lines.

**Step 2: Commit**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git add README.md
git commit -m "docs: add README with installation and usage guide"
```

**Step 3: Tag and verify**

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
git tag v0.1.0
git log --oneline
```

Expected: Clean commit history with all tasks, tagged at v0.1.0

---

Plan complete and saved to `.claude/docs/plans/2026-02-16-armadillo-npm-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

Which approach?