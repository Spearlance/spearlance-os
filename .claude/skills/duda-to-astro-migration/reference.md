# Duda-to-Astro Migration Reference

## Table of Contents

1. [Duda Export Structure](#duda-export-structure)
2. [HTML Parsing Strategy](#html-parsing-strategy)
3. [CSS Extraction](#css-extraction)
4. [Content Extraction](#content-extraction)
5. [Component Mapping](#component-mapping)
6. [Image and Asset Handling](#image-and-asset-handling)
7. [Navigation Extraction](#navigation-extraction)
8. [Page-by-Page Migration](#page-by-page-migration)
9. [Astro 5 Content Collections](#astro-5-content-collections)
10. [Responsive Rebuild Strategy](#responsive-rebuild-strategy)
11. [Blog and Store Content](#blog-and-store-content)
12. [Common Duda Patterns](#common-duda-patterns)
13. [Quality Checklist](#quality-checklist)

---

## Duda Export Structure

### ZIP Contents

```
export/
├── index.html              # Home page
├── about.html              # About page (example)
├── services.html           # Services page (example)
├── contact.html            # Contact page (example)
├── mobile.css              # Mobile-specific overrides
├── {siteId}_1.min{hash}.css  # Main site stylesheet
├── page-specific.css       # Per-page style overrides
├── images/                 # Downloaded images
├── fonts/                  # Custom fonts
├── scripts/                # JavaScript bundles
└── _dm/                    # Duda internal runtime
    └── s/
        └── rt/
            └── dist/
                ├── css/    # Duda base CSS, Foundation
                └── js/     # Duda runtime engine
```

### File Identification

- **Main site CSS:** Filename pattern `{8-char-siteId}_1.min{hash}.css`
- **Foundation CSS:** Located in `_dm/s/rt/dist/css/`, filename includes "foundation"
- **Font CSS:** Usually `{siteId}_fonts.css` or inline in `<head>`
- **Mobile CSS:** Always `mobile.css` at root level
- **Runtime JS:** `_dm/s/rt/dist/js/` — jQuery, layout engine, widget handlers

### What to Ignore

- Everything in `_dm/` directory (Duda platform runtime)
- All `<script>` tags (Duda runtime, jQuery, analytics)
- `data-editor-state` attributes (Duda editor metadata)
- `dmDisplayNone` class elements (editor-hidden content)
- Elements with `style="display:none"` that are Duda UI chrome

---

## HTML Parsing Strategy

### Step 1: Identify the Content Root

Skip all Duda wrapper elements until you reach actual content:

```html
<!-- Skip these wrappers -->
<body class="dmRoot">
  <div class="dmwr">
    <div class="dm_wrapper">
      <div class="dm-home-page">
        <!-- START parsing here: template sections -->
        <div dm:templateid="header" dm:templateorder="1">
          <div class="dmOuter">
            <div class="dmInner">
              <div class="dmLayoutWrapper">
                <!-- ACTUAL CONTENT STARTS HERE -->
```

### Step 2: Parse Section by Section

Each `div[dm:templateid]` is a page section. Process them in `dm:templateorder`:

```html
<div dm:templateid="header" dm:templateorder="1">    <!-- → Header component -->
<div dm:templateid="content1" dm:templateorder="2">   <!-- → Hero/first section -->
<div dm:templateid="content2" dm:templateorder="3">   <!-- → Second section -->
<div dm:templateid="footer" dm:templateorder="99">     <!-- → Footer component -->
```

### Step 3: Extract Content from Sections

Inside each section, the structure is:

```html
<div class="dmRespRow">                    <!-- Section row -->
  <div class="dmRespColsWrapper">          <!-- Column container -->
    <div class="dmRespCol small-12 medium-6"> <!-- Column (with Foundation grid) -->
      <div class="dmNewParagraph">          <!-- Text content -->
        <h2>Heading Text</h2>
        <p>Paragraph text here.</p>
      </div>
      <div class="dmButtonLink">            <!-- Button/CTA -->
        <a href="/contact">Get Started</a>
      </div>
    </div>
    <div class="dmRespCol small-12 medium-6"> <!-- Second column -->
      <div class="imageWidget">
        <img src="images/photo.jpg" alt="..." />
      </div>
    </div>
  </div>
</div>
```

### Nested Widget Identification

Use `data-widget-type` and class names to identify widget purpose:

| Pattern | Widget Type |
|---------|------------|
| `class="dmNewParagraph"` | Rich text block |
| `class="dmButtonLink"` | Button / CTA link |
| `class="imageWidget"` or `class="dmImage"` | Single image |
| `class="dmImageSlider"` | Image carousel/slider |
| `class="dmPhotoGallery"` | Photo gallery grid |
| `class="dmform"` | Contact/lead form |
| `class="dmNav"` | Navigation menu |
| `class="dmSocialShare"` | Social media links |
| `class="dmVideo"` | Embedded video |
| `class="dmMap"` | Google Maps embed |
| `class="dmCustomWidget"` | Custom HTML/embed |
| `class="dmAccordion"` | Accordion/FAQ |
| `class="dmTabs"` | Tabbed content |

---

## CSS Extraction

### Design Token Extraction Strategy

Don't port Duda CSS. Extract the design intent and rebuild.

#### Step 1: Find the Site CSS File

The main site CSS is `{siteId}_1.min{hash}.css`. Unminify it to read.

#### Step 2: Extract Color Palette

Search for these patterns in the site CSS:

```css
/* Background colors on sections */
.dmRespRow { background-color: #...; }
div[dm:templateid="..."] .dmOuter { background: ...; }

/* Text colors */
.dmNewParagraph { color: #...; }
.dmNewParagraph h1, .dmNewParagraph h2 { color: #...; }

/* Button colors */
.dmButtonLink a { background-color: #...; color: #...; }
.dmButtonLink a:hover { background-color: #...; }

/* Link colors */
a { color: #...; }
```

Build a palette:

```css
:root {
  --color-primary: /* from buttons/CTAs */;
  --color-secondary: /* from secondary buttons or accents */;
  --color-text: /* from paragraph text */;
  --color-heading: /* from h1/h2 */;
  --color-background: /* from body/main background */;
  --color-surface: /* from card/section backgrounds */;
}
```

#### Step 3: Extract Typography

```css
/* Font families - check both site CSS and font CSS */
body { font-family: ...; }
h1, h2, h3 { font-family: ...; }

/* Font sizes */
.dmNewParagraph { font-size: ...; line-height: ...; }
.dmNewParagraph h1 { font-size: ...; }
.dmNewParagraph h2 { font-size: ...; }

/* Font weights */
h1, h2 { font-weight: ...; }
```

#### Step 4: Extract Spacing Patterns

```css
/* Section padding */
.dmRespRow { padding: ...; }
.dmOuter { padding: ...; }
.dmInner { max-width: ...; margin: 0 auto; }

/* Element spacing */
.dmNewParagraph { margin-bottom: ...; }
.dmRespCol { padding: ...; }
```

#### Step 5: Extract Component-Specific Styles

For buttons:
```css
.dmButtonLink a {
  padding: ...;
  border-radius: ...;
  font-size: ...;
  font-weight: ...;
  text-transform: ...;
}
```

For cards/containers:
```css
.dmRespCol {
  background: ...;
  border-radius: ...;
  box-shadow: ...;
}
```

### Mobile CSS Analysis

`mobile.css` uses `@media (max-width: 800px)` and often completely restructures:

```css
/* Mobile overrides — these may change EVERYTHING */
@media (max-width: 800px) {
  .dmRespRow { padding: 20px 15px; }
  .dmRespCol { width: 100% !important; }
  .dmNewParagraph h1 { font-size: 28px; }
  /* Elements may be hidden, reordered, or resized */
}
```

**Important:** Many elements have completely different styling in mobile.css. Always check both desktop and mobile CSS for each component.

---

## Content Extraction

### Text Content

Extract from `.dmNewParagraph` elements:

```python
# Pseudocode for content extraction
for paragraph in soup.select('.dmNewParagraph'):
    # Get all text with formatting
    heading = paragraph.find(['h1', 'h2', 'h3', 'h4'])
    body_text = paragraph.find_all('p')
    lists = paragraph.find_all(['ul', 'ol'])

    # Preserve inline formatting
    # <strong>, <em>, <a href="..."> → markdown **bold**, *italic*, [link](url)
```

### Image Content

Extract from image widgets:

```python
for img_widget in soup.select('.imageWidget, .dmImage'):
    img = img_widget.find('img')
    src = img.get('src', '')  # May be CDN URL or local path
    alt = img.get('alt', '')

    # Check for background images too
    style = img_widget.get('style', '')
    # background-image: url(...) is common in Duda
```

### Link/Button Content

```python
for btn in soup.select('.dmButtonLink'):
    link = btn.find('a')
    href = link.get('href', '')
    text = link.get_text(strip=True)

    # Duda internal links: /page-name or #anchor
    # External links: https://...
    # Tel/mail: tel:, mailto:
```

### Background Images

Duda heavily uses inline styles for backgrounds:

```html
<div class="dmRespRow" style="background-image: url('irp-cdn.multiscreensite.com/...')">
```

Also check CSS for background declarations on section IDs/classes.

---

## Component Mapping

### Section → Astro Component

A `dmRespRow` with its columns maps to an Astro section component:

**Duda HTML:**
```html
<div class="dmRespRow">
  <div class="dmRespColsWrapper">
    <div class="dmRespCol small-12 medium-6 large-6">
      <div class="dmNewParagraph">
        <h2>Our Services</h2>
        <p>We provide excellent service.</p>
      </div>
    </div>
    <div class="dmRespCol small-12 medium-6 large-6">
      <div class="imageWidget">
        <img src="images/services.jpg" alt="Services" />
      </div>
    </div>
  </div>
</div>
```

**Astro Component:**
```astro
---
// src/components/TextImageSection.astro
interface Props {
  heading: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: 'left' | 'right';
}

const { heading, text, imageSrc, imageAlt, imagePosition = 'right' } = Astro.props;
---

<section class="text-image-section">
  <div class="container">
    <div class="content" data-position={imagePosition}>
      <div class="text-col">
        <h2>{heading}</h2>
        <p>{text}</p>
      </div>
      <div class="image-col">
        <img src={imageSrc} alt={imageAlt} loading="lazy" />
      </div>
    </div>
  </div>
</section>

<style>
  .container {
    max-width: var(--max-width, 1200px);
    margin: 0 auto;
    padding: var(--section-padding, 4rem 2rem);
  }
  .content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: center;
  }
  .content[data-position="left"] {
    direction: rtl;
  }
  .content[data-position="left"] > * {
    direction: ltr;
  }
  @media (max-width: 800px) {
    .content {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### Hero Section

Duda heroes are typically the first `dmRespRow` with a background image and overlay text:

```html
<!-- Duda pattern -->
<div class="dmRespRow" style="background-image: url(...);">
  <div class="dmRespColsWrapper">
    <div class="dmRespCol small-12">
      <div class="dmNewParagraph">
        <h1>Main Headline</h1>
        <p>Subtitle text</p>
      </div>
      <div class="dmButtonLink">
        <a href="/contact">Call to Action</a>
      </div>
    </div>
  </div>
</div>
```

**Astro Component:**
```astro
---
interface Props {
  headline: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage: string;
}
const { headline, subtitle, ctaText, ctaHref, backgroundImage } = Astro.props;
---

<section class="hero" style={`--bg-image: url(${backgroundImage})`}>
  <div class="hero-content">
    <h1>{headline}</h1>
    {subtitle && <p class="subtitle">{subtitle}</p>}
    {ctaText && ctaHref && <a href={ctaHref} class="cta-button">{ctaText}</a>}
  </div>
</section>
```

### Navigation

Duda nav is typically in a `dmNav` widget:

```html
<div class="dmNav">
  <nav>
    <ul class="dmNavMenu">
      <li><a href="/">Home</a></li>
      <li class="dmNavHasChildren">
        <a href="/services">Services</a>
        <ul class="dmNavSubmenu">
          <li><a href="/services/web-design">Web Design</a></li>
        </ul>
      </li>
    </ul>
  </nav>
</div>
```

Extract nav items as structured data, then use in an Astro navigation component.

### Contact Form

**Forms are dead in exports.** The HTML structure shows the fields but no backend:

```html
<div class="dmform">
  <form>
    <input type="text" placeholder="Name" />
    <input type="email" placeholder="Email" />
    <textarea placeholder="Message"></textarea>
    <button type="submit">Send</button>
  </form>
</div>
```

**Rebuild options:**
- Astro + form service (Formspree, Netlify Forms, etc.)
- Astro API route + email service
- Astro + React/Svelte form component with client-side validation

### Multi-Column Layouts

Duda uses Foundation grid classes for columns:

| Foundation Classes | Layout |
|-------------------|--------|
| `small-12 medium-12 large-12` | Full width |
| `small-12 medium-6 large-6` | Two equal columns |
| `small-12 medium-4 large-4` | Three equal columns |
| `small-12 medium-8 large-8` + `medium-4 large-4` | 2/3 + 1/3 split |
| `small-12 medium-3 large-3` | Four equal columns |

Map to CSS Grid:

```css
/* Two columns */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }

/* Three columns */
.three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }

/* 2/3 + 1/3 */
.split-col { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* All collapse to single column on mobile */
@media (max-width: 800px) {
  .two-col, .three-col, .split-col {
    grid-template-columns: 1fr;
  }
}
```

---

## Image and Asset Handling

### CDN URL Rewriting

All Duda CDN URLs follow this pattern:
```
https://irp-cdn.multiscreensite.com/{siteId}/dms3rep/multi/...
```

**Steps:**
1. Search all HTML and CSS files for `irp-cdn.multiscreensite.com`
2. Download each referenced asset
3. Place in Astro's `public/` or `src/assets/` (for optimization)
4. Rewrite URLs to local paths

### Image Optimization with Astro

For images that benefit from optimization, use Astro's `<Image>` component:

```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<Image src={heroImage} alt="Hero" width={1200} height={600} />
```

For images that should be served as-is (logos, icons), place in `public/`:
```
public/
  images/
    logo.png
    favicon.ico
```

### Font Handling

Extract `@font-face` declarations from Duda's font CSS:

```css
/* Duda font CSS pattern */
@font-face {
  font-family: 'CustomFont';
  src: url('irp-cdn.multiscreensite.com/.../font.woff2') format('woff2');
}
```

1. Download font files
2. Place in `public/fonts/`
3. Create clean `@font-face` declarations in your global CSS
4. If using Google Fonts, switch to direct Google Fonts import instead

---

## Navigation Extraction

### Duda Nav Structure

```html
<div class="dmNav">
  <div class="dmNavWrapper">
    <div class="dmNavLogo">
      <a href="/"><img src="logo.png" alt="Site Name" /></a>
    </div>
    <nav>
      <ul class="dmNavMenu">
        <li class="dmNavItem"><a href="/">Home</a></li>
        <li class="dmNavItem dmNavHasChildren">
          <a href="/services">Services</a>
          <ul class="dmNavSubmenu">
            <li><a href="/services/design">Design</a></li>
            <li><a href="/services/development">Development</a></li>
          </ul>
        </li>
        <li class="dmNavItem"><a href="/about">About</a></li>
        <li class="dmNavItem"><a href="/contact">Contact</a></li>
      </ul>
    </nav>
    <div class="dmNavMobileToggle">☰</div>
  </div>
</div>
```

### Extract as Data

```typescript
// src/data/navigation.ts
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const mainNav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Design', href: '/services/design' },
      { label: 'Development', href: '/services/development' },
    ]
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];
```

---

## Page-by-Page Migration

### Migration Order

1. **Layout first** — BaseLayout with header, footer, global styles
2. **Home page** — Usually the most complex; establishes component library
3. **Simple content pages** — About, Contact (reuse components from home)
4. **Complex pages** — Services, Portfolio (may need new components)
5. **Blog/dynamic pages** — Last, requires content collection setup

### Per-Page Process

For each HTML page in the export:

1. **Open HTML and identify sections** by `dm:templateid`
2. **For each section:**
   - Identify the layout pattern (columns, full-width, split)
   - Identify widgets within (text, image, button, form, etc.)
   - Extract text content verbatim
   - Note image references
   - Note any section-specific background colors/images
3. **Check if an existing component fits** — reuse before creating new
4. **Build the Astro page** using components + extracted content
5. **Compare visual output** to the original Duda site

### URL Mapping

Duda URL patterns → Astro pages:

| Duda | Astro |
|------|-------|
| `index.html` | `src/pages/index.astro` |
| `about.html` or `about-us.html` | `src/pages/about.astro` |
| `services.html` | `src/pages/services.astro` |
| `services/web-design.html` | `src/pages/services/web-design.astro` |
| `blog.html` (if exported) | `src/pages/blog/index.astro` |
| `contact.html` | `src/pages/contact.astro` |

---

## Astro 5 Content Collections

### Setup (Astro 5 Content Layer API)

```typescript
// src/content.config.ts  (NOT src/content/config.ts)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { blog, services };
```

### Querying Collections (Astro 5)

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

{sorted.map(post => (
  <article>
    <a href={`/blog/${post.id}`}>  <!-- .id not .slug in Astro 5 -->
      <h2>{post.data.title}</h2>
      <time>{post.data.date.toLocaleDateString()}</time>
    </a>
  </article>
))}
```

### Rendering Collection Content (Astro 5)

```astro
---
// src/pages/blog/[...id].astro
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { id: post.id },  // .id not .slug
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);  // render(post) not post.render()
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
```

---

## Responsive Rebuild Strategy

### Don't Port — Rebuild

Duda's responsive approach (desktop CSS + separate mobile.css at 800px) is outdated. Instead:

1. **Extract the mobile design** from mobile.css — what changes at mobile?
2. **Extract the desktop design** from main CSS
3. **Rebuild with modern breakpoints:**

```css
/* Mobile-first approach */
.section {
  padding: 2rem 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .section {
    padding: 3rem 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .section {
    padding: 4rem 2rem;
  }
}

/* Wide */
@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Key Mobile Differences to Check

In Duda exports, mobile.css often:
- Hides entire sections (`display: none`)
- Changes column layouts to single-column
- Reduces font sizes significantly
- Removes background images
- Changes navigation to hamburger menu
- Reorders elements with absolute positioning hacks

Document which sections are visible/hidden on mobile before building.

---

## Blog and Store Content

### Blog (RSS Export)

If the Duda site has a blog, export via RSS:

1. Access `https://{site-domain}/blog/rss.xml`
2. Parse RSS entries: title, date, content (HTML), featured image
3. Convert each entry to markdown in `src/content/blog/`

```markdown
---
title: "Blog Post Title"
date: 2025-06-15
description: "Post excerpt here"
image: "/images/blog/post-image.jpg"
---

Blog post content converted from HTML to markdown...
```

### Store (CSV Export)

If the Duda site has an e-commerce store:

1. Export products as CSV from Duda dashboard
2. Convert to content collection or JSON data

```typescript
// src/content.config.ts
const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    price: z.number(),
    description: z.string(),
    images: z.array(z.string()),
    category: z.string(),
    inStock: z.boolean(),
  }),
});
```

---

## Common Duda Patterns

### Pattern: Alternating Sections

Duda sites frequently alternate between light/dark background sections:

```html
<div class="dmRespRow" style="background-color: #ffffff;"><!-- Light --></div>
<div class="dmRespRow" style="background-color: #1a1a2e;"><!-- Dark --></div>
<div class="dmRespRow" style="background-color: #ffffff;"><!-- Light --></div>
```

Build a `<Section>` component with a `variant` prop:

```astro
---
interface Props { variant?: 'light' | 'dark' | 'primary'; }
const { variant = 'light' } = Astro.props;
---
<section class={`section section--${variant}`}>
  <div class="container"><slot /></div>
</section>
```

### Pattern: Icon + Text Cards

Common Duda layout: row of 3-4 columns, each with icon + heading + text:

```astro
---
interface Props {
  items: { icon: string; heading: string; text: string; }[];
}
const { items } = Astro.props;
---
<div class="card-grid">
  {items.map(item => (
    <div class="card">
      <img src={item.icon} alt="" class="card-icon" />
      <h3>{item.heading}</h3>
      <p>{item.text}</p>
    </div>
  ))}
</div>
```

### Pattern: Testimonials / Reviews

Duda testimonial widgets become a simple component:

```astro
---
interface Props {
  quotes: { text: string; author: string; role?: string; }[];
}
---
```

### Pattern: CTA Banner

Full-width colored section with centered text + button:

```astro
---
interface Props {
  heading: string;
  text?: string;
  ctaText: string;
  ctaHref: string;
}
---
<section class="cta-banner">
  <div class="container">
    <h2>{Astro.props.heading}</h2>
    {Astro.props.text && <p>{Astro.props.text}</p>}
    <a href={Astro.props.ctaHref} class="cta-button">{Astro.props.ctaText}</a>
  </div>
</section>
```

### Pattern: Parallax Background

Duda uses `data-background-parallax-*` attributes. For Astro, implement with CSS:

```css
.parallax-section {
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

/* Disable on mobile (performance) */
@media (max-width: 800px) {
  .parallax-section {
    background-attachment: scroll;
  }
}
```

---

## Quality Checklist

### Content Parity

- [ ] All text content matches original
- [ ] All images present and loading
- [ ] All links functional (internal and external)
- [ ] Navigation complete with correct hierarchy
- [ ] Footer content matches (address, phone, social links)
- [ ] Favicon present

### Visual Parity

- [ ] Color palette matches original
- [ ] Typography matches (fonts, sizes, weights)
- [ ] Spacing feels similar (doesn't need to be pixel-perfect)
- [ ] Layout structure matches at desktop width
- [ ] Layout works at mobile width
- [ ] Background images/colors on sections

### Technical Quality

- [ ] No Duda classes remain in output (dm*, Foundation)
- [ ] No CDN references to `irp-cdn.multiscreensite.com`
- [ ] No jQuery or Duda runtime JS
- [ ] Images optimized (using Astro `<Image>` where appropriate)
- [ ] Semantic HTML (proper heading hierarchy, landmarks)
- [ ] Accessible (alt text, focus states, color contrast)
- [ ] Fast (Lighthouse performance > 90)

### Astro-Specific

- [ ] Using `ClientRouter` not `ViewTransitions`
- [ ] Content config in `src/content.config.ts` with `glob()` loader
- [ ] Using `entry.id` not `entry.slug`
- [ ] Using `render(entry)` not `entry.render()`
- [ ] Pages use layouts consistently
- [ ] Scoped styles or global CSS custom properties
