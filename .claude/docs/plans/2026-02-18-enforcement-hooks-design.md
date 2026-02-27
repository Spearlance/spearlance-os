# Enforcement Hooks Design

## Problem

Claude bypasses armadillo skills by using built-in agents (Explore, Plan) and tools (EnterPlanMode) directly. The `using-armadillo` skill and CLAUDE.md rules request skill usage but have no enforcement mechanism. Claude can rationalize away skill usage and use built-in alternatives instead.

## Solution

Three PreToolUse/UserPromptSubmit hooks that deterministically block bypasses and inject skill awareness reminders. All hooks use `type: "command"` (shell scripts) for fast, reliable enforcement with no LLM judgment calls.

## Hooks

### Hook 1: Block EnterPlanMode

- **Event:** PreToolUse
- **Matcher:** `EnterPlanMode`
- **Type:** Inline command (no script file)
- **Action:** Exit 2 with stderr message directing Claude to use `writing-plans` skill
- **Rationale:** EnterPlanMode directly competes with the writing-plans skill. CLAUDE.md already says "Never use EnterPlanMode" but has no enforcement.

### Hook 2: Block Plan/Explore Task Dispatches

- **Event:** PreToolUse
- **Matcher:** `Task`
- **Type:** Shell script (`enforce-skills.sh`)
- **Action:** Parse `tool_input.subagent_type` from stdin JSON. Deny `Plan` and `Explore` types. Allow all others.
- **Blocked types:**
  - `Plan` → "Use writing-plans skill instead"
  - `Explore` → "Use Glob/Grep/Read directly, or invoke a matching skill"
- **Allowed types:** `general-purpose`, `Bash`, `code-reviewer`, all custom agent types
- **Rationale:** Plan agent directly competes with writing-plans skill. Explore agent competes with systematic-debugging and other skills. Skills should use Glob/Grep/Read directly instead of delegating to Explore.

### Hook 3: Skill Awareness Injection

- **Event:** UserPromptSubmit
- **Matcher:** None (fires on every prompt)
- **Type:** Shell script (`inject-skill-awareness.sh`)
- **Action:** Output JSON with `additionalContext` injecting a brief skill reminder
- **Content:** "REMINDER: Check armadillo skills before responding. Use Skill tool — never bypass with Explore/Plan agents or EnterPlanMode."
- **Rationale:** Reinforces session-start skill injection with a per-prompt reminder.

## Files

| Action | Path |
|--------|------|
| Create | `.claude/hooks/enforce-skills.sh` |
| Create | `.claude/hooks/inject-skill-awareness.sh` |
| Modify | `.claude/hooks/hooks.json` |
| Modify | `skills.json` (sharedFiles.hooks) |

## Architecture Decisions

- **PreToolUse over SubagentStart:** PreToolUse blocking is explicitly documented. SubagentStart event exists but blocking behavior is less certain.
- **Command over Prompt:** Deterministic enforcement. No LLM judgment needed — blocked types are hardcoded.
- **Plugin hooks.json over settings.json:** Ships with armadillo to every project. Enforcement is part of the armadillo package, not project-specific config.
- **Blocks ALL Plan/Explore including from skills:** Skills should use Glob/Grep/Read directly rather than dispatching generic agents. This is cleaner and avoids the complexity of detecting "is this dispatch from a skill or the main conversation."

## Testing

- Unit test shell scripts by piping JSON and checking exit codes + output
- Test EnterPlanMode blocking
- Test Plan/Explore agent blocking
- Test that other agent types (general-purpose, Bash, code-reviewer) pass through
- Test UserPromptSubmit context injection
