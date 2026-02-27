# React Hook Form Reference

Version: 7.71+ (latest as of 2025). Check [npm](https://www.npmjs.com/package/react-hook-form) for updates.

---

## 1. Setup

```bash
npm i react-hook-form @hookform/resolvers zod
```

### Basic Form

```tsx
import { useForm } from 'react-hook-form';

type LoginForm = {
  email: string;
  password: string;
};

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    await signIn(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required' })} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register('password', { required: true, minLength: 8 })} />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

### useForm Options

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),          // validation strategy
  defaultValues: { name: '', age: 18 },  // always provide
  mode: 'onBlur',                         // 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all'
  reValidateMode: 'onChange',             // when to re-validate after first submit
  criteriaMode: 'firstError',             // 'firstError' | 'all' — stop at first vs collect all
  delayError: 500,                        // ms delay before showing errors
});
```

### register Options (built-in validation)

```tsx
register('field', {
  required: 'This field is required',
  minLength: { value: 2, message: 'Min 2 characters' },
  maxLength: { value: 100, message: 'Max 100 characters' },
  min: { value: 0, message: 'Must be positive' },
  max: { value: 120, message: 'Must be under 120' },
  pattern: { value: /^[A-Z]/, message: 'Must start with uppercase' },
  validate: (value) => value !== 'admin' || 'Username "admin" is reserved',
  validate: {                              // multiple validators
    noSpaces: (v) => !v.includes(' ') || 'No spaces allowed',
    notAdmin: (v) => v !== 'admin' || 'Reserved username',
  },
  setValueAs: (v) => parseInt(v),         // transform value before storing
  disabled: false,                         // value excluded from submission when disabled
  deps: ['confirmPassword'],              // trigger re-validation of deps on change
})
```

---

## 2. Validation with Zod Resolver

### Basic Schema

```tsx
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(2, 'Name too short').max(100),
  email: z.string().email('Invalid email'),
  age: z.number({ coerce: true }).min(18, 'Must be 18+'),
  website: z.string().url('Invalid URL').optional(),
  role: z.enum(['admin', 'user', 'guest']),
});

type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '', age: 18, role: 'user' },
});
```

### Conditional Validation

```tsx
const schema = z.object({
  accountType: z.enum(['personal', 'business']),
  companyName: z.string().optional(),
}).refine(
  (data) => data.accountType !== 'business' || !!data.companyName,
  { message: 'Company name required for business accounts', path: ['companyName'] }
);
```

### Password Confirmation

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords must match', path: ['confirmPassword'] }
);
```

### File Validation

```tsx
const schema = z.object({
  avatar: z.instanceof(FileList)
    .refine((f) => f.length > 0, 'File required')
    .refine((f) => f[0]?.size < 5 * 1024 * 1024, 'Max 5MB')
    .refine((f) => ['image/jpeg', 'image/png'].includes(f[0]?.type), 'JPEG/PNG only'),
});
```

### Other Resolvers

`yupResolver`, `joiResolver`, `valibotResolver` — same pattern: `resolver: yupResolver(schema)`.

---

## 3. Error Handling

### Basic Error Display

```tsx
const { formState: { errors } } = useForm();

// Single field
{errors.email && <p role="alert">{errors.email.message}</p>}

// Nested field
{errors.address?.city && <p>{errors.address.city.message}</p>}

// Array field
{errors.items?.[0]?.name && <p>{errors.items[0].name.message}</p>}
```

### FormStateSubscribe (v7.54+ — targeted re-renders)

Subscribes to one field's errors without re-rendering the whole form:

```tsx
import { useForm, FormStateSubscribe } from 'react-hook-form';

function MyForm() {
  const { register, control } = useForm<FormData>();

  return (
    <form>
      <input {...register('email')} />
      <FormStateSubscribe
        control={control}
        name="email"
        render={({ errors }) => <span>{errors.email?.message}</span>}
      />
    </form>
  );
}
```

### useFormState (hook version)

```tsx
import { useFormState } from 'react-hook-form';

function EmailError({ control }: { control: Control<FormData> }) {
  const { errors } = useFormState({ control, name: 'email' });
  return errors.email ? <p>{errors.email.message}</p> : null;
}
```

### Global Form Error (server errors)

```tsx
const { setError, formState: { errors } } = useForm();

// In submit handler:
try {
  await submitForm(data);
} catch (err) {
  setError('root.serverError', { message: err.message });
}

// In JSX:
{errors.root?.serverError && <Alert>{errors.root.serverError.message}</Alert>}
```

### Error Summary

```tsx
const { formState: { errors } } = useForm({ criteriaMode: 'all' });

// errors.email.types contains all failed validations
Object.entries(errors).map(([field, error]) => (
  <li key={field}>{error?.message}</li>
))
```

---

## 4. Controlled Components

Use `Controller` or `useController` for third-party components that don't expose a ref.

### Controller

```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="country"
  control={control}
  rules={{ required: 'Country required' }}
  render={({ field, fieldState }) => (
    <Select
      {...field}
      options={countryOptions}
      isInvalid={!!fieldState.error}
    />
  )}
