# Project Context

## Stack-Aware Behavior

When `.claude/stack.json` exists, ALL skills and agents MUST:

1. **Read it before starting work** — it contains the project's technology decisions
2. **Never ask redundant questions** — if the stack is decided, use it
3. **Activate relevant reference skills** — if stack says `"auth": "clerk"`, load the `clerk` skill
4. **Respect the architecture** — don't suggest alternatives unless the user asks

### stack.json Schema

```json
{
  "framework": "nextjs",
  "styling": ["tailwind-css", "shadcn-ui"],
  "auth": "clerk",
  "database": "supabase",
  "orm": "drizzle",
  "deploy": "vercel",
  "testing": ["vitest", "playwright"],
  "monitoring": "sentry",
  "apis": ["ga4-api"],
  "packageManager": "pnpm",
  "phase": "build",
  "decided": "2026-02-19"
}
```

Each key maps to an armadillo skill name. If the skill exists, use it. If it doesn't exist, the `fresh-project` orchestrator will have generated it on-demand via `writing-reference-skills`.

### PROJECT.md

When `.claude/PROJECT.md` exists, it contains the project brief — who, what, why, constraints. Read it for context on ANY task. Don't re-ask questions it already answers.

### fresh-project.json

When `.claude/fresh-project.json` exists, the project is in an active fresh-project flow. Read it to determine which phase is current. If a phase is `in_progress` or `pending`, the `fresh-project` skill manages it — don't interfere.

## When These Files Don't Exist

Normal behavior. No stack context, no project brief. Skills operate independently as usual.
