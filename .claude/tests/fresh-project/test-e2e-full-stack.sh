#!/usr/bin/env bash
# End-to-end test: fresh-project full system validation
# Tests that all Phase 1-6 skills, agents, bundles, and hooks are correctly wired

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "fresh-project E2E: full system validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Phase 1: Orchestrator skills and agents ─────────────────────────────
echo ""
echo "Phase 1: Orchestrator"

[ -f "$PLUGIN_ROOT/skills/fresh-project/SKILL.md" ] && pass "fresh-project skill exists" || fail "fresh-project skill missing"
[ -f "$PLUGIN_ROOT/skills/stack-recommender/SKILL.md" ] && pass "stack-recommender skill exists" || fail "stack-recommender skill missing"
[ -f "$PLUGIN_ROOT/skills/scaffold/SKILL.md" ] && pass "scaffold skill exists" || fail "scaffold skill missing"
[ -f "$PLUGIN_ROOT/agents/fullstack-architect.md" ] && pass "fullstack-architect agent exists" || fail "fullstack-architect agent missing"
[ -f "$PLUGIN_ROOT/agents/project-scaffolder.md" ] && pass "project-scaffolder agent exists" || fail "project-scaffolder agent missing"

# ── 2. Phase 2: Backend + Data skills ─────────────────────────────────────
echo ""
echo "Phase 2: Backend + Data"

for skill in hono express trpc rest-api-patterns supabase mongodb redis-upstash drizzle prisma; do
    [ -f "$PLUGIN_ROOT/skills/$skill/SKILL.md" ] && pass "$skill skill exists" || fail "$skill skill missing"
    [ -f "$PLUGIN_ROOT/skills/$skill/reference.md" ] && pass "$skill reference.md exists" || fail "$skill reference.md missing"
done

# ── 3. Phase 3: Auth + Deploy skills ──────────────────────────────────────
echo ""
echo "Phase 3: Auth + Deploy"

for skill in authjs clerk supabase-auth vercel cloudflare-pages-workers docker github-actions; do
    [ -f "$PLUGIN_ROOT/skills/$skill/SKILL.md" ] && pass "$skill skill exists" || fail "$skill skill missing"
    [ -f "$PLUGIN_ROOT/skills/$skill/reference.md" ] && pass "$skill reference.md exists" || fail "$skill reference.md missing"
done

# ── 4. Phase 4: DX Layer skills ───────────────────────────────────────────
echo ""
echo "Phase 4: DX Layer"

for skill in zod react-hook-form zustand tanstack-query sentry posthog eslint-prettier; do
    [ -f "$PLUGIN_ROOT/skills/$skill/SKILL.md" ] && pass "$skill skill exists" || fail "$skill skill missing"
    [ -f "$PLUGIN_ROOT/skills/$skill/reference.md" ] && pass "$skill reference.md exists" || fail "$skill reference.md missing"
done

# ── 5. Phase 5: Content + Communication skills ────────────────────────────
echo ""
echo "Phase 5: Content + Communication"

for skill in sanity payload resend react-email uploadthing s3-cloudflare-r2 turborepo; do
    [ -f "$PLUGIN_ROOT/skills/$skill/SKILL.md" ] && pass "$skill skill exists" || fail "$skill skill missing"
    [ -f "$PLUGIN_ROOT/skills/$skill/reference.md" ] && pass "$skill reference.md exists" || fail "$skill reference.md missing"
done

# ── 6. Phase 6: Frontier skills ───────────────────────────────────────────
echo ""
echo "Phase 6: Frontier"

for skill in vercel-ai-sdk anthropic-api react-vite sveltekit expo-react-native; do
    [ -f "$PLUGIN_ROOT/skills/$skill/SKILL.md" ] && pass "$skill skill exists" || fail "$skill skill missing"
    [ -f "$PLUGIN_ROOT/skills/$skill/reference.md" ] && pass "$skill reference.md exists" || fail "$skill reference.md missing"
done

# ── 7. skills.json registry ───────────────────────────────────────────────
echo ""
echo "skills.json registry"

SKILLS_JSON="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)/skills.json"

if [ -f "$SKILLS_JSON" ]; then
    for skill in fresh-project stack-recommender scaffold hono express trpc rest-api-patterns supabase mongodb redis-upstash drizzle prisma authjs clerk supabase-auth vercel cloudflare-pages-workers docker github-actions zod react-hook-form zustand tanstack-query sentry posthog eslint-prettier turborepo sanity payload resend react-email uploadthing s3-cloudflare-r2 vercel-ai-sdk anthropic-api react-vite sveltekit expo-react-native; do
        node -e "const s=JSON.parse(require('fs').readFileSync('$SKILLS_JSON','utf-8')); process.exit(s.skills['$skill'] ? 0 : 1)" 2>/dev/null \
            && pass "$skill registered in skills.json" \
            || fail "$skill NOT registered in skills.json"
    done

    for bundle in backend database auth deploy forms state monitoring tooling cms email storage ai mobile frontend-dev; do
        node -e "const s=JSON.parse(require('fs').readFileSync('$SKILLS_JSON','utf-8')); process.exit(s.bundles['$bundle'] ? 0 : 1)" 2>/dev/null \
            && pass "$bundle bundle registered" \
            || fail "$bundle bundle NOT registered"
    done
else
    fail "skills.json not found at $SKILLS_JSON"
fi

# ── 8. Shepherd routing ───────────────────────────────────────────────────
echo ""
echo "Shepherd routing"

SHEPHERD="$PLUGIN_ROOT/skills/armadillo-shepherd/SKILL.md"
if [ -f "$SHEPHERD" ]; then
    grep -q "fresh-project" "$SHEPHERD" && pass "shepherd routes fresh-project" || fail "shepherd missing fresh-project"
    grep -q "scaffold" "$SHEPHERD" && pass "shepherd routes scaffold" || fail "shepherd missing scaffold"
    grep -q "stack-recommender" "$SHEPHERD" && pass "shepherd routes stack-recommender" || fail "shepherd missing stack-recommender"
else
    fail "shepherd SKILL.md not found"
fi

# ── 9. Session-start hook ─────────────────────────────────────────────────
echo ""
echo "Session-start hook"

HOOK="$PLUGIN_ROOT/hooks/session-start.sh"
if [ -f "$HOOK" ]; then
    grep -q "fresh-project" "$HOOK" && pass "session-start detects fresh-project.json" || fail "session-start missing fresh-project detection"
    grep -q "fresh_project_context" "$HOOK" && pass "session-start injects fresh-project context" || fail "session-start missing context injection"
else
    fail "session-start.sh not found"
fi

# ── 10. Onboarding greenfield detection ───────────────────────────────────
echo ""
echo "Onboarding greenfield"

ONBOARDING="$PLUGIN_ROOT/skills/onboarding/SKILL.md"
if [ -f "$ONBOARDING" ]; then
    grep -qi "greenfield" "$ONBOARDING" && pass "onboarding has greenfield detection" || fail "onboarding missing greenfield"
    grep -q "fresh-project" "$ONBOARDING" && pass "onboarding routes to fresh-project" || fail "onboarding missing fresh-project route"
else
    fail "onboarding SKILL.md not found"
fi

# ── Results ───────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASS + FAIL))
echo "$PASS/$TOTAL passed · $FAIL failed"
if [ $FAIL -eq 0 ]; then
    echo "● ahh, that felt good didn't it?"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[ $FAIL -eq 0 ]