/>
```

### useController (hook form)

```tsx
import { useController } from 'react-hook-form';

function PhoneInput({ control, name }: { control: Control; name: string }) {
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules: { required: true } });

  return (
    <div>
      <PhoneNumberInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
      />
      {error && <p>{error.message}</p>}
    </div>
  );
}
```

### field Object Properties

```tsx
// field provides:
field.name       // input name attribute
field.value      // current value
field.onChange   // value change handler
field.onBlur     // blur handler (triggers validation)
field.ref        // ref for focus management
field.disabled   // from register options

// fieldState provides:
fieldState.error        // current field error
fieldState.isDirty      // value differs from defaultValues
fieldState.isTouched    // field has been blurred
fieldState.invalid      // has an error
```

---

## 5. Field Arrays

### useFieldArray

```tsx
import { useForm, useFieldArray } from 'react-hook-form';

type FormData = { items: { name: string; quantity: number }[] };

function DynamicList() {
  const { control, register } = useForm<FormData>({
    defaultValues: { items: [{ name: '', quantity: 1 }] },
  });

  const { fields, append, prepend, remove, swap, move, insert, replace } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>                          {/* ALWAYS field.id, not index */}
          <input {...register(`items.${index}.name`)} />
          <input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}

      <button type="button" onClick={() => append({ name: '', quantity: 1 })}>
        Add Item
      </button>
    </>
  );
}
```

### useFieldArray API

```tsx
append({ name: '', qty: 0 })              // add to end
prepend({ name: '', qty: 0 })             // add to front
insert(2, { name: '', qty: 0 })           // insert at index
remove(1)                                  // remove by index
remove([1, 3])                             // remove multiple
swap(0, 2)                                 // swap two items
move(0, 3)                                 // move item to index
replace([{ name: 'a', qty: 1 }])          // replace entire array
update(1, { name: 'updated', qty: 2 })    // update single item
```

### Nested Field Arrays

```tsx
type FormData = {
  sections: { title: string; items: { text: string }[] }[];
};

function NestedArrays() {
  const { control, register } = useForm<FormData>();
  const { fields: sections, append: appendSection } = useFieldArray({ control, name: 'sections' });

  return sections.map((section, sIdx) => {
    const { fields: items, append: appendItem } = useFieldArray({
      control,
      name: `sections.${sIdx}.items`,
    });

    return (
      <div key={section.id}>
        <input {...register(`sections.${sIdx}.title`)} />
        {items.map((item, iIdx) => (
          <input key={item.id} {...register(`sections.${sIdx}.items.${iIdx}.text`)} />
        ))}
        <button type="button" onClick={() => appendItem({ text: '' })}>Add Item</button>
      </div>
    );
  });
}
```

---

## 6. Multi-Step Forms

### Step State Pattern

```tsx
import { useForm, FormProvider } from 'react-hook-form';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  plan: z.enum(['free', 'pro']),
  cardNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ['personal', 'plan', 'payment'] as const;

export function MultiStepForm() {
  const [step, setStep] = useState(0);
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', plan: 'free' },
    mode: 'onBlur',
  });

  const { trigger, handleSubmit, getValues } = methods;

  const next = async () => {
    const fieldsPerStep: (keyof FormData)[][] = [
      ['name', 'email'],
      ['plan'],
      ['cardNumber'],
    ];
    const valid = await trigger(fieldsPerStep[step]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && <PersonalStep />}
        {step === 1 && <PlanStep />}
        {step === 2 && <PaymentStep />}

        <div>
          {step > 0 && <button type="button" onClick={() => setStep((s) => s - 1)}>Back</button>}
          {step < STEPS.length - 1
            ? <button type="button" onClick={next}>Next</button>
            : <button type="submit">Submit</button>
          }
        </div>
      </form>
    </FormProvider>
  );
}
```

### Accessing Form in Child Steps (FormProvider + useFormContext)

```tsx
import { useFormContext } from 'react-hook-form';

function PersonalStep() {
  const { register, formState: { errors } } = useFormContext<FormData>();

  return (
    <>
      <input {...register('name')} placeholder="Name" />
      {errors.name && <p>{errors.name.message}</p>}
      <input {...register('email')} placeholder="Email" type="email" />
      {errors.email && <p>{errors.email.message}</p>}
    </>
  );
}
```

---

## 7. shadcn/ui Integration

Install shadcn Form component (wraps RHF with proper ARIA):

```bash
npx shadcn@latest add form input textarea select checkbox
```

### Full shadcn Form Pattern

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form, FormControl, FormDescription,
  FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ProfileForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="zachwieder" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />    {/* auto-renders field error */}
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
      </form>
    </Form>
  );
}
```

