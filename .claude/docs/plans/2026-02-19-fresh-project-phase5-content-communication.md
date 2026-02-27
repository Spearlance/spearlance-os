# Fresh Project System — Phase 5: Content + Communication

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 7 reference skills covering CMS, email, file storage, and monorepo tooling.

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle. No new agents needed — CMS skills route through frontend-dev-guide, email/storage through backend-guide.

**Tech Stack:** Sanity, Payload CMS, Resend, React Email, Uploadthing, S3/Cloudflare R2, Turborepo

**Depends on:** Phase 1 complete

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: sanity

**Files:**
- Create: `.claude/skills/sanity/SKILL.md`
- Create: `.claude/skills/sanity/reference.md`
- Create: `.claude/skills/sanity/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: sanity
description: Use when working with Sanity CMS — content modeling, GROQ queries, Sanity Studio customization, or real-time content. Also use when choosing a headless CMS or integrating Sanity with Next.js or Astro.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Sanity v3 with a Next.js App Router project. Show me: creating a Sanity project, embedding Sanity Studio as a Next.js route, defining a blog schema (post, author, category), and fetching content with GROQ."

**Q2 (Common Operation):** "Build a complete content model for an agency website: pages (with portable text body, SEO metadata), services, team members, testimonials, and a settings singleton for site-wide config. Show me the schemas and the GROQ queries for the main pages."

**Q3 (Gotcha/Limits):** "What are the Sanity gotchas? Cover: the GROQ learning curve, portable text rendering complexity, image URL building with the CDN, real-time preview setup, and the pricing model (free tier is generous but watch API CDN requests)."

**Q4 (Recent Change):** "What's new in Sanity in 2025-2026? Cover: Sanity Create, Content Lake, Sanity TypeGen, any pricing changes, and Studio v3 improvements."

### Research queries:
- `"Sanity" CMS changelog 2025 2026`
- `"Sanity" Next.js App Router setup v3`
- `"Sanity" GROQ query language reference`
- `"Sanity" pricing 2026 free tier`
- `"Sanity" vs Contentful vs Payload comparison`
- `site:sanity.io/docs` — verify via WebFetch

### reference.md sections:
1. Setup (project creation, Next.js embedded Studio, Astro integration)
2. Content Modeling (schemas: document, object, array, reference, slug)
3. GROQ Queries (syntax, projections, joins, ordering, pagination)
4. Portable Text (schema, rendering with @portabletext/react)
5. Images (image schema, URL builder, CDN hotspot/crop)
6. Studio Customization (Structure Builder, custom components, plugins)
7. TypeScript (sanity-typegen, typed GROQ queries)
8. Preview & Draft Mode (real-time preview, Next.js draft mode)
9. Webhooks & API
10. Pricing & Limits
11. Common Mistakes

---

## Task 2: payload

**Files:**
- Create: `.claude/skills/payload/SKILL.md`
- Create: `.claude/skills/payload/reference.md`
- Create: `.claude/skills/payload/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: payload
description: Use when working with Payload CMS — collection configuration, field types, access control, or Next.js integration. Also use when choosing a code-first CMS or self-hosting a headless CMS.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Payload CMS 3.0 with Next.js. Show me: initializing the project, defining collections for blog posts and authors, configuring the admin panel, and querying data from Next.js pages."

**Q2 (Common Operation):** "Build a Payload CMS backend for an e-commerce site: products (with variants, images, rich text description), categories (hierarchical), orders, and users with role-based access (admin, editor, customer). Show me the collection configs and access control functions."

**Q3 (Gotcha/Limits):** "What are the Payload CMS gotchas? Cover: the self-hosted nature (you manage the database and hosting), the relationship between Payload and Next.js (shared process), migration handling when schemas change, and performance with large collections."

**Q4 (Recent Change):** "What's new in Payload 3.0? Cover: the Next.js native integration, the new admin UI, database adapter changes (Postgres support), and breaking changes from Payload 2.x."

