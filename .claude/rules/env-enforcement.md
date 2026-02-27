# ENV Enforcement

Never hardcode secrets, API keys, tokens, passwords, or configuration
values in source files. Always use environment variables.

## Always Reference Environment Variables

- `process.env.VARIABLE_NAME` in Node.js / Next.js
- `import.meta.env.VARIABLE_NAME` in Vite / Astro
- `os.environ.get('VARIABLE_NAME')` in Python / Django
- Never inline the actual value — even in "temporary" code

## .env.example Is the Source of Truth

When `.env.example` exists, it documents every required env var.
Before writing code that needs a new env var:
1. Add the variable name to `.env.example` (value empty for secrets)
2. Add the actual value to `.env` or `.env.local` (never committed)
3. Reference with the framework-appropriate env var accessor

## What Counts as a Secret

- **API keys:** Stripe, Resend, OpenAI, any third-party service key
- **Database URLs:** Connection strings with credentials
- **Auth secrets:** JWT secrets, session secrets, OAuth client secrets
- **Tokens:** Access tokens, refresh tokens, bearer tokens
- **Passwords:** Any password or passphrase
- **Private keys:** PEM files, signing keys

## .gitignore

All `.env*` files except `.env.example` must be in `.gitignore`:
- `.env`
- `.env.local`
- `.env.*.local`
- `.env.production`

## When Hardcoding Is OK

- `.env.example` itself (empty values or safe defaults like `PORT=3000`)
- Test files using obviously fake values (`"test_key_fake"`, `"sk_test_mock"`)
- Non-secret config that's truly static and public (e.g., `NODE_ENV=development` in docs)
