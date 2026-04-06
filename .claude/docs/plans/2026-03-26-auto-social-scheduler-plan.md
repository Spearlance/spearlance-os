# Auto Social Media Scheduler — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully automated social media pipeline that generates brand-consistent posts using configurable templates, renders static images via satori, and publishes to all connected platforms via Late/Zernio on a daily cron.

**Architecture:** Monthly remote agent generates all posts for the next month (research → plan → render → save). A daily cron edge function publishes each day's posts to Late API. The existing planner UI lets clients view/edit anything in between. Templates are JSX components that work for both frontend preview (React) and server-side rendering (satori + resvg-wasm in edge functions).

**Tech Stack:** Supabase (DB + Edge Functions + Storage), satori + resvg-wasm (image rendering), React (frontend preview), Late/Zernio API (publishing), OpenRouter AI (caption generation + image generation)

**Design Doc:** `.claude/docs/plans/2026-03-26-auto-social-scheduler-design.md`

---

## Dependency Graph

```
Task 1 (DB migration) ──┬── Task 2 (template types)
                         │
                         ├── Task 3 (render edge fn) ← depends on Task 2
                         │
                         ├── Task 4 (research edge fn)
                         │
                         ├── Task 5 (caption gen edge fn) ← depends on Task 2
                         │
                         ├── Task 6 (run tracking edge fns)
                         │
                         ├── Task 7 (daily publisher cron)
                         │
                         ├── Task 8 (template post creator UI) ← depends on Tasks 2, 3
                         │
                         ├── Task 9 (image source selector UI) ← depends on Task 3
                         │
                         └── Task 10 (remote agent prompt) ← depends on Tasks 4, 5, 6, 7
```

Tasks 2-7 are largely independent and can be parallelized. Tasks 8-9 depend on 2+3. Task 10 comes last.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260326200000_auto_social_scheduler.sql`
- Create: `supabase/migrations/tests/20260326200000_auto_social_scheduler.test.sql`

**Step 1: Write the migration test**

```sql
-- supabase/migrations/tests/20260326200000_auto_social_scheduler.test.sql
BEGIN;
SELECT plan(10);

-- Test social_auto_runs table exists
SELECT has_table('public', 'social_auto_runs', 'social_auto_runs table should exist');

-- Test social_auto_runs columns
SELECT has_column('public', 'social_auto_runs', 'id', 'should have id column');
SELECT has_column('public', 'social_auto_runs', 'client_id', 'should have client_id column');
SELECT has_column('public', 'social_auto_runs', 'trigger_type', 'should have trigger_type column');
SELECT has_column('public', 'social_auto_runs', 'status', 'should have status column');
SELECT has_column('public', 'social_auto_runs', 'month', 'should have month column');
SELECT has_column('public', 'social_auto_runs', 'year', 'should have year column');

-- Test new columns on social_media_posts
SELECT has_column('public', 'social_media_posts', 'template_id', 'should have template_id column');
SELECT has_column('public', 'social_media_posts', 'template_props', 'should have template_props column');
SELECT has_column('public', 'social_media_posts', 'image_source_type', 'should have image_source_type column');
SELECT has_column('public', 'social_media_posts', 'auto_run_id', 'should have auto_run_id column');

SELECT * FROM finish();
ROLLBACK;
```

**Step 2: Run the test to verify it fails**

Run: `supabase db test`
Expected: FAIL — table `social_auto_runs` does not exist, columns missing

**Step 3: Write the migration**

```sql
-- supabase/migrations/20260326200000_auto_social_scheduler.sql

-- New table: tracks each auto-social run
CREATE TABLE IF NOT EXISTS social_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  posts_generated int NOT NULL DEFAULT 0,
  assets_matched int NOT NULL DEFAULT 0,
  assets_ai_generated int NOT NULL DEFAULT 0,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL CHECK (year >= 2024),
  completed_at timestamptz,
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Index for querying runs by client
CREATE INDEX idx_social_auto_runs_client ON social_auto_runs(client_id);
CREATE INDEX idx_social_auto_runs_status ON social_auto_runs(status);

-- Enable RLS
ALTER TABLE social_auto_runs ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can read runs for their clients
CREATE POLICY "Users can view social auto runs for their clients"
  ON social_auto_runs FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

-- New columns on social_media_posts
ALTER TABLE social_media_posts
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS template_props jsonb,
  ADD COLUMN IF NOT EXISTS image_source_type text CHECK (image_source_type IN ('upload', 'asset_match', 'ai_generated')),
  ADD COLUMN IF NOT EXISTS auto_run_id uuid REFERENCES social_auto_runs(id) ON DELETE SET NULL;

-- Index for daily publisher query
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled
  ON social_media_posts(scheduled_date, status)
  WHERE status = 'scheduled';
```

**Step 4: Run the migration and test**

Run: `supabase db reset && supabase db test`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add supabase/migrations/20260326200000_auto_social_scheduler.sql supabase/migrations/tests/20260326200000_auto_social_scheduler.test.sql
git commit -m "feat(social): add auto social scheduler schema — social_auto_runs table + new columns on social_media_posts"
```

---

### Task 2: Template Type Definitions and Registry

**Files:**
- Create: `src/lib/social-templates/types.ts`
- Create: `src/lib/social-templates/registry.ts`
- Create: `src/lib/social-templates/registry.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/social-templates/registry.test.ts
import { describe, it, expect } from 'vitest';
import { getTemplate, getAllTemplates, getTemplateForCategory } from './registry';

describe('social template registry', () => {
  it('returns all 5 templates', () => {
    const templates = getAllTemplates();
    expect(templates).toHaveLength(5);
  });

  it('returns a template by id', () => {
    const template = getTemplate('quote-card');
    expect(template).toBeDefined();
    expect(template!.id).toBe('quote-card');
    expect(template!.category).toBe('educational');
    expect(template!.textSlots).toContain('quote_text');
  });

  it('returns undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('maps each strategy category to a template', () => {
    const categories = ['educational', 'quick_tips', 'promotional', 'customer_stories', 'behind_the_scenes'];
    for (const cat of categories) {
      const template = getTemplateForCategory(cat);
      expect(template).toBeDefined();
      expect(template!.category).toBe(cat);
    }
  });

  it('every template has required fields', () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.textSlots.length).toBeGreaterThan(0);
      expect(t.format).toContain('1080x1080');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/social-templates/registry.test.ts`
