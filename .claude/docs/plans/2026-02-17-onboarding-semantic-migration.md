# Onboarding Semantic Migration Design

**Date:** 2026-02-17

## Problem

The onboarding skill's Phase 1 classification is entirely path/name-based. It only promotes a file to Bucket A (auto-upgrade) if its path matches an armadillo file in `skills.json`. The skill says "read before classifying" but the actual classification rules never use content for semantic matching.

Result: a project with a `skills/commit-helper/` skill that does exactly what `finishing-a-development-branch` does gets sent to Phase 3 for a user decision, instead of being silently replaced. The folder infrastructure may also be in a non-standard layout that breaks armadillo tooling.

## Goal

Make migration aggressive and intelligent:
- Semantic content matching replaces name matching as the primary classification signal
- Unique content extracted from partial matches is fully handled (not just noted)
- Folder structure is normalized to match armadillo's expected layout
- Only files with zero armadillo equivalent ever reach Phase 3

## Design

### Phase 1 — Two-Pass Classification

**Pass 1 (path-based, unchanged):** Any file whose path matches an armadillo path in `skills.json` → Bucket A. Fast, no reading needed.

**Pass 2 (semantic, new):** For each remaining Bucket B candidate, read its full content and compare against armadillo skill/agent descriptions (from `skills.json` descriptions and fetched SKILL.md files). Ask: *"Does this file's core purpose overlap with any armadillo skill?"*

- **Full match:** Core function is 100% covered by an armadillo skill → promote to Bucket A, label with armadillo equivalent, no unique content to extract.
- **Partial match:** Core function is covered but file has additional unique behavior → promote to Bucket A, label with armadillo equivalent, extract unique content into a "dropped content buffer" for Phase 2 processing.
- **No match:** File does something armadillo has no equivalent for → stays Bucket B.

**Summary table gains a new section:**

```
### Semantic Match → Auto-Upgrade:
- skills/commit-helper/SKILL.md → finishing-a-development-branch
  (unique content: Heroku deploy commands, Slack notification step)
- agents/reviewer.md → code-reviewer.md
  (identical function, nothing unique)
```

### Phase 2 — Auto-Upgrade + Structural Normalization + Dropped Content

After installing armadillo files:

**Structural normalization:**
1. Delete misplaced originals — when a file was promoted to Bucket A (path or semantic), delete it from wherever it lived. A `skills/commit-helper/` directory gets deleted entirely, not left as a ghost.
2. Fix non-standard directories — `custom-skills/`, `scripts/`, stray `.md` files in `.claude/` root, etc. Bucket B files in wrong locations get moved to correct armadillo paths (e.g., `.claude/my-skill.md` → `.claude/skills/my-skill/SKILL.md`).
3. Prune empty directories after all moves/deletes.

**Dropped content processing (new):**
For each unique snippet in the dropped content buffer, Claude determines the right home:

| Unique content type | Action |
|---------------------|--------|
| Project-specific workflow | Write a custom skill via writing-skills TDD |
| One-liner command or convention | Add to project-specific CLAUDE.md section |
| Protection/enforcement behavior | Write a hook, wire into hooks.json |
| Reference information (endpoints, env vars) | Write to `.claude/docs/` |
| Trivial/redundant (armadillo already covers it) | Discard silently |

No user prompting — Claude makes the call. If a snippet is genuinely ambiguous (can't confidently categorize it), surface it as a Bucket B item for Phase 3.

All custom artifacts created here get tracked in the manifest as `owner: "user"`.

### Phase 3 — True Bucket B Only

After Phase 2, Phase 3 only contains files with zero armadillo equivalent. No leftovers from semantic matches. The walkthrough is focused and minimal.

## What Doesn't Change

- Phase 0 (detect state) — unchanged
- Phase 3 walk-through logic (per-item AskUserQuestion) — unchanged
- Phase 4 (rebuild kept customs) — unchanged
- Phase 5 (clean slate, manifest, CLAUDE.md, hooks wiring) — unchanged
- Phase 6 (fresh install project analysis) — unchanged
- All Key Rules and Common Mistakes — unchanged (enhanced by this design)

## Files to Change

- `.claude/skills/onboarding/SKILL.md` — update Phase 1 classification rules and Phase 2 to add semantic pass, structural normalization, and dropped content processing