### Research queries:
- `"Payload CMS" 3.0 changelog 2025 2026`
- `"Payload CMS" Next.js setup`
- `"Payload CMS" access control patterns`
- `"Payload CMS" vs Sanity vs Strapi comparison`
- `"Payload CMS" self-hosted deployment`
- `site:payloadcms.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (create-payload-app, Next.js integration, config)
2. Collections (config, fields, hooks, access control)
3. Field Types (text, richText, upload, relationship, array, blocks, tabs)
4. Access Control (collection-level, field-level, function patterns)
5. Hooks (beforeChange, afterChange, beforeRead, etc.)
6. Admin Panel (customization, components, live preview)
7. Queries (Local API, REST API, GraphQL)
8. Authentication (built-in auth, email verification)
9. Upload & Media
10. Database (Postgres adapter, MongoDB adapter, migrations)
11. Deployment (self-hosted, Docker, Vercel)
12. Common Mistakes

---

## Task 3: resend

**Files:**
- Create: `.claude/skills/resend/SKILL.md`
- Create: `.claude/skills/resend/reference.md`
- Create: `.claude/skills/resend/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: resend
description: Use when sending emails with Resend — transactional emails, domain setup, React Email templates, or webhook handling. Also use when choosing an email service or integrating email into a web application.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Resend for sending transactional emails from a Next.js app. Show me: API key setup, sending a basic email, domain verification, and using Resend with React Email templates."

**Q2 (Common Operation):** "Build a complete email system with Resend: welcome email on signup, password reset, order confirmation, and a weekly digest. Show me: the API calls, React Email templates for each, and how to handle email delivery webhooks."

**Q3 (Gotcha/Limits):** "What are the Resend gotchas? Cover: the sandbox mode limitations, domain DNS setup (SPF, DKIM, DMARC), email deliverability best practices, rate limits, and the difference between the free and pro tiers."

**Q4 (Recent Change):** "What's new with Resend in 2025-2026? Cover: batch sending, Audiences (marketing emails), any new API features, and pricing changes."

### Research queries:
- `"Resend" email changelog 2025 2026`
- `"Resend" Next.js setup React Email`
- `"Resend" pricing 2026 free tier`
- `"Resend" domain verification DNS`
- `"Resend" vs SendGrid vs Postmark comparison`
- `site:resend.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (API key, SDK installation, environment config)
2. Sending Emails (send, batch, schedule)
3. React Email Templates (components, styling, preview)
4. Domain Verification (DNS records, SPF, DKIM, DMARC)
5. Webhooks (delivery events, bounce handling)
6. Audiences (marketing emails, contacts)
7. Attachments
8. Error Handling (retry, rate limits)
9. Pricing & Limits
10. Common Mistakes

---

## Task 4: react-email

**Files:**
- Create: `.claude/skills/react-email/SKILL.md`
- Create: `.claude/skills/react-email/reference.md`
- Create: `.claude/skills/react-email/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: react-email
description: Use when building email templates with React Email — component library, styling, preview server, or rendering to HTML. Also use when creating responsive email layouts or debugging email rendering across clients.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up React Email in a Next.js project. Show me: project structure for email templates, the preview server, and how to render a template to HTML for sending with Resend or any email service."

**Q2 (Common Operation):** "Build a professional transactional email with React Email: company header with logo, a main content section with dynamic data (order details), a CTA button, and a footer with unsubscribe link. Must look good in Gmail, Outlook, and Apple Mail."

**Q3 (Gotcha/Limits):** "What are the React Email gotchas? Cover: the limited CSS support in emails (no flexbox in Outlook, table-based layouts), inline styles vs Tailwind for Email, image hosting, and testing across email clients."

**Q4 (Recent Change):** "What's new in React Email in 2025-2026? Cover: new components, Tailwind support improvements, and the render API."

### Research queries:
- `"React Email" changelog 2025 2026`
- `"React Email" components reference`
- `"React Email" Tailwind support`
- `"React Email" Outlook compatibility`
- `site:react.email/docs` — verify via WebFetch

### reference.md sections:
1. Setup (installation, project structure, preview server)
2. Components (Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Img, Hr)
3. Styling (inline styles, Tailwind for Email, responsive patterns)
4. Rendering (render() to HTML string)
5. Layout Patterns (table-based for Outlook, modern for others)
6. Dynamic Content (props, conditional sections, loops)
7. Images (hosting, sizing, alt text)
8. Email Client Compatibility (Gmail, Outlook, Apple Mail quirks)
9. Testing (preview server, Litmus/Email on Acid)
10. Common Mistakes

---

## Task 5: uploadthing

