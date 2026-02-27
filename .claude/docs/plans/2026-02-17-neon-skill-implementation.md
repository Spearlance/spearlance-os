# Neon Serverless Postgres Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create a reference skill for Neon serverless Postgres with MCP configuration guide, covering the full platform (API, serverless driver, branching, autoscaling, connection pooling, pricing).

**Architecture:** Two-file reference skill (SKILL.md + reference.md) following the Stripe pattern. No custom agent — Neon's official MCP server handles live operations. New `database` bundle in skills.json.

**Tech Stack:** Markdown documentation, web research (WebSearch/WebFetch), subagent testing

**Design doc:** `.claude/docs/plans/2026-02-17-neon-skill-design.md`

---

### Task 1: Web Research — Verify All Facts

This is a reference skill. Training data produces plausible-but-wrong information. Research is mandatory BEFORE writing anything.

**Files:**
- Create: `skills/neon/research-notes.md` (temporary, deleted after skill is written)

**Step 1: Search for current Neon API state**

Use WebSearch with these queries (run in parallel):
- `"Neon serverless postgres" API changelog 2025 2026`
- `"Neon" pricing tiers 2026`
- `"Neon MCP server" setup configuration claude`
- `"@neondatabase/serverless" npm latest version`
- `"Neon" rate limits API quota`
- `"Neon" branching database copy-on-write`

**Step 2: Verify specific facts with WebFetch**

Fetch these official docs pages:
- `https://neon.tech/docs/introduction` — overview, current features
- `https://neon.tech/docs/get-started-with-neon/connect-neon` — connection setup
- `https://neon.tech/pricing` — current pricing tiers and limits
- `https://neon.tech/docs/serverless/serverless-driver` — driver API surface
- `https://neon.tech/docs/introduction/branching` — branching architecture
- `https://neon.tech/docs/reference/api-reference` — API endpoints
- `https://neon.tech/docs/ai/ai-concepts` — MCP and AI integration

**Step 3: Document verified facts**

Write `skills/neon/research-notes.md` with verified values for:
- [ ] API base URL and current version
- [ ] Authentication method (API key format, where to get it)
- [ ] Rate limits (requests/min, burst)
- [ ] Pricing tiers (exact names, CU rates, storage limits, free tier limits)
- [ ] Serverless driver package name and latest version
- [ ] MCP server URL and setup methods (OAuth vs API key)
- [ ] Branching: copy-on-write behavior, branch limits per tier
- [ ] Compute: CU definition, autoscaling range, scale-to-zero defaults
- [ ] Connection pooling: PgBouncer config, pooled vs direct strings
- [ ] SDKs: package names and versions (TypeScript, Python, Go)
- [ ] Any deprecations or breaking changes in last 6 months
- [ ] `@neondatabase/toolkit` package purpose and API

For each fact, note the source URL. Flag anything you couldn't verify with `(UNVERIFIED - as of [date])`.

**Step 4: Commit research notes**

```bash
git add skills/neon/research-notes.md
git commit -m "research: verify Neon platform facts for reference skill"
```

---

### Task 2: RED Phase — Baseline Test (Without Skill)

Test what agents get wrong about Neon without the skill. This establishes what value the skill needs to add.

**Files:**
- Create: `skills/neon/test-baseline.md`

**Step 1: Run 4 baseline queries with subagents**

Dispatch 4 subagents (Task tool, model: haiku) WITHOUT any Neon skill loaded. Each gets one question:

**Query 1: MCP Setup**
```
Prompt: "I want to use Neon's MCP server with Claude Code. How do I set it up?
Give me the exact configuration I need to add to my settings."
```

**Query 2: Serverless Driver — HTTP vs WebSocket**
```
Prompt: "I'm using @neondatabase/serverless in a Next.js app. When should I use
HTTP mode vs WebSocket mode? Show me code examples of each."
```

**Query 3: Pricing and Free Tier**
```
Prompt: "What are Neon's current pricing tiers? What are the exact free tier
limits? I need to know CU-hour rates, storage limits, and project limits."
```

**Query 4: Preview Branch Workflow**
```
Prompt: "How do I create a Neon branch for each PR as a preview environment?
Show me the API calls or CLI commands and how to clean up after merge."
```

Run all 4 in parallel.

**Step 2: Document baseline results**

For each query, record in `skills/neon/test-baseline.md`:
- What the agent said (summary, not full transcript)
- What was correct
- What was wrong or missing
- What was hedged ("I think", "probably", "might be")

