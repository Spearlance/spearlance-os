# Design: Auto-Syncing Docs via Starlight

**Date:** 2026-02-21
**Status:** Approved
**Audience:** Armadilloers (users) + Contributors (skill builders)

## Problem

armadillo has 130+ skills, 30 packs, 15 agents, 12 rules, and 9 hooks — all documented in markdown files scattered across the repo. The README auto-generates from `armadillo.json`, but the full knowledge base is only browsable by digging through `.claude/skills/*/SKILL.md` files on GitHub. There's no searchable, navigable docs site.

## Decision

**Starlight** (Astro docs framework) deployed to **GitHub Pages** via GitHub Actions.

### Why Starlight

- Reads markdown files — same content format we already use
- Astro is already in our frontend pack ecosystem
- Free hosting via GitHub Pages, auto-deploy on push
- Searchable, sidebar nav, dark mode, responsive — zero custom CSS
- No third-party SaaS dependency
- Content stays as markdown — portable if we ever switch

### Rejected Alternatives

| Option | Why not |
|--------|---------|
| Mintlify | Third-party dependency, needs their config format |
| VitePress | Vue ecosystem — we're Astro/React |
| Docusaurus | Heavyweight for our needs |
| GitHub Wiki | Poor navigation for deep content, separate repo to maintain |
| Raw markdown | What we have now — not browsable enough |

## Architecture

```
armadillo repo
├── docs/                          ← Starlight app
│   ├── astro.config.mjs           ← sidebar auto-generated from armadillo.json
│   ├── package.json               ← minimal: astro + @astrojs/starlight
│   ├── src/
│   │   ├── content/docs/          ← generated pages (gitignored)
│   │   │   ├── getting-started/
│   │   │   ├── skills/
│   │   │   │   ├── core/
│   │   │   │   └── packs/
│   │   │   ├── rules/
│   │   │   ├── agents/
│   │   │   ├── hooks/
│   │   │   ├── configuration/
│   │   │   ├── contributing/
│   │   │   └── changelog.md
│   │   └── assets/                ← logo, brand assets
│   └── public/
├── scripts/build-docs.js          ← transforms source → Starlight pages
├── .github/workflows/docs.yml     ← deploy on push to main
└── (everything else unchanged)
```

## Build Pipeline

```
Push to main triggers GitHub Action:

  1. scripts/build-docs.js
     ├── Read armadillo.json
     │   ├── Generate sidebar navigation config
     │   ├── Generate overview page (skill/pack counts, version)
     │   └── Generate pack overview pages (description, skill list)
     │
     ├── Read .claude/skills/*/SKILL.md (core skills)
     │   ├── Parse Claude Code frontmatter
     │   ├── Extract: name, description, model, context, depends, allowed-tools
     │   ├── Extract: body content
     │   ├── Generate summary section (metadata + key principles)
     │   └── Generate full reference section (collapsible)
     │
     ├── Read packs/*/skills/*/SKILL.md (pack skills)
     │   └── Same transform as core skills
     │
     ├── Read .claude/rules/*.md
     │   └── Strip rule frontmatter → clean markdown pages
     │
     ├── Read .claude/agents/*.md
     │   ├── Parse frontmatter (name, model, description)
     │   └── Generate agent reference pages
     │
     ├── Read .claude/hooks/*.sh + hooks.json
     │   ├── Extract: event binding, description
     │   └── Generate hooks reference page
     │
     ├── Read CHANGELOG.json
     │   └── Generate formatted changelog (grouped by version)
     │
     └── Read INSTALL.md + README.md sections
         └── Generate getting started pages

  2. cd docs && npm run build (Starlight static build)

  3. Deploy to GitHub Pages
```

## Content Structure

### Navigation Sidebar

```
Getting Started
  ├── What is armadillo
  ├── Install
  └── Configuration

Core Skills (29)
  ├── Workflow
  │   ├── brainstorming
  │   ├── writing-plans
  │   ├── executing-plans
  │   ├── test-driven-development
  │   ├── systematic-debugging
  │   └── verification-before-completion
  ├── Collaboration
  │   ├── requesting-code-review
  │   ├── receiving-code-review
  │   ├── subagent-driven-development
  │   └── dispatching-parallel-agents
  ├── Git
  │   ├── using-git-worktrees
  │   ├── finishing-a-development-branch
  │   └── writing-prs
  ├── Testing
  │   ├── playwright
  │   ├── puppeteer
  │   ├── cypress
  │   └── vitest
  ├── Meta
  │   ├── armadillo-shepherd
  │   ├── onboarding
  │   ├── updating-armadillo
  │   ├── writing-skills
  │   └── writing-reference-skills
  └── Data Quality
      ├── nap-ninja
      └── env-ninja

Skill Packs (30)
  ├── frontend (10 skills)
  ├── seo (15 skills)
  ├── ads (7 skills)
  ├── database (6 skills)
  ├── ... (one page per pack, listing skills)
  └── Each skill gets its own page

Rules (12)
  ├── coding-standards
  ├── git-workflow
  ├── output-style
  └── ...

Agents (15)
  ├── code-reviewer
  ├── brand-strategist
  └── ...

Hooks (9)
  └── All hooks on one reference page

Contributing
  ├── Writing Skills
  ├── Writing Reference Skills
  └── Architecture

Changelog
```

### Skill Page Layout

Each skill page has two layers:

**Summary (always visible):**
- Name, description, category
- Metadata badges: model tier, context mode, dependencies
- "When to use" — extracted from description + routing table
- Key principles — first 3-5 bullet points from the skill body

**Full Reference (collapsible `<details>`):**
- Complete SKILL.md body (process flow, checklist, examples, common mistakes, anti-patterns)
- Stripped of Claude-specific frontmatter

## Auto-Sync Contract

| Content change | Auto-handled? | How |
|----------------|---------------|-----|
| New skill added | ✓ | build-docs.js reads skill directories dynamically |
| Skill content updated | ✓ | SKILL.md is re-parsed on every build |
| New pack added | ✓ | armadillo.json packs section drives pack pages |
| New rule added | ✓ | build-docs.js reads rules/ dynamically |
| New agent added | ✓ | build-docs.js reads agents/ dynamically |
| Version bump | ✓ | CHANGELOG.json parsed on build |
| Sidebar update | ✓ | Generated from armadillo.json categories |
| New hook added | ◐ | Script reads hooks.json, but new hooks need entry there |

**Zero manual docs maintenance.** The only time you touch docs is to write custom landing page copy or add a new category to the sidebar groupings.

## Dependencies

```
docs/package.json:
  astro: ^4.x
  @astrojs/starlight: ^0.x (latest)

.github/workflows/docs.yml:
  Node 20
  GitHub Pages deployment
```

## Open Questions (for implementation plan)

1. **Custom domain?** `docs.armadillo.dev` vs `filenamedotexe.github.io/armadillo`
2. **Generated pages gitignored?** Probably yes — `docs/src/content/docs/` is a build artifact. Only `scripts/build-docs.js` and `docs/astro.config.mjs` are committed.
3. **Landing page copy** — auto-generate from README or write custom?
4. **Search scope** — Starlight has built-in Pagefind search. Include full skill body in search index or just summaries?
