import {
  Rocket,
  Target,
  TrendingUp,
  HelpCircle,
  DollarSign,
  Lightbulb,
  Compass,
  Handshake,
  Search,
  LayoutTemplate,
  Megaphone,
  PenLine,
  BarChart3,
  Code2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMeta {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

type CategoryDef = Omit<CategoryMeta, "id">;

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

// Curated presentation metadata per known category slug. Unknown slugs fall
// back to a title-cased name + default icon (see resolveCategory), so a new
// category authored in the DB always renders something sensible.
const CATEGORY_META: Record<string, CategoryDef> = {
  // Client-facing
  getting_started: {
    name: "Getting Started",
    description: "New to the platform? Start here",
    icon: Rocket,
    color: "from-blue-500 to-blue-600",
  },
  features: {
    name: "Features",
    description: "Learn about platform capabilities",
    icon: Target,
    color: "from-purple-500 to-purple-600",
  },
  marketing: {
    name: "Marketing",
    description: "Campaign creation and management",
    icon: TrendingUp,
    color: "from-green-500 to-green-600",
  },
  troubleshooting: {
    name: "Troubleshooting",
    description: "Common issues and solutions",
    icon: HelpCircle,
    color: "from-orange-500 to-orange-600",
  },
  billing: {
    name: "Billing & Account",
    description: "Subscriptions and account settings",
    icon: DollarSign,
    color: "from-yellow-500 to-yellow-600",
  },
  best_practices: {
    name: "Best Practices",
    description: "Tips and strategies for success",
    icon: Lightbulb,
    color: "from-pink-500 to-pink-600",
  },

  // Internal SOPs
  how_we_work: {
    name: "How We Work",
    description: "Operating principles, tools, and how we run the agency",
    icon: Compass,
    color: "from-slate-500 to-slate-700",
  },
  client_onboarding: {
    name: "Client Onboarding",
    description: "Bringing a new client from signed to shipped",
    icon: Handshake,
    color: "from-teal-500 to-teal-700",
  },
  seo_delivery: {
    name: "SEO Delivery",
    description: "Audits, on-page, technical, and reporting workflows",
    icon: Search,
    color: "from-emerald-500 to-emerald-700",
  },
  duda_production: {
    name: "Duda Production",
    description: "Building and launching client sites on Duda",
    icon: LayoutTemplate,
    color: "from-indigo-500 to-indigo-700",
  },
  paid_search: {
    name: "Paid Search",
    description: "Google Ads setup, management, and optimization",
    icon: Megaphone,
    color: "from-amber-500 to-amber-700",
  },
  content: {
    name: "Content",
    description: "Blogs, briefs, and content production",
    icon: PenLine,
    color: "from-rose-500 to-rose-700",
  },
  proof_reporting: {
    name: "Proof & Reporting",
    description: "Client reporting, dashboards, and proof of work",
    icon: BarChart3,
    color: "from-cyan-500 to-cyan-700",
  },
  engineering: {
    name: "Engineering",
    description: "Shipping code on SpearlanceOS and internal tools",
    icon: Code2,
    color: "from-zinc-600 to-zinc-800",
  },
};

const DEFAULT_DEF: CategoryDef = {
  name: "",
  description: "",
  icon: BookOpen,
  color: "from-slate-500 to-slate-600",
};

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
  const def = CATEGORY_META[slug];
  if (def) return { id: slug, ...def };
  return { id: slug, ...DEFAULT_DEF, name: titleCase(slug) };
}

/** Friendly display name for a category slug. */
export function getCategoryName(slug: string): string {
  return CATEGORY_META[slug]?.name ?? titleCase(slug);
}

/**
 * Derive the distinct categories present in a set of article rows, ordered by
 * the canonical client → SOP order, with unknown categories appended
 * alphabetically. This is presentation only: RLS decides which rows the caller
 * ever receives, so a category tab can only appear if the viewer is allowed to
 * see at least one article in it.
 */
export function deriveCategories(
  rows: Array<{ category: string }>,
): CategoryMeta[] {
  const order: string[] = [...CLIENT_CATEGORY_ORDER, ...SOP_CATEGORY_ORDER];
  const present = Array.from(
    new Set(rows.map((row) => row.category).filter(Boolean)),
  );

  present.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return present.map(resolveCategory);
}
