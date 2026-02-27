# Zod Reference

Version: **4.3.6** (stable as of February 2026). v4 released July 2025 on npm.
Import: `import { z } from "zod"` — v4 is now the package root default.
v3 still available at `import { z } from "zod/v4"` won't work — v3 lives at root only if you pin `"zod": "^3"`.

---

## Primitives

```typescript
z.string()
z.number()
z.bigint()
z.boolean()
z.date()
z.symbol()
z.undefined()
z.null()
z.void()        // undefined or void
z.any()         // no validation
z.unknown()     // requires type narrowing before use
z.never()       // always fails
```

### String validators

```typescript
z.string().min(1)
z.string().max(100)
z.string().length(10)           // exact length
z.string().regex(/^[a-z]+$/)
z.string().startsWith("https")
z.string().endsWith(".com")
z.string().includes("foo")
z.string().trim()               // trims whitespace before validation
z.string().toLowerCase()
z.string().toUpperCase()

// v4: top-level format validators (preferred)
z.email()
z.url()
z.uuid()
z.cuid()
z.cuid2()
z.ulid()
z.nanoid()
z.ipv4()
z.ipv6()
z.cidrv4()
z.cidrv6()
z.jwt()
z.base64()
z.base64url()       // v4: no padding allowed
z.iso.datetime()
z.iso.date()
z.iso.time()
z.iso.duration()

// v4 deprecation: z.string().email() still works but prefer top-level z.email()
```

### Number validators

```typescript
z.number().gt(5)
z.number().gte(5)       // alias: .min()
z.number().lt(10)
z.number().lte(10)      // alias: .max()
z.number().int()        // integers only — within safe integer range in v4
z.number().positive()
z.number().negative()
z.number().nonnegative()
z.number().nonpositive()
z.number().multipleOf(5)
z.number().finite()     // explicit — v4 rejects Infinity by default
// Note v4: .safe() behaves like .int() — only accepts safe integers
```

### Date validators

```typescript
z.date().min(new Date("2020-01-01"))
z.date().max(new Date())
```

### Literals

```typescript
z.literal("hello")
z.literal(42)
z.literal(true)
z.literal(null)
z.literal([200, 201, 204])  // v4: multi-value literal (any of)
```

### Coercion

```typescript
// Uses JavaScript constructors under the hood
z.coerce.string()     // String(input)
z.coerce.number()     // Number(input)
z.coerce.boolean()    // Boolean(input)
z.coerce.bigint()     // BigInt(input)
z.coerce.date()       // new Date(input)

// v4: stringbool for env-style booleans
z.stringbool()        // "true","yes","1","on" → true; "false","no","0","off" → false
```

---

## Objects & Arrays

### z.object

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.email(),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user"]).default("user"),
});
```

**Object methods:**

```typescript
// Add fields (non-destructive, returns new schema)
schema.extend({ phone: z.string().optional() });

// Pick/omit fields
schema.pick({ id: true, name: true });
schema.omit({ age: true });

// Make all fields optional / required
schema.partial();
schema.partial({ name: true });   // partial specific fields
schema.required();

// Access shape
schema.shape.email;               // ZodEmail schema

// Unknown keys behavior
z.object({ name: z.string() });             // strips unknown keys (default)
z.looseObject({ name: z.string() });        // v4: passes unknown keys through
z.strictObject({ name: z.string() });       // v4: errors on unknown keys

// v4 deprecation: .passthrough() → z.looseObject(); .strict() → z.strictObject()
// v4 deprecation: .merge() → .extend()

// Catchall for remaining keys
schema.catchall(z.string());     // all unknown keys must be string

// keyof
schema.keyof();                  // ZodEnum of object keys
```

### z.array

```typescript
z.array(z.string())
z.string().array()          // same thing, chained

z.array(z.number()).min(1)
z.array(z.number()).max(10)
z.array(z.number()).length(5)
z.array(z.string()).nonempty()   // v4: returns ZodArray not ZodTuple

