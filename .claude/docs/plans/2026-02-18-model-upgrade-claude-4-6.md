# Model Upgrade to Claude 4.6 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Update all Claude model assignments across both the nirvana-pmu and armadillo-cli codebases to use explicit Claude 4.6-era model IDs instead of short aliases (`sonnet`, `opus`, `inherit`).

**Model Framework (exact model IDs):**

| Tier | Model ID | Use Cases |
|------|----------|-----------|
| **Opus 4.6** | `claude-opus-4-6` | Onboarding, updating-armadillo, writing-plans, systematic-debugging, writing-skills, dispatching-parallel-agents, receiving-code-review, reviewer/planner/debugger agents, brand auditing |
| **Sonnet 4.6** | `claude-sonnet-4-6` | ALL coding/implementation, content creation, API-heavy work, domain experts, content agents |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Drift-check, render-variants, batch/scanning, mechanical hooks |

**Repos:**
- Nirvana-PMU: `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu`
- Armadillo-CLI: `/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli`

---

## Parallel Group A: Nirvana Agent Files (Tasks 1-4)

These four tasks are independent and can be dispatched in parallel.

---

### Task 1: Nirvana Agents — Opus Tier (7 files)

**Files (all in `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/.claude/agents/`):**
- `orchestrator.md`
- `planner.md`
- `reviewer.md`
- `debugger.md`
- `google-docs-verifier.md`
- `meta-docs-verifier.md`
- `verifier.md`

**Action:** In each file, find the `model:` line in the YAML frontmatter and replace the value.

**Exact changes:**

**`orchestrator.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`planner.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`reviewer.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`debugger.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`google-docs-verifier.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`meta-docs-verifier.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`verifier.md`** — Change `model: opus` to `model: claude-opus-4-6`:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**Verification:** After edits, run:
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
for f in .claude/agents/{orchestrator,planner,reviewer,debugger,google-docs-verifier,meta-docs-verifier,verifier}.md; do
  echo "=== $f ==="; grep '^model:' "$f"
done
```
Expected: all 7 show `model: claude-opus-4-6`

---

### Task 2: Nirvana Agents — Sonnet Tier (14 files)

**Files (all in `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/.claude/agents/`):**
- `acuity-expert.md`
- `ads-pipeline.md`
- `analytics-expert.md`
- `api-reviewer.md`
- `astro-expert.md`
- `cloudinary-expert.md`
- `content-writer.md`
- `email-expert.md`
- `facebook-pixel-expert.md`
- `illustrator.md`
- `meta-ads-expert.md`
- `pinterest-expert.md`
- `posthog-expert.md`
- `remotion-expert.md`

**Action:** In each file, find the `model:` line in the YAML frontmatter and replace the value.

**Exact change for all 14 files:**
```yaml
# Find:
model: sonnet
# Replace with:
model: claude-sonnet-4-6
```

**Verification:** After edits, run:
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
for f in .claude/agents/{acuity-expert,ads-pipeline,analytics-expert,api-reviewer,astro-expert,cloudinary-expert,content-writer,email-expert,facebook-pixel-expert,illustrator,meta-ads-expert,pinterest-expert,posthog-expert,remotion-expert}.md; do
  echo "=== $f ==="; grep '^model:' "$f"
done
```
Expected: all 14 show `model: claude-sonnet-4-6`

---

### Task 3: Nirvana Agents — Special Cases (6 files)

**Files (all in `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/.claude/agents/`):**

These agents currently use special model values or need tier reassignment per the framework.

**`seo-specialist.md`** — Currently `model: opus`. Per framework, SEO is domain-expert implementation work, but the user listed it under Opus for "brand auditing". Keep Opus:
```yaml
# Find:
model: opus
# Replace with:
model: claude-opus-4-6
```

**`supercut-generator.md`** — Currently `model: opus`. This is a content/creative agent. Per framework, content creation uses Sonnet:
```yaml
# Find:
model: opus
# Replace with:
model: claude-sonnet-4-6
```

**`health-monitor.md`** — Currently `model: sonnet`. Health monitoring is batch/scanning work. Per framework, use Haiku:
```yaml
# Find:
model: sonnet
# Replace with:
model: claude-haiku-4-5-20251001
```

**`style-expert.md`** — Currently `model: sonnet`. Implementation/coding agent:
```yaml
# Find:
model: sonnet
# Replace with:
model: claude-sonnet-4-6
```

