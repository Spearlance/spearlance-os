-- Support/SOP categories become database-driven so admins can add, rename,
-- restyle, reorder, and retire categories without a code change. Categories are
-- presentation metadata only (name/icon/color/order); the content boundary stays
-- RLS on support_articles. Seeded to exactly mirror the previous hardcoded
-- CATEGORY_META so there is zero visual change until an admin edits something.

CREATE TABLE IF NOT EXISTS public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  audience text NOT NULL DEFAULT 'client' CHECK (audience IN ('client','internal','all')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'BookOpen',                        -- lucide icon component name
  color text NOT NULL DEFAULT 'from-slate-500 to-slate-600',   -- tailwind gradient classes
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (audience, slug)
);

CREATE INDEX IF NOT EXISTS idx_support_categories_audience ON public.support_categories(audience);

-- Reuse the shared updated_at trigger fn already used by support_articles.
CREATE TRIGGER update_support_categories_updated_at
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

-- Names/icons/colors aren't sensitive; article-level RLS is the real boundary.
CREATE POLICY "Authenticated can view categories"
  ON public.support_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create categories"
  ON public.support_categories
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
  ON public.support_categories
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
  ON public.support_categories
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed: client-facing help categories (mirrors CLIENT_CATEGORY_ORDER + CATEGORY_META).
INSERT INTO public.support_categories (slug, audience, name, description, icon, color, sort_order) VALUES
  ('getting_started',  'client', 'Getting Started',   'New to the platform? Start here',            'Rocket',      'from-blue-500 to-blue-600',     0),
  ('features',         'client', 'Features',           'Learn about platform capabilities',          'Target',      'from-purple-500 to-purple-600', 1),
  ('marketing',        'client', 'Marketing',          'Campaign creation and management',           'TrendingUp',  'from-green-500 to-green-600',   2),
  ('troubleshooting',  'client', 'Troubleshooting',    'Common issues and solutions',                'HelpCircle',  'from-orange-500 to-orange-600', 3),
  ('billing',          'client', 'Billing & Account',  'Subscriptions and account settings',         'DollarSign',  'from-yellow-500 to-yellow-600', 4),
  ('best_practices',   'client', 'Best Practices',     'Tips and strategies for success',            'Lightbulb',   'from-pink-500 to-pink-600',     5)
ON CONFLICT (audience, slug) DO NOTHING;

-- Seed: internal SOP groupings (mirrors SOP_CATEGORY_ORDER + CATEGORY_META).
INSERT INTO public.support_categories (slug, audience, name, description, icon, color, sort_order) VALUES
  ('how_we_work',       'internal', 'How We Work',      'Operating principles, tools, and how we run the agency', 'Compass',        'from-slate-500 to-slate-700',   0),
  ('client_onboarding', 'internal', 'Client Onboarding','Bringing a new client from signed to shipped',          'Handshake',      'from-teal-500 to-teal-700',     1),
  ('seo_delivery',      'internal', 'SEO Delivery',     'Audits, on-page, technical, and reporting workflows',   'Search',         'from-emerald-500 to-emerald-700', 2),
  ('duda_production',   'internal', 'Duda Production',  'Building and launching client sites on Duda',           'LayoutTemplate', 'from-indigo-500 to-indigo-700',   3),
  ('paid_search',       'internal', 'Paid Search',      'Google Ads setup, management, and optimization',        'Megaphone',      'from-amber-500 to-amber-700',     4),
  ('content',           'internal', 'Content',          'Blogs, briefs, and content production',                 'PenLine',        'from-rose-500 to-rose-700',       5),
  ('proof_reporting',   'internal', 'Proof & Reporting','Client reporting, dashboards, and proof of work',       'BarChart3',      'from-cyan-500 to-cyan-700',       6),
  ('engineering',       'internal', 'Engineering',      'Shipping code on SpearlanceOS and internal tools',      'Code2',          'from-zinc-600 to-zinc-800',       7)
ON CONFLICT (audience, slug) DO NOTHING;