// Spread
z.array(z.string()).rest(z.number())  // tuple with rest
```

### z.tuple

```typescript
z.tuple([z.string(), z.number(), z.boolean()])
z.tuple([z.string(), z.number()]).rest(z.string())  // variable-length
```

### z.record

```typescript
z.record(z.string(), z.number())     // Record<string, number>
z.record(z.enum(["a","b"]), z.string())  // constrained keys
```

### z.map

```typescript
z.map(z.string(), z.number())   // Map<string, number>
```

### z.set

```typescript
z.set(z.string())
z.set(z.string()).min(1).max(5).size(3)
```

---

## Unions

### z.union

Tries each schema in order. First match wins.

```typescript
const StringOrNumber = z.union([z.string(), z.number()]);
// Shorthand:
const StringOrNumber = z.string().or(z.number());
```

### z.discriminatedUnion

Faster than `z.union` — uses discriminator key to find the right schema directly.

```typescript
const Shape = z.discriminatedUnion("type", [
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("rect"), width: z.number(), height: z.number() }),
]);

// v4: discriminators support unions, pipes, and compositions as discriminators
```

### z.intersection

Both schemas must match. Use sparingly — `.extend()` is usually better for objects.

```typescript
const AB = z.intersection(SchemaA, SchemaB);
const AB = SchemaA.and(SchemaB);  // shorthand
```

### z.xor (v4)

Exactly one of the schemas must match.

```typescript
const Exclusive = z.xor(SchemaA, SchemaB);
```

### z.enum

```typescript
const Direction = z.enum(["north", "south", "east", "west"]);
type Direction = z.infer<typeof Direction>;  // "north" | "south" | "east" | "west"
Direction.options;  // ["north", "south", "east", "west"]
Direction.enum.north;  // "north"

// From native TypeScript enum
enum Color { Red, Green, Blue }
const ColorSchema = z.nativeEnum(Color);
```

---

## Refinements & Transforms

### .refine()

Custom validation. Return `true` to pass, `false` to fail.

```typescript
const EvenNumber = z.number().refine((n) => n % 2 === 0, {
  message: "Must be even",
});

// Async refinement — requires .parseAsync()
const UniqueEmail = z.string().email().refine(
  async (email) => !(await emailExists(email)),
  { message: "Email already taken" }
);

// v4: refinements live inside schemas, not wrapped in ZodEffects
// So you can chain: .refine().min().refine()
```

### .superRefine()

Multiple issues, path control, fatal flags.

```typescript
const PasswordSchema = z.object({
  password: z.string(),
  confirm: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords must match",
      path: ["confirm"],
    });
  }
  if (data.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 8,
      type: "string",
      inclusive: true,
      message: "Password must be at least 8 characters",
    });
  }
});
```

### .check() (v4)

Low-level, high-performance validation. Used internally by built-in validators.

```typescript
const schema = z.string().check((ctx) => {
  if (ctx.value.length > 10) {
    ctx.addIssue({ code: "too_big", maximum: 10, type: "string", inclusive: true });
  }
});
```

### .transform()

Mutates the output type. `z.input<>` and `z.output<>` differ after transform.

```typescript
const TrimmedString = z.string().trim().transform((s) => s.toLowerCase());
type In = z.input<typeof TrimmedString>;   // string
type Out = z.output<typeof TrimmedString>; // string (same here, but relevant for type changes)

// Transforming to a different type
const StringToNumber = z.string().transform((s) => parseInt(s, 10));
type In2 = z.input<typeof StringToNumber>;   // string
type Out2 = z.output<typeof StringToNumber>; // number
```

### .overwrite() (v4)

Transform that doesn't change the inferred type.

```typescript
const schema = z.string().overwrite((s) => s.trim());
type T = z.infer<typeof schema>;  // still string
```

### .preprocess()

Transforms *before* parsing. Runs first regardless of type.

```typescript
const FlexNumber = z.preprocess(
  (val) => (typeof val === "string" ? parseFloat(val) : val),
  z.number()
);
```

### .pipe()

Chain schemas. Output of first feeds input of second.

```typescript
const schema = z.string()
  .transform((s) => parseInt(s, 10))
  .pipe(z.number().min(0).max(100));
