# PR Format

When creating any pull request (`gh pr create`), follow these rules.

## PR Title
Conventional commits: `<type>(<scope>): <description>` — under 70 chars, lowercase after colon, no period.

Types: feat, fix, refactor, test, docs, chore, perf. Use `!` for breaking: `feat!: remove auth export`.

## PR Body — Required Sections
1. **Why** — one sentence, link issue if exists
2. **Changes** — bullet points describing outcomes (not file names)
3. **Test plan** — specific commands + manual verification steps
4. **Links** — closes/relates to issues

## Conditional Sections
- **Review guide** — file:line + focus table (when 3+ files changed)
- **Breaking changes** — what broke + migration path (when applicable)
- **Screenshots** — before/after table (when UI changed)

## Footer
Always end with: `Generated with [Claude Code](https://claude.com/claude-code)`

## Never
- Restate the diff in prose
- Use emoji section headers
- Write "Tests pass" without specifying which command
- Skip the Why section
- Put all details in the title

## Always
- Use HEREDOC for `gh pr create --body`
- Prefix with `env -u GITHUB_TOKEN`
- Use the `writing-prs` skill for full guidance
