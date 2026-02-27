# shadcn/ui Reference

> **Last Verified:** February 2026

shadcn/ui is a copy-paste component distribution system — not an npm package. Components are copied into your project and owned by you. Built on Radix UI or Base UI primitives with Tailwind CSS styling.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Installation & Configuration

### New Project (Greenfield — Dec 2025+)

```bash
npx shadcn create
```

Opens a visual builder at ui.shadcn.com/create. Configures:
- Framework: Next.js, Vite, TanStack Start
- Primitive library: Radix UI or Base UI
- Visual style preset: Vega, Nova, Maia, Lyra, Mira
- Base color, icon library, fonts, border radius

### Add to Existing Project

```bash
npx shadcn@latest init          # npm
pnpm dlx shadcn@latest init     # pnpm
bunx --bun shadcn@latest init   # bun
```

The CLI detects Tailwind v3 vs v4 and configures accordingly.

### Tailwind v4 + Next.js 15 Setup

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app
cd my-app
npx shadcn@latest init
```

### globals.css (Tailwind v4)

Key structure — the `@theme inline` block is mandatory:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.141 0.005 285.823);
  --chart-1: oklch(0.646 0.222 41.116);
  /* --chart-2 through --chart-5 follow same pattern */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  /* --sidebar-primary-foreground, --sidebar-accent, etc. */
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.21 0.006 285.885);
  /* ... all tokens get dark values */
}

/* REQUIRED for Tailwind v4 — without this, bg-primary etc. won't work */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  /* ... all tokens mapped here */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

Run `npx shadcn@latest init` — it generates the full CSS. The pattern above shows structure.

### components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "rsc": true,
  "tsx": true,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Key fields:
- `style` — `"new-york"` only (`"default"` is deprecated since Feb 2025)
- `tailwind.baseColor` — `neutral` | `gray` | `zinc` | `stone` | `slate`
- `tailwind.cssVariables` — `true` for CSS variable theming
- `rsc` — `true` for App Router / React Server Components

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. CLI Reference

Package is `shadcn` — NOT `shadcn-ui`.

### Commands

```bash
# Initialize project
npx shadcn@latest init [options]
  -t, --template <template>   next | next-monorepo
  -b, --base-color <color>    neutral | gray | zinc | stone | slate
  -y, --yes                   Skip confirmation
  -f, --force                 Overwrite existing config
  --src-dir / --no-src-dir    Use src/ directory
  --css-variables / --no-css-variables

# Add components
npx shadcn@latest add button
npx shadcn@latest add button card dialog   # multiple
npx shadcn@latest add -a                   # all components
npx shadcn@latest add -o button            # overwrite existing

# Preview before adding
npx shadcn@latest view button

# Search registry
npx shadcn@latest search -q "table"
npx shadcn@latest search -l 20 -o 0

# Build your own registry
npx shadcn@latest build -o ./public/registry

# Run migrations
npx shadcn@latest migrate --list           # show available
npx shadcn@latest migrate rtl              # RTL support (Jan 2026)
npx shadcn@latest migrate radix            # unified radix-ui (Feb 2026)
npx shadcn@latest migrate icons            # switch icon library
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Theming System

### Color Token Convention

Every token has a pair. When used as Tailwind class, omit `-background`:

```
CSS variable           →  Tailwind utility class
--primary              →  bg-primary
--primary-foreground   →  text-primary-foreground
--muted                →  bg-muted
--muted-foreground     →  text-muted-foreground
```

### Available Tokens

| Token | Usage |
|-------|-------|
| `--background` | Page background |
| `--foreground` | Default text |
| `--card` / `--card-foreground` | Card surfaces |
| `--popover` / `--popover-foreground` | Popover/dropdown surfaces |
| `--primary` / `--primary-foreground` | Primary action color |
| `--secondary` / `--secondary-foreground` | Secondary surfaces |
| `--muted` / `--muted-foreground` | Subtle backgrounds, placeholders |
| `--accent` / `--accent-foreground` | Hover states, highlights |
| `--destructive` | Errors, destructive actions |
| `--border` | Component borders |
| `--input` | Input field borders |
| `--ring` | Focus ring color |
| `--chart-1` to `--chart-5` | Chart color palette |
| `--sidebar-*` | Sidebar-specific tokens (8 tokens) |
| `--radius` | Global border radius base |