```

### .default() / .catch()

```typescript
z.string().default("hello")            // use default when input is undefined
z.string().catch("fallback")           // use fallback on any parse failure
z.string().default(() => uuid())       // factory function form
```

### .optional() / .nullable() / .nullish()

```typescript
z.string().optional()   // string | undefined
z.string().nullable()   // string | null
z.string().nullish()    // string | null | undefined
```

### .unwrap()

Remove optional/nullable wrapper and get inner schema.

```typescript
z.string().optional().unwrap()   // → ZodString
z.string().nullable().unwrap()   // → ZodString
```

---

## Error Handling

### ZodError structure

```typescript
try {
  schema.parse(input);
} catch (e) {
  if (e instanceof z.ZodError) {
    e.issues;   // ZodIssue[]
    // Each issue: { code, message, path: (string|number)[], ...extra }
  }
}
```

### safeParse / safeParseAsync

```typescript
const result = schema.safeParse(input);
// { success: true, data: T } | { success: false, error: ZodError }

if (!result.success) {
  result.error.issues.forEach((issue) => {
    console.log(issue.path.join("."), issue.message);
  });
}
```

### Error formatting (v4)

```typescript
// v4: z.prettifyError — user-friendly string
const message = z.prettifyError(error);

// v4: z.treeifyError — nested object mirroring schema shape
const tree = z.treeifyError(error);

// v4 deprecated: .format(), .flatten(), .addIssue()
// Still works but prefer treeifyError
const flat = error.flatten();    // { fieldErrors, formErrors }
const fmt = error.format();      // nested { _errors: string[] }
```

### Custom error messages (v4)

```typescript
// v4: unified `error` param (replaces message/invalid_type_error/required_error)
z.string({ error: "Must be a string" })
z.string({ error: (issue) => issue.input === undefined ? "Required" : "Must be a string" })

z.string().min(3, { error: "Too short" })
z.string().min(3, { error: (issue) => `Got ${issue.input?.length}, need 3` })

// v3 style (deprecated in v4 but still works)
z.string({ invalid_type_error: "Not a string", required_error: "Required" })
```

---

## Type Inference

```typescript
// Extract TypeScript type from schema
type User = z.infer<typeof UserSchema>;

// Input type (pre-transform) — what you pass to .parse()
type UserInput = z.input<typeof UserSchema>;

// Output type (post-transform) — what .parse() returns
type UserOutput = z.output<typeof UserSchema>;

// Practical: export both schema and type from validation module
export const UserSchema = z.object({ name: z.string(), id: z.string().uuid() });
export type User = z.infer<typeof UserSchema>;
```

---

## Environment Validation

Standard pattern for Next.js / Node.js env validation:

```typescript
// lib/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  // Required
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.url(),

  // With defaults
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Optional
  SENTRY_DSN: z.url().optional(),
  REDIS_URL: z.string().optional(),

  // Boolean env vars (v4)
  ENABLE_FEATURE_FLAG: z.stringbool().default(false),
  // or v3-style:
  ENABLE_FEATURE_FLAG_V3: z.string().transform((s) => s === "true").default("false"),
});

export const env = EnvSchema.parse(process.env);

// Fail fast at startup with clear error message
// If parse() throws, process exits with descriptive ZodError
```

**For Next.js with t3-env pattern:**

```typescript
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "production", "test"]),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: process.env,
});
```

---

## Form Integration

### React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
type LoginFormData = z.infer<typeof LoginSchema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <input type="password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}
    </form>
  );
}
```

### Server-side form (Next.js Server Actions)

```typescript
// actions/login.ts
"use server";
import { redirect } from "next/navigation";

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function loginAction(formData: FormData) {
  const result = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: z.treeifyError(result.error) };
  }

  // proceed with result.data
}
```

---

## API Validation

### Express / Hono middleware

```typescript
// middleware/validate.ts
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: result.error.issues,
      });
    }
    req.body = result.data;  // replace with parsed/coerced data
    next();
  };
}

// Usage
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(["admin", "user"]).default("user"),
});

app.post("/users", validateBody(CreateUserSchema), (req, res) => {
  const user: z.infer<typeof CreateUserSchema> = req.body;
  // ...
});
```

### tRPC input validation

```typescript
import { z } from "zod";
import { publicProcedure, router } from "./trpc";

export const userRouter = router({
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.email(),
    }))
    .mutation(async ({ input }) => {
      // input is fully typed
      return db.user.create({ data: input });
    }),

  getById: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input: id }) => {
      return db.user.findUnique({ where: { id } });
    }),
});
```

### JSON Schema export (v4)

```typescript
const schema = z.object({ name: z.string(), age: z.number() });
const jsonSchema = z.toJSONSchema(schema);
// Use for OpenAPI docs, form generation, etc.
```