**Step 3: Identify patterns**

At the bottom of test-baseline.md, list:
- Facts consistently wrong across queries
- Knowledge gaps (things agents don't know at all)
- Hedged facts (agents uncertain about)
- These are what the skill MUST address

**Step 4: Commit baseline**

```bash
git add skills/neon/test-baseline.md
git commit -m "test: RED phase baseline for Neon reference skill"
```

---

### Task 3: GREEN Phase — Write SKILL.md

Write the concise entry point. Must be <100 lines. Reference research-notes.md for all facts — do NOT rely on training data.

**Files:**
- Create: `skills/neon/SKILL.md`
- Reference: `skills/neon/research-notes.md` (read for verified facts)

**Step 1: Write SKILL.md**

Follow this exact structure (adapted from Stripe pattern):

```markdown
---
name: neon
description: Use when working with Neon serverless Postgres — project setup, branching,
  connection pooling, autoscaling, serverless driver, or MCP configuration
---

# Neon

## Overview
Serverless Postgres with instant branching, autoscaling, and scale-to-zero.
[1 sentence on key differentiator from research]

## Quick Reference

| Item | Value |
|------|-------|
| **API Base** | `https://console.neon.tech/api/v2/` |
| **Auth** | Bearer token (API key from Neon Console) |
| **MCP Server** | `https://mcp.neon.tech/sse` |
| **Node.js Driver** | `@neondatabase/serverless` |
| **AI Toolkit** | `@neondatabase/toolkit` |
| **Rate Limits** | [VERIFIED VALUE from research] |

## MCP Setup

### Option 1: OAuth (Recommended)
[Exact steps from research — neonctl or neon-mcp-server setup]

### Option 2: API Key
[Claude Code settings.json snippet with exact JSON from research]

## Authentication

[Connection string format]
[3-5 line code example for serverless driver — from research]

## Common Operations

**Create a project:**
[Code snippet from verified API docs]

**Query with serverless driver (HTTP mode):**
[Code snippet — use neon() function]

**Create a branch:**
[Code snippet or API call]

## Branching

Copy-on-write database clones. [Key facts from research: instant, point-in-time, WAL-based].

## Pricing

| Tier | CU Rate | Storage | Key Limits |
|------|---------|---------|------------|
| Free | [VERIFIED] | [VERIFIED] | [VERIFIED] |
| Launch | [VERIFIED] | [VERIFIED] | [VERIFIED] |
| Scale | [VERIFIED] | [VERIFIED] | [VERIFIED] |

1 CU = [VERIFIED definition from research].

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not using connection pooling | Use pooled connection string (port 5432 via pooler endpoint) |
| Cold start surprises | [VERIFIED cold start time] — set suspend timeout or keep-alive |
| Orphaned branches | Clean up branches after PR merge; [VERIFIED branch limit] per tier |
| WebSocket in serverless functions | Use HTTP mode (`neon()`) for one-shot queries in edge/serverless |
| Direct connection from serverless | Always use pooled endpoint from serverless/edge environments |

## Full Reference

See `reference.md` for complete API documentation, serverless driver guide, branching workflows, connection pooling details, autoscaling configuration, and pricing breakdown.
```

**CRITICAL:** Every `[VERIFIED]` placeholder MUST be filled from `research-notes.md`. If a value wasn't verified, use the format `(as of Feb 2026)` — never hedge with "probably" or "might be".

**Step 2: Verify line count**

```bash
wc -l skills/neon/SKILL.md
```

Must be <100 lines. If over, move details to reference.md.

**Step 3: Validate YAML frontmatter**

Verify:
- Only `name` and `description` fields
- `name` uses only letters, numbers, hyphens
- `description` starts with "Use when" and is <500 characters
- No workflow summary in description

**Step 4: Commit SKILL.md**

```bash
git add skills/neon/SKILL.md
git commit -m "feat: add Neon SKILL.md entry point"
```

---

### Task 4: GREEN Phase — Write reference.md

Write the comprehensive reference. Target 400-800 lines. ALL facts from research-notes.md.

**Files:**
- Create: `skills/neon/reference.md`
- Reference: `skills/neon/research-notes.md` (read for verified facts)
- Pattern: `skills/stripe-api/reference.md` (structural reference)

**Step 1: Write reference.md**

Follow this structure:

```markdown
# Neon Serverless Postgres Reference

> **Last Updated:** February 2026
> **API Base:** `https://console.neon.tech/api/v2/`
> **Documentation:** `https://neon.tech/docs`

---

## Table of Contents

1. [MCP Server Integration](#mcp-server-integration)
2. [Authentication and Setup](#authentication-and-setup)
3. [Serverless Driver](#serverless-driver)
4. [API Reference](#api-reference)
5. [Branching](#branching)
6. [Connection Pooling](#connection-pooling)
7. [Autoscaling and Compute](#autoscaling-and-compute)
8. [Pricing Tiers](#pricing-tiers)
9. [Error Codes](#error-codes)
10. [SDKs and Tools](#sdks-and-tools)

---

## MCP Server Integration
[Complete MCP setup: URL, auth methods, available tools, example config]
[Both OAuth and API key methods]
[Claude Code settings.json example]
[List of MCP tools available: project management, SQL, migrations, etc.]

## Authentication and Setup
[API key types and where to get them]
[Connection string formats: pooled, direct, with/without SSL]
[Environment variable conventions]
[Code examples for Node.js and Python setup]

## Serverless Driver
[@neondatabase/serverless package]
[HTTP mode: neon() function — when to use, code examples]
[WebSocket mode: Pool/Client — when to use, code examples]
[Transaction support in each mode]
[Connection string format for each mode]
[@neondatabase/toolkit: what it combines, AI agent use case]

## API Reference
[Base URL, auth header, content type]
[Rate limits: requests/min, burst]

### Projects
[CRUD operations with request/response examples]

### Branches
[Create, list, delete, reset, restore]
[Point-in-time parameters]

### Computes (Endpoints)
[Start, suspend, resize]
[Autoscaling configuration]

### Roles and Databases
[Create role, create database, password management]

### Operations
[Async operation tracking, polling]

## Branching
[Copy-on-write architecture explanation]
[Branch from parent or point-in-time]
[Dev/preview environment workflow]
[Branch compute lifecycle (auto-suspend)]
[Reset branch to parent]
[Naming conventions and limits]

## Connection Pooling
[Built-in PgBouncer]
[Pooled vs direct connection strings — format differences]
[When to use each (serverless → pooled, migrations → direct)]
[Connection limits per tier]

## Autoscaling and Compute
[CU definition: 1 CU = 1 vCPU, 4 GB RAM]
[Autoscaling range: 0.25-16 CU per tier]
[Scale-to-zero: suspend timeout, cold start times]
[Configuring min/max CU]
[Keeping compute warm]

## Pricing Tiers
[Table with all tiers: Free, Launch, Scale, Business, Enterprise]
[CU-hour rates]
[Storage included and overage rates]
[Free tier limits: CU-hours, storage, projects, branches, computes]
[Data transfer costs]
[Billing model: consumption-based, prorated]

## Error Codes
[Common HTTP errors: 400, 401, 403, 404, 409, 422, 429, 500]
[Connection errors: cold start timeout, pool exhaustion]
[Branch operation errors]
[Actionable fix for each error]

## SDKs and Tools
[TypeScript: @neondatabase/api-client]
[Python: neon-api]
[Go: community-maintained]
[Neon CLI: neonctl]
[Each: install command, auth setup, basic usage example]

### Useful Links
[Official docs, API reference, status page, community]
```

**Step 2: Verify line count**

```bash
wc -l skills/neon/reference.md
```

Target: 400-800 lines.

**Step 3: Commit reference.md**

```bash
git add skills/neon/reference.md
git commit -m "feat: add Neon reference.md comprehensive guide"
```

---

### Task 5: GREEN Phase — Test With Skill

Run the same 4 queries from Task 2 WITH the skill loaded. Verify the skill adds value.

**Files:**
- Modify: `skills/neon/test-baseline.md` (add GREEN results)
- Reference: `skills/neon/SKILL.md` + `skills/neon/reference.md`

**Step 1: Run 4 queries WITH skill**

Dispatch 4 subagents (Task tool, model: haiku). Each gets:
1. The same question from Task 2
2. The full contents of SKILL.md AND reference.md (read and paste into the prompt)

Use the exact same 4 prompts from Task 2 Step 1.

**Step 2: Compare results**

For each query, add to test-baseline.md:

```markdown
## GREEN Phase: With Skill

### Query N (GREEN): [Title]

| Criterion | Baseline | GREEN | Improved? |
|-----------|----------|-------|-----------|
| [specific fact] | [wrong/missing/hedged] | [correct/present/confident] | YES/NO |
```

**Step 3: Evaluate success criteria**

The skill must add correct, current, actionable information on **at least 3 of 4 questions** that the agent couldn't produce from training data alone.

If fewer than 3 pass, go back to Tasks 3-4 and strengthen the weak areas.

**Step 4: Commit GREEN results**

```bash
git add skills/neon/test-baseline.md
git commit -m "test: GREEN phase results for Neon reference skill"
```

---

### Task 6: REFACTOR Phase — Close Gaps

Review GREEN results and strengthen the skill where needed.

**Files:**
- Modify: `skills/neon/SKILL.md` (if gaps found in quick reference)
- Modify: `skills/neon/reference.md` (add missing details)
- Modify: `skills/neon/test-baseline.md` (document REFACTOR findings)

**Step 1: Identify remaining gaps**

From GREEN phase results:
- Which queries still had incorrect or missing information?
- Which sections were agents uncertain about even with the skill?
- Are there common follow-up questions the skill doesn't address?

**Step 2: Fix gaps in SKILL.md and/or reference.md**

Make targeted edits — don't rewrite from scratch. Focus on:
- Missing facts agents couldn't find
- Unclear sections that led to wrong answers
- Code examples that didn't work or were incomplete

**Step 3: Re-test fixed areas**

If significant changes were made, dispatch subagent with the specific queries that failed and verify they now pass.

**Step 4: Document REFACTOR findings**

Add to test-baseline.md:

```markdown
## REFACTOR Phase

### Gaps Identified
1. [Gap] — [Fix applied]

### Remaining Gaps (Acceptable)
- [Any known limitations with explanation]
```

**Step 5: Commit REFACTOR**

```bash
git add skills/neon/SKILL.md skills/neon/reference.md skills/neon/test-baseline.md
git commit -m "refactor: close gaps in Neon skill from GREEN testing"
```

---

### Task 7: Register in skills.json

Add the `database` bundle and `neon` skill entry to skills.json.

**Files:**
- Modify: `skills.json`

**Step 1: Read current skills.json**

Read the file to find the correct insertion point.

**Step 2: Add database bundle**

Add after the last bundle (currently `creative`):

```json
"database": {
  "name": "Database",
  "description": "Neon serverless Postgres — branching, autoscaling, serverless driver",
  "default": false,
  "skills": ["neon"]
}
```

**Step 3: Add neon skill entry**

Add to the `skills` object (alphabetical order, after `lighthouse-api`):

```json
"neon": {
  "name": "Neon",
  "description": "Serverless Postgres with instant branching, autoscaling, and scale-to-zero",
  "files": ["skills/neon/SKILL.md", "skills/neon/reference.md"],
  "agents": [],
  "bundle": "database"
}
```

**Step 4: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills.json', 'utf8')); console.log('Valid JSON')"
```

**Step 5: Commit**

```bash
git add skills.json
git commit -m "feat: register Neon skill in database bundle"
```

---

### Task 8: Clean Up and Final Verification

Remove temporary files and verify everything is wired correctly.

**Files:**
- Delete: `skills/neon/research-notes.md` (temporary research artifact)
- Verify: `skills/neon/SKILL.md`, `skills/neon/reference.md`, `skills.json`

**Step 1: Delete research notes**

```bash
rm skills/neon/research-notes.md
```

Research notes are a working artifact, not a skill deliverable. The verified facts are now in SKILL.md and reference.md.

**Step 2: Final verification checklist**

- [ ] `skills/neon/SKILL.md` exists and has valid YAML frontmatter
- [ ] `skills/neon/SKILL.md` is <100 lines
- [ ] `skills/neon/reference.md` exists and is 400-800 lines
- [ ] `skills.json` has `database` bundle with `neon` skill
- [ ] `skills.json` `neon` entry references correct file paths
- [ ] `skills.json` `neon.agents` is empty array (no custom agent)
- [ ] No hedging language ("probably", "might be") in either file
- [ ] All pricing/quota numbers have been verified via web research
- [ ] MCP setup instructions are complete and testable
- [ ] `test-baseline.md` documents RED, GREEN, and REFACTOR phases

**Step 3: Commit cleanup**

```bash
git rm skills/neon/research-notes.md
git commit -m "chore: clean up research notes, finalize Neon skill"
```
