<!-- armadillo:start -->
# Claude Code Configuration

## Skills

This project uses [Armadillo](https://github.com/filenamedotexe/armadillo) skills. Use the Skill tool to invoke them.

### Workflow
- **brainstorming** — You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
- **writing-plans** — Use when you have a spec or requirements for a multi-step task, before touching code
- **executing-plans** — Use when you have a written implementation plan to execute in a separate session with review checkpoints
- **test-driven-development** — Use when implementing any feature or bugfix, before writing implementation code
- **systematic-debugging** — Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- **verification-before-completion** — Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always

### Collaboration
- **requesting-code-review** — Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- **receiving-code-review** — Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
- **subagent-driven-development** — Use when executing implementation plans with independent tasks in the current session
- **dispatching-parallel-agents** — Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies

### Git
- **using-git-worktrees** — Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
- **finishing-a-development-branch** — Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
- **writing-prs** — Use when creating pull requests, writing PR descriptions, or when finishing-a-development-branch creates a PR. Ensures PR titles follow conventional commits and descriptions follow the hybrid template format.

### Testing
- **playwright** — Use when working with Playwright for E2E testing, browser automation, cross-browser testing, test generation, or visual comparison. Also use when setting up Playwright in a project, writing page object models, or debugging test failures with trace viewer.
- **puppeteer** — Use when working with Puppeteer for browser automation, Chrome DevTools Protocol, headless Chrome, web scraping, PDF generation, or screenshot automation. Also use when working with Chrome for Testing, debugging CDP connections, or WebDriver BiDi.
- **cypress** — Use when working with Cypress for E2E testing, component testing, visual testing, or real-time test runner. Also use when configuring Cypress Cloud, writing custom commands, or debugging test flakiness in Cypress.
- **vitest** — Use when working with Vitest for unit testing, component testing, snapshot testing, or mocking in Vite-based projects. Also use when migrating from Jest to Vitest, configuring Vitest workspaces, or using Vitest Browser Mode for component tests.

### Meta
- **armadillo-shepherd** — Active router — classifies every request and routes to the correct skill before any response
- **onboarding** — Use when setting up armadillo in a new project, migrating an existing .claude/ setup to armadillo standard, or running armadillo for the first time in a project. Also use when the user says "onboard", "init", "setup", or "install armadillo".
- **updating-armadillo** — Use when checking for armadillo updates, upgrading to a new version, verifying installation health, adding or removing skill packs, or when the user says "update armadillo", "upgrade", "check for updates", "doctor", "add pack", or "remove pack".
- **writing-skills** — Use when creating new skills, editing existing skills, or verifying skills work before deployment
- **writing-reference-skills** — Use when creating skills that document APIs, libraries, CLIs, or other external tools with version-sensitive facts like endpoints, pricing, quotas, or auth flows. Also use when an existing reference skill has outdated information.

### Data Quality
- **nap-ninja** — Use when hardcoded business info is detected, when centralizing contact data into business.json, or when the user says 'nap ninja', 'business info', 'centralize contacts', or 'hardcoded phone/email/address'. Also use when onboarding detects scattered NAP data.
- **env-ninja** — Use when hardcoded secrets or API keys are detected in source code, when organizing .env files, when centralizing environment variables, or when the user says 'env ninja', 'organize env', 'hardcoded secret', 'API key in code', '.env cleanup'. Also use when onboarding detects scattered secrets.

### Other
- **git-setup** — Use when a project has no git strategy, no branch protection, no conventional commits, or when the user says "set up git", "git workflow", "branch protection", or "version bumping". Also use when onboarding detects missing git hygiene.
- **cleanup** — Use when post-implementation cleanup is needed — archiving old docs, scanning for orphaned files, removing debug code, organizing imports, and auditing .claude/ for stale references. Also use after a feature ships or periodically to prevent drift.
- **deps** — Use when managing dependencies — auditing for vulnerabilities, updating packages safely, or adding new dependencies with rollback on failure. Also use when npm audit reports issues or packages are outdated.
- **safe-merge** — Use when ready to merge a feature branch — validates all quality gates (tests, build, lint, conflicts, migrations) before merging. Also use when you want automated pre-merge verification.
- **test-debug** — Use when tests are failing unexpectedly — diagnoses root cause by reading test + code + imports, classifies failure type (CODE BUG / CODE GAP / TEST BUG / ENV), and applies targeted fix. Never brute-forces.

## Skill Packs

armadillo is modular. The **core** (always installed) provides workflow skills, agents, hooks, and rules. Optional **skill packs** add domain-specific expertise:

| Pack | Skills | Focus |
|------|--------|-------|
| core | 29 | Workflow, testing, git, debugging, and meta skills — always required |
| google-apis | 8 | GA4, Ads, Search Console, Business Profile, Lighthouse, YouTube, Places, Tag Manager |
| payments | 6 | Stripe and Square API references — payments, subscriptions, checkout, catalog, terminal, loyalty |
| video | 5 | Remotion video creation, rendering, supercuts, templates, and content ingestion |
| brand | 7 | Brand asset pipeline — discovery, knowledge building, asset organization, PDF export, compliance checking, and audio transcription |
| web-migration | 1 | Duda-to-Astro website migration toolkit |
| creative | 1 | ASCII art creation for standalone pieces and CLI tool decoration |
| database | 6 | Neon, Supabase, MongoDB, Redis/Upstash, pgvector, Turso — serverless databases and BaaS |
| backend | 4 | Hono, Express, tRPC, REST API patterns — server frameworks and API design |
| orm | 2 | Drizzle and Prisma — type-safe database access layers |
| auth | 3 | Auth.js, Clerk, Supabase Auth — drop-in authentication for any stack |
| deploy | 4 | Vercel, Cloudflare, Docker, GitHub Actions — deploy anywhere with CI/CD |
| frontend | 16 | Frontend ecosystem with pimp orchestrator — Tailwind v4, shadcn/ui, design systems, UI craft, Storybook, visual regression, testing-library, Next.js, Astro, React+Vite, SvelteKit, animations, responsive design, accessibility |
| fresh-project | 3 | Zero-to-shipped — discovery, stack recommendation, scaffold, plan, build |
| forms | 2 | Zod schema validation + React Hook Form — type-safe forms |
| state | 3 | Zustand client state + TanStack Query + SWR server state |
| monitoring | 2 | Sentry error tracking + PostHog product analytics |
| tooling | 2 | ESLint/Prettier, Turborepo — code quality and monorepo builds |
| cms | 2 | Sanity and Payload CMS — structured content for any frontend |
| email | 2 | Resend + React Email — modern transactional email with React components |
| storage | 2 | Uploadthing, S3, Cloudflare R2 — file uploads and object storage |
| ai | 4 | Vercel AI SDK, Anthropic, OpenAI, Google Gemini — build AI features into any app |
| mobile | 1 | Expo + React Native — cross-platform mobile apps |
| ads | 7 | Meta Ads, Pinterest Ads, Conversions API — paid social campaign management and verification |
| seo | 15 | SEO audit, pulse checks, local SEO, link analysis, rank tracking, site reports, schema markup, reviews, content strategy, AI visibility, workflow orchestrators |
| python | 4 | Django, Django ORM, Django Auth, FastAPI — Python web frameworks and APIs |
| cloudinary | 1 | Cloudinary media management — uploads, transformations, optimization, and delivery |
| scheduling | 1 | Acuity/Squarespace Scheduling — appointment booking, availability, and client management |
| cro | 5 | CRO audit, A/B testing, landing page optimization, Microsoft Clarity, server-side tracking |
| performance | 2 | Core Web Vitals diagnosis, CrUX field data API, performance budgets |
| opencode | 6 | OpenCode expert ecosystem — config, agents, tools, extensions, CLI/SDK/ACP, with opencode-pimp orchestrator |
| scraping | 1 | Firecrawl — web scraping, crawling, structured extraction, Browser Sandbox, MCP server |
| dns | 7 | Domain & DNS management — Cloudflare, GoDaddy, Namecheap, Name.com, Squarespace with unified interface and domains.json config |

Use `/updating-armadillo` to add or remove skill packs.

## Rules

Rules auto-load from `.claude/rules/`:

| Rule | What it enforces |
|------|-----------------|
| **coding-standards** | DRY, YAGNI, TDD, smart backgrounding, skill-first workflow |
| **env-enforcement** | Never hardcode secrets — always use environment variables and .env files |
| **git-workflow** | `env -u GITHUB_TOKEN` auth, conventional commits, atomic changes |
| **nap-enforcement** | Always reference business.json — never hardcode NAP data in source files |
| **output-style** | Consistent formatting, status markers, brand voice |
| **pr-format** | Conventional commits PR titles, hybrid template, anti-patterns |
| **project-context** | Stack-aware behavior — reads stack.json, PROJECT.md, fresh-project.json |
| **security** | Secrets handling, env var safety, OWASP awareness |
| **testing** | Test quality standards, coverage expectations, TDD enforcement |
| **bug-discipline** | Root-cause diagnosis before fixes, no brute-force debugging |
| **release-checklist** | Pre-release verification steps, quality gates |
| **visual-testing** | Visual regression testing standards, screenshot comparison |
| **facebook-capi** | Meta Conversions API event schema, dedup, and server-side tracking rules |
| **meta-api-versioning** | Meta Graph API version lifecycle, upgrade cadence, deprecation handling |
| **pinterest** | Pinterest API conventions, OAuth refresh, rate limit patterns |
| **prod-safety** | Two-ref doctrine, prod firewall, escape valve, Vercel/Stripe rules |
| **seo-doctrine** | Spearlance SEO operating stance, on-page rules, content thresholds, page context protection, escalation |

## Model Selection

Agents and skills specify their own `model:` field. Never override via Task tool `model` parameter.

| Tier | Model ID | Use Cases |
|------|----------|-----------|
| **Opus 4.6** | `claude-opus-4-6` | Onboarding, updating-armadillo, writing-plans, executing-plans, subagent-driven-development, systematic-debugging, writing-skills, writing-reference-skills, dispatching-parallel-agents, receiving-code-review, fresh-project, stack-recommender, code-reviewer, brand-strategist, fullstack-architect |
| **Sonnet 4.6** | `claude-sonnet-4-6` | Implementation, content creation, API work, domain experts (ascii-art-creator, duda-migration-agent, remotion-creator, frontend-testing-guide, frontend-dev-guide, project-scaffolder, armadillo-shepherd) |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Mechanical tasks, batch scanning, rendering |
| **Inherit** | `inherit` | Reference/knowledge agents that follow the invoking agent's model (claude-code-guide, google-api-guide, backend-guide, database-guide, infra-guide) |
## Permissions

Default mode: `bypassPermissions` — auto-approves everything except the deny-list. Fastest iteration.

| Mode | Behavior | Risk |
|------|----------|------|
| `acceptEdits` | Auto-approves reads + edits, prompts for unknown Bash | Low — you see Bash prompts |
| `bypassPermissions` | Auto-approves everything except deny-list **(Recommended)** | Low — deny-list blocks catastrophic commands |
| `plan` | Read-only, no writes | Zero — exploration only |

Deny-list always active regardless of mode (catastrophic commands blocked).

## Environment: Dev/Main Split

Two Supabase environments:
- **Production** (`chikljxwgiskyjsnjelf`): `os.spearlance.com`, main branch only — firewalled
- **Development** (`zlljsdaxsggkasvympku`): local dev + Vercel previews + Playwright

### Safety Net

- **prod-firewall hook** (`.claude/hooks/prod-firewall.sh`): blocks destructive prod commands at tool layer
- **prod-safety rule** (`.claude/rules/prod-safety.md`): documents firewall + escape valve
- **predev script** (Stripe live-key check): blocks `npm run dev` if live keys in `.env.local`
- **pre-commit hook**: blocks commits containing live Stripe keys or `.env` files

### Daily Workflow

```bash
git checkout -b feat/something
npm run db:current             # should show DEV
npm run dev                    # localhost reads .env.local -> dev Supabase
# write code, test, push
git push origin feat/something # -> Vercel preview -> dev Supabase
# PR review -> merge to main
# Vercel auto-rebuilds production -> prod Supabase
```

### Migration Promotion

```bash
# Test on dev (safe)
npx supabase db push --project-ref zlljsdaxsggkasvympku

# Merge PR to main, then promote to prod (requires confirmation):
npm run prod:confirm           # type "PRODUCTION"
npx supabase db push --project-ref chikljxwgiskyjsnjelf
```

### Edge Functions

- `npm run deploy:functions:dev` — deploy to dev (default)
- `npm run deploy:functions:prod` — deploy to prod (explicit, firewalled)

### Seed Data

`npm run db:seed` — resets dev DB to known state with ABC Company fixtures.
<!-- armadillo:end -->

<!-- Add your project-specific instructions below this line -->