**`claude-code-guide.md`** — Currently `model: inherit`. This is a reference/knowledge agent. Keep as inherit (it follows the parent model):
```yaml
# No change needed — keep model: inherit
```

**`code-reviewer.md`** — Currently `model: inherit`. This is the shared armadillo code-reviewer agent. Keep inherit (inherits from invoking agent):
```yaml
# No change needed — keep model: inherit
```

**Verification:** After edits, run:
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
for f in .claude/agents/{seo-specialist,supercut-generator,health-monitor,style-expert,claude-code-guide,code-reviewer}.md; do
  echo "=== $f ==="; grep '^model:' "$f"
done
```
Expected:
- `seo-specialist.md` -> `model: claude-opus-4-6`
- `supercut-generator.md` -> `model: claude-sonnet-4-6`
- `health-monitor.md` -> `model: claude-haiku-4-5-20251001`
- `style-expert.md` -> `model: claude-sonnet-4-6`
- `claude-code-guide.md` -> `model: inherit` (unchanged)
- `code-reviewer.md` -> `model: inherit` (unchanged)

---

### Task 4: Nirvana skills.json — Add Model Fields

**File:** `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/.claude/skills.json`

**Action:** Add a `"model"` field to every skill entry in the `"skills"` object. The model is determined by which agent the skill uses and the nature of the work.

**Model assignment per skill:**

| Skill | Agent | Model ID |
|-------|-------|----------|
| `add-blog-post` | content-writer | `claude-sonnet-4-6` |
| `add-location` | seo-specialist | `claude-opus-4-6` |
| `add-service` | content-writer | `claude-sonnet-4-6` |
| `add-testimonial` | content-writer | `claude-sonnet-4-6` |
| `add-illustrations` | illustrator | `claude-sonnet-4-6` |
| `create-supercut` | supercut-generator | `claude-sonnet-4-6` |
| `create-template` | remotion-expert | `claude-sonnet-4-6` |
| `ingest-content` | content-writer | `claude-sonnet-4-6` |
| `brand` | content-writer | `claude-sonnet-4-6` |
| `seo-flow` | seo-specialist | `claude-opus-4-6` |
| `seo-pulse` | seo-specialist | `claude-opus-4-6` |
| `search-rank` | analytics-expert | `claude-sonnet-4-6` |
| `link-analysis` | seo-specialist | `claude-opus-4-6` |
| `site-report` | health-monitor | `claude-haiku-4-5-20251001` |
| `drift-check` | health-monitor | `claude-haiku-4-5-20251001` |
| `local-seo-audit` | seo-specialist | `claude-opus-4-6` |
| `ads` | analytics-expert | `claude-sonnet-4-6` |
| `meta-ads` | meta-ads-expert | `claude-sonnet-4-6` |
| `meta-audiences` | meta-ads-expert | `claude-sonnet-4-6` |
| `meta-conversions` | facebook-pixel-expert | `claude-sonnet-4-6` |
| `pinterest-ads` | pinterest-expert | `claude-sonnet-4-6` |
| `ad-assets` | ads-pipeline | `claude-sonnet-4-6` |
| `render-video` | remotion-expert | `claude-sonnet-4-6` |
| `render-static-ad` | remotion-expert | `claude-sonnet-4-6` |
| `render-variants` | remotion-expert | `claude-haiku-4-5-20251001` |
| `upload-gdrive` | (none) | `claude-haiku-4-5-20251001` |
| `verify-meta-auth` | meta-ads-expert | `claude-sonnet-4-6` |
| `meta-api-reference` | meta-ads-expert, facebook-pixel-expert | `claude-sonnet-4-6` |
| `google-ads-api-reference` | analytics-expert | `claude-sonnet-4-6` |
| `pinterest-api-reference` | pinterest-expert | `claude-sonnet-4-6` |
| `cloudinary-reference` | cloudinary-expert, ads-pipeline | `claude-sonnet-4-6` |
| `posthog-reference` | posthog-expert | `claude-sonnet-4-6` |
| `acuity-reference` | acuity-expert | `claude-sonnet-4-6` |
| `resend-reference` | email-expert | `claude-sonnet-4-6` |
| `vercel` | (none) | `claude-sonnet-4-6` |
| `deps` | (none) | `claude-sonnet-4-6` |
| `cleanup` | (none) | `claude-sonnet-4-6` |
| `safe-merge` | reviewer | `claude-opus-4-6` |
| `test-debug` | debugger | `claude-opus-4-6` |
| `audit-issues` | (none) | `claude-sonnet-4-6` |

**Exact change pattern:** For each skill entry, add a `"model"` field after `"bundle"`. Example:

Before:
```json
"add-blog-post": {
  "name": "Add Blog Post",
  "description": "Create SEO-optimized blog posts with Dan Henry framework",
  "files": ["skills/add-blog-post/SKILL.md"],
  "agents": ["agents/content-writer.md"],
  "bundle": "nirvana-content"
},
```

After:
```json
"add-blog-post": {
  "name": "Add Blog Post",
  "description": "Create SEO-optimized blog posts with Dan Henry framework",
  "files": ["skills/add-blog-post/SKILL.md"],
  "agents": ["agents/content-writer.md"],
  "bundle": "nirvana-content",
  "model": "claude-sonnet-4-6"
},
```

Apply this pattern to ALL 40 skills in the file using the model assignments from the table above.

**Verification:** After edits, run:
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
node -e "const s=require('./.claude/skills.json'); console.log('Valid JSON'); const skills=s.skills; Object.keys(skills).forEach(k => console.log(k, '->', skills[k].model || 'MISSING'))"
```
Expected: valid JSON, every skill shows its model ID, zero `MISSING` entries.

