# Security Rules

## Secrets Management

- NEVER commit secrets, API keys, passwords, or tokens to any file.
- NEVER write credentials into source code. Use environment variables.
- You CAN read `.env` files. You MUST ask before writing or editing them.
- Store secrets in: `.env` (local dev), `.env.local` (local overrides), platform-specific env config (Vercel, Cloudflare, etc.).
- All `.env*` files must be in `.gitignore` — verify before committing.

## Input Validation

- Validate and sanitize ALL user input at the boundary layer (form submissions, API routes).
- API routes must validate request body before processing.
- Use schema validation (Zod, Joi, etc.) for runtime validation where applicable.
- Never trust client-side data — always re-validate server-side.

## Database Security

- Use parameterized queries via ORM (Drizzle, Prisma, Django ORM, etc.). NEVER string-concatenate SQL.
- SHA-256 hash all PII before storage or transmission to third-party APIs.
- No raw email or phone numbers in databases when sending to tracking APIs — hashed values only.

## API Security

- Use HTTPS for all external requests.
- Bearer tokens in Authorization header, never in query params.
- Implement rate limit awareness with exponential backoff for external APIs.
- Store API keys in environment variables, never in source code.

## PII Handling

- All PII (email, phone, name, address) must be SHA-256 hashed before:
  - Sending to ad platform APIs (Meta CAPI, Pinterest CAPI, etc.)
  - Sending to analytics APIs (GA4 Measurement Protocol, etc.)
- Normalize before hashing: lowercase, trim, E.164 for phone numbers.
- Respect GPC consent headers (`Sec-GPC: 1`) — skip marketing platforms when present.

## XSS Prevention

- Trust framework auto-escaping (React, Astro, Svelte, etc.).
- NEVER use `dangerouslySetInnerHTML`, `set:html`, or `{@html}` with user-supplied content.
- Escape all dynamic content rendered in HTML.
- Configure CSP headers for sensitive pages.

## Dependency Security

- Audit dependencies before adding new packages: `npm audit`.
- Check weekly downloads, last publish date, maintainer activity.
- Warn if package is >100KB (frontend bundle impact).
- Apply principle of least privilege to all service accounts and API keys.

## Logging

- Never log API tokens, secrets, or credentials in plain text.
- Redact PII in all log output.
- Log API errors for debugging but strip sensitive headers.