Expected: FAIL — module not found

**Step 3: Write the types and registry**

```ts
// src/lib/social-templates/types.ts
export interface SocialTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  textSlots: string[];
  textSlotLabels: Record<string, string>;
  format: ('1080x1080' | '1080x1920')[];
}

export interface SocialTemplateProps {
  templateId: string;
  backgroundImageUrl: string;
  texts: Record<string, string>;
  logo: string;
  brandColors: { primary: string; secondary: string; accent: string };
  format: '1080x1080' | '1080x1920';
}
```

```ts
// src/lib/social-templates/registry.ts
import type { SocialTemplate } from './types';

const templates: SocialTemplate[] = [
  {
    id: 'quote-card',
    name: 'Quote Card',
    category: 'educational',
    description: 'Centered text over a dimmed background image',
    textSlots: ['quote_text', 'attribution'],
    textSlotLabels: { quote_text: 'Quote', attribution: 'Attribution' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'quick-tip',
    name: 'Quick Tip',
    category: 'quick_tips',
    description: 'Bold number/icon top, tip text below, branded footer',
    textSlots: ['tip_number', 'tip_text'],
    textSlotLabels: { tip_number: 'Tip Number', tip_text: 'Tip Text' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'promo-cta',
    name: 'Promo CTA',
    category: 'promotional',
    description: 'Hero image with overlay text and CTA button',
    textSlots: ['headline', 'cta_text'],
    textSlotLabels: { headline: 'Headline', cta_text: 'Call to Action' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    category: 'customer_stories',
    description: 'Quote marks, customer text, name/role, subtle background',
    textSlots: ['testimonial_text', 'customer_name', 'customer_role'],
    textSlotLabels: { testimonial_text: 'Testimonial', customer_name: 'Customer Name', customer_role: 'Role / Company' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'behind-scenes',
    name: 'Behind the Scenes',
    category: 'behind_the_scenes',
    description: 'Full-bleed image with caption bar at bottom',
    textSlots: ['caption_text'],
    textSlotLabels: { caption_text: 'Caption' },
    format: ['1080x1080', '1080x1920'],
  },
];

export function getAllTemplates(): SocialTemplate[] {
  return templates;
}

export function getTemplate(id: string): SocialTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplateForCategory(category: string): SocialTemplate | undefined {
  return templates.find(t => t.category === category);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/social-templates/registry.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/social-templates/types.ts src/lib/social-templates/registry.ts src/lib/social-templates/registry.test.ts
git commit -m "feat(social): add social template type definitions and registry"
```

---

### Task 3: Image Rendering Edge Function (satori + resvg)

**Files:**
- Create: `supabase/functions/social-render-template/index.ts`

**Context:** Satori converts JSX-like objects to SVG. In Deno, we use `satori` from esm.sh and `@resvg/resvg-wasm` for SVG → PNG conversion. The template layouts are defined as satori-compatible JSX (flexbox only, subset of CSS).

**Step 1: Write the edge function**

