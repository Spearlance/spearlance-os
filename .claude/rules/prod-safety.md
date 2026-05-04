# Production Safety Rules

When SpearlanceOS production project is in scope (`chikljxwgiskyjsnjelf`), these rules apply with no exceptions.

## The Two Refs

| Env | Ref | Color | Where it lives |
|-----|-----|-------|----------------|
| Production | `chikljxwgiskyjsnjelf` | 🔴 | os.spearlance.com |
| Development | `zlljsdaxsggkasvympku` | 🟢 | persistent branch on prod project (forked schema, isolated DB) |

The dev branch is a Supabase Branching feature — it shares billing and admin with prod, but its database, edge functions, and auth users are completely isolated.

## The Firewall

`.claude/hooks/prod-firewall.sh` is a PreToolUse Bash hook that blocks dangerous Supabase commands at the tool layer. It activates when:

| Trigger | Action |
|---------|--------|
| `supabase db reset` + prod ref | BLOCK — never allowed (no escape valve) |
| `supabase db reset --linked` | BLOCK — link could be prod |
| `supabase db push` + prod ref + no confirmation | BLOCK |
| `supabase db push --linked` + no confirmation | BLOCK |
| `deploy-functions --env prod --all` + no confirmation | BLOCK |
| `DROP TABLE` / `TRUNCATE` / `DELETE FROM` referencing prod ref | BLOCK |

Read-only operations (`db query SELECT`, `projects list`, `branches list`, `functions list`) are always allowed.

## The Escape Valve

When you genuinely need to run a destructive command on prod:

```bash
npm run prod:confirm           # type 'PRODUCTION' (exact case)
export ARMADILLO_PROD_CONFIRMED=1
# now re-run your command in the same shell session
```

The flag is per-shell-session — opening a new terminal resets it. Intentional friction.

**`db reset` against prod has NO escape valve.** It is refused unconditionally.

## Always Use Explicit `--project-ref`

The Supabase CLI's "linked" state can drift between sessions. Always pass `--project-ref` for any destructive command:

```bash
# ❌ Wrong — relies on link state
npx supabase db push --linked

# ✓ Correct — impossible to hit wrong project
npx supabase db push --project-ref zlljsdaxsggkasvympku
```

## Verify Current Link

Before any DB operation:

```bash
npm run db:current
```

Shows 🔴 PRODUCTION or 🟢 DEVELOPMENT (branch). Default to dev branch.

## Vercel Rules

- Production-scoped env vars: NEVER edited via Claude. User-only operation.
- Preview-scoped env vars: editable, points at the dev branch
- The Production column in Vercel's env vars table should be visually identical before and after any preview-scope work

## Stripe Rules

- Dev `.env.local` and dev-branch Edge Function secrets: `sk_test_*` / `pk_test_*` keys ONLY
- `npm run dev` runs `predev` (when wired) which validates this
- Live keys (`sk_live_*`) refuse to load in dev — by design

## Branch-Specific Considerations

Because the dev environment is a branch on the prod project (not a separate project):

- **Project-level admin actions** (delete project, change billing, modify org settings) affect both prod and the branch. Always pause and confirm before any project-level change in the dashboard.
- **Branch deletion** is recoverable only by re-creating the branch and re-running `seed.sql` + re-setting secrets. Treat it as a destructive operation.
- **Edge function secrets are per-branch** — secrets set on the dev branch do not appear on prod, and vice versa.
- **Auth users are per-branch** — `dev@spearlance.com` exists on the branch, not on prod.

## When This Rule Is Inactive

This rule applies whenever the project is SpearlanceOS. There is no inactive state.