---

## Parallel Group B: Nirvana CLAUDE.md + Armadillo Agents (Tasks 5-7)

These three tasks are independent and can be dispatched in parallel. They can also run in parallel with Group A.

---

### Task 5: Nirvana CLAUDE.md — Update Model Selection Section

**File:** `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/CLAUDE.md`

**Action:** Replace the existing "Model Selection" section (lines 227-233) with the updated framework using exact model IDs.

**Find this block (lines 227-233):**
```markdown
## Model Selection

Agents and skills specify their own models. Quality over cost:

- **Opus**: Critical reasoning (reviewer, planner, debugger, orchestrator, doc verifiers, SEO, auditor)
- **Sonnet**: Standard work (domain experts, content, implementation, verification)
- **Haiku**: Mechanical tasks (drift-check, dashboard interfaces, rendering, CLI wrappers)
```

**Replace with:**
```markdown
## Model Selection

Agents and skills specify their own `model:` field. Quality over cost. Never override via Task tool `model` parameter.

| Tier | Model ID | Agents | Skills |
|------|----------|--------|--------|
| **Opus 4.6** | `claude-opus-4-6` | orchestrator, planner, reviewer, debugger, verifier, seo-specialist, google-docs-verifier, meta-docs-verifier | writing-plans, seo-flow, seo-pulse, link-analysis, local-seo-audit, add-location, safe-merge, test-debug |
| **Sonnet 4.6** | `claude-sonnet-4-6` | acuity-expert, ads-pipeline, analytics-expert, api-reviewer, astro-expert, cloudinary-expert, content-writer, email-expert, facebook-pixel-expert, illustrator, meta-ads-expert, pinterest-expert, posthog-expert, remotion-expert, style-expert, supercut-generator | add-blog-post, add-service, add-testimonial, add-illustrations, create-supercut, create-template, ingest-content, brand, search-rank, ads, meta-ads, meta-audiences, meta-conversions, pinterest-ads, ad-assets, render-video, render-static-ad, verify-meta-auth, all reference skills, vercel, deps, cleanup, audit-issues |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | health-monitor | drift-check, site-report, render-variants, upload-gdrive |
```

**Verification:** Read the file and confirm the table renders correctly.

---

### Task 6: Armadillo Agents — Update Model Fields (7 files)

**Files (all in `/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/agents/`):**

All 7 armadillo agents currently use `model: inherit`. Update them to explicit model IDs per the framework.

**`brand-strategist.md`** — Brand auditing work. Per framework, use Opus:
```yaml
# Find:
model: inherit
# Replace with:
model: claude-opus-4-6
```

**`code-reviewer.md`** — Review/quality work. Per framework, use Opus:
```yaml
# Find:
model: inherit
# Replace with:
model: claude-opus-4-6
```

**`claude-code-guide.md`** — Reference/knowledge agent. Keep inherit (follows parent):
```yaml
# No change needed — keep model: inherit
```