---

## Advanced

### Recursive schemas

```typescript
// v4: use getter pattern for proper type inference (no casting needed)
type Category = {
  name: string;
  subcategories: Category[];
};

const CategorySchema: z.ZodType<Category> = z.object({
  name: z.string(),
  get subcategories() {
    return z.array(CategorySchema);
  },
});
```

### Branded types

Nominal typing — prevents accidental misuse of structurally identical types.

```typescript
const UserId = z.string().uuid().brand("UserId");
type UserId = z.infer<typeof UserId>;  // string & { __brand: "UserId" }

const PostId = z.string().uuid().brand("PostId");
type PostId = z.infer<typeof PostId>;

// TypeScript will error if you pass PostId where UserId expected
function getUser(id: UserId) {}
const id = UserId.parse("123e4567-e89b-12d3-a456-426614174000");
getUser(id);  // ✓
getUser("raw-string");  // ✗ TypeScript error
```

### z.lazy (for circular references, pre-v4 style)

```typescript
// v3 compatible pattern, still works in v4
interface Node {
  value: number;
  children: Node[];
}

const NodeSchema: z.ZodType<Node> = z.lazy(() =>
  z.object({
    value: z.number(),
    children: z.array(NodeSchema),
  })
);
```

### Schema composition patterns

```typescript
// Base schema for DB entities
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Extend for domain types
const UserSchema = BaseEntitySchema.extend({
  name: z.string(),
  email: z.email(),
});

// Create/update variants
const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });
const UpdateUserSchema = CreateUserSchema.partial();

type User = z.infer<typeof UserSchema>;
type CreateUser = z.infer<typeof CreateUserSchema>;
type UpdateUser = z.infer<typeof UpdateUserSchema>;
```

### Schema metadata (v4)

```typescript
const schema = z.string().email().meta({
  title: "Email address",
  description: "Primary contact email",
  examples: ["user@example.com"],
});

// Global registry
import { globalRegistry } from "zod";
globalRegistry.add(schema, { id: "email-field" });
const found = globalRegistry.get(schema);
```

### Async parsing

```typescript
// Required when schema contains async .refine() or .superRefine()
const result = await schema.parseAsync(input);
const result = await schema.safeParseAsync(input);
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `z.string().email()` in v4 | Use top-level `z.email()` — old form deprecated |
| `z.object().strict()` in v4 | Use `z.strictObject()` |
| `z.object().passthrough()` in v4 | Use `z.looseObject()` |
| `schema.merge(other)` in v4 | Use `schema.extend(other.shape)` |
| `invalid_type_error` / `required_error` | Unified `error` param: `z.string({ error: "msg" })` |
| `error.format()` / `error.flatten()` | Prefer `z.treeifyError(error)` in v4 |
| `.parse()` with async `.refine()` | Use `.parseAsync()` — sync parse throws |
| `z.number()` accepting `Infinity` | v4 rejects by default; add `.finite()` to opt back in |
| Forgetting to export the type | `export type User = z.infer<typeof UserSchema>` alongside schema |
| Env vars without coerce | Use `z.coerce.number()` — env vars are always strings |
| `z.any()` for unknown API data | Use `z.unknown()` — forces explicit narrowing, safer |
| `.optional()` vs `.default()` | `.optional()` → `T \| undefined`; `.default()` → always `T` |

---

## v3 → v4 Migration Quick Reference

| v3 | v4 |
|----|-----|
| `z.string().email()` | `z.email()` |
| `z.string().url()` | `z.url()` |
| `z.string().uuid()` | `z.uuid()` |
| `z.object().strict()` | `z.strictObject()` |
| `z.object().passthrough()` | `z.looseObject()` |
| `schema.merge(other)` | `schema.extend(other.shape)` |
| `{ invalid_type_error, required_error }` | `{ error: "msg" \| (issue) => string }` |
| `error.format()` | `z.treeifyError(error)` |
| `error.flatten()` | `z.treeifyError(error)` |
| `z.nonempty()` returns tuple-like | Returns regular array in v4 |
| `z.function()` is a schema | v4: `z.function()` is a factory — use `.implement()` |
| `Infinity` passes `z.number()` | v4 rejects by default |

**Automated migration:** `npx zod-v3-to-v4` handles most mechanical transforms.
