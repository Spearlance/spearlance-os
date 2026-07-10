import { type LucideIcon } from "lucide-react";
import { resolveIcon, DEFAULT_ICON_NAME, DEFAULT_COLOR } from "./categoryIcons";

export interface CategoryMeta {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

/** Internal representation shared by the built-in defaults and DB rows. */
export interface CategoryRecord {
  name: string;
  description: string;
  iconName: string;
  color: string;
  audience: string;
  sort_order: number;
}

// Client-facing help categories (audience: client | all).
export const CLIENT_CATEGORY_ORDER = [
  "getting_started",
  "features",
  "marketing",
  "troubleshooting",
  "billing",
  "best_practices",
] as const;

// Internal SOP groupings (audience: internal).
export const SOP_CATEGORY_ORDER = [
  "how_we_work",
  "client_onboarding",
  "seo_delivery",
  "duda_production",
  "paid_search",
  "content",
  "proof_reporting",
  "engineering",
] as const;

// Built-in defaults. These mirror the seed rows in the support_categories table
// (migration 20260710120000) so the UI renders identically before the DB has
// hydrated, and still renders sensibly if the fetch fails. Once useCategories()
// loads, DB rows override these via registerCategories().
const BUILTIN: Record<string, CategoryRecord> = {
  // Client-facing
  getting_started: { name: "Getting Started", description: "New to the platform? Start here", iconName: "Rocket", color: "from-blue-500 to-blue-600", audience: "client", sort_order: 0 },
  features: { name: "Features", description: "Learn about platform capabilities", iconName: "Target", color: "from-purple-500 to-purple-600", audience: "client", sort_order: 1 },
  marketing: { name: "Marketing", description: "Campaign creation and management", iconName: "TrendingUp", color: "from-green-500 to-green-600", audience: "client", sort_order: 2 },
  troubleshooting: { name: "Troubleshooting", description: "Common issues and solutions", iconName: "HelpCircle", color: "from-orange-500 to-orange-600", audience: "client", sort_order: 3 },
  billing: { name: "Billing & Account", description: "Subscriptions and account settings", iconName: "DollarSign", color: "from-yellow-500 to-yellow-600", audience: "client", sort_order: 4 },
  best_practices: { name: "Best Practices", description: "Tips and strategies for success", iconName: "Lightbulb", color: "from-pink-500 to-pink-600", audience: "client", sort_order: 5 },

  // Internal SOPs
  how_we_work: { name: "How We Work", description: "Operating principles, tools, and how we run the agency", iconName: "Compass", color: "from-slate-500 to-slate-700", audience: "internal", sort_order: 0 },
  client_onboarding: { name: "Client Onboarding", description: "Bringing a new client from signed to shipped", iconName: "Handshake", color: "from-teal-500 to-teal-700", audience: "internal", sort_order: 1 },
  seo_delivery: { name: "SEO Delivery", description: "Audits, on-page, technical, and reporting workflows", iconName: "Search", color: "from-emerald-500 to-emerald-700", audience: "internal", sort_order: 2 },
  duda_production: { name: "Duda Production", description: "Building and launching client sites on Duda", iconName: "LayoutTemplate", color: "from-indigo-500 to-indigo-700", audience: "internal", sort_order: 3 },
  paid_search: { name: "Paid Search", description: "Google Ads setup, management, and optimization", iconName: "Megaphone", color: "from-amber-500 to-amber-700", audience: "internal", sort_order: 4 },
  content: { name: "Content", description: "Blogs, briefs, and content production", iconName: "PenLine", color: "from-rose-500 to-rose-700", audience: "internal", sort_order: 5 },
  proof_reporting: { name: "Proof & Reporting", description: "Client reporting, dashboards, and proof of work", iconName: "BarChart3", color: "from-cyan-500 to-cyan-700", audience: "internal", sort_order: 6 },
  engineering: { name: "Engineering", description: "Shipping code on SpearlanceOS and internal tools", iconName: "Code2", color: "from-zinc-600 to-zinc-800", audience: "internal", sort_order: 7 },
};

// Live registry: starts as the built-ins and is replaced (built-ins re-merged)
// whenever the DB categories load. Kept module-level so the synchronous helpers
// below stay synchronous and the many existing consumers don't need rewrites.
let REGISTRY: Record<string, CategoryRecord> = { ...BUILTIN };

/**
 * Hydrate the registry from DB rows. Built-ins remain as a fallback for any slug
 * the DB doesn't define; DB rows win for slugs they do. Call from useCategories.
 */
export function registerCategories(
  rows: Array<{
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    audience: string;
    sort_order: number;
  }>,
): void {
  const next: Record<string, CategoryRecord> = { ...BUILTIN };
  for (const row of rows) {
    next[row.slug] = {
      name: row.name,
      description: row.description ?? "",
      iconName: row.icon ?? DEFAULT_ICON_NAME,
      color: row.color ?? DEFAULT_COLOR,
      audience: row.audience,
      sort_order: row.sort_order,
    };
  }
  REGISTRY = next;
}

/** Turn a slug like "how_we_work" into "How We Work". */
export function titleCase(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Full presentation metadata for a category slug, with a safe fallback. */
export function resolveCategory(slug: string): CategoryMeta {
  const rec = REGISTRY[slug];
  if (rec) {
    return {
      id: slug,
      name: rec.name,
      description: rec.description,
      icon: resolveIcon(rec.iconName),
      color: rec.color,
    };
  }
  return {
    id: slug,
    name: titleCase(slug),
    description: "",
    icon: resolveIcon(null),
    color: DEFAULT_COLOR,
  };
}

/** Friendly display name for a category slug. */
export function getCategoryName(slug: string): string {
  return REGISTRY[slug]?.name ?? titleCase(slug);
}

// Order categories from different audiences deterministically: client first,
// then shared, then internal, and by sort_order within each. Preserves the
// previous "client order then SOP order" behavior for any mixed input.
function audienceRank(audience: string | undefined): number {
  if (audience === "client") return 0;
  if (audience === "all") return 1;
  if (audience === "internal") return 2;
  return 3;
}

/**
 * Derive the distinct categories present in a set of article rows, ordered by
 * the registry's audience + sort_order, with unknown categories appended
 * alphabetically. This is presentation only: RLS decides which rows the caller
 * ever receives, so a category tab can only appear if the viewer is allowed to
 * see at least one article in it.
 */
export function deriveCategories(
  rows: Array<{ category: string }>,
): CategoryMeta[] {
  const present = Array.from(
    new Set(rows.map((row) => row.category).filter(Boolean)),
  );

  present.sort((a, b) => {
    const ra = REGISTRY[a];
    const rb = REGISTRY[b];
    if (!ra && !rb) return a.localeCompare(b);
    if (!ra) return 1;
    if (!rb) return -1;
    const rankA = audienceRank(ra.audience);
    const rankB = audienceRank(rb.audience);
    if (rankA !== rankB) return rankA - rankB;
    if (ra.sort_order !== rb.sort_order) return ra.sort_order - rb.sort_order;
    return ra.name.localeCompare(rb.name);
  });

  return present.map(resolveCategory);
}
