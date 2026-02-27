# Degrees of Freedom Reference

How much latitude to give Claude in a skill. Match the specificity to the task's fragility.

From Anthropic's official guide: "Think of Claude as a robot exploring a path. Narrow bridge with cliffs on both sides → low freedom. Open field with no hazards → high freedom."

## The Three Levels

### High Freedom (text-based, multiple valid approaches)

**Use when:**
- Multiple approaches are valid
- Decisions depend on runtime context
- Heuristics guide the approach
- Creativity or judgment matters

**Looks like:** Prose instructions, guidelines, principles, checklists.

**Example from armadillo:**
```markdown
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability
4. Verify adherence to project conventions
```

**Armadillo skills at this level:** `brainstorming` (exploration is open-ended), `receiving-code-review` (judgment-heavy analysis)

### Medium Freedom (pseudocode with parameters)

**Use when:**
- A preferred pattern exists but details vary
- Configuration affects behavior
- Structure matters but specifics depend on context

**Looks like:** Templates with fill-in sections, pseudocode, configurable scripts.

**Example from armadillo:**
```markdown
## Generate report

Use this template and customize as needed:
- ## Summary — [adapt to findings]
- ## Key Findings — [3-5 bullets]
- ## Recommendations — [actionable items]
```

**Armadillo skills at this level:** `writing-plans` (structure defined, content varies), `writing-skills` (template + checklist, content open)

### Low Freedom (specific scripts, exact steps)

**Use when:**
- Operations are fragile and error-prone
- Consistency is critical
- A specific sequence must be followed
- Deviation causes failure

**Looks like:** Exact commands, specific scripts, no-modification warnings.

**Example from armadillo:**
```markdown
## Database migration

Run exactly this script:
```bash
python scripts/migrate.py --verify --backup
```
Do not modify the command or add additional flags.
```

**Armadillo skills at this level:** `verification-before-completion` (exact gate function, no shortcuts), `finishing-a-development-branch` (exact git commands)

## Decision Framework

**"How fragile is this task?"**

| Fragility | Freedom | Example |
|-----------|---------|---------|
| High (deviation = failure) | Low | Database migrations, deployment scripts |
| Medium (preferred pattern) | Medium | Code generation, report templates |
| Low (many valid approaches) | High | Code review, brainstorming, analysis |

## Mixing Levels Within a Skill

Most skills use different levels for different sections:

- **When to Use** → High freedom (judgment about when to apply)
- **Core Process** → Medium freedom (structured but flexible)
- **Critical Steps** → Low freedom (exact commands, must follow)

Example: `subagent-driven-development` uses high freedom for "when to parallelize" (judgment call) but low freedom for "dispatch prompt template" (exact format required).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Low freedom for judgment tasks | Agent follows letter, misses spirit. Use high. |
| High freedom for fragile tasks | Agent improvises, breaks things. Use low. |
| Same level throughout | Mix levels — guidance where needed, freedom where safe. |
| Over-constraining creative tasks | Kill agent effectiveness. Trust Claude's judgment. |
| Under-constraining risky tasks | Agent takes shortcuts. Add specific guardrails. |