**`ascii-art-creator.md`** — Creative content agent. Use Sonnet:
```yaml
# Find:
model: inherit
# Replace with:
model: claude-sonnet-4-6
```

**`duda-migration-agent.md`** — Implementation/coding work. Use Sonnet:
```yaml
# Find:
model: inherit
# Replace with:
model: claude-sonnet-4-6
```

**`google-api-guide.md`** — Reference/knowledge agent. Keep inherit (follows parent):
```yaml
# No change needed — keep model: inherit
```

**`remotion-creator.md`** — Implementation/coding work. Use Sonnet:
```yaml
# Find:
model: inherit
# Replace with:
model: claude-sonnet-4-6
```

**Verification:** After edits, run:
```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli"
for f in .claude/agents/*.md; do
  echo "=== $(basename "$f") ==="; grep '^model:' "$f"
done
```
Expected:
- `ascii-art-creator.md` -> `model: claude-sonnet-4-6`
- `brand-strategist.md` -> `model: claude-opus-4-6`
- `claude-code-guide.md` -> `model: inherit`
- `code-reviewer.md` -> `model: claude-opus-4-6`
- `duda-migration-agent.md` -> `model: claude-sonnet-4-6`
- `google-api-guide.md` -> `model: inherit`
- `remotion-creator.md` -> `model: claude-sonnet-4-6`

---

### Task 7: Armadillo Skills — Add Model Requirement Lines

**Action:** Add a `**Model requirement:**` line to key SKILL.md files. The onboarding skill already has this line (use it as the template). Add the line right after the `**Announce at start:**` line, or after the first paragraph of the `## Overview` section if there is no announce line.

**Files and exact additions:**

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md`** — Already has the line. No change needed. Verify it says:
```
**Model requirement:** This skill involves deep classification and thinking. Use **Opus 4.6** (`claude-opus-4-6`) for any subagent dispatches.
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/updating-armadillo/SKILL.md`** — Add after the announce line or first paragraph:
```
**Model requirement:** This skill involves version comparison and upgrade decisions. Use **Opus 4.6** (`claude-opus-4-6`).
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/writing-plans/SKILL.md`** — Add after the announce line:
```
**Model requirement:** Planning requires deep reasoning about architecture and dependencies. Use **Opus 4.6** (`claude-opus-4-6`).
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/systematic-debugging/SKILL.md`** — Add after the overview paragraph:
```
**Model requirement:** Root cause analysis requires deep reasoning. Use **Opus 4.6** (`claude-opus-4-6`).
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/writing-skills/SKILL.md`** — Add after the overview section opener:
```
**Model requirement:** Skill authoring requires understanding persuasion principles and constraint design. Use **Opus 4.6** (`claude-opus-4-6`).
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/dispatching-parallel-agents/SKILL.md`** — Add after the overview:
```
**Model requirement:** Parallel dispatch coordination requires careful dependency analysis. Use **Opus 4.6** (`claude-opus-4-6`).
```

**`/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/receiving-code-review/SKILL.md`** — Add after the overview:
```
**Model requirement:** Processing review feedback requires nuanced technical judgment. Use **Opus 4.6** (`claude-opus-4-6`).
```

**Detailed instructions for each file:**

For `updating-armadillo/SKILL.md`, read the file first to find the exact insertion point. Add the model requirement line as a new line after the `**Announce at start:**` line (or after the first paragraph of `## Overview` if no announce line exists).

For `writing-plans/SKILL.md`, insert after line 14 (`**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."`):
```

**Model requirement:** Planning requires deep reasoning about architecture and dependencies. Use **Opus 4.6** (`claude-opus-4-6`).
```

For `systematic-debugging/SKILL.md`, insert after line 14 (`**Violating the letter of this process is violating the spirit of debugging.**`):
```

**Model requirement:** Root cause analysis requires deep reasoning. Use **Opus 4.6** (`claude-opus-4-6`).
```

For `dispatching-parallel-agents/SKILL.md`, insert after line 10 (the overview paragraph):
```

**Model requirement:** Parallel dispatch coordination requires careful dependency analysis. Use **Opus 4.6** (`claude-opus-4-6`).
```

For `receiving-code-review/SKILL.md`, read the file first to find the exact insertion point after the overview section.

For `writing-skills/SKILL.md`, read the file first to find the exact insertion point after the overview section.

