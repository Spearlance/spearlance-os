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
  Users,
  FileText,
  Settings,
  Wrench,
  ShieldCheck,
  Zap,
  Globe,
  Mail,
  Calendar,
  Palette,
  Database,
  Briefcase,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Star,
  Folder,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated set of icons selectable for a category. Keyed by the icon component
 * name so the choice can be persisted as a plain string in the DB
 * (`support_categories.icon`) and resolved back to a component at render time.
 * Every icon previously hardcoded in categories.ts is included, plus common
 * extras for new categories.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
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
  Users,
  FileText,
  Settings,
  Wrench,
  ShieldCheck,
  Zap,
  Globe,
  Mail,
  Calendar,
  Palette,
  Database,
  Briefcase,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Star,
  Folder,
};

export const DEFAULT_ICON_NAME = "BookOpen";

/** Resolve a persisted icon name to a Lucide component, falling back safely. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) || ICON_MAP[DEFAULT_ICON_NAME];
}

/** Icon names offered in the category editor picker. */
export const ICON_OPTIONS: string[] = Object.keys(ICON_MAP);

/**
 * Gradient presets offered in the category editor color picker. Values are the
 * Tailwind classes stored in `support_categories.color` and consumed by
 * CategoryCard's `bg-gradient-to-br ${color}`.
 */
export const COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: "Blue", value: "from-blue-500 to-blue-600" },
  { label: "Purple", value: "from-purple-500 to-purple-600" },
  { label: "Green", value: "from-green-500 to-green-600" },
  { label: "Orange", value: "from-orange-500 to-orange-600" },
  { label: "Yellow", value: "from-yellow-500 to-yellow-600" },
  { label: "Pink", value: "from-pink-500 to-pink-600" },
  { label: "Slate", value: "from-slate-500 to-slate-700" },
  { label: "Teal", value: "from-teal-500 to-teal-700" },
  { label: "Emerald", value: "from-emerald-500 to-emerald-700" },
  { label: "Indigo", value: "from-indigo-500 to-indigo-700" },
  { label: "Amber", value: "from-amber-500 to-amber-700" },
  { label: "Rose", value: "from-rose-500 to-rose-700" },
  { label: "Cyan", value: "from-cyan-500 to-cyan-700" },
  { label: "Zinc", value: "from-zinc-600 to-zinc-800" },
  { label: "Red", value: "from-red-500 to-red-600" },
  { label: "Violet", value: "from-violet-500 to-violet-700" },
];

export const DEFAULT_COLOR = "from-slate-500 to-slate-600";
