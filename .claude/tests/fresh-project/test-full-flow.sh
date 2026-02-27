#!/usr/bin/env bash
# Integration test — fresh-project full flow walkthrough
# Verifies that all expected files exist and the system is properly wired up.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Armadillo plugin root is two levels up from tests/fresh-project
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

passed=0
failed=0

pass() {
    echo "✓ PASS: $1"
    passed=$((passed + 1))
}

fail() {
    echo "✗ FAIL: $1"
    failed=$((failed + 1))
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. File existence checks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "1. Checking required files exist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

files=(
    "skills/fresh-project/SKILL.md"
    "skills/scaffold/SKILL.md"
    "skills/stack-recommender/SKILL.md"
    "skills/stack-recommender/reference.md"
    "agents/fullstack-architect.md"
    "agents/project-scaffolder.md"
    "rules/project-context.md"
)

for f in "${files[@]}"; do
    if [ -f "${PLUGIN_ROOT}/${f}" ]; then
        pass "$f"
    else
        fail "$f — not found"
    fi
done

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. skills.json registration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "2. Checking skills.json registrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SKILLS_JSON="$(cd "$PLUGIN_ROOT/.." && pwd)/skills.json"

if [ ! -f "$SKILLS_JSON" ]; then
    fail "skills.json not found at $SKILLS_JSON"
else
    # Skills
    for skill in "fresh-project" "scaffold" "stack-recommender"; do
        result=$(jq ".skills[\"${skill}\"]" "$SKILLS_JSON" 2>/dev/null)
        if [ "$result" != "null" ] && [ -n "$result" ]; then
            pass "skills.json: skills[\"${skill}\"] registered"
        else
            fail "skills.json: skills[\"${skill}\"] is missing"
        fi
    done

    # Bundle
    bundle_result=$(jq '.bundles["fresh-project"]' "$SKILLS_JSON" 2>/dev/null)
    if [ "$bundle_result" != "null" ] && [ -n "$bundle_result" ]; then
        pass "skills.json: bundles[\"fresh-project\"] registered"
    else
        fail "skills.json: bundles[\"fresh-project\"] is missing"
    fi

    # Shared rule
    rule_index=$(jq '.sharedFiles.rules | index("rules/project-context.md")' "$SKILLS_JSON" 2>/dev/null)
    if [ "$rule_index" != "null" ] && [ -n "$rule_index" ]; then
        pass "skills.json: sharedFiles.rules includes rules/project-context.md"
    else
        fail "skills.json: sharedFiles.rules missing rules/project-context.md"
    fi
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. session-start.sh re-entry detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "3. Checking session-start.sh re-entry detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SESSION_START="${PLUGIN_ROOT}/hooks/session-start.sh"
TEMP_FP="${PLUGIN_ROOT}/fresh-project.json"
TEMP_FP_BACKUP=""

# Back up existing fresh-project.json if present
if [ -f "$TEMP_FP" ]; then
    TEMP_FP_BACKUP=$(mktemp)
    cp "$TEMP_FP" "$TEMP_FP_BACKUP"
fi

# Write test state
echo '{"phase":"scaffold","build":"pending"}' > "$TEMP_FP"

# Run session-start.sh and capture output
if [ -f "$SESSION_START" ]; then
    session_output=$(bash "$SESSION_START" 2>/dev/null || true)
    if echo "$session_output" | grep -q "fresh-project-resume"; then
        pass "session-start.sh: outputs fresh-project-resume when build=pending"
    else
        fail "session-start.sh: no fresh-project-resume in output (build=pending)"
    fi
else
    fail "session-start.sh not found at $SESSION_START"
fi

# Clean up temp file
rm -f "$TEMP_FP"

# Restore backup if there was one
if [ -n "$TEMP_FP_BACKUP" ] && [ -f "$TEMP_FP_BACKUP" ]; then
    mv "$TEMP_FP_BACKUP" "$TEMP_FP"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Shepherd routing includes fresh-project entries
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "4. Checking shepherd SKILL.md routing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SHEPHERD="${PLUGIN_ROOT}/skills/armadillo-shepherd/SKILL.md"

if [ -f "$SHEPHERD" ]; then
    if grep -q "fresh-project" "$SHEPHERD"; then
        pass "shepherd SKILL.md: contains fresh-project routing entry"
    else
        fail "shepherd SKILL.md: missing fresh-project routing entry"
    fi

    if grep -q "scaffold" "$SHEPHERD"; then
        pass "shepherd SKILL.md: contains scaffold routing entry"
    else
        fail "shepherd SKILL.md: missing scaffold routing entry"
    fi
else
    fail "shepherd SKILL.md not found at $SHEPHERD"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Onboarding includes greenfield detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "5. Checking onboarding SKILL.md greenfield detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ONBOARDING="${PLUGIN_ROOT}/skills/onboarding/SKILL.md"

if [ -f "$ONBOARDING" ]; then
    if grep -q "Greenfield Detection" "$ONBOARDING"; then
        pass "onboarding SKILL.md: contains Greenfield Detection section"
    else
        fail "onboarding SKILL.md: missing Greenfield Detection section"
    fi
else
    fail "onboarding SKILL.md not found at $ONBOARDING"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: ${passed} passed · ${failed} failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$failed" -gt 0 ]; then
    exit 1
fi

exit 0
