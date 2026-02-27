#!/usr/bin/env bash
# UserPromptSubmit hook: injects skill-first policy on every user message.
# Known issue: Claude Code ≤ v2.1.49 shows "UserPromptSubmit hook error" in UI
# (github.com/anthropics/claude-code/issues/13912) but the content still reaches
# Claude's context. Cosmetic error — enforcement works.

cat <<'EOF'
CRITICAL CONSTRAINT — SKILL-FIRST POLICY: You MUST invoke an armadillo skill via the Skill tool BEFORE taking any action. DO NOT skip skills. DO NOT go straight to tools. Action-to-skill mapping: creating PR → writing-prs | debugging → systematic-debugging | new feature → brainstorming then test-driven-development | finishing branch → finishing-a-development-branch | code review → requesting-code-review | planning → writing-plans | executing plan → executing-plans | multiple tasks → dispatching-parallel-agents | subagent work → subagent-driven-development. If unsure which skill → invoke armadillo-shepherd. Plan and Explore agents are BLOCKED. EnterPlanMode is BLOCKED. gh pr create is BLOCKED without writing-prs skill. VISUAL STYLE MANDATE: Every skill MUST announce with a box frame: ┏━ [emoji] skill-name ━━━━━━━━━━━━━━━━━━━━━━━┓ with a one-line summary inside. Use category emojis: 🧠 Creative/Planning, ⚡ Execution, 🔧 Implementation, 🔍 Debugging, 🚀 Delivery, 🛡 Meta, 📋 Review. Use status markers: ✓ pass, ✗ fail, ○ pending, ● active. Use flow markers: ▸ next action, → result, ▪ bullet. End completed work with: ● ahh, that felt good didn't it?
EOF

exit 0
