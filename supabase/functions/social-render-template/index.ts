// supabase/functions/social-render-template/index.ts
// NOTE: satori and resvg-wasm ESM imports below may need version adjustment in production.
// Tested against satori@0.12.1 and @resvg/resvg-wasm@2.6.2 — pin or bump as needed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import satori from 'https://esm.sh/satori@0.12.1';
import { Resvg, initWasm } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2';

// ── Types ────────────────────────────────────────────────────────────────────

type TemplateId = 'quote-card' | 'quick-tip' | 'promo-cta' | 'testimonial' | 'behind-scenes';

interface BrandColors {
  primary: string;
  secondary?: string;
  accent: string;
}

interface RenderRequest {
  template_id: TemplateId;
  background_image_url: string;
  texts: Record<string, string>;
  logo?: string;
  brand_colors: BrandColors;
  format?: string; // e.g. "1080x1080", "1080x1920", "1200x628"
}

// ── Constants ────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FONT_URL = 'https://rsms.me/inter/font-files/InterVariable.woff2';
const STORAGE_BUCKET = 'client-assets';
const STORAGE_PREFIX = 'social-posts';

// Module-level cache to avoid re-initialising WASM on every request
let wasmInitialized = false;
let fontData: ArrayBuffer | null = null;

// ── WASM + Font bootstrap ────────────────────────────────────────────────────

async function ensureWasm(): Promise<void> {
  if (wasmInitialized) return;

  // resvg-wasm ships its own .wasm file via the ESM bundle; initWasm resolves it automatically.
  await initWasm();
  wasmInitialized = true;
}

async function getFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Failed to fetch Inter font: ${res.status}`);
  fontData = await res.arrayBuffer();
  return fontData;
}

// ── Dimension helpers ────────────────────────────────────────────────────────

function parseDimensions(format?: string): { width: number; height: number } {
  if (!format) return { width: 1080, height: 1080 };
  const match = format.match(/^(\d+)[x×](\d+)$/i);
  if (!match) return { width: 1080, height: 1080 };
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}

// ── Template builders ─────────────────────────────────────────────────────────
// All element trees use satori's object notation:
//   { type: 'div', props: { style: {...}, children: [...] } }
// Satori only supports flexbox — no grid, no absolute positioning shorthand.

function buildOverlayContainer(
  backgroundUrl: string,
  width: number,
  height: number,
  overlayOpacity: number,
  children: object[]
): object {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      children: [
        // Dark overlay
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
            },
            children: [],
          },
        },
        // Content layer
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
            children,
          },
        },
      ],
    },
  };
}

function logoNode(logoUrl: string, size = 48): object {
  return {
    type: 'img',
    props: {
      src: logoUrl,
      style: { width: `${size}px`, height: `${size}px`, objectFit: 'contain' },
    },
  };
}

// 1. quote-card ───────────────────────────────────────────────────────────────
function quoteCard(
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  const quote = texts.quote ?? '';
  const attribution = texts.attribution ?? '';

  return buildOverlayContainer(bg, w, h, 0.6, [
    // Centered quote block
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        },
        children: [
          // Large decorative quote mark
          {
            type: 'div',
            props: {
              style: {
                fontSize: '120px',
                color: colors.accent,
                lineHeight: '80px',
                marginBottom: '24px',
                fontWeight: 700,
              },
              children: ['\u201C'],
            },
          },
          // Quote text
          {
            type: 'p',
            props: {
              style: {
                color: '#ffffff',
                fontSize: '42px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.3,
                margin: 0,
              },
              children: [quote],
            },
          },
          // Attribution
          attribution
            ? {
                type: 'p',
                props: {
                  style: {
                    color: colors.accent,
                    fontSize: '24px',
                    fontWeight: 500,
                    marginTop: '32px',
                    textAlign: 'center',
                  },
                  children: [`\u2014 ${attribution}`],
                },
              }
            : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
        ],
      },
    },
    // Logo bottom-right
    logo
      ? {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '24px',
            },
            children: [logoNode(logo)],
          },
        }
      : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
  ]);
}

// 2. quick-tip ────────────────────────────────────────────────────────────────
function quickTip(
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  const tipNumber = texts.tip_number ?? '1';
  const tipText = texts.tip_text ?? '';
  const footerLabel = texts.footer_label ?? '';

  return buildOverlayContainer(bg, w, h, 0.65, [
    // Main content
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          gap: '40px',
        },
        children: [
          // Tip number circle
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                borderRadius: '50px',
                backgroundColor: colors.primary,
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { color: '#fff', fontSize: '48px', fontWeight: 700 },
                    children: [tipNumber],
                  },
                },
              ],
            },
          },
          // Tip text
          {
            type: 'p',
            props: {
              style: {
                color: '#ffffff',
                fontSize: '38px',
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.4,
                margin: 0,
              },
              children: [tipText],
            },
          },
        ],
      },
    },
    // Branded footer bar
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.primary,
          padding: '20px 40px',
        },
        children: [
          logo
            ? logoNode(logo, 40)
            : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
          footerLabel
            ? {
                type: 'span',
                props: {
                  style: { color: '#fff', fontSize: '22px', fontWeight: 600 },
                  children: [footerLabel],
                },
              }
            : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
        ],
      },
    },
  ]);
}

// 3. promo-cta ────────────────────────────────────────────────────────────────
function promoCta(
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  const headline = texts.headline ?? '';
  const ctaText = texts.cta ?? 'Learn More';

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${w}px`,
        height: `${h}px`,
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      children: [
        // Bottom-heavy gradient overlay
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '70%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
            },
            children: [],
          },
        },
        // Content anchored to bottom
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '60px',
              gap: '28px',
            },
            children: [
              logo
                ? logoNode(logo, 56)
                : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
              {
                type: 'h1',
                props: {
                  style: {
                    color: '#ffffff',
                    fontSize: '52px',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    margin: 0,
                  },
                  children: [headline],
                },
              },
              // CTA button
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.accent,
                    borderRadius: '8px',
                    padding: '16px 40px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#fff', fontSize: '28px', fontWeight: 700 },
                        children: [ctaText],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// 4. testimonial ──────────────────────────────────────────────────────────────