### Changing Primary Color

```css
:root {
  --primary: oklch(0.55 0.2 264);         /* blue */
  --primary-foreground: oklch(0.98 0 0);  /* white */
}
.dark {
  --primary: oklch(0.7 0.18 264);
  --primary-foreground: oklch(0.15 0 0);
}
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
}
```

### Changing Border Radius

```css
:root {
  --radius: 0rem;    /* sharp */
  /* --radius: 0.5rem;  default */
  /* --radius: 1rem;    rounded */
}
```

Components derive `--radius-sm/md/lg/xl` from `--radius` via `@theme inline`.

### Changing Font

```css
:root {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
@theme inline {
  --font-family-sans: var(--font-sans);
}
```

With Next.js font optimization:

```tsx
import { Inter } from "next/font/google"
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function Layout({ children }) {
  return <html className={inter.variable}><body>{children}</body></html>
}
```

### Adding Custom Tokens

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}
.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.98 0 0);
}
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Use as: `bg-warning text-warning-foreground`

### Per-Instance Overrides with data-slot

Every primitive has `data-slot` attributes. Target them without breaking global theme:

```tsx
{/* Override icon color inside button */}
<Button className="[&_[data-slot=icon]]:text-blue-500">
  <Icon />Submit
</Button>

{/* Override card header background */}
<Card className="[&_[data-slot=card-header]]:bg-muted">
  ...
</Card>
```

Check component source for available `data-slot` values.

### Base Color Palettes

| Name | Description |
|------|-------------|
| `zinc` | Cool gray, slight blue tint (default) |
| `neutral` | Pure neutral gray |
| `stone` | Warm gray, slight brown |
| `gray` | Standard gray |
| `slate` | Cool blue-gray |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Component Catalog

### Layout & Structure

| Component | Key Props / Notes |
|-----------|------------------|
| `Card` | `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Separator` | `orientation`: horizontal/vertical |
| `AspectRatio` | `ratio` (e.g., 16/9) |
| `ScrollArea` | Scrollable with styled scrollbar |
| `Resizable` | `PanelGroup`, `Panel`, `PanelResizeHandle` |
| `Sidebar` | Full system: `SidebarProvider`, `SidebarTrigger`, `SidebarContent`, `SidebarMenu` |

### Form Inputs

| Component | Key Props |
|-----------|-----------|
| `Button` | `variant`: default, destructive, outline, secondary, ghost, link; `size`: sm, default, lg, icon |
| `Input` | Standard HTML input props |
| `Textarea` | Standard textarea props |
| `Checkbox` | `checked`, `onCheckedChange` |
| `RadioGroup` | `value`, `onValueChange`; contains `RadioGroupItem` |
| `Select` | `value`, `onValueChange`; `SelectTrigger`, `SelectContent`, `SelectItem` |
| `Switch` | `checked`, `onCheckedChange` |
| `Slider` | `value[]`, `onValueChange`, `min`, `max`, `step` |
| `Toggle` | `pressed`, `onPressedChange`, `variant` |
| `ToggleGroup` | `type`: single/multiple |
| `Calendar` | `mode`: single/multiple/range; React DayPicker v9 (upgraded Jun 2025) |
| `InputOTP` | `maxLength`; `InputOTPGroup`, `InputOTPSlot` |

### Oct 2025 Components

| Component | Install | Purpose |
|-----------|---------|---------|
| `Spinner` | `add spinner` | Loading indicator |
| `Kbd` | `add kbd` | `<Kbd>⌘K</Kbd>`, `<KbdGroup>` for combos |
| `Button Group` | `add button-group` | Grouped actions, split buttons |
| `Input Group` | `add input-group` | Input with prefix/suffix/icons |
| `Field` | `add field` | Universal form field (all control types) |
| `Item` | `add item` | Flex list items with media/title/actions |
| `Empty` | `add empty` | Empty state screens |