**Files:**
- Create: `.claude/skills/uploadthing/SKILL.md`
- Create: `.claude/skills/uploadthing/reference.md`
- Create: `.claude/skills/uploadthing/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: uploadthing
description: Use when implementing file uploads with Uploadthing — type-safe uploads, image processing, or file management in Next.js or React applications. Also use when choosing a file upload solution or handling user-generated content.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Uploadthing in a Next.js App Router project. Show me: the core.ts file router, the API route, the upload button/dropzone components, and how to handle upload completion with metadata."

**Q2 (Common Operation):** "Build an image upload system with Uploadthing: allow users to upload profile pictures (max 4MB, images only), show upload progress, display the uploaded image, and delete files. Include server-side validation and the database integration pattern."

**Q3 (Gotcha/Limits):** "What are the Uploadthing gotchas? Cover: the file size limits per plan, the callback URL requirement (must be publicly accessible — problem for localhost), image processing/resizing capabilities, and how files are stored (their infra vs your own S3)."

**Q4 (Recent Change):** "What's new in Uploadthing in 2025-2026? Cover: UTApi changes, new file types support, pricing model, and any breaking changes."

### Research queries:
- `"Uploadthing" changelog 2025 2026`
- `"Uploadthing" Next.js App Router setup`
- `"Uploadthing" pricing file storage`
- `"Uploadthing" image upload validation`
- `site:docs.uploadthing.com` — verify via WebFetch

### reference.md sections:
1. Setup (core.ts file router, API route, environment)
2. File Router (FileRoute, middleware, onUploadComplete)
3. Components (UploadButton, UploadDropzone, useUploadThing hook)
4. Upload Progress & States
5. File Validation (type, size, count limits)
6. Server-Side (UTApi — list, delete, rename)
7. Database Integration (storing file URLs, relating to records)
8. Image Processing (if available)
9. Pricing & Limits
10. Common Mistakes

---

## Task 6: s3-cloudflare-r2

**Files:**
- Create: `.claude/skills/s3-cloudflare-r2/SKILL.md`
- Create: `.claude/skills/s3-cloudflare-r2/reference.md`
- Create: `.claude/skills/s3-cloudflare-r2/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: s3-cloudflare-r2
description: Use when working with AWS S3 or Cloudflare R2 for object storage — file uploads, presigned URLs, bucket policies, or CDN integration. Also use when choosing between S3 and R2 or implementing direct-to-storage uploads.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up the AWS SDK v3 for S3 in a Node.js/TypeScript project. Show me: client configuration, uploading a file, generating a presigned URL for direct upload, and listing objects. Also show the equivalent for Cloudflare R2 (same SDK, different config)."

**Q2 (Common Operation):** "Build a presigned URL upload flow: the backend generates a presigned PUT URL, the frontend uploads directly to S3/R2 (bypassing your server), and then notifies the backend on completion. Show me: the API endpoint, the frontend upload code, and CORS configuration."

**Q3 (Gotcha/Limits):** "What are the S3/R2 gotchas? Cover: CORS configuration headaches, presigned URL expiry, the difference between S3 and R2 API compatibility (what R2 doesn't support), egress costs (S3 vs R2's zero egress), and IAM policy best practices."

**Q4 (Recent Change):** "Compare S3 and Cloudflare R2 pricing as of 2026. Cover: storage costs, request costs, egress, and the break-even point where R2 becomes cheaper. Also any new S3/R2 features."

### Research queries:
- `"AWS S3" SDK v3 Node.js 2025 2026`
- `"Cloudflare R2" S3 compatible API`
- `"Cloudflare R2" vs "AWS S3" pricing comparison 2026`
- `"presigned URL" upload pattern S3`
- `"Cloudflare R2" CORS configuration`
- `site:docs.aws.amazon.com/s3` and `site:developers.cloudflare.com/r2` — verify via WebFetch

### reference.md sections:
1. S3 Setup (AWS SDK v3, credentials, client config)
2. R2 Setup (same SDK, account ID, access keys)
3. Basic Operations (put, get, delete, list, head)
4. Presigned URLs (upload, download, expiry)
5. Direct Upload Pattern (presigned PUT from frontend)
6. CORS Configuration (S3 bucket CORS, R2 CORS)
7. Bucket Policies (public read, restrict by IP/referrer)
8. CDN Integration (CloudFront for S3, R2 custom domains)
9. Multipart Upload (large files)
10. S3 vs R2 Comparison (pricing, features, compatibility)
11. Common Mistakes

