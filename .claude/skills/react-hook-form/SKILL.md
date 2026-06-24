---
model: claude-sonnet-4-6
name: react-hook-form
description: Use when building forms in React with React Hook Form — registration, validation, error handling, or complex multi-step forms. Also use when integrating forms with Zod, shadcn/ui, or server actions.
---

## Overview

React Hook Form v7.71+ — performant, uncontrolled forms. Minimal re-renders. Native HTML inputs by default; `Controller` for external UI libs. Zod resolver for type-safe validation.

## Install

```bash
npm i react-hook-form @hookform/resolvers zod
```

## useForm + register Pattern

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

<form onSubmit={handleSubmit((data) => console.log(data))}>
  <input {...register('email', { required: 'Email required' })} />
  {errors.email && <p>{errors.email.message}</p>}
</form>
```

## Zod Resolver Setup

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ email: z.string().email(), age: z.number().min(18) });
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: '', age: 18 },
});
```

## Error Display

```tsx
{errors.email && <p role="alert">{errors.email.message}</p>}

// FormStateSubscribe — targeted re-render (v7.54+)
<FormStateSubscribe control={control} name="email"
  render={({ errors }) => <span>{errors.email?.message}</span>}
/>
```

## useFieldArray

```tsx
const { fields, append, remove } = useFieldArray({ control, name: 'items' });

{fields.map((field, i) => (
  <div key={field.id}>                          {/* use field.id, not index */}
    <input {...register(`items.${i}.name`)} />
    <button type="button" onClick={() => remove(i)}>Remove</button>
  </div>
))}
<button type="button" onClick={() => append({ name: '' })}>Add</button>
```

## Controller (External UI Components)

```tsx
<Controller
  name="country"
  control={control}
  render={({ field }) => <Select {...field} options={countries} />}
/>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `key={index}` on field array | Always use `key={field.id}` |
| `setValue` on field arrays | Use `replace` API instead |
| No `defaultValues` | Always provide — prevents uncontrolled→controlled warnings |
| Nesting `<form>` | HTML spec violation — use `useFormContext` for sub-components |
| Forgetting `type="button"` | Every non-submit button needs it to avoid accidental submit |

## Full Reference

See `reference.md` for: setup, Zod validation, error handling, controlled components, field arrays, multi-step forms, shadcn/ui integration, server actions, performance, testing, common mistakes.