### Overlays & Feedback

| Component | Key Props |
|-----------|-----------|
| `Dialog` | `open`, `onOpenChange`; `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` |
| `Sheet` | `side`: top/right/bottom/left — same structure as Dialog |
| `Drawer` | Mobile slide-up (Vaul); `DrawerContent`, `DrawerHeader` |
| `Popover` | `open`, `onOpenChange`; `PopoverTrigger`, `PopoverContent` |
| `HoverCard` | `openDelay`, `closeDelay` |
| `Tooltip` | Requires `TooltipProvider` at app root; `TooltipTrigger`, `TooltipContent` |
| `Alert` | `variant`: default, destructive |
| `AlertDialog` | `AlertDialogAction`, `AlertDialogCancel` |
| `Progress` | `value` 0–100 |
| `Sonner` | Toast (replaces deprecated `toast`) — import `{ toast }` from `"sonner"` |
| `Skeleton` | Shimmer loading placeholder |

### Navigation

| Component | Key Props |
|-----------|-----------|
| `Breadcrumb` | `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` |
| `NavigationMenu` | Full nav with dropdowns; `NavigationMenuList`, `NavigationMenuTrigger`, `NavigationMenuContent` |
| `Menubar` | Desktop application-style menu |
| `Tabs` | `value`, `onValueChange`; `TabsList`, `TabsTrigger`, `TabsContent` |
| `Pagination` | `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious` |

### Data Display

| Component | Key Props |
|-----------|-----------|
| `Table` | `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |
| `Accordion` | `type`: single/multiple; `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `Collapsible` | `open`, `onOpenChange`; `CollapsibleTrigger`, `CollapsibleContent` |
| `Chart` | Recharts-based; `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend` |
| `Carousel` | Embla-based; `CarouselContent`, `CarouselItem`, `CarouselNext`, `CarouselPrevious` |
| `Badge` | `variant`: default, secondary, destructive, outline |
| `Avatar` | `AvatarImage`, `AvatarFallback` |

### Command & Search

| Component | Key Props |
|-----------|-----------|
| `Command` | `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut` |
| `DropdownMenu` | `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel` |
| `ContextMenu` | Same structure as DropdownMenu; right-click trigger |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Radix UI Primitives

shadcn/ui wraps Radix UI (or Base UI since Dec 2025). Radix handles behavior; shadcn adds Tailwind styles.

### What You Get for Free

- WAI-ARIA attributes (`role`, `aria-expanded`, `aria-haspopup`, `aria-selected`, etc.) — set automatically
- Keyboard navigation (see below)
- Focus management and trapping
- Portal rendering for overlays

Don't add ARIA attributes manually to Radix components — you'll create conflicts.

### Keyboard Navigation

| Component | Keys |
|-----------|------|
| Dialog / Sheet | `Esc` close, focus trap inside |
| Select | `↑` `↓` navigate, `Enter` select, `Esc` close |
| Tabs | `←` `→` switch tabs |
| Command | `↑` `↓` navigate, `Enter` select |
| DropdownMenu | `↑` `↓` `Enter` `Esc` |
| Accordion | `Enter` / `Space` toggle |
| RadioGroup | `↑` `↓` / `←` `→` select |

### Styling with Data Attributes

Radix exposes state via `data-*`:

```tsx
{/* State-based styling */}
<AccordionTrigger className="data-[state=open]:text-primary data-[state=closed]:text-muted-foreground">

{/* Combine with data-slot for internals */}
<Dialog>
  <DialogContent className="[&_[data-slot=dialog-header]]:bg-muted">
```

### `asChild` Pattern

Pass Radix behavior to your own element instead of wrapping it:

```tsx
{/* Without asChild — extra DOM node */}
<DialogTrigger>
  <Button>Open</Button>   {/* DialogTrigger renders a button, Button renders a button = 2 buttons */}
</DialogTrigger>

{/* With asChild — Radix merges props onto your element */}
<DialogTrigger asChild>
  <Button>Open</Button>   {/* single button element */}
</DialogTrigger>
```

### Radix UI vs Base UI

As of Dec 2025, both are first-class in shadcn/ui:

| Factor | Radix UI | Base UI |
|--------|----------|---------|
| Stability | Mature, battle-tested | Active development |
| Packages | Unified `radix-ui` (Feb 2026) | Single package |
| New projects | `npx shadcn create` → your choice | Same |
| Existing migration | `npx shadcn migrate radix` | N/A |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Complex Compositions

### Data Table (TanStack Table)

```bash
npx shadcn@latest add table
npm install @tanstack/react-table
```

Three-file pattern:

**`columns.tsx`** — define column structure:

```tsx
"use client"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"

export type Payment = { id: string; amount: number; status: string; email: string }

export const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <div className="text-right">${parseFloat(row.getValue("amount")).toFixed(2)}</div>,
  },
]
```

**`data-table.tsx`** — reusable table component:

```tsx
"use client"
import { useState } from "react"
import { ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data, columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter emails..."
        value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
        onChange={(e) => table.getColumn("email")?.setFilterValue(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  )
}
```

**`page.tsx`** — use it:

```tsx
import { DataTable } from "./data-table"
import { columns } from "./columns"

async function getData(): Promise<Payment[]> {
  return fetch("/api/payments").then(r => r.json())
}

export default async function Page() {
  const data = await getData()
  return <DataTable columns={columns} data={data} />
}
```

### Combobox (Command + Popover)

```tsx
"use client"
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const options = [
  { value: "next.js", label: "Next.js" },
  { value: "astro", label: "Astro" },
]

export function Combobox() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
          {value ? options.find((o) => o.value === value)?.label : "Select..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.value}
                  onSelect={(v) => { setValue(v === value ? "" : v); setOpen(false) }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### Command Palette (⌘K)

```tsx
"use client"
import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>Calendar<CommandShortcut>⌘C</CommandShortcut></CommandItem>
          <CommandItem>Search<CommandShortcut>⌘S</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>Profile<CommandShortcut>⌘P</CommandShortcut></CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Form Integration

### React Hook Form + Zod

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form input label
```

Complete example:

```tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "" },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl><Input placeholder="acme" {...field} /></FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />  {/* renders zod error automatically */}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Form Primitives

| Component | Wraps | Purpose |
|-----------|-------|---------|
| `Form` | RHF `FormProvider` | Provides form context |
| `FormField` | RHF `Controller` | Connects field to form state |
| `FormItem` | `div` | Spacing wrapper |
| `FormLabel` | `Label` | Auto red on error |
| `FormControl` | Slot | Passes `aria-invalid`, `aria-describedby` to child |
| `FormDescription` | `p` | Helper text |
| `FormMessage` | `p` | Zod error message |

### Select in Form

```tsx
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

### Field Component (Oct 2025 — simpler pattern)

```tsx
import { Controller } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