```ts
// supabase/functions/social-render-template/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "https://esm.sh/satori@0.12.1";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Template layout definitions (satori JSX)
// Each returns a satori-compatible element tree
function renderQuoteCard(props: any) {
  const { backgroundImageUrl, texts, logo, brandColors } = props;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover',
        backgroundPosition: 'center', position: 'relative',
      },
      children: [
        // Dark overlay
        { type: 'div', props: { style: {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}},
        // Quote text
        { type: 'div', props: {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '80px', zIndex: 1, gap: '24px',
          },
          children: [
            { type: 'div', props: {
              style: { fontSize: '48px', color: 'white', textAlign: 'center',
                fontWeight: 700, lineHeight: 1.3 },
              children: `"${texts.quote_text || ''}"`,
            }},
            texts.attribution ? { type: 'div', props: {
              style: { fontSize: '28px', color: brandColors.accent || '#F59E0B',
                fontWeight: 500 },
              children: `— ${texts.attribution}`,
            }} : null,
          ].filter(Boolean),
        }},
        // Logo bottom
        logo ? { type: 'img', props: {
          src: logo, style: { position: 'absolute', bottom: '40px', right: '40px',
            height: '48px', zIndex: 1 },
        }} : null,
      ].filter(Boolean),
    },
  };
}

function renderQuickTip(props: any) {
  const { backgroundImageUrl, texts, logo, brandColors } = props;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover',
        backgroundPosition: 'center', position: 'relative',
      },
      children: [
        { type: 'div', props: { style: {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}},
        // Tip number badge
        { type: 'div', props: {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, padding: '60px', zIndex: 1, gap: '32px',
          },
          children: [
            { type: 'div', props: {
              style: {
                backgroundColor: brandColors.primary || '#3B82F6',
                borderRadius: '50%', width: '120px', height: '120px',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: '48px', fontWeight: 800, color: 'white',
              },
              children: texts.tip_number || '#1',
            }},
            { type: 'div', props: {
              style: { fontSize: '42px', color: 'white', textAlign: 'center',
                fontWeight: 700, lineHeight: 1.3, maxWidth: '800px' },
              children: texts.tip_text || '',
            }},
          ],
        }},
        // Branded footer bar
        { type: 'div', props: {
          style: {
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backgroundColor: brandColors.primary || '#3B82F6', padding: '20px',
            zIndex: 1,
          },
          children: logo ? [{ type: 'img', props: {
            src: logo, style: { height: '36px' },
          }}] : [],
        }},
      ].filter(Boolean),
    },
  };
}

function renderPromoCta(props: any) {
  const { backgroundImageUrl, texts, logo, brandColors } = props;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover',
        backgroundPosition: 'center', position: 'relative',
      },
      children: [
        { type: 'div', props: { style: {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        }}},
        { type: 'div', props: {
          style: {
            display: 'flex', flexDirection: 'column', padding: '60px',
            zIndex: 1, gap: '24px',
          },
          children: [
            logo ? { type: 'img', props: {
              src: logo, style: { height: '40px', alignSelf: 'flex-start', marginBottom: '16px' },
            }} : null,
            { type: 'div', props: {
              style: { fontSize: '52px', color: 'white', fontWeight: 800, lineHeight: 1.2 },
              children: texts.headline || '',
            }},
            { type: 'div', props: {
              style: {
                backgroundColor: brandColors.accent || '#F59E0B',
                color: 'white', fontSize: '24px', fontWeight: 700,
                padding: '16px 32px', borderRadius: '8px', alignSelf: 'flex-start',
              },
              children: texts.cta_text || 'Learn More',
            }},
          ].filter(Boolean),
        }},
      ].filter(Boolean),
    },
  };
}

function renderTestimonial(props: any) {
  const { backgroundImageUrl, texts, logo, brandColors } = props;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover',
        backgroundPosition: 'center', position: 'relative',
      },
      children: [
        { type: 'div', props: { style: {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
        }}},
        { type: 'div', props: {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '80px', zIndex: 1, gap: '32px', maxWidth: '900px',
          },
          children: [
            // Large quote mark
            { type: 'div', props: {
              style: { fontSize: '96px', color: brandColors.accent || '#F59E0B',
                fontWeight: 800, lineHeight: 0.8 },
              children: '\u201C',
            }},
            { type: 'div', props: {
              style: { fontSize: '36px', color: 'white', textAlign: 'center',
                fontWeight: 500, lineHeight: 1.4, fontStyle: 'italic' },
              children: texts.testimonial_text || '',
            }},
            { type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
              children: [
                { type: 'div', props: {
                  style: { fontSize: '24px', color: 'white', fontWeight: 700 },
                  children: texts.customer_name || '',
                }},
                texts.customer_role ? { type: 'div', props: {
                  style: { fontSize: '20px', color: brandColors.accent || '#F59E0B' },
                  children: texts.customer_role,
                }} : null,
              ].filter(Boolean),
            }},
          ],
        }},
        logo ? { type: 'img', props: {
          src: logo, style: { position: 'absolute', bottom: '40px', right: '40px',
            height: '48px', zIndex: 1 },
        }} : null,
      ].filter(Boolean),
    },
  };
}

function renderBehindScenes(props: any) {
  const { backgroundImageUrl, texts, logo, brandColors } = props;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover',
        backgroundPosition: 'center', position: 'relative',
      },
      children: [
        // Caption bar at bottom
        { type: 'div', props: {
          style: {
            display: 'flex', alignItems: 'center', gap: '16px',
            backgroundColor: brandColors.primary || '#3B82F6',
            padding: '24px 40px', zIndex: 1,
          },
          children: [
            logo ? { type: 'img', props: {
              src: logo, style: { height: '36px' },
            }} : null,
            { type: 'div', props: {
              style: { fontSize: '28px', color: 'white', fontWeight: 600, flex: 1 },
              children: texts.caption_text || '',
            }},
          ].filter(Boolean),
        }},
      ].filter(Boolean),
    },
  };
}

const TEMPLATE_RENDERERS: Record<string, (props: any) => any> = {
  'quote-card': renderQuoteCard,
  'quick-tip': renderQuickTip,
  'promo-cta': renderPromoCta,
  'testimonial': renderTestimonial,
  'behind-scenes': renderBehindScenes,
};

// Initialize resvg WASM once
let wasmInitialized = false;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_id, background_image_url, texts, logo, brand_colors, format = '1080x1080' } = await req.json();

    if (!template_id || !texts) {
      return new Response(
        JSON.stringify({ error: 'template_id and texts are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const renderer = TEMPLATE_RENDERERS[template_id];
    if (!renderer) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template_id}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse dimensions
    const [width, height] = format.split('x').map(Number);

    // Build template element tree
    const element = renderer({
      backgroundImageUrl: background_image_url || '',
      texts,
      logo: logo || '',
      brandColors: brand_colors || { primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
    });

    // Render to SVG via satori
    // Note: satori needs at least one font. We'll use a system font fallback.
    const svg = await satori(element, {
      width,
      height,
      fonts: [{
        name: 'Inter',
        data: await fetch('https://rsms.me/inter/font-files/InterVariable.woff2').then(r => r.arrayBuffer()),
        weight: 400,
        style: 'normal',
      }],
    });

    // Initialize resvg WASM if not yet done
    if (!wasmInitialized) {
      await initWasm(
        fetch('https://unpkg.com/@aspect-build/rules_esbuild@0.17.1/packages/resvg-wasm/resvg.wasm')
      );
      wasmInitialized = true;
    }

    // SVG → PNG
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `social-posts/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(fileName, pngBuffer, { contentType: 'image/png' });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('client-assets')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        image_url: urlData.publicUrl,
        format,
        template_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Render error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Important Note for Implementer:** The satori and resvg-wasm imports may need version adjustments. Test the edge function locally with `supabase functions serve social-render-template` and verify:
1. The satori esm.sh import resolves correctly in Deno
2. The resvg WASM initialization works
3. The font fetch doesn't timeout

If satori doesn't work cleanly in Deno, fallback approach: use the existing `social-generate-image` pattern (AI generates the full image) but with a structured prompt built from template props. This gives 80% of the value without the rendering complexity.

**Step 2: Test manually**