---

## Task 7: turborepo

**Files:**
- Create: `.claude/skills/turborepo/SKILL.md`
- Create: `.claude/skills/turborepo/reference.md`
- Create: `.claude/skills/turborepo/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: turborepo
description: Use when managing monorepos with Turborepo — workspace setup, pipeline configuration, caching, or multi-package builds. Also use when deciding on a monorepo strategy or optimizing build times in a multi-package project.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up a Turborepo monorepo with pnpm workspaces: a Next.js app in apps/web, a shared UI library in packages/ui, and a shared config package in packages/config. Show me: the directory structure, root turbo.json, package.json workspaces, and internal package imports."

**Q2 (Common Operation):** "Configure Turborepo pipelines for: build (with dependencies), dev (parallel), lint, test, and typecheck. Show me the turbo.json configuration with proper task dependencies, outputs for caching, and environment variable passthrough."

**Q3 (Gotcha/Limits):** "What are the Turborepo gotchas? Cover: cache invalidation (when cached builds use stale deps), the difference between local and remote caching, internal packages vs published packages, and TypeScript path aliases across packages."

**Q4 (Recent Change):** "What's new in Turborepo in 2025-2026? Cover: Turbo 2.x changes, the new turbo.json format, Remote Cache improvements, and any changes to Vercel's Turborepo support."

### Research queries:
- `"Turborepo" changelog 2025 2026`
- `"Turborepo" pnpm workspaces setup`
- `"Turborepo" pipeline configuration`
- `"Turborepo" remote cache Vercel`
- `"Turborepo" vs Nx comparison 2026`
- `site:turbo.build/repo/docs` — verify via WebFetch

### reference.md sections:
1. Setup (create-turbo, existing repo conversion)
2. Workspaces (pnpm, npm, yarn — workspace config)
3. Pipeline Configuration (turbo.json tasks, dependencies, outputs)
4. Caching (local cache, outputs, inputs, environment variables)
5. Remote Caching (Vercel, self-hosted)
6. Internal Packages (shared code, TypeScript config, exports)
7. Task Dependencies (dependsOn, topological order)
8. Development (turbo dev, watching, filtering)
9. CI/CD (GitHub Actions integration, Docker builds)
10. Common Mistakes

---

## Task 8: Update skills.json with Phase 5 skills + bundles

**Files:**
- Modify: `skills.json`

**New bundles:**
```json
"cms": {
  "name": "Content Management",
  "description": "Sanity and Payload CMS — structured content for any frontend",
  "default": false,
  "skills": ["sanity", "payload"]
},
"email": {
  "name": "Email",
  "description": "Resend + React Email — modern transactional email with React components",
  "default": false,
  "skills": ["resend", "react-email"]
},
"storage": {
  "name": "File Storage",
  "description": "Uploadthing, S3, Cloudflare R2 — file uploads and object storage",
  "default": false,
  "skills": ["uploadthing", "s3-cloudflare-r2"]
}
```

**Add turborepo to tooling bundle:**
```json
"tooling": {
  "name": "Developer Tooling",
  "description": "ESLint/Prettier, Turborepo — code quality and monorepo builds",
  "default": false,
  "skills": ["eslint-prettier", "turborepo"]
}
```

**Commit:**
```bash
git add skills.json
git commit -m "feat: register Phase 5 content + communication skills and bundles"
```

---

## Summary

| Task | Skill | Type |
|------|-------|------|
| 1 | sanity | Reference (TDD) |
| 2 | payload | Reference (TDD) |
| 3 | resend | Reference (TDD) |
| 4 | react-email | Reference (TDD) |
| 5 | uploadthing | Reference (TDD) |
| 6 | s3-cloudflare-r2 | Reference (TDD) |
| 7 | turborepo | Reference (TDD) |
| 8 | skills.json update | Registry |

8 tasks · executing subagent-driven

**Parallelizable:** Tasks 1-2 (CMS) in parallel. Tasks 3-4 (email) in parallel. Tasks 5-6 (storage) in parallel. Task 7 independent. Task 8 after all.