<Controller
  name="email"
  control={control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. Dark Mode Integration

### Next.js (App Router)

```bash
npm install next-themes
```

**`components/theme-provider.tsx`**:

```tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

**`app/layout.tsx`**:

```tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Theme toggle**:

```tsx
"use client"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

### Key Configuration

| Prop | Value | Purpose |
|------|-------|---------|
| `attribute="class"` | Required | next-themes adds `class="dark"` to `<html>` |
| `defaultTheme="system"` | Recommended | Respects OS preference |
| `enableSystem` | Required for system | Listens to OS changes |
| `disableTransitionOnChange` | Recommended | Prevents flash on switch |
| `suppressHydrationWarning` | On `<html>` | Prevents SSR/CSR mismatch warning |

### Tailwind v4 Dark Mode Variant

Ensure this is in `globals.css`:

```css
@custom-variant dark (&:is(.dark *));
```

Without this, `dark:` prefixed utilities won't work with class-based dark mode.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. Common Mistakes

| Mistake | Why It Breaks | Fix |
|---------|--------------|-----|
| `npx shadcn-ui@latest` | Old deprecated package | `npx shadcn@latest` |
| CSS vars without `@theme inline` (v4) | Tailwind v4 doesn't auto-bridge CSS vars | Add `@theme inline { --color-primary: var(--primary); }` |
| `"style": "default"` in components.json | Deprecated Feb 2025 | `"style": "new-york"` |
| `tailwindcss-animate` | Replaced | `tw-animate-css` |
| Using built-in `toast` | Deprecated | `npx shadcn@latest add sonner` |
| `React.forwardRef` wrappers | Removed from components | Use `React.ComponentProps<"button">` |
| HSL values in CSS vars | Colors migrated to OKLCH | `oklch(0.205 0 0)` format |
| `<DialogTrigger><Button>` nested | Double button element | `<DialogTrigger asChild><Button>` |
| No `TooltipProvider` at root | Tooltips break everywhere | Wrap app root with `<TooltipProvider>` |
| `"use client"` missing | Hooks/events fail in RSC | Add to all interactive component files |
| No `suppressHydrationWarning` | Hydration mismatch | Add to `<html>` tag |
| className on wrapper to target internals | Misses inner elements | Use `data-slot` attribute selectors |
| Individual `@radix-ui/react-*` imports | Deprecated Feb 2026 | `npx shadcn migrate radix` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Recent Changes (2025-2026)

### February 2026 — Unified Radix + Base UI

- All Blocks available for both Radix UI and Base UI
- Unified `radix-ui` package replaces individual `@radix-ui/react-*` packages
- **Migration:** `npx shadcn migrate radix`

### January 2026 — RTL Support

- First-class right-to-left layout (Arabic, Hebrew, Persian)
- Logical CSS properties (`inline-start`, `inline-end`) throughout
- **Migration:** `npx shadcn migrate rtl`

### December 2025 — npx shadcn create + Base UI

- `npx shadcn create` — visual project builder
- Base UI is now a first-class primitive alternative to Radix UI
- 5 visual style presets: Vega (classic), Nova (compact), Maia (soft), Lyra (boxy), Mira (dense)

### October 2025 — 7 New Components

Spinner, Kbd, Button Group, Input Group, Field, Item, Empty — all work with Radix, Base UI, and React Aria.

### August 2025 — CLI 3.0 + MCP Server

- New subcommands: `view`, `search`, `list`, `build`, `migrate`
- MCP server: agents invoke shadcn CLI tools via MCP protocol
- Universal registry items — share components cross-framework

### June 2025 — Calendar Rebuild

- Calendar rebuilt on React DayPicker v9
- 30+ calendar block variants added

### February 2025 — Tailwind v4 + React 19 (Breaking)

| Change | Action |
|--------|--------|
| Tailwind v4 support | CLI auto-detects; run `@tailwindcss/upgrade@next` codemod on existing projects |
| OKLCH replaces HSL | Update CSS variable values to OKLCH format |
| `@theme inline` required | Add block to globals.css |
| `tw-animate-css` replaces `tailwindcss-animate` | Update dependency |
| `React.forwardRef` removed | Components use `React.ComponentProps` |
| `data-slot` attributes added | Use for per-instance styling |
| `"default"` style deprecated | Switch to `"new-york"` |
| `toast` deprecated | Switch to Sonner |
| Buttons use default cursor | CSS change — `cursor-pointer` no longer default on Button |

### October 2024 — Sidebar + React 19

- Sidebar component: full system with `SidebarProvider`, `SidebarMenu`, `SidebarMenuItem`
- React 19 compatibility

### August 2024 — CLI Renamed

- `shadcn-ui` → `shadcn`
- Use `npx shadcn@latest` going forward