function testimonial(
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  const testimonialText = texts.testimonial ?? '';
  const customerName = texts.customer_name ?? '';
  const customerRole = texts.customer_role ?? '';

  return buildOverlayContainer(bg, w, h, 0.7, [
    // Content block
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          gap: '32px',
        },
        children: [
          // Large quote mark
          {
            type: 'div',
            props: {
              style: {
                fontSize: '140px',
                color: colors.accent,
                lineHeight: '80px',
                fontWeight: 800,
              },
              children: ['\u201C'],
            },
          },
          // Testimonial text
          {
            type: 'p',
            props: {
              style: {
                color: '#ffffff',
                fontSize: '36px',
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.5,
                margin: 0,
              },
              children: [testimonialText],
            },
          },
          // Customer name + role
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '4px' },
              children: [
                customerName
                  ? {
                      type: 'span',
                      props: {
                        style: { color: '#ffffff', fontSize: '26px', fontWeight: 700 },
                        children: [customerName],
                      },
                    }
                  : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
                customerRole
                  ? {
                      type: 'span',
                      props: {
                        style: { color: colors.accent, fontSize: '22px', fontWeight: 400 },
                        children: [customerRole],
                      },
                    }
                  : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
              ],
            },
          },
        ],
      },
    },
    // Logo bottom-right
    logo
      ? {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '24px',
            },
            children: [logoNode(logo)],
          },
        }
      : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
  ]);
}

// 5. behind-scenes ────────────────────────────────────────────────────────────
function behindScenes(
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  const caption = texts.caption ?? '';

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${w}px`,
        height: `${h}px`,
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      children: [
        // Caption bar anchored to bottom
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.primary,
              padding: '24px 40px',
              gap: '24px',
            },
            children: [
              logo
                ? logoNode(logo, 44)
                : { type: 'div', props: { style: { display: 'flex' }, children: [] } },
              {
                type: 'span',
                props: {
                  style: {
                    color: '#ffffff',
                    fontSize: '26px',
                    fontWeight: 600,
                    flex: 1,
                  },
                  children: [caption],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ── Template dispatcher ───────────────────────────────────────────────────────

function buildTemplate(
  templateId: TemplateId,
  bg: string,
  texts: Record<string, string>,
  logo: string | undefined,
  colors: BrandColors,
  w: number,
  h: number
): object {
  switch (templateId) {
    case 'quote-card':
      return quoteCard(bg, texts, logo, colors, w, h);
    case 'quick-tip':
      return quickTip(bg, texts, logo, colors, w, h);
    case 'promo-cta':
      return promoCta(bg, texts, logo, colors, w, h);
    case 'testimonial':
      return testimonial(bg, texts, logo, colors, w, h);
    case 'behind-scenes':
      return behindScenes(bg, texts, logo, colors, w, h);
    default:
      throw new Error(`Unknown template_id: ${templateId}`);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: RenderRequest = await req.json();
    const { template_id, background_image_url, texts, logo, brand_colors, format } = body;

    // Validate required fields
    if (!template_id || !background_image_url || !texts || !brand_colors) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template_id, background_image_url, texts, brand_colors' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { width, height } = parseDimensions(format);

    // Bootstrap WASM and font in parallel
    await Promise.all([ensureWasm(), getFont()]);
    const font = await getFont(); // cached after first call

    // Build element tree
    const element = buildTemplate(template_id, background_image_url, texts, logo, brand_colors, width, height);

    // Render SVG via satori
    const svg = await satori(element as any, {
      width,
      height,
      fonts: [
        {
          name: 'Inter',
          data: font,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: font,
          weight: 600,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: font,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: font,
          weight: 800,
          style: 'normal',
        },
      ],
    });

    // Render PNG via resvg-wasm
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Upload to Supabase Storage
    const uuid = crypto.randomUUID();
    const storagePath = `${STORAGE_PREFIX}/${uuid}.png`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pngBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        image_url: urlData.publicUrl,
        format: `${width}x${height}`,
        template_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('social-render-template error:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Render failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
