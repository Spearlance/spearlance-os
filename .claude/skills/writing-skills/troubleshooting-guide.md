# Skill Troubleshooting Guide

Common problems when writing skills and how to fix them.

## Skill Not Invoked

**Symptom:** You say "use the X skill" or describe a scenario that should trigger X, but Claude doesn't load it.

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| Description too narrow | Add more trigger conditions and synonyms |
| Description too vague | Make triggers specific ("Use when..." not "Helps with...") |
| Description missing WHAT | Add what the skill does, not just when to use it |
| Name doesn't match mental model | Rename using gerund form (e.g., "testing-code" not "test-utils") |
| Competing skill has better match | Differentiate descriptions or merge skills |

**Diagnostic:** Read the skill's YAML frontmatter. Does the `description` match how you'd naturally ask for help? If you'd say "help me debug this", does the description mention "debug"?

## Skill Invoked but Steps Skipped

**Symptom:** Claude loads the skill but doesn't follow all steps. It takes shortcuts.

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| Description summarizes workflow | Remove HOW from description (CSO trap) |
| No enforcement mechanism | Add `<HARD-GATE>` tag for critical rules |
| Instructions feel advisory | Add rationalization table and red flags list |
| Too many steps | Consolidate or split into sub-skills |
| Steps aren't clearly separated | Use numbered lists, not prose paragraphs |

**Diagnostic:** Check if the description contains any workflow summary. Test: if you deleted the SKILL.md body and only had the description, could Claude "wing it"? If yes, the description leaks too much process.

## Skill Too Long (>500 Lines)

**Symptom:** SKILL.md exceeds 500 lines. Performance degrades.

**Fixes:**
1. Move heavy reference to separate files (e.g., `reference.md`, `api-docs.md`)
2. Keep SKILL.md as a "table of contents" pointing to detail files
3. Use `@filename.md` references for content Claude loads on-demand
4. Move examples to a separate `examples.md` if >3 examples

**Anthropic's guidance:** "Keep SKILL.md body under 500 lines for optimal performance. Split content into separate files when approaching this limit."

**Rule of thumb:** SKILL.md = overview + decision logic + critical rules. Everything else goes in linked files.

## Cross-Model Failures

**Symptom:** Skill works with Opus but fails with Haiku (or vice versa).

**Fixes:**

| Model | Common issue | Fix |
|-------|-------------|-----|
| Haiku | Skips steps, needs more guidance | Add more explicit instructions, lower freedom |
| Sonnet | Generally works but misses nuance | Clarify edge cases explicitly |
| Opus | Over-explains, adds unwanted extras | Use stronger YAGNI language |

**From Anthropic:** "What works perfectly for Opus might need more detail for Haiku. If you plan to use your Skill across multiple models, aim for instructions that work well with all of them."

**Testing approach:** Test each skill with the model you'll use it with. If you use Haiku for subagents, test with Haiku — not just Opus.

## Skill Rationalized Away

**Symptom:** Agent finds creative reasons to not follow the skill's rules.

**Fixes (escalating enforcement):**

1. **Add `<HARD-GATE>` tag** — Strongest prose enforcement
2. **Add rationalization table** — Explicitly counter every known excuse
3. **Add red flags list** — Help agent self-detect rationalization
4. **Add "spirit vs letter" statement** — Cut off "I'm following the spirit" arguments
5. **Add code enforcement** — Scripts that verify compliance programmatically

**Pressure testing:** Use 3+ combined pressures (time + sunk cost + authority) to verify. See `testing-skills-with-subagents.md` for methodology.

## Skill Creates Confusion

**Symptom:** Agent applies skill incorrectly or in wrong context.

**Fixes:**

| Cause | Fix |
|-------|-----|
| Ambiguous "When to Use" | Add "When NOT to Use" section with explicit exclusions |
| Similar to another skill | Add comparison flowchart (see SDD vs executing-plans example) |
| Examples too abstract | Replace with concrete, real-world examples |
| Missing decision logic | Add flowchart for non-obvious decisions |

## Quick Diagnostic Checklist

When a skill isn't working:

1. **Check description** — Does it say WHAT + WHEN (never HOW)?
2. **Check length** — Is SKILL.md under 500 lines?
3. **Check enforcement** — Does it have `<HARD-GATE>` for critical rules?
4. **Check examples** — Are they concrete and runnable?
5. **Check model** — Are you testing with the model you'll deploy with?
6. **Check references** — Are linked files one level deep from SKILL.md?
7. **Run pressure test** — Does the agent follow rules under combined pressures?
