# Shepherd + Style Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Rename using-armadillo to armadillo-shepherd (active router), enhance output style with emojis + personality refactor, re-block Explore agents, add bypass mode detection, and fix stale references.

**Architecture:** Four interconnected upgrades — shepherd rename/rewrite, output-style enhancement, enforcement tightening, permissions escalation. Each task is self-contained with TDD: test → implement → commit.

**Tech Stack:** Bash hooks, markdown skill files, JSON config, Node.js test runner

**Design doc:** `.claude/docs/plans/2026-02-19-shepherd-style-enforcement-design.md`

---

### Task 1: RED tests for armadillo-shepherd rename

**Files:**
- Create: `tests/shepherd-rename.test.js`
- Reference: `skills.json`, `.claude/skills/using-armadillo/SKILL.md`

**Step 1: Write the failing tests**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('armadillo-shepherd rename', () => {
  it('armadillo-shepherd directory exists', () => {
    assert.ok(existsSync(join(ROOT, '.claude', 'skills', 'armadillo-shepherd', 'SKILL.md')));
  });

  it('using-armadillo directory no longer exists', () => {
    assert.ok(!existsSync(join(ROOT, '.claude', 'skills', 'using-armadillo', 'SKILL.md')));
  });

  it('skills.json references armadillo-shepherd not using-armadillo', () => {
    const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
    assert.ok(skillsJson.skills['armadillo-shepherd'], 'must have armadillo-shepherd key');
    assert.ok(!skillsJson.skills['using-armadillo'], 'must not have using-armadillo key');
  });

  it('core bundle references armadillo-shepherd', () => {
    const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
    assert.ok(skillsJson.bundles.core.skills.includes('armadillo-shepherd'));
    assert.ok(!skillsJson.bundles.core.skills.includes('using-armadillo'));
  });

  it('CLAUDE.md references armadillo-shepherd', () => {
    const claudeMd = readFileSync(join(ROOT, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(claudeMd.includes('armadillo-shepherd'));
    assert.ok(!claudeMd.includes('using-armadillo'));
  });

  it('session-start.sh references armadillo-shepherd', () => {
    const hook = readFileSync(join(ROOT, '.claude', 'hooks', 'session-start.sh'), 'utf8');
    assert.ok(hook.includes('armadillo-shepherd'));
    assert.ok(!hook.includes('using-armadillo'));
  });

  it('README.md references armadillo-shepherd', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    assert.ok(readme.includes('armadillo-shepherd'));
    assert.ok(!readme.includes('using-armadillo'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/shepherd-rename.test.js`
Expected: FAIL — using-armadillo still exists, armadillo-shepherd doesn't

**Step 3: Commit**

```bash
git add tests/shepherd-rename.test.js
git commit -m "test: add RED tests for armadillo-shepherd rename"
```

---

### Task 2: RED tests for shepherd routing table content

**Files:**
- Create: `tests/shepherd-content.test.js`

**Step 1: Write the failing tests**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Will fail until armadillo-shepherd exists
const skillPath = join(ROOT, '.claude', 'skills', 'armadillo-shepherd', 'SKILL.md');
let content = '';
try { content = readFileSync(skillPath, 'utf8'); } catch {}

describe('armadillo-shepherd/SKILL.md — routing table', () => {
  it('has routing table section', () => {
    assert.ok(content.includes('Routing') || content.includes('routing'));
  });

  it('routes brainstorming for creative/feature work', () => {
    assert.ok(content.includes('brainstorming'));
  });

  it('routes test-driven-development for implementation', () => {
    assert.ok(content.includes('test-driven-development'));
  });

  it('routes systematic-debugging for bugs', () => {
    assert.ok(content.includes('systematic-debugging'));
  });

  it('routes finishing-a-development-branch for shipping', () => {
    assert.ok(content.includes('finishing-a-development-branch'));
  });

  it('routes writing-prs for PR creation', () => {
    assert.ok(content.includes('writing-prs'));
  });

  it('routes onboarding for install', () => {
    assert.ok(content.includes('onboarding'));
  });

  it('routes updating-armadillo for updates', () => {
    assert.ok(content.includes('updating-armadillo'));
  });
});

describe('armadillo-shepherd/SKILL.md — hard rules', () => {
  it('requires invoking target skill before responding', () => {
    assert.ok(content.includes('Never respond before') || content.includes('invoke') && content.includes('before'));
  });

  it('has "if unclear, ask ONE question" rule', () => {
    assert.ok(content.includes('ONE') || content.includes('one clarifying'));
  });

  it('has two-skill collision rule (invoke first)', () => {
    assert.ok(content.includes('first') && (content.includes('two skills') || content.includes('Two skills') || content.includes('2 skills') || content.includes('FIRST')));
  });
});

describe('armadillo-shepherd/SKILL.md — frontmatter', () => {
  it('has name: armadillo-shepherd', () => {
    assert.ok(content.includes('name: armadillo-shepherd'));
  });

  it('has description mentioning routing or orchestration', () => {
    assert.ok(content.includes('rout') || content.includes('orchestrat'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/shepherd-content.test.js`
Expected: FAIL — file doesn't exist yet

**Step 3: Commit**

```bash
git add tests/shepherd-content.test.js
git commit -m "test: add RED tests for shepherd routing table content"
```

---

### Task 3: RED tests for output-style emoji enhancement

**Files:**
- Create: `tests/output-style-enhanced.test.js`

**Step 1: Write the failing tests**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const content = readFileSync(join(ROOT, '.claude', 'rules', 'output-style.md'), 'utf8');

describe('output-style.md — emoji visual hierarchy', () => {
  it('has emoji table/section for visual hierarchy', () => {
    assert.ok(content.includes('Emoji') || content.includes('emoji'));
  });

  it('includes shield emoji for brand moments', () => {
    assert.ok(content.includes('🛡'));
  });

  it('includes rocket emoji for release/deploy', () => {
    assert.ok(content.includes('🚀'));
  });

  it('includes lightning emoji for performance', () => {
    assert.ok(content.includes('⚡'));
  });

  it('includes target emoji for precision', () => {
    assert.ok(content.includes('🎯'));
  });

  it('includes test tube emoji for testing', () => {
    assert.ok(content.includes('🧪'));
  });

  it('includes bug emoji for bug identification', () => {
    assert.ok(content.includes('🐛'));
  });

  it('includes wrench emoji for fixes', () => {
    assert.ok(content.includes('🔧'));
  });

  it('includes magnifying glass for investigation', () => {
    assert.ok(content.includes('🔍'));
  });
});

describe('output-style.md — skill announcement category emojis', () => {
  it('has category emoji section for skill announcements', () => {
    assert.ok(content.includes('category emoji') || content.includes('Category Emoji') || content.includes('category prefix'));
  });

  it('maps brain emoji to creative/planning', () => {
    assert.ok(content.includes('🧠'));
  });

  it('maps rocket emoji to delivery', () => {
    assert.ok(content.includes('🚀') && (content.includes('Delivery') || content.includes('delivery')));
  });

  it('maps shield emoji to armadillo meta', () => {
    assert.ok(content.includes('🛡') && (content.includes('Armadillo') || content.includes('armadillo')));
  });
});

describe('output-style.md — personality anti-patterns', () => {
  it('has explicit anti-patterns section', () => {
    assert.ok(content.includes('Never') || content.includes('never'));
  });

  it('lists what armadillo never says', () => {
    assert.ok(content.includes('Never to Do') || content.includes('never say') || content.includes('What Never'));
  });
});

describe('output-style.md — edge case guidance', () => {
  it('has guidance for when blocked', () => {
    assert.ok(content.includes('blocked') || content.includes('Blocked'));
  });

  it('has guidance for when confused', () => {
    assert.ok(content.includes('confused') || content.includes('unclear') || content.includes('Unclear'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/output-style-enhanced.test.js`
Expected: FAIL — output-style.md doesn't have emojis yet

**Step 3: Commit**

```bash
git add tests/output-style-enhanced.test.js
git commit -m "test: add RED tests for output-style emoji enhancement"
```

---

### Task 4: RED tests for enforcement tightening

**Files:**
- Create: `tests/enforcement-tightened.test.js`

**Step 1: Write the failing tests**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENFORCE_SCRIPT = resolve(ROOT, '.claude', 'hooks', 'enforce-skills.sh');
const INJECT_SCRIPT = resolve(ROOT, '.claude', 'hooks', 'inject-skill-awareness.sh');

function runEnforce(input) {
  try {
    const stdout = execSync(`bash "${ENFORCE_SCRIPT}"`, {
      input: JSON.stringify(input),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return { exitCode: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

describe('enforce-skills.sh — Explore re-blocked', () => {
  it('blocks Explore agent type with exit 2', () => {
    const result = runEnforce({ tool_input: { subagent_type: 'Explore' } });
    assert.equal(result.exitCode, 2);
  });

  it('mentions armadillo-shepherd in Explore block message', () => {
    const result = runEnforce({ tool_input: { subagent_type: 'Explore' } });
    assert.ok(result.stderr.includes('armadillo-shepherd') || result.stderr.includes('Skill tool'));
  });

  it('still blocks Plan agent type', () => {
    const result = runEnforce({ tool_input: { subagent_type: 'Plan' } });
    assert.equal(result.exitCode, 2);
  });

  it('still allows general-purpose agent type', () => {
    const result = runEnforce({ tool_input: { subagent_type: 'general-purpose' } });
    assert.equal(result.exitCode, 0);
  });

  it('still allows code-reviewer agent type', () => {
    const result = runEnforce({ tool_input: { subagent_type: 'code-reviewer' } });
    assert.equal(result.exitCode, 0);
  });
});

describe('inject-skill-awareness.sh — hard constraint', () => {
  it('uses CONSTRAINT or MUST language', () => {
    const result = execSync(`bash "${INJECT_SCRIPT}"`, {
      input: '{}',
      encoding: 'utf8',
    });
    const parsed = JSON.parse(result);
    const ctx = parsed.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('CONSTRAINT') || ctx.includes('MUST'));
  });

  it('mentions Explore is blocked', () => {
    const result = execSync(`bash "${INJECT_SCRIPT}"`, {
      input: '{}',
      encoding: 'utf8',
    });
    const parsed = JSON.parse(result);
    const ctx = parsed.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('Explore') && (ctx.includes('blocked') || ctx.includes('Blocked')));
  });

  it('references armadillo-shepherd', () => {
    const result = execSync(`bash "${INJECT_SCRIPT}"`, {
      input: '{}',
      encoding: 'utf8',
    });
    const parsed = JSON.parse(result);
    const ctx = parsed.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('armadillo-shepherd'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/enforcement-tightened.test.js`
Expected: FAIL — Explore not blocked, inject-skill-awareness doesn't have CONSTRAINT language

**Step 3: Commit**

```bash
git add tests/enforcement-tightened.test.js
git commit -m "test: add RED tests for enforcement tightening"
```

---

### Task 5: RED tests for bypass mode detection + stale reference fix

**Files:**
- Create: `tests/bypass-detection.test.js`

**Step 1: Write the failing tests**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCRIPT = resolve(ROOT, '.claude', 'hooks', 'session-start.sh');

describe('session-start.sh — bypass mode detection', () => {
  it('session-start.sh reads settings.json for bypass detection', () => {
    const hook = readFileSync(SCRIPT, 'utf8');
    assert.ok(hook.includes('bypassPermissions') || hook.includes('defaultMode'));
  });

  it('session-start.sh includes bypass warning text', () => {
    const hook = readFileSync(SCRIPT, 'utf8');
    assert.ok(hook.includes('BYPASS') || hook.includes('bypass'));
  });
});

describe('updating-armadillo/SKILL.md — stale reference fixed', () => {
  it('does NOT say bypassPermissions is the standard', () => {
    const content = readFileSync(
      join(ROOT, '.claude', 'skills', 'updating-armadillo', 'SKILL.md'), 'utf8'
    );
    assert.ok(
      !content.includes('bypassPermissions is the standard'),
      'stale reference must be removed'
    );
  });

  it('references acceptEdits as default', () => {
    const content = readFileSync(
      join(ROOT, '.claude', 'skills', 'updating-armadillo', 'SKILL.md'), 'utf8'
    );
    assert.ok(content.includes('acceptEdits'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/bypass-detection.test.js`
Expected: FAIL — session-start.sh doesn't detect bypass, updating-armadillo still has stale reference

**Step 3: Commit**

```bash
git add tests/bypass-detection.test.js
git commit -m "test: add RED tests for bypass detection + stale reference"
```

---

### Task 6: GREEN — Create armadillo-shepherd skill + rename

This is the core rename. Create the new skill directory, write the full SKILL.md with routing table, update all references.

**Files:**
- Create: `.claude/skills/armadillo-shepherd/SKILL.md`
- Delete: `.claude/skills/using-armadillo/SKILL.md` (directory)
- Modify: `skills.json` — rename key + update files/description
- Modify: `.claude/hooks/session-start.sh` — reference armadillo-shepherd
- Modify: `.claude/CLAUDE.md` — update skill list
- Modify: `README.md` — update references

**Step 1: Create `.claude/skills/armadillo-shepherd/SKILL.md`**

Write the full routing table skill. Frontmatter:

```yaml
---
model: claude-sonnet-4-6
name: armadillo-shepherd
description: Active router — classifies every request and routes to the correct skill before any response
---
```

Body must include:
- EXTREMELY-IMPORTANT block requiring skill invocation
- Full routing table organized by category (Creative & Planning, Implementation, Completion & Delivery, Git & Workspace, Armadillo Meta, Testing Tools, Frontend, APIs & Services, Content & Creative)
- Hard rules: never respond before invoking, no summarizing/planning, two-skill collision = first one, unclear = ask ONE question then route
- Red flags table (same as using-armadillo but updated)
- Skill types section
- User instructions section

**Step 2: Delete using-armadillo directory**

```bash
rm -r .claude/skills/using-armadillo/
```

**Step 3: Update skills.json**

Replace `"using-armadillo"` key with `"armadillo-shepherd"`:
- Key: `"armadillo-shepherd"`
- Name: `"Armadillo Shepherd"`
- Description: `"Active router — classifies requests and routes to the correct skill"`
- Files: `["skills/armadillo-shepherd/SKILL.md"]`
- Bundle: `"core"`

In `bundles.core.skills` array: replace `"using-armadillo"` with `"armadillo-shepherd"`.

**Step 4: Update session-start.sh**

Change line 20 path from `skills/using-armadillo/SKILL.md` to `skills/armadillo-shepherd/SKILL.md`. Update variable names from `using_armadillo_*` to `shepherd_*`. Update the additionalContext message to reference `armadillo:armadillo-shepherd`.

**Step 5: Update CLAUDE.md**

In the Meta section, replace:
```
- **using-armadillo** — Discover and invoke skills
```
with:
```
- **armadillo-shepherd** — Active router — classifies requests and routes to the correct skill
```

**Step 6: Update README.md**

Replace all `using-armadillo` references with `armadillo-shepherd`. Update the skill table description.

**Step 7: Run tests to verify they pass**

Run: `node --test tests/shepherd-rename.test.js tests/shepherd-content.test.js`
Expected: PASS

Also run full suite: `node --test tests/*.test.js`
Expected: All pass (check that no other tests broke from the rename)

**Step 8: Commit**

```bash
git add .claude/skills/armadillo-shepherd/ skills.json .claude/hooks/session-start.sh .claude/CLAUDE.md README.md
git commit -m "feat: rename using-armadillo to armadillo-shepherd with full routing table"
```

---

### Task 7: GREEN — Enhance output-style.md with emojis + personality refactor

**Files:**
- Modify: `.claude/rules/output-style.md`

**Step 1: Add emoji visual hierarchy section**

After the existing "Severity" section, add a new section:

```markdown
## Visual Emoji

Selective emoji for visual hierarchy. Use sparingly — one per callout, not decoration.

| Emoji | Context |
|-------|---------|
| 🛡 | Armadillo brand moments, protection/guardrail callouts |
| 🚀 | Release, deploy, shipped |
| ⚡ | Performance, fast-path, speed |
| 🎯 | Precision, goal achieved, on-target |
| 🔥 | Completion, hot streak |
| 💡 | Insight, tip, non-obvious suggestion |
| 📋 | Checklist, plan, structured list |
| 🧪 | Test-related callouts |
| 🐛 | Bug found/identified |
| 🔧 | Fix, tool, configuration |
| 🔍 | Investigation, search, debugging |
```

**Step 2: Add category emoji section for skill announcements**

Update the "Skill Announcements" section to include category emoji prefixes:

```markdown
### Skill Announcement Category Emoji

Each skill category gets an emoji prefix in the announcement box:

| Emoji | Category | Skills |
|-------|----------|--------|
| 🧠 | Creative & Planning | brainstorming, writing-plans |
| ⚡ | Execution | executing-plans, subagent-driven-development, dispatching-parallel-agents |
| 🔧 | Implementation | test-driven-development |
| 🔍 | Debugging | systematic-debugging |
| 🚀 | Delivery | finishing-a-development-branch, writing-prs, verification-before-completion |
| 🛡 | Armadillo Meta | onboarding, updating-armadillo, writing-skills, armadillo-shepherd |
| 📋 | Review | requesting-code-review, receiving-code-review |

Example:
```
┏━ 🔍 systematic-debugging ━━━━━━━━━━━━━━━━━━━━━━┓
┃ Tracing null pointer in checkout flow           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
```

**Step 3: Expand personality/voice section**

Rewrite the Voice section to be more complete, add edge case guidance:

```markdown
## Voice

Succinct. Direct. Opinionated. The vibe: Tony Hawk if he got a CS degree and never stopped shredding. Short. Cool. Funny at the right times. Always helpful. Never lets anything slide. Always hella chill about it.

### Do
- State facts. Make recommendations. Skip pleasantries.
- Be confident — no hedging ("probably", "might", "seems like", "I think")
- Jump straight in — no narration ("Let me check...", "Now I'll...")
- Users are **Armadilloers**. The system is **armadillo** (always lowercase).

### Don't
- Perform enthusiasm: "Great!", "Perfect!", "Absolutely!", "Love it!"
- Narrate upcoming actions: "Let me take a look at...", "I'm going to..."
- Use filler transitions: "Alright, so...", "Now then...", "Moving on..."
- Hedge: "You might want to consider...", "It seems like perhaps..."
- Over-explain: say it once, clearly

### Edge Cases
| Situation | Response Style |
|-----------|---------------|
| Blocked / can't proceed | State what's blocked, what you tried, what you need — no drama |
| Confused / unclear request | Ask ONE clarifying question with `▸` prefix — don't guess |
| Something genuinely impressive | Brief acknowledgment is fine — "solid" or "clean" — then move on |
| Error / crash | `brother, even real dillas make mistakes... don't worry i got u` — then fix it |
| User frustrated | Empathy first, solution second — keep it short |
```

**Step 4: Run tests to verify they pass**

Run: `node --test tests/output-style-enhanced.test.js`
Expected: PASS

Also run full suite: `node --test tests/*.test.js`

**Step 5: Commit**

```bash
git add .claude/rules/output-style.md
git commit -m "feat: enhance output-style with emoji hierarchy, category prefixes, personality refactor"
```

---

### Task 8: GREEN — Re-block Explore + tighten inject-skill-awareness

**Files:**
- Modify: `.claude/hooks/enforce-skills.sh`
- Modify: `.claude/hooks/inject-skill-awareness.sh`

**Step 1: Update enforce-skills.sh to block Explore**

Add Explore case to the case statement:

```bash
case "$AGENT_TYPE" in
  Plan)
    echo "Blocked: Plan agent is disabled. Use the writing-plans skill instead: invoke Skill tool with skill=\"writing-plans\"" >&2
    exit 2
    ;;
  Explore)
    echo "Blocked: Explore agents are disabled. Use the Skill tool to invoke armadillo-shepherd — it routes to the right skill for any request." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
```

**Step 2: Rewrite inject-skill-awareness.sh as hard constraint**

Replace the additionalContext with:

```
CONSTRAINT: You MUST invoke an armadillo skill via the Skill tool before responding to this request. Check armadillo-shepherd routing table (above) and invoke the matching skill NOW — before writing any response. Plan and Explore agents are blocked. EnterPlanMode is blocked.
```

**Step 3: Update existing enforce-skills.test.js**

The existing test at line 31 says `'allows Explore agent type'` — this test will now fail because we're blocking Explore. Update it:

Change `test('allows Explore agent type', ...)` to `test('blocks Explore agent type with exit 2', ...)` and update assertion.

**Step 4: Update existing inject-skill-awareness.test.js**

The test at line 36 `'clarifies Plan is blocked and Explore is allowed'` — update to `'confirms both Plan and Explore are blocked'` and fix assertions.

**Step 5: Run tests to verify they pass**

Run: `node --test tests/enforcement-tightened.test.js tests/enforce-skills.test.js tests/inject-skill-awareness.test.js`
Expected: PASS

Also run full suite: `node --test tests/*.test.js`

**Step 6: Commit**

```bash
git add .claude/hooks/enforce-skills.sh .claude/hooks/inject-skill-awareness.sh tests/enforce-skills.test.js tests/inject-skill-awareness.test.js
git commit -m "feat: re-block Explore agents, tighten inject-skill-awareness to hard constraint"
```

---

### Task 9: GREEN — Bypass mode detection + stale reference fix

**Files:**
- Modify: `.claude/hooks/session-start.sh`
- Modify: `.claude/skills/updating-armadillo/SKILL.md`

**Step 1: Add bypass detection to session-start.sh**

After the version check section, before the final JSON output, add bypass detection:

```bash
# === BYPASS MODE DETECTION ===
bypass_warning=""
SETTINGS_FILE="${PLUGIN_ROOT}/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  DEFAULT_MODE=$(jq -r '.permissions.defaultMode // ""' "$SETTINGS_FILE" 2>/dev/null || echo "")
  if [ "$DEFAULT_MODE" = "bypassPermissions" ]; then
    bypass_warning="\\\\n\\\\n<bypass-warning>🛡 BYPASS MODE ACTIVE — all non-deny-listed Bash commands auto-approved.\\\\nDeny-list still enforced (force-push, reset --hard, rm -rf blocked).\\\\nTo return to safe mode: set defaultMode to \\\\\\\"acceptEdits\\\\\\\" in .claude/settings.json</bypass-warning>"
  fi
fi
```

Then append `${bypass_warning}` to the additionalContext string in the JSON output.

**Step 2: Fix stale reference in updating-armadillo/SKILL.md**

Line 450: Replace:
```
13. **bypassPermissions is the standard** — the installed settings.json ships with bypassPermissions + deny list for catastrophic commands; never prompt for routine Bash, Edit, or Write operations
```
with:
```
13. **acceptEdits is the default** — the installed settings.json ships with acceptEdits + allow-list for safe commands; users can opt into bypassPermissions for faster iteration with clear session-start warning
```

**Step 3: Run tests to verify they pass**

Run: `node --test tests/bypass-detection.test.js`
Expected: PASS

Also run full suite: `node --test tests/*.test.js`

**Step 4: Commit**

```bash
git add .claude/hooks/session-start.sh .claude/skills/updating-armadillo/SKILL.md
git commit -m "feat: add bypass mode detection in session-start, fix stale bypassPermissions reference"
```

---

### Task 10: Update README.md + hooks table + subagent-start.sh

**Files:**
- Modify: `README.md`
- Modify: `.claude/hooks/subagent-start.sh`

**Step 1: Update README Runtime Intelligence table**

Update the enforce-skills.sh row:
```
| **PreToolUse** | `enforce-skills.sh` | Blocks Plan and Explore agents (use skills). |
```

Update the inject-skill-awareness.sh row:
```
| **UserPromptSubmit** | `inject-skill-awareness.sh` | Hard constraint — skill invocation required before any response (fires **once** per session) |
```

Add bypass detection to session-start row:
```
| **SessionStart** | `session-start.sh` | Injects skill awareness, SWARM-STATE, error log, agent memory list; version check once per day; bypass mode warning |
```

**Step 2: Update subagent-start.sh**

Currently injects coding-standards + output-style. This is sufficient — the full output-style now includes all emoji and personality guidance. No code change needed, but verify the output-style content is complete by checking the file is being read correctly.

**Step 3: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README hooks table for enforcement changes"
```

---

### Task 11: Final verification + full test run

**Files:**
- All modified files

**Step 1: Run full test suite**

```bash
node --test tests/*.test.js
```

Expected: All pass (should be ~400+ tests)

**Step 2: Verify key behaviors manually**

```bash
# Verify enforce-skills blocks Explore
echo '{"tool_input":{"subagent_type":"Explore"}}' | bash .claude/hooks/enforce-skills.sh
# Expected: exit 2 with armadillo-shepherd redirect message

# Verify enforce-skills blocks Plan
echo '{"tool_input":{"subagent_type":"Plan"}}' | bash .claude/hooks/enforce-skills.sh
# Expected: exit 2 with writing-plans redirect message

# Verify enforce-skills allows general-purpose
echo '{"tool_input":{"subagent_type":"general-purpose"}}' | bash .claude/hooks/enforce-skills.sh
# Expected: exit 0

# Verify inject-skill-awareness has CONSTRAINT language
bash .claude/hooks/inject-skill-awareness.sh <<< '{}'
# Expected: JSON with CONSTRAINT in additionalContext

# Verify session-start references armadillo-shepherd
grep -c 'armadillo-shepherd' .claude/hooks/session-start.sh
# Expected: > 0

# Verify using-armadillo directory is gone
ls .claude/skills/using-armadillo/ 2>&1
# Expected: No such file or directory

# Verify armadillo-shepherd exists
ls .claude/skills/armadillo-shepherd/SKILL.md
# Expected: file exists
```

**Step 3: Commit if any fixes needed**

Only commit if Step 2 revealed issues requiring fixes.

---

### Task 12: Finish development branch

**REQUIRED SUB-SKILL:** Use armadillo:finishing-a-development-branch

Follow that skill to:
1. Verify all tests pass
2. Auto-generate CHANGELOG.json entries
3. Present 3 options (PR, keep, discard)
4. Execute chosen option
