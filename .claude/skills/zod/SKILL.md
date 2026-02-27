---
model: claude-sonnet-4-6
name: zod
description: Use when working with Zod for schema validation — form validation, API input parsing, environment variable validation, or TypeScript type inference from schemas. Also use when choosing a validation library or debugging Zod type errors.
---

# Zod

## Overview
Zod (v4.3.6, as of February 2026) is a TypeScript-first schema validation library with static type inference. v4 ships 14x faster string parsing and a ~57% smaller bundle vs v3.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 4.3.6 (stable) |
| **Install** | `npm install zod` |
| **Import** | `import { z } from "zod"` |
| **v4 subpath** | `import { z } from "zod/v4"` |
| **Mini (tree-shakable)** | `npm install @zod/mini` (~1.9 KB gz) |
| **Docs** | https://zod.dev |

## Schema Primitives

```typescript
z.string()        z.number()       z.boolean()
z.bigint()        z.date()         z.null()
z.undefined()     z.any()          z.unknown()
z.never()         z.void()         z.symbol()
z.literal("ok")   z.literal([200, 201, 204])  // v4: multi-value
z.enum(["a","b"]) z.nativeEnum(MyEnum)
z.coerce.number() // coerces via Number()
```

## parse() vs safeParse()

```typescript
// parse() — throws ZodError on failure
const data = schema.parse(input);

// safeParse() — never throws, check .success
const result = schema.safeParse(input);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

## z.infer Usage

```typescript
const UserSchema = z.object({ name: z.string(), age: z.number() });
type User = z.infer<typeof UserSchema>;       // { name: string; age: number }
type UserInput = z.input<typeof UserSchema>;   // pre-transform type
type UserOutput = z.output<typeof UserSchema>; // post-transform type
```

## Environment Validation Pattern

```typescript
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]),
  OPTIONAL_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `z.string().email()` in v4 | Use top-level `z.email()` (old form deprecated) |
| `z.object().strict()` in v4 | Use `z.strictObject()` instead |
| `z.object().merge()` in v4 | Use `.extend()` instead |
| `invalid_type_error` / `required_error` params | Replaced by unified `error` param in v4 |
| `schema.format()` / `schema.flatten()` | Deprecated — use `z.treeifyError(err)` |
| Forgetting `.parseAsync()` for async refinements | Sync `.parse()` will throw on async `.refine()` |
| `z.number()` accepting `Infinity` | v4 rejects infinite values by default |

## Full Reference

See `reference.md` in this skill directory for complete docs: primitives, objects, arrays, unions, refinements, transforms, error handling, type inference, env validation, form integration, API validation, advanced patterns, and v3→v4 migration.