Run: `supabase functions serve social-render-template`

Then curl:
```bash
curl -X POST http://localhost:54321/functions/v1/social-render-template \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "quote-card",
    "background_image_url": "https://picsum.photos/1080/1080",
    "texts": { "quote_text": "Quality is never an accident", "attribution": "John Ruskin" },
    "brand_colors": { "primary": "#3B82F6", "secondary": "#10B981", "accent": "#F59E0B" },
    "format": "1080x1080"
  }'
```
Expected: `{ "success": true, "image_url": "https://...supabase.co/storage/v1/object/public/client-assets/social-posts/..." }`

**Step 3: Commit**

```bash
git add supabase/functions/social-render-template/index.ts
git commit -m "feat(social): add template rendering edge function using satori + resvg"
```

---

### Task 4: Social Research Edge Function

**Files:**
- Create: `supabase/functions/social-auto-research/index.ts`

**Context:** Mirrors `blog-auto-research` but returns social-specific context: brand voice, strategy config, recent posts (for dedup), and brand assets. Authenticated with `x-auto-social-key` header (same pattern as auto-blog).

**Step 1: Write the edge function**

```ts
// supabase/functions/social-auto-research/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept either x-auto-social-key OR standard Supabase auth
  const autoSocialKey = Deno.env.get('AUTO_BLOG_API_KEY'); // Reuse same key
  const providedKey = req.headers.get('x-auto-social-key') || req.headers.get('x-auto-blog-key');

  if (!autoSocialKey || !providedKey || providedKey !== autoSocialKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { client_id, month, year } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parallel-fetch all context
    const [
      clientResult,
      brandVoiceResult,
      strategyResult,
      recentPostsResult,
      servicesResult,
      assetsResult,
      brandGuideResult,
    ] = await Promise.all([
      supabase.from('clients')
        .select('id, name, brand_name, industry, website_url, service_areas')
        .eq('id', client_id).maybeSingle(),

      supabase.from('brand_voice')
        .select('tone_adjectives, personality_traits, personality_description')
        .eq('client_id', client_id).maybeSingle(),

      supabase.from('social_media_strategy')
        .select('*')
        .eq('client_id', client_id)
        .or(`and(is_global.eq.false,month.eq.${month || 0},year.eq.${year || 0}),is_global.eq.true`)
        .order('is_global', { ascending: true })
        .limit(1).maybeSingle(),

      // Last 60 days of posts for dedup
      supabase.from('social_media_posts')
        .select('topic_category, caption_text, scheduled_date, template_id')
        .eq('client_id', client_id)
        .gte('scheduled_date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_date', { ascending: false })
        .limit(90),

      supabase.from('client_services')
        .select('service_name, description')
        .eq('client_id', client_id),

      // Brand assets for matching
      supabase.from('assets')
        .select('id, title, file_url, ai_description')
        .eq('client_id', client_id)
        .not('ai_description', 'is', null)
        .limit(50),

      supabase.from('brand_guides')
        .select('primary_color, secondary_color, accent_color, aesthetic, imagery_style')
        .eq('client_id', client_id).maybeSingle(),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        client: clientResult.data,
        brand_voice: brandVoiceResult.data,
        strategy: strategyResult.data,
        recent_posts: recentPostsResult.data || [],
        services: servicesResult.data || [],
        assets: assetsResult.data || [],
        brand_guide: brandGuideResult.data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Research error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Test locally**

Run: `supabase functions serve social-auto-research`
Curl with a valid client_id and x-auto-blog-key header.
Expected: JSON with client, brand_voice, strategy, recent_posts, services, assets, brand_guide fields.

**Step 3: Commit**

```bash
git add supabase/functions/social-auto-research/index.ts
git commit -m "feat(social): add social-auto-research edge function for brand context bundle"
```

---

### Task 5: Caption Generation Edge Function

**Files:**
- Create: `supabase/functions/social-auto-generate/index.ts`

**Context:** Given a brand context bundle + topic category + template, generates caption text, hashtags, and template text slot values. Uses the shared `aiClient.ts` for OpenRouter AI calls.

**Step 1: Write the edge function**

```ts
// supabase/functions/social-auto-generate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiTextResponse } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Accept either auto key or standard auth
  const autoKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-social-key') || req.headers.get('x-auto-blog-key');
  const authHeader = req.headers.get('Authorization');

  const isAutoAuth = autoKey && providedKey && providedKey === autoKey;

  if (!isAutoAuth && !authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      client_name,
      industry,
      brand_voice,
      services,
      topic_category,
      template_id,
      template_text_slots,
      recent_captions = [],
      custom_instructions = '',
    } = await req.json();

    if (!topic_category || !template_id || !template_text_slots) {
      return new Response(
        JSON.stringify({ error: 'topic_category, template_id, and template_text_slots are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a social media content creator for ${client_name || 'a business'} in the ${industry || 'service'} industry.

Brand voice: ${JSON.stringify(brand_voice || {})}
Services: ${(services || []).map((s: any) => s.service_name).join(', ')}

Generate a social media post for the category: "${topic_category}"
Template: "${template_id}"

You need to fill these text slots for the template image:
${template_text_slots.map((slot: string) => `- ${slot}`).join('\n')}

Also generate:
- A caption for the social media post (2-4 sentences, conversational, matches brand voice)
- 5-8 relevant hashtags

${recent_captions.length > 0 ? `AVOID repeating these recent topics:\n${recent_captions.slice(0, 10).join('\n')}` : ''}

${custom_instructions}

Respond in this exact JSON format:
{
  "template_texts": { ${template_text_slots.map((s: string) => `"${s}": "value"`).join(', ')} },
  "caption": "The social media caption text",
  "hashtags": ["hashtag1", "hashtag2"]
}

Rules:
- Template texts should be SHORT (5-15 words max per slot)
- Caption should be conversational and engaging
- Hashtags without the # symbol
- All content must match the brand voice
- Be specific to the industry, not generic`;

    const response = await aiTextResponse({
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse the JSON from AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        success: true,
        template_texts: parsed.template_texts,
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        template_id,
        topic_category,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Test locally**

Run: `supabase functions serve social-auto-generate`
Curl with sample data. Expected: JSON with template_texts, caption, hashtags.

**Step 3: Commit**

```bash
git add supabase/functions/social-auto-generate/index.ts
git commit -m "feat(social): add social-auto-generate edge function for AI caption generation"
```

---

### Task 6: Run Tracking Edge Functions

**Files:**
- Create: `supabase/functions/social-auto-run-start/index.ts`
- Create: `supabase/functions/social-auto-run-complete/index.ts`

**Context:** Mirrors `blog-auto-run-start` pattern. Creates/completes `social_auto_runs` records.

**Step 1: Write social-auto-run-start**

```ts
// supabase/functions/social-auto-run-start/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const autoKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-social-key') || req.headers.get('x-auto-blog-key');

  if (!autoKey || !providedKey || providedKey !== autoKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { client_id, trigger_type, month, year } = await req.json();

    if (!client_id || !trigger_type || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'client_id, trigger_type, month, and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: run, error } = await supabase
      .from('social_auto_runs')
      .insert({ client_id, trigger_type, month, year, status: 'running' })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, auto_run_id: run.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Write social-auto-run-complete**

```ts
// supabase/functions/social-auto-run-complete/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const autoKey = Deno.env.get('AUTO_BLOG_API_KEY');
  const providedKey = req.headers.get('x-auto-social-key') || req.headers.get('x-auto-blog-key');

  if (!autoKey || !providedKey || providedKey !== autoKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { auto_run_id, status, posts_generated, assets_matched, assets_ai_generated, error_log } = await req.json();

    if (!auto_run_id || !status) {
      return new Response(
        JSON.stringify({ error: 'auto_run_id and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('social_auto_runs')
      .update({
        status,
        posts_generated: posts_generated || 0,
        assets_matched: assets_matched || 0,
        assets_ai_generated: assets_ai_generated || 0,
        completed_at: new Date().toISOString(),
        error_log: error_log || [],
      })
      .eq('id', auto_run_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 3: Commit**

```bash
git add supabase/functions/social-auto-run-start/index.ts supabase/functions/social-auto-run-complete/index.ts
git commit -m "feat(social): add run tracking edge functions for auto social pipeline"
```

---

### Task 7: Daily Publisher Cron Edge Function

**Files:**
- Create: `supabase/functions/social-auto-publish/index.ts`
- Modify: `supabase/config.toml` (add cron schedule)

**Context:** Runs daily on cron. Queries posts where `scheduled_date = today` and `status = 'scheduled'`. Pushes each to Late API. Updates status. This is the "dumb publisher" — no AI, just posts what's scheduled.

**Step 1: Write the edge function**

```ts
// supabase/functions/social-auto-publish/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) throw new Error('LATE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get today's date in UTC (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Find all scheduled posts for today that haven't been published
    const { data: posts, error: queryError } = await supabase
      .from('social_media_posts')
      .select('id, client_id, caption_text, image_url, hashtags, platform')
      .eq('scheduled_date', today)
      .eq('status', 'scheduled')
      .is('late_post_id', null);

    if (queryError) throw queryError;

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No posts to publish today', published: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${posts.length} posts to publish today (${today})`);

    let published = 0;
    let failed = 0;

    // Group posts by client_id to batch Late API lookups
    const clientIds = [...new Set(posts.map(p => p.client_id))];

    for (const clientId of clientIds) {
      // Get Late profile for this client
      const { data: lateProfile } = await supabase
        .from('late_profiles')
        .select('late_profile_id')
        .eq('client_id', clientId)
        .single();

      if (!lateProfile) {
        console.error(`No Late profile for client ${clientId}, skipping`);
        // Mark posts as failed
        const clientPosts = posts.filter(p => p.client_id === clientId);
        for (const post of clientPosts) {
          await supabase.from('social_media_posts').update({
            status: 'failed',
            late_error_message: 'No Late profile configured',
          }).eq('id', post.id);
          failed++;
        }
        continue;
      }

      // Get connected accounts
      const { data: accounts } = await supabase
        .from('late_social_accounts')
        .select('late_account_id, platform')
        .eq('late_profile_id', lateProfile.late_profile_id)
        .eq('is_active', true);

      if (!accounts || accounts.length === 0) {
        console.error(`No active social accounts for client ${clientId}`);
        const clientPosts = posts.filter(p => p.client_id === clientId);
        for (const post of clientPosts) {
          await supabase.from('social_media_posts').update({
            status: 'failed',
            late_error_message: 'No active social accounts',
          }).eq('id', post.id);
          failed++;
        }
        continue;
      }

      // Publish each post for this client
      const clientPosts = posts.filter(p => p.client_id === clientId);
      for (const post of clientPosts) {
        try {
          // Build caption with hashtags
          let fullCaption = post.caption_text || '';
          if (post.hashtags && post.hashtags.length > 0) {
            fullCaption += '\n\n' + post.hashtags.map((h: string) => `#${h}`).join(' ');
          }

          const latePostData: any = {
            profile_id: lateProfile.late_profile_id,
            accounts: accounts.map(a => a.late_account_id),
            content: { text: fullCaption },
          };

          if (post.image_url) {
            latePostData.content.media = [{ url: post.image_url, type: 'image' }];
          }

          const lateResponse = await fetch('https://getlate.dev/api/v1/posts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lateApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(latePostData),
          });

          if (!lateResponse.ok) {
            const errorText = await lateResponse.text();
            throw new Error(errorText);
          }

          const latePost = await lateResponse.json();

          await supabase.from('social_media_posts').update({
            late_post_id: latePost.id,
            late_status: latePost.status,
            status: 'posted',
            posted_at: new Date().toISOString(),
            synced_to_late_at: new Date().toISOString(),
          }).eq('id', post.id);

          published++;
          console.log(`Published post ${post.id} → Late ${latePost.id}`);

        } catch (postError: any) {
          console.error(`Failed to publish post ${post.id}:`, postError.message);
          await supabase.from('social_media_posts').update({
            status: 'failed',
            late_error_message: postError.message,
          }).eq('id', post.id);
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, published, failed, total: posts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Publish error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Add cron schedule to config.toml**

Open `supabase/config.toml` and add under the `[functions]` or appropriate section:

```toml
[functions.social-auto-publish]
schedule = "0 14 * * *"  # Daily at 2pm UTC (9am EST / 10am EDT)
```

**Note for implementer:** Check the existing `config.toml` for the exact cron syntax used by other scheduled functions (e.g. `blog-schedule-check`). Match that pattern.

**Step 3: Test locally**

Run: `supabase functions serve social-auto-publish`
Insert a test post with `scheduled_date = today` and `status = 'scheduled'` in Supabase.
Curl the function. Expected: post status changes to 'posted' (or 'failed' if no Late profile).

**Step 4: Commit**

```bash
git add supabase/functions/social-auto-publish/index.ts supabase/config.toml
git commit -m "feat(social): add daily publisher cron edge function"
```

---

### Task 8: Template-Based Post Creator UI

**Files:**
- Create: `src/components/social/TemplateSelector.tsx`
- Create: `src/components/social/TemplatePreview.tsx`
- Modify: `src/components/social/PostCreator.tsx` — add template step between topic and caption

**Context:** The existing `PostCreator` has 4 steps: topic → caption → image → save. We're adding a template selection step after topic. The template determines which text slots appear in the caption step. The image step gets a live preview of the template with the filled slots.

**Step 1: Write the TemplateSelector component**

```tsx
// src/components/social/TemplateSelector.tsx
import { Card, CardContent } from "@/components/ui/card";
import { getAllTemplates } from "@/lib/social-templates/registry";
import type { SocialTemplate } from "@/lib/social-templates/types";

interface TemplateSelectorProps {
  category: string;
  onSelect: (template: SocialTemplate) => void;
}

export function TemplateSelector({ category, onSelect }: TemplateSelectorProps) {
  const templates = getAllTemplates();
  // Show the matching category template first, then others
  const sorted = [
    ...templates.filter(t => t.category === category),
    ...templates.filter(t => t.category !== category),
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose a template</h3>
      <p className="text-sm text-muted-foreground">
        We recommend the highlighted template for your topic, but you can pick any.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {sorted.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
              template.category === category ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground">{template.description}</div>
              {template.category === category && (
                <div className="text-xs font-medium text-primary">Recommended</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Write the TemplatePreview component**

```tsx
// src/components/social/TemplatePreview.tsx
import type { SocialTemplateProps } from "@/lib/social-templates/types";

// Simple React preview of the template — matches the satori layout visually
// This is a CSS-based approximation, not pixel-perfect with satori output
export function TemplatePreview({ templateId, backgroundImageUrl, texts, logo, brandColors, format }: SocialTemplateProps) {
  const [w, h] = format.split('x').map(Number);
  const aspectRatio = w / h;

  const baseStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: `${aspectRatio}`,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: backgroundImageUrl ? undefined : '#1a1a2e',
  };

  if (templateId === 'quote-card') {
    return (
      <div style={baseStyle}>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
          <p className="text-white text-lg font-bold text-center leading-snug">
            &ldquo;{texts.quote_text || 'Your quote here'}&rdquo;
          </p>
          {texts.attribution && (
            <p className="mt-3 text-sm font-medium" style={{ color: brandColors.accent }}>
              &mdash; {texts.attribution}
            </p>
          )}
        </div>
        {logo && <img src={logo} alt="" className="absolute bottom-3 right-3 h-6 z-10" />}
      </div>
    );
  }

  if (templateId === 'quick-tip') {
    return (
      <div style={baseStyle}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 gap-4">
          <div
            className="rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-extrabold"
            style={{ backgroundColor: brandColors.primary }}
          >
            {texts.tip_number || '#1'}
          </div>
          <p className="text-white text-lg font-bold text-center">{texts.tip_text || 'Your tip here'}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-center z-10" style={{ backgroundColor: brandColors.primary }}>
          {logo && <img src={logo} alt="" className="h-5" />}
        </div>
      </div>
    );
  }

  if (templateId === 'promo-cta') {
    return (
      <div style={baseStyle}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10 space-y-3">
          {logo && <img src={logo} alt="" className="h-5 mb-2" />}
          <p className="text-white text-xl font-extrabold leading-tight">{texts.headline || 'Your headline'}</p>
          <span className="inline-block px-4 py-2 rounded text-white text-sm font-bold" style={{ backgroundColor: brandColors.accent }}>
            {texts.cta_text || 'Learn More'}
          </span>
        </div>
      </div>
    );
  }

  if (templateId === 'testimonial') {
    return (
      <div style={baseStyle}>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 gap-4">
          <span className="text-5xl font-extrabold" style={{ color: brandColors.accent }}>&ldquo;</span>
          <p className="text-white text-base text-center italic leading-relaxed max-w-xs">
            {texts.testimonial_text || 'Customer testimonial here'}
          </p>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{texts.customer_name || 'Customer Name'}</p>
            {texts.customer_role && (
              <p className="text-xs" style={{ color: brandColors.accent }}>{texts.customer_role}</p>
            )}
          </div>
        </div>
        {logo && <img src={logo} alt="" className="absolute bottom-3 right-3 h-6 z-10" />}
      </div>
    );
  }

  // behind-scenes
  return (
    <div style={baseStyle}>
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3 z-10" style={{ backgroundColor: brandColors.primary }}>
        {logo && <img src={logo} alt="" className="h-5" />}
        <p className="text-white text-sm font-semibold flex-1">{texts.caption_text || 'Behind the scenes caption'}</p>
      </div>
    </div>
  );
}
```

**Step 3: Modify PostCreator to add template step**

Open `src/components/social/PostCreator.tsx`. Changes needed:

1. Add `'template'` to the `CreatorStep` type: `type CreatorStep = 'topic' | 'template' | 'caption' | 'image' | 'save';`
2. Add `selected_template` to postData state
3. After topic selection, go to template step instead of caption
4. In template step, show `TemplateSelector` with the selected category
5. In caption step, show text inputs based on `selected_template.textSlotLabels`
6. In image step, show `TemplatePreview` alongside the existing image selection
7. Update progress bar to show 5 steps

**Detailed modifications in `PostCreator.tsx`:**

```tsx
// Line ~10: Update type
type CreatorStep = 'topic' | 'template' | 'caption' | 'image' | 'save';

// Line ~18: Add to state
const [postData, setPostData] = useState({
  topic_category: '',
  selected_idea: null as any,
  selected_template: null as SocialTemplate | null, // NEW
  template_texts: {} as Record<string, string>,     // NEW
  caption_text: '',
  caption_tone: '',
  hashtags: [] as string[],
  image_url: '',
  image_source: '',
  nano_banana_prompt: '',
});

// Line ~33: Topic complete → go to template
const handleTopicComplete = (topic: string, idea: any) => {
  updatePostData({ topic_category: topic, selected_idea: idea });
  setStep('template'); // Changed from 'caption'
};

// NEW: Template complete handler
const handleTemplateComplete = (template: SocialTemplate) => {
  updatePostData({ selected_template: template });
  setStep('caption');
};

// Line ~48: Update back navigation
const handleBack = () => {
  if (step === 'template') setStep('topic');
  else if (step === 'caption') setStep('template');
  else if (step === 'image') setStep('caption');
  else if (step === 'save') setStep('image');
};

// In JSX, add template step between topic and caption:
{step === 'template' && (
  <TemplateSelector
    category={postData.topic_category}
    onSelect={handleTemplateComplete}
  />
)}
```

**Step 4: Test the changes**

Run: `npm run dev`
Navigate to Social Media → Create Single Post → select a topic → verify template selector appears → select template → verify caption editor shows template-specific text slots.

**Step 5: Commit**

```bash
git add src/components/social/TemplateSelector.tsx src/components/social/TemplatePreview.tsx src/components/social/PostCreator.tsx
git commit -m "feat(social): add template-based post creator with live preview"
```

---

### Task 9: Image Source Selector Upgrade

**Files:**
- Modify: `src/components/social/ImageSelector.tsx` — add template preview alongside image selection
- Modify: `src/components/social/PostSaver.tsx` — save template_id and template_props to DB

**Context:** The existing ImageSelector already has upload, AI generation, and asset recommendation. We need to add the template preview showing how the selected image will look in the template, and save the template data when the post is saved.

**Step 1: Modify ImageSelector to show template preview**

The `ImageSelector` receives the caption but doesn't know about the template. Pass template data through via props or context.

In `PostCreator.tsx`, pass template data to ImageSelector:

```tsx
{step === 'image' && (
  <ImageSelector
    caption={postData.caption_text}
    template={postData.selected_template}
    templateTexts={postData.template_texts}
    onComplete={handleImageComplete}
    onBack={handleBack}
  />
)}
```

In `ImageSelector.tsx`, add the preview:

```tsx
// Add to props interface
interface ImageSelectorProps {
  caption: string;
  template?: SocialTemplate | null;
  templateTexts?: Record<string, string>;
  onComplete: (imageUrl: string, source: string, prompt: string) => void;
  onBack: () => void;
}

// In the component body, after image selection, show preview:
{selectedImageUrl && template && (
  <div className="mt-4">
    <h4 className="text-sm font-medium mb-2">Preview</h4>
    <TemplatePreview
      templateId={template.id}
      backgroundImageUrl={selectedImageUrl}
      texts={templateTexts || {}}
      logo={clientLogo || ''}
      brandColors={brandColors}
      format="1080x1080"
    />
  </div>
)}
```

**Step 2: Modify PostSaver to include template data**

In `PostSaver.tsx`, when inserting the post into `social_media_posts`, add:

```ts
template_id: postData.selected_template?.id || null,
template_props: postData.selected_template ? {
  templateId: postData.selected_template.id,
  backgroundImageUrl: postData.image_url,
  texts: postData.template_texts,
  format: '1080x1080',
} : null,
image_source_type: postData.image_source === 'uploaded' ? 'upload'
  : postData.image_source === 'brand_asset' ? 'asset_match'
  : 'ai_generated',
```

**Step 3: Test**

Run: `npm run dev`
Create a post through the full flow. Verify the post record in Supabase has `template_id`, `template_props`, and `image_source_type` populated.

**Step 4: Commit**

```bash
git add src/components/social/ImageSelector.tsx src/components/social/PostSaver.tsx src/components/social/PostCreator.tsx
git commit -m "feat(social): add template preview to image selector and save template data"
```

---

### Task 10: Remote Agent Prompt

**Files:**
- Create: `.claude/prompts/auto-social-agent.md`

**Context:** This is the prompt for the scheduled remote Claude Code agent that runs monthly. Mirrors `auto-blog-agent.md` pattern but for social media.

**Step 1: Write the agent prompt**

```markdown
# Auto-Social Agent — Scheduled Remote Execution Prompt

> **Isolation model:** This trigger processes all enabled clients in sequence.
> Client isolation is guaranteed because ALL content generation happens in
> fresh AI calls inside edge functions.

This prompt powers the scheduled remote Claude Code agent that runs the auto-social pipeline on Anthropic's infrastructure. Follow every step exactly.

---

## Runtime Variables

- `{{SUPABASE_URL}}` — Supabase project URL
- `{{AUTO_BLOG_API_KEY}}` — Shared API key for auto edge functions

---

## Tools Available

- **Read** — read any file in the repo checkout
- **Bash** — run shell commands (curl, date, etc.)

---

## Step 0: Load Context

```bash
Read: .claude/rules/output-style.md
```

---

## Step 0.5: Discover Clients

Query which clients have social media enabled (have a social_media_strategy record):

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-research" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "ALL"}'
```

If response returns `{ "clients": [...] }`, process each client.
Otherwise, query clients table directly via a helper edge function.

For each client, execute Steps 1-5 independently and sequentially.

---

## Step 1: Initialize Run

```bash
NEXT_MONTH=$(date -d "next month" +%m | sed 's/^0//')
NEXT_YEAR=$(date -d "next month" +%Y)

curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-run-start" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"<client.id>\",
    \"trigger_type\": \"scheduled\",
    \"month\": $NEXT_MONTH,
    \"year\": $NEXT_YEAR
  }"
```

Extract `auto_run_id` from response.

---

## Step 2: Research

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-research" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"<client.id>\",
    \"month\": $NEXT_MONTH,
    \"year\": $NEXT_YEAR
  }"
```

Extract: client info, brand_voice, strategy, recent_posts, services, assets, brand_guide.

---

## Step 3: Plan the Month

Using the strategy config (posting_frequency, selected_days, topic_distribution):

1. Calculate all posting days for the target month
2. Assign topic categories to each day based on distribution percentages
3. Map each category to its template_id:
   - educational → quote-card
   - quick_tips → quick-tip
   - promotional → promo-cta
   - customer_stories → testimonial
   - behind_the_scenes → behind-scenes

---

## Step 4: Generate Content (per post)

For each planned post:

### 4a: Generate caption and template texts

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-generate" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_name\": \"<client.name>\",
    \"industry\": \"<client.industry>\",
    \"brand_voice\": <brand_voice_json>,
    \"services\": <services_json>,
    \"topic_category\": \"<category>\",
    \"template_id\": \"<template_id>\",
    \"template_text_slots\": [<slot_names>],
    \"recent_captions\": [<last_10_captions>]
  }"
```

### 4b: Find or generate background image

First, try asset matching. Use the caption text to find a matching brand asset from the assets array returned by research. If an asset's `ai_description` is semantically close to the caption topic, use its `file_url` as the background image. Set `image_source_type = 'asset_match'`.

If no good match, generate an AI image:

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-generate-image" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"<client.id>\",
    \"caption_text\": \"<caption>\",
    \"image_mode\": \"ai_only\"
  }"
```

Set `image_source_type = 'ai_generated'`.

### 4c: Render template image

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-render-template" \
  -H "Content-Type: application/json" \
  -d "{
    \"template_id\": \"<template_id>\",
    \"background_image_url\": \"<background_url>\",
    \"texts\": <template_texts_json>,
    \"logo\": \"<client_logo_url>\",
    \"brand_colors\": <brand_colors_json>,
    \"format\": \"1080x1080\"
  }"
```

### 4d: Save post to database

```bash
curl -s -X POST "{{SUPABASE_URL}}/rest/v1/social_media_posts" \
  -H "apikey: <supabase_anon_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"<client.id>\",
    \"topic_category\": \"<category>\",
    \"caption_text\": \"<caption>\",
    \"hashtags\": <hashtags_array>,
    \"image_url\": \"<rendered_image_url>\",
    \"scheduled_date\": \"<YYYY-MM-DD>\",
    \"status\": \"scheduled\",
    \"template_id\": \"<template_id>\",
    \"template_props\": <template_props_json>,
    \"image_source_type\": \"<asset_match|ai_generated>\",
    \"auto_run_id\": \"<auto_run_id>\"
  }"
```

Track: posts_generated++, assets_matched++ or assets_ai_generated++.

---

## Step 5: Complete Run

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-run-complete" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d "{
    \"auto_run_id\": \"<auto_run_id>\",
    \"status\": \"completed\",
    \"posts_generated\": <count>,
    \"assets_matched\": <count>,
    \"assets_ai_generated\": <count>
  }"
```

Log: `"Completed social pipeline for: <client.name> — <posts_generated> posts for <month>/<year>"`

---

## Error Handling

- If any step fails for a post, log the error and continue to the next post
- If research fails (no client data), skip the client entirely
- If render fails, save the post without an image (caption-only post)
- At the end, if any errors occurred, set run status to 'completed' (not 'failed') but include error_log
- Only set status to 'failed' if the entire run crashes (no posts generated)
```

**Step 2: Commit**

```bash
git add .claude/prompts/auto-social-agent.md
git commit -m "feat(social): add remote agent prompt for auto social pipeline"
```

---

## Summary

| Task | Component | Depends On | Parallelizable |
|------|-----------|------------|----------------|
| 1 | Database migration | — | — |
| 2 | Template types + registry | — | Yes (with 1) |
| 3 | Render edge function (satori) | 2 | Yes |
| 4 | Research edge function | 1 | Yes |
| 5 | Caption generation edge function | 2 | Yes |
| 6 | Run tracking edge functions | 1 | Yes |
| 7 | Daily publisher cron | 1 | Yes |
| 8 | Template post creator UI | 2, 3 | After 2+3 |
| 9 | Image source selector upgrade | 3 | After 3 |
| 10 | Remote agent prompt | 4, 5, 6, 7 | Last |

**Parallel groups:**
- **Group A (infra):** Tasks 1 + 2 (no deps)
- **Group B (edge functions):** Tasks 3, 4, 5, 6, 7 (after Group A)
- **Group C (frontend):** Tasks 8, 9 (after tasks 2 + 3)
- **Group D (automation):** Task 10 (after all edge functions)