### shadcn Select

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### shadcn Checkbox

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<FormField
  control={form.control}
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex items-center gap-2">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel>Accept terms</FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 8. Server Actions (Next.js App Router)

### Pattern 1: handleSubmit + useTransition

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/app/actions/users'; // server action

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await createUser(data);
      if (result.error) {
        form.setError('root.serverError', { message: result.error });
      } else {
        router.push('/dashboard');
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      <input {...form.register('email')} />
      {form.formState.errors.root?.serverError && (
        <p>{form.formState.errors.root.serverError.message}</p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Server Action (validate on server too)

```ts
// app/actions/users.ts
'use server';
import { schema } from '@/lib/schemas';

export async function createUser(data: unknown) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  try {
    await db.insert(users).values(parsed.data);
    return { success: true };
  } catch (err) {
    return { error: 'Database error' };
  }
}
```

### Pattern 2: React 19 useActionState

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { useActionState } from 'react';
import { createUser } from '@/app/actions/users';

export function CreateUserForm() {
  const [state, action, isPending] = useActionState(createUser, null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',    // validate on blur; server handles onSubmit errors
    defaultValues: { name: '', email: '' },
  });

  return (
    <form action={action}>
      <input {...form.register('name')} name="name" />
      <input {...form.register('email')} name="email" />
      {state?.error && <p>{state.error}</p>}
      <button type="submit" disabled={isPending}>Submit</button>
    </form>
  );
}
```

---

## 9. Performance

### Reduce Re-renders

RHF is uncontrolled by default — inputs don't cause parent re-renders. Common perf mistakes that undo this:

```tsx
// BAD: subscribes to entire formState, re-renders on any change
const { formState } = useForm();

// GOOD: destructure only what you need
const { formState: { errors, isSubmitting } } = useForm();

// GOOD: useFormState for child components — isolates subscription
function SubmitButton({ control }) {
  const { isSubmitting } = useFormState({ control });
  return <button disabled={isSubmitting}>Submit</button>;
}
```

### watch vs getValues

```tsx
// watch — reactive, triggers re-render on change — use for conditional rendering
const watchedPlan = watch('plan');
const watchAll = watch();    // BAD: re-renders on every keystroke

// getValues — non-reactive snapshot — use in event handlers
const onNext = () => {
  const currentValues = getValues(['name', 'email']);
};
```

### useWatch (targeted subscription)

```tsx
import { useWatch } from 'react-hook-form';

function PlanSummary({ control }: { control: Control<FormData> }) {
  // only re-renders when 'plan' changes — not the whole form
  const plan = useWatch({ control, name: 'plan' });
  return <div>Selected: {plan}</div>;
}
```

### FormStateSubscribe vs useFormState

| | `FormStateSubscribe` | `useFormState` |
|---|---|---|
| Type | Component | Hook |
| Renders | In JSX directly | Requires wrapper component |
| Re-renders | Only on subscribed fields | Only on subscribed fields |
| Use when | Inline error display | Extracting state to child components |

---

## 10. Testing

### Vitest + Testing Library

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('shows validation errors on empty submit', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows server error on failed submission', async () => {
    render(<LoginForm />);
    // fill and submit...
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });
});
```

### Testing Field Arrays

```tsx
it('adds and removes items', async () => {
  render(<DynamicList />);

  const addButton = screen.getByRole('button', { name: /add item/i });
  await userEvent.click(addButton);

  expect(screen.getAllByPlaceholderText('Item name')).toHaveLength(2);

  const removeButtons = screen.getAllByRole('button', { name: /remove/i });
  await userEvent.click(removeButtons[0]);

  expect(screen.getAllByPlaceholderText('Item name')).toHaveLength(1);
});
```

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `key={index}` in field arrays | Use `key={field.id}` — field.id is stable across reorders |
| `setValue` on field arrays | Use `replace` API — `setValue` breaks field array state |
| No `defaultValues` | Always set defaultValues — prevents uncontrolled→controlled React warnings |
| `watch()` with no args | Subscribes to whole form — use `watch('field')` or `useWatch` |
| Forgetting `type="button"` | Buttons inside `<form>` submit by default — add `type="button"` to non-submit buttons |
| Nested `<form>` tags | Invalid HTML — use `useFormContext` + `FormProvider` to pass state to child components |
| `mode: 'onChange'` everywhere | High re-render frequency on every keystroke — prefer `'onBlur'` or `'onTouched'` |
| Missing `valueAsNumber` on number inputs | `register('age', { valueAsNumber: true })` — without it, value is a string |
| Calling `reset()` with no args after schema change | Pass new defaultValues: `reset({ ...getValues() })` |
| Ignoring `isSubmitting` | Always disable submit button while `isSubmitting` is true — prevents double submission |
| Server-only validation | Always validate on both client (UX) and server (security) — never trust the client |
| Spreading `field` onto non-standard inputs | Some components don't support `ref` — use `useController` and handle ref manually |