**Verification:** After edits, run:
```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli"
for skill in onboarding updating-armadillo writing-plans systematic-debugging writing-skills dispatching-parallel-agents receiving-code-review; do
  echo "=== $skill ==="; grep -n "Model requirement" ".claude/skills/$skill/SKILL.md" || echo "(MISSING)"
done
```
Expected: all 7 show a `**Model requirement:**` line with the correct model ID.

---

## Parallel Group C: Armadillo CLAUDE.md + Validation (Tasks 8-9)

These can run after Groups A and B complete (Task 9 depends on all prior tasks).

---

### Task 8: Armadillo CLAUDE.md — Add Model Selection Section

**File:** `/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/CLAUDE.md`

**Action:** Add a "Model Selection" section inside the `<!-- armadillo:start -->` block, right before the closing `<!-- armadillo:end -->` tag.

**Find this block:**
```markdown
## Rules

@.claude/rules/coding-standards.md
@.claude/rules/git-workflow.md
<!-- armadillo:end -->
```

**Replace with:**
```markdown
## Rules

@.claude/rules/coding-standards.md
@.claude/rules/git-workflow.md

## Model Selection

Agents and skills specify their own `model:` field. Never override via Task tool `model` parameter.

| Tier | Model ID | Use Cases |
|------|----------|-----------|
| **Opus 4.6** | `claude-opus-4-6` | Onboarding, updating-armadillo, writing-plans, systematic-debugging, writing-skills, dispatching-parallel-agents, receiving-code-review, code-reviewer, brand-strategist |
| **Sonnet 4.6** | `claude-sonnet-4-6` | Implementation, content creation, API work, domain experts (ascii-art-creator, duda-migration-agent, remotion-creator) |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Mechanical tasks, batch scanning, rendering |
| **Inherit** | `inherit` | Reference/knowledge agents that follow the invoking agent's model (claude-code-guide, google-api-guide) |
<!-- armadillo:end -->
```

**Verification:** Read the file and confirm the section appears correctly inside the armadillo block.

---

### Task 9: Validation — Parse All Modified Files

**Action:** Run validation commands to confirm all JSON/YAML files parse correctly.

**Step 1: Validate nirvana skills.json:**
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
node -e "JSON.parse(require('fs').readFileSync('.claude/skills.json','utf8')); console.log('skills.json: VALID')"
```

**Step 2: Validate all nirvana agent frontmatter parses (check YAML `---` blocks):**
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
for f in .claude/agents/*.md; do
  model=$(grep -m1 '^model:' "$f" | awk '{print $2}')
  if [ -z "$model" ]; then
    echo "FAIL: $(basename "$f") - no model field"
  else
    echo "OK: $(basename "$f") -> $model"
  fi
done
```

**Step 3: Validate all armadillo agent frontmatter:**
```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli"
for f in .claude/agents/*.md; do
  model=$(grep -m1 '^model:' "$f" | awk '{print $2}')
  if [ -z "$model" ]; then
    echo "FAIL: $(basename "$f") - no model field"
  else
    echo "OK: $(basename "$f") -> $model"
  fi
done
```

