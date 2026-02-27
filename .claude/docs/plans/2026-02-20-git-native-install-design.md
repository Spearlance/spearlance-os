# Git-Native Install & Update — Design

## Decision

Eliminate the Claude Code plugin system entirely. Armadillo is a single GitHub repo. Install = clone + copy files. Update = read repo + diff + merge. Claude Code is the installer. No terminal commands for users.

## Repo Structure

```
armadillo/
├── README.md              ← users paste this URL into Claude
├── armadillo.json         ← manifest: version, packs, file map
├── .claude/               ← copies wholesale into user's project
│   ├── settings.json
│   ├── CLAUDE.md
│   ├── rules/
│   ├── skills/            ← core skills only
│   ├── agents/
│   └── hooks/
├── packs/                 ← optional skill packs
│   ├── frontend/
│   │   ├── skills/        ← merges into .claude/skills/
│   │   └── agents/        ← merges into .claude/agents/
│   ├── backend/
│   ├── database/
│   └── ...
├── scripts/               ← dev-only, never copied
└── tests/                 ← dev-only, never copied
```

## Version Tracking

Commit SHA — automatic, no manual tagging required. Manifest stores the SHA of the commit the install/update was based on.

## Install Flow

1. User says "install armadillo" or pastes GitHub URL
2. Claude clones/reads the repo
3. Copies repo's `.claude/` → user's `.claude/`
4. User picks packs (auto-selected if stack.json exists)
5. Claude copies selected pack skills/agents into `.claude/`
6. Writes manifest (version = commit SHA, installed packs)

For migrations (existing .claude/):
- Same Phase 1-4 intelligence (scan, classify, walk-through, rebuild)
- Just simpler mechanics: copy files instead of register plugins

## Update Flow

1. Read manifest → current SHA
2. Read repo → latest SHA
3. Hash-compare each armadillo-owned file
4. Auto-update unmodified, conflict-handle modified
5. Offer new packs/skills
6. Run Step 5.5 intelligence (semantic overlap, quality audit, orphans)
7. Health check
8. Update manifest

## What Gets Removed

- All plugin machinery: marketplace.json, plugin.json, enabledPlugins, extraKnownMarketplaces
- All install type distinctions (legacy-file-copy, plugin, multi-plugin)
- All migration paths between install types
- skills.json as remote registry (repo structure IS the registry)
- "Restart Claude Code" messaging
- build-plugins.js, sync-all.js, install-hooks.js

## What Stays

- Semantic classification (Pass 1 + Pass 2, Bucket A/B/C/D)
- Dropped content processing
- Quality audit (score custom skills, offer rebuilds)
- Orphaned file resolution
- Conflict handling (hash comparison, diffs)
- Phase 6 project analysis (scan codebase, recommend custom content)
- Manifest tracking (owner: armadillo vs user, SHA hashes)

## Manifest Format (New)

```json
{
  "version": "abc123def456",
  "repoUrl": "https://github.com/filenamedotexe/armadillo",
  "installedAt": "2026-02-20T00:00:00Z",
  "updatedAt": "2026-02-20T00:00:00Z",
  "completed": true,
  "installedPacks": ["frontend", "backend", "database"],
  "files": {
    "skills/brainstorming/SKILL.md": {
      "owner": "armadillo",
      "hash": "sha256..."
    }
  }
}
```

## Scope

This is a full restructure of:
1. Repo directory layout (flatten plugins/ → .claude/ + packs/)
2. Onboarding skill (remove plugin machinery, simplify to file-copy)
3. Updating-armadillo skill (remove plugin machinery, simplify to file-diff)
4. Remove all plugin infrastructure files (marketplace.json, plugin.json, build-plugins.js, etc.)
5. Remove install.sh
6. Update README with new install instructions
7. Update CLAUDE.md template (remove plugin references)
