# Armadillo 3.0 Full Upgrade — Design

## Goal

Upgrade Armadillo 3.0 (OpenCode) to full parity+ with v2 (Claude Code). Port all enforcement, context injection, lifecycle management, rules, tests, and skill depth — rebuilt natively for OpenCode's TypeScript plugin system.

## Problem

v3 was built early in v2's lifecycle. Since then, v2 gained:
- 19 behavioral enforcement hooks (bash scripts)
- REST-first GitHub API patterns (no GraphQL)
- 80+ test files (791+ tests)
- gh auth pre-flight checks
- Sync guarantee system
- Hook behavioral test coverage with TDD-discovered bug fixes

v3's current plugin is a stub — `console.log` warnings instead of real enforcement. Goons are 30-line skeletons. Zero tests.

## Design — 5 Pillars

### Pillar 1: Plugin Enforcement Engine

Split `armadillo.ts` into focused TypeScript modules:

```
.opencode/plugins/
├── armadillo.ts          ← entry point, wires all modules
├── state.ts              ← in-memory state (typed object, replaces /tmp flags)
├── enforcement.ts        ← tool.execute.before guards (throw to block)
├── context.ts            ← tool.execute.after context injection
├── lifecycle.ts          ← event handlers (session, compaction, todo)
└── utils.ts              ← shared helpers (pattern matching, git helpers)
```

**state.ts** — Typed in-memory state replacing all `/tmp` flag files:

```typescript
export interface ArmadilloState {
  testsFailing: boolean;
  lastTestOutput: string;
  debugActive: boolean;
  activeSkill: string | null;
  activePlay: string | null;
  mergeAuthorized: boolean;
  sessionStarted: boolean;
  commitHistory: string[];
  skillFlagActive: boolean;
}
```

**enforcement.ts** — 7 guards via `tool.execute.before`:

| Guard | Trigger | Blocks |
|---|---|---|
| TDD order | `git commit` with `feat:/fix:` | No prior `test:` or `test(scope):` commit on branch |
| Debug-before-fix | `git commit -m "fix:..."` | `state.debugActive` is false |
| Skill routing | Task tool dispatch | Explore agent type |
| Skill gate | `git push` / `gh api merge` | `state.mergeAuthorized` is false |
| Stop verification | `git commit` / `git push` | Completion phrases without test evidence |
| ENV ninja | `edit` on source files | Hardcoded secrets pattern match |
| NAP ninja | `edit` on source files | Hardcoded NAP pattern match |

**context.ts** — 5 handlers via `tool.execute.after`:

| Handler | Trigger | Action |
|---|---|---|
| Test failure detect | bash with test commands | Set `state.testsFailing`, store output |
| Subagent context | Task before dispatch | Inject test failure state |
| Tool failure context | Any tool failure | Inject failure-type guidance |
| Post-push PR check | `git push` success | Suggest `/ship` |
| Async lint | `edit` on code files | Background lint via `$` |

**lifecycle.ts** — Event handlers:

| Event | Handler |
|---|---|
| `session.created` | Initialize state, log version |
| `session.idle` | Cleanup state |
| `experimental.session.compacting` | Inject git log, branch, active play |
| `todo.updated` | TDD quality gate |

### Pillar 2: Custom Tools

Existing `.opencode/tools/` (6 tools) unchanged.

New plugin-registered tools:

| Tool | Purpose |
|---|---|
| `armadillo-status` | Show plugin state |
| `tdd-gate` | Mark test phase complete |
| `play-dispatch` | Programmatic play dispatch |

### Pillar 3: Rules Sync

**Add 4 missing:**
- `facebook-capi.md`
- `meta-api-versioning.md`
- `pinterest.md`
- `release-checklist.md` (adapted for v3)

**Update 9 existing** to match v2's latest:
- `coding-standards.md` — add frontmatter paths filter
- `git-workflow.md` — REST-first GitHub API, env patterns
- `nap-enforcement.md` — expand social media list
- `output-style.md` — goons/plays terminology
- `pr-format.md` — REST API examples, HEREDOC
- `project-context.md` — .opencode/ paths
- `security.md` — .env read policy
- `testing.md` — max cycles, escalation

### Pillar 4: Test Infrastructure

Bun test runner in Armadillo-3.0 project:

```
tests/
├── enforcement.test.ts
├── context.test.ts
├── lifecycle.test.ts
├── state.test.ts
├── tools.test.ts
└── integration.test.ts
```

TypeScript module imports, mock hook inputs/outputs, verify `throw` behavior for enforcement and state mutations for context/lifecycle.

### Pillar 5: Agents + Commands + Plays

**Enrich all 9 goons** with v2 skill depth (30 lines → 150-300 lines each):

| Goon | Key additions |
|---|---|
| `build-goon` | REST-first git, `env -u GITHUB_TOKEN`, worktree workflow |
| `ship-goon` | Full PR template, REST API merge, merge polling, squash via REST |
| `test-goon` | Iron Law, Red-Green-Refactor, rationalization prevention, anti-patterns |
| `debug-goon` | 7-step diagnostic, hypothesis-driven, failure classification |
| `review-goon` | Two-stage review (spec then quality), checklist |
| `plan-goon` | Bite-sized tasks, TDD task format, exact file paths |
| `guard-goon` | ENV/NAP scan patterns, dep audit, security methodology |
| `scout-goon` | Fast recon methodology, pattern matching |
| `clean-goon` | Dead code detection, orphan scanning, safe removal |

**New plays:**

| Play | Sequence | Purpose |
|---|---|---|
| `git-forge` | worktree → build → test → ship | Feature branch lifecycle |
| `onboard` | scout → guard → build → test | New project setup |
| `upgrade` | scout → build → test | Self-update |

**New commands:**

| Command | Purpose |
|---|---|
| `/worktree` | Git worktree creation |
| `/finish` | Branch completion |
| `/onboard` | Setup in new project |
| `/upgrade` | Self-update |
| `/verify` | Verification before completion |

**Shepherd updates:**
- Expanded routing table
- gh auth pre-flight check
- REST-first mandate

## Not Doing

- Not modifying armadillo-cli (v2) — read-only reference
- Not porting v2's npm distribution system (v3 is git-native)
- Not porting v2's Starlight docs site (v3 may get its own later)
- Not porting skill packs (domain-specific skills) — just core enforcement and workflow

## Testing

- Every enforcement guard: test it throws on violation, passes on compliance
- Every context handler: test state mutations and output injection
- Every lifecycle event: test initialization and cleanup
- Every goon: verify key content (REST-first, TDD enforcement, etc.)
- Every rule: verify content matches v2's latest