**Step 4: Validate model IDs are from the allowed set:**
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
for f in .claude/agents/*.md; do
  model=$(grep -m1 '^model:' "$f" | awk '{print $2}')
  case "$model" in
    claude-opus-4-6|claude-sonnet-4-6|claude-haiku-4-5-20251001|inherit) echo "OK: $(basename "$f") -> $model" ;;
    *) echo "INVALID: $(basename "$f") -> $model" ;;
  esac
done
```

```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli"
for f in .claude/agents/*.md; do
  model=$(grep -m1 '^model:' "$f" | awk '{print $2}')
  case "$model" in
    claude-opus-4-6|claude-sonnet-4-6|claude-haiku-4-5-20251001|inherit) echo "OK: $(basename "$f") -> $model" ;;
    *) echo "INVALID: $(basename "$f") -> $model" ;;
  esac
done
```

**Step 5: Validate skills.json model field completeness:**
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
node -e "
const s = JSON.parse(require('fs').readFileSync('.claude/skills.json','utf8'));
const skills = s.skills;
let pass = 0, fail = 0;
for (const [k,v] of Object.entries(skills)) {
  if (!v.model) { console.log('MISSING:', k); fail++; }
  else if (!['claude-opus-4-6','claude-sonnet-4-6','claude-haiku-4-5-20251001'].includes(v.model)) {
    console.log('INVALID:', k, '->', v.model); fail++;
  } else { pass++; }
}
console.log('Result:', pass, 'pass,', fail, 'fail');
if (fail > 0) process.exit(1);
"
```

Expected: all validations pass, zero INVALID or MISSING entries.

---

## Sequential Group D: Commits (Task 10)

This runs after ALL previous tasks are complete and validated.

---

### Task 10: Commit Changes

**Step 1: Commit nirvana-pmu changes:**
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu
git add \
  .claude/agents/orchestrator.md \
  .claude/agents/planner.md \
  .claude/agents/reviewer.md \
  .claude/agents/debugger.md \
  .claude/agents/google-docs-verifier.md \
  .claude/agents/meta-docs-verifier.md \
  .claude/agents/verifier.md \
  .claude/agents/acuity-expert.md \
  .claude/agents/ads-pipeline.md \
  .claude/agents/analytics-expert.md \
  .claude/agents/api-reviewer.md \
  .claude/agents/astro-expert.md \
  .claude/agents/cloudinary-expert.md \
  .claude/agents/content-writer.md \
  .claude/agents/email-expert.md \
  .claude/agents/facebook-pixel-expert.md \
  .claude/agents/illustrator.md \
  .claude/agents/meta-ads-expert.md \
  .claude/agents/pinterest-expert.md \
  .claude/agents/posthog-expert.md \
  .claude/agents/remotion-expert.md \
  .claude/agents/seo-specialist.md \
  .claude/agents/supercut-generator.md \
  .claude/agents/health-monitor.md \
  .claude/agents/style-expert.md \
  .claude/skills.json \
  CLAUDE.md

git commit -m "$(cat <<'EOF'
feat(agents): upgrade all model assignments to Claude 4.6 model IDs

Replace short model aliases (opus, sonnet) with explicit model IDs
(claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001).
Add model field to all skills.json entries. Update Model Selection
table in CLAUDE.md with exact model IDs and agent/skill mappings.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Step 2: Commit armadillo-cli changes:**
```bash
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli"
git add \
  .claude/agents/ascii-art-creator.md \
  .claude/agents/brand-strategist.md \
  .claude/agents/code-reviewer.md \
  .claude/agents/duda-migration-agent.md \
  .claude/agents/remotion-creator.md \
  .claude/skills/onboarding/SKILL.md \
  .claude/skills/updating-armadillo/SKILL.md \
  .claude/skills/writing-plans/SKILL.md \
  .claude/skills/systematic-debugging/SKILL.md \
  .claude/skills/writing-skills/SKILL.md \
  .claude/skills/dispatching-parallel-agents/SKILL.md \
  .claude/skills/receiving-code-review/SKILL.md \
  .claude/CLAUDE.md

git commit -m "$(cat <<'EOF'
feat(agents,skills): upgrade model assignments to Claude 4.6 model IDs

Replace inherit with explicit model IDs for agents that need pinned
models (brand-strategist, code-reviewer -> opus; ascii-art-creator,
duda-migration-agent, remotion-creator -> sonnet). Add Model
requirement lines to 7 key skill files. Add Model Selection table
to CLAUDE.md.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Verification:** After both commits:
```bash
cd /Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu && git log --oneline -1
cd "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli" && git log --oneline -1
```

---

## Summary

| Group | Tasks | Parallelizable | Est. Time |
|-------|-------|---------------|-----------|
| **A** | Tasks 1-4 (nirvana agents + skills.json) | Yes, all 4 in parallel | 3-5 min each |
| **B** | Tasks 5-7 (nirvana CLAUDE.md + armadillo agents + skills) | Yes, all 3 in parallel | 2-4 min each |
| **C** | Tasks 8-9 (armadillo CLAUDE.md + validation) | Task 8 parallel with A/B, Task 9 after all | 2-3 min each |
| **D** | Task 10 (commits) | Sequential after all above | 2 min |

**Total estimated time:** 15-20 minutes with parallel execution.

**Files modified:**
- Nirvana: 25 agent files + 1 skills.json + 1 CLAUDE.md = **27 files**
- Armadillo: 5 agent files + 7 SKILL.md files + 1 CLAUDE.md = **13 files**
- **Grand total: 40 files**
