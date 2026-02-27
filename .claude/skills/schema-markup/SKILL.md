---
model: claude-sonnet-4-6
name: schema-markup
description: Use when auditing structured data, implementing JSON-LD schemas, checking rich result eligibility, or adding schema types for service businesses. Also use when fixing schema validation errors or optimizing for Google rich results.
---

# Schema Markup

## Overview

Deep structured data skill — JSON-LD audit, rich result eligibility, full templates for service businesses, and validation. Surfaces every schema gap and produces atomic implementation commits.

```
Section 1: Schema Inventory
Section 2: Completeness Audit
Section 3: Rich Result Eligibility
Section 4: Schema Templates
Section 5: Validation
Section 6: Implementation
──► Structured audit report + implementation plan
```

---

## Quick Reference

| Schema Type | Rich Result | Status (2026) |
|------------|-------------|---------------|
| LocalBusiness | Local pack review snippets | ✓ Active |
| AggregateRating | Review stars on LocalBusiness | ✓ Active |
| BreadcrumbList | Breadcrumbs in SERPs | ✓ Active |
| WebSite + SearchAction | Sitelinks search box | ✓ Active |
| Event | Event rich result | ✓ Active |
| VideoObject | Video thumbnail | ✓ Active |
| Product | Product rich result | ✓ Active |
| Organization | Knowledge panel data | ✓ Active |
| FAQPage | FAQ dropdowns | ⚠ Restricted — gov/health only |
| HowTo | How-to steps | ✗ Deprecated (2023) |

> **Note:** Google restricted FAQPage rich results in August 2023 — FAQ dropdowns no longer appear for general commercial sites, only authoritative government and health websites. FAQPage schema can still assist with featured snippets, so it's worth keeping, but don't expect the expandable rich result format.
> HowTo rich results were fully removed from desktop and mobile in 2023. Schema is harmless to keep but produces zero SERP benefit.

---

## Section 1: Schema Inventory

Scan every JSON-LD block in the codebase. Read files — do not rely on grep output alone.

```bash
# Find all JSON-LD blocks
grep -rn "application/ld+json" --include="*.html" --include="*.tsx" --include="*.jsx" --include="*.astro" --include="*.svelte" .
```

For each JSON-LD block found:
- Parse the `@type` value(s)
- Note file path and line number
- Check for syntax errors (malformed JSON)
- Assess rich result eligibility (see Section 3)

**Output table:**

| Page | File Path | Schema Types | Valid JSON | Rich Result Eligible |
|------|-----------|-------------|------------|---------------------|
| Homepage | src/pages/index.astro:42 | LocalBusiness, WebSite | ✓ | ✓ Local pack, Sitelinks |
| /contact | src/pages/contact.astro:18 | none | — | ✗ |
| /services/plumbing | src/pages/services/plumbing.astro:31 | Service | ✓ | ◐ Missing AggregateRating |

---

## Section 2: Completeness Audit

For each schema type found, check required vs recommended properties against Google's current docs.

### Service Business Minimum Requirements

| Schema Type | Required | Recommended | Priority |
|------------|----------|-------------|----------|
| LocalBusiness (or subtype) | `name`, `address` | `telephone`, `url`, `geo`, `openingHoursSpecification`, `priceRange`, `image`, `areaServed`, `aggregateRating` | Critical |
| Service | `name`, `provider` | `serviceType`, `areaServed`, `description`, `offers` | High |
| AggregateRating | `ratingValue`, `reviewCount` | `bestRating`, `worstRating` | High |
| BreadcrumbList | `itemListElement[].item`, `itemListElement[].name`, `itemListElement[].position` | — | Medium |
| WebSite | `url`, `potentialAction` | `name` | Medium |
| Organization | `name`, `url` | `logo`, `contactPoint`, `address`, `sameAs` | Medium |
| FAQPage | `mainEntity[].name`, `mainEntity[].acceptedAnswer.text` | — | Low (restricted rich result) |

### Per-Schema Property Check

For each schema found, produce a completeness table:

```
LocalBusiness (src/pages/index.astro)
  name            ✓
  address         ✓ — PostalAddress complete
  telephone       ✓
  url             ✓
  geo             ✗ — missing latitude/longitude
  openingHours    ◐ — present but no Saturday/Sunday
  priceRange      ✗ — missing
  image           ✗ — missing
  aggregateRating ✓ — pulled from live data
  areaServed      ✗ — missing
```

---

## Section 3: Rich Result Eligibility

Map each page to which Google rich result features it qualifies for.

| Rich Result | Required Schema | Additional Requirements | Status |
|-------------|----------------|------------------------|--------|
| Local pack review snippets | `LocalBusiness` + `AggregateRating` | GBP claimed, rating from real data | ✓ Active |
| Review stars in organic | `AggregateRating` nested in `LocalBusiness` | Cannot be standalone — must be on an entity | ✓ Active |
| Breadcrumbs | `BreadcrumbList` | Must match actual URL structure | ✓ Active |
| Sitelinks search box | `WebSite` + `SearchAction` | Homepage only | ✓ Active |
| Event rich result | `Event` | Future dates, physical or virtual location | ✓ Active |
| Video thumbnail | `VideoObject` | Page must have a playable video | ✓ Active |
| Product rich result | `Product` | E-commerce or product catalog pages | ✓ Active |
| FAQ dropdowns | `FAQPage` | **Government and health sites only** — all others excluded | ⚠ Restricted |
| How-to steps | `HowTo` | **Fully deprecated** — no SERP benefit | ✗ Removed |

### Eligibility Output Per Page

| Page | Schema Present | Rich Result | Gap |
|------|---------------|-------------|-----|
| Homepage | LocalBusiness, WebSite | Local pack, Sitelinks | Missing AggregateRating for review stars |
| /services/plumbing | Service | None | Add LocalBusiness ref + AggregateRating |
| /about | Organization | Knowledge panel | Add sameAs social links |
| /faq | FAQPage | Featured snippets only | Note: expandable FAQ not shown for commercial sites |

---

## Section 4: Schema Templates

Complete, copy-paste-ready JSON-LD templates. Replace placeholder values. Never hardcode `aggregateRating` or `review` data — always pull from live API/CMS (see note under each template).

### 1. LocalBusiness with Subtype

Use the most specific applicable subtype from schema.org. Common subtypes for service businesses:
`Plumber`, `Electrician`, `HVACBusiness`, `Dentist`, `LegalService`, `HomeAndConstructionBusiness`, `Locksmith`, `RoofingContractor`, `AutoRepair`, `GeneralContractor`

```json
{
  "@context": "https://schema.org",
  "@type": "Plumber",
  "name": "",
  "image": "",
  "telephone": "",
  "email": "",
  "url": "",
  "description": "",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "",
    "addressLocality": "",
    "addressRegion": "",
    "postalCode": "",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 0.00000,
    "longitude": 0.00000
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "09:00",
      "closes": "14:00"
    }
  ],
  "areaServed": [
    {
      "@type": "City",
      "name": ""
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "",
    "reviewCount": "",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": []
}
```

> `aggregateRating.ratingValue` and `aggregateRating.reviewCount` MUST come from live data. Pull from Google Business Profile API, a reviews aggregation service, or your CMS. Hardcoded ratings that don't match actual review counts violate Google's structured data guidelines and can trigger manual actions. Cross-reference `review-management` for live review data pipelines.

> `review` array should contain actual review objects or be omitted entirely. Never populate with fabricated reviews.

---

### 2. Service with ServiceArea

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "",
  "description": "",
  "serviceType": "",
  "provider": {
    "@type": "LocalBusiness",
    "name": "",
    "url": ""
  },
  "areaServed": [
    {
      "@type": "City",
      "name": ""
    },
    {
      "@type": "State",
      "name": ""
    }
  ],
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "priceCurrency": "USD"
    }
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": ""
        }
      }
    ]
  }
}
```

---

### 3. FAQPage

> Note: Google no longer shows FAQ rich results (expandable dropdowns) for commercial websites — only government and health sites. FAQPage schema can still help with featured snippet eligibility, so it's worth implementing, but don't expect the visual rich result in SERPs.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": ""
      }
    },
    {
      "@type": "Question",
      "name": "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": ""
      }
    }
  ]
}
```

---

### 4. BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://example.com/services/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Plumbing",
      "item": "https://example.com/services/plumbing/"
    }
  ]
}
```

Breadcrumb `item` URLs must exactly match actual page URLs. Mismatches cause validation errors.

---

### 5. WebSite + SearchAction

Homepage only. Enables Google to display a sitelinks search box in brand searches.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "",
  "url": "",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

Only implement if the site has working search functionality at the `urlTemplate` endpoint.

---

### 6. Organization + ContactPoint (Multi-Location)

Use `Organization` with nested `LocalBusiness` entries for multi-location businesses.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "",
  "url": "",
  "logo": "",
  "description": "",
  "sameAs": [
    "https://www.facebook.com/businessname",
    "https://www.instagram.com/businessname",
    "https://www.linkedin.com/company/businessname",
    "https://www.yelp.com/biz/businessname"
  ],
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "",
      "contactType": "customer service",
      "contactOption": "TollFree",
      "areaServed": "US",
      "availableLanguage": "English"
    }
  ],
  "department": [
    {
      "@type": "LocalBusiness",
      "name": "",
      "telephone": "",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "",
        "addressLocality": "",
        "addressRegion": "",
        "postalCode": "",
        "addressCountry": "US"
      }
    }
  ]
}
```

`sameAs` is a key E-E-A-T signal — include all verified social/directory profiles to build entity authority.

---

### 7. VideoObject (Service Demo Videos)

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "",
  "description": "",
  "thumbnailUrl": "",
  "uploadDate": "",
  "duration": "PT2M30S",
  "contentUrl": "",
  "embedUrl": "",
  "publisher": {
    "@type": "Organization",
    "name": "",
    "logo": {
      "@type": "ImageObject",
      "url": ""
    }
  }
}
```

`VideoObject` only produces a rich result if a playable video exists on the same page. `duration` uses ISO 8601 duration format (`PT2M30S` = 2 minutes 30 seconds).

---

## Section 5: Validation

### Automated Validation (Recommended)

Run validation at two levels:

**1. Schema.org Validator**
```
https://validator.schema.org
```
Checks structural validity — required properties, correct types, proper nesting.

**2. Google Rich Results Test**
```
https://search.google.com/test/rich-results
```
Checks Google-specific requirements for rich result eligibility. More restrictive than schema.org validator.

**3. Lighthouse Structured Data Audit**
```bash
npx lighthouse https://example.com --only-categories=seo --output=json | jq '.audits["structured-data"]'
```

**4. Build-Time Validation (Static Sites)**

For Astro, Next.js, or any static site — add a build-time check that parses every JSON-LD block, validates required fields, and fails the build on errors:

```js
// scripts/validate-schema.js
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const REQUIRED_FIELDS = {
  LocalBusiness: ['name', 'address'],
  Service: ['name', 'provider'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
}

function validateSchema(json, filePath) {
  const type = json['@type']
  const required = REQUIRED_FIELDS[type]
  if (!required) return []

  return required
    .filter(field => !json[field])
    .map(field => `${filePath}: ${type} missing required field "${field}"`)
}

// Wire into build process — exit 1 on any validation error
```

### Validation Output Format

```
validator.schema.org results — [Date]

src/pages/index.astro     LocalBusiness    ✓  no errors
src/pages/services/*.astro  Service        ✗  missing: provider
src/pages/about.astro     Organization     ✓  1 warning: sameAs empty
```

---

## Section 6: Implementation

### Commit Strategy

One schema type per commit. Never batch multiple schema changes in one commit — makes rollback impossible if one change triggers issues.

```bash
# Correct
git add src/pages/index.astro
git commit -m "feat(schema): add LocalBusiness JSON-LD to homepage"

git add src/pages/services/plumbing.astro
git commit -m "feat(schema): add Service schema to plumbing page"

# Wrong — don't do this
git add src/pages/
git commit -m "feat(schema): add all schemas"
```

### Implementation Order

| Priority | Action | Why |
|----------|--------|-----|
| 1 | Fix malformed JSON in existing schemas | Broken JSON = ignored entirely by Google |
| 2 | Add `LocalBusiness` with subtype to homepage | Highest local SEO leverage |
| 3 | Complete missing required fields | Required fields first — recommended second |
| 4 | Add `AggregateRating` (live data only) | Review stars in search results |
| 5 | Add `BreadcrumbList` to inner pages | Breadcrumbs in SERPs, cleaner URLs |
| 6 | Add `Service` schema to service pages | Signals service relevance |
| 7 | Add `Organization` with `sameAs` | Entity authority and knowledge panel |
| 8 | Add `VideoObject` to pages with video | Video thumbnails in results |

### Post-Implementation Checklist

After each schema addition:

- [ ] Validate at `https://validator.schema.org`
- [ ] Test rich result at `https://search.google.com/test/rich-results`
- [ ] Run site build — confirm no regressions
- [ ] Commit with conventional commit message
- [ ] Submit URL for reindexing via GSC (or wait for natural recrawl)
- [ ] Monitor GSC → Enhancements tab for indexing status (allow 2–4 weeks)

---

## Audit Report Template

```
# Schema Markup Audit — [Site] — [Date]

## Inventory
| Page | Schema Types | Valid | Rich Result Eligible |
|------|-------------|-------|---------------------|

## Missing Schemas
| Page | Recommended Type | Why | Priority |
|------|-----------------|-----|----------|

## Validation Errors
| Page | Type | Error | Fix |
|------|------|-------|-----|

## AggregateRating Check
| Page | Rating Hardcoded? | Live Data Source | Action |
|------|------------------|-----------------|--------|

## Implementation Plan
1. [schema + page + priority]
2. ...
```

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| Hardcoding `aggregateRating` values | Pull from live data (GBP API, review service) or omit |
| Using `HowTo` schema expecting SERP benefit | Deprecated — no rich result since 2023 |
| Expecting FAQ dropdowns for commercial sites | FAQPage restricted to gov/health since Aug 2023 |
| Malformed JSON (trailing commas, unquoted keys) | Validate JSON syntax before checking schema validity |
| `BreadcrumbList` URLs that don't match actual pages | Each `item` URL must return a 200 status |
| `VideoObject` on pages without a playable video | Only add where video exists on-page |
| `SearchAction` without working site search | Only implement if the search endpoint works |
| Multiple `LocalBusiness` entries with different NAP | Enforce exact NAP consistency — cross-reference `nap-ninja` |
| Standalone `AggregateRating` not nested in entity | Must be nested in `LocalBusiness` or `Product` for review stars |
| Schema in `<head>` vs `<body>` | Either is valid — but be consistent across pages |
| `@type: "LocalBusiness"` when a subtype exists | Use the most specific subtype — `Plumber`, `Dentist`, etc. |

---

## Official References

- [Google Structured Data Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- [LocalBusiness Reference](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Organization Reference](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org)
- [FAQ + HowTo Changes (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Schema.org LocalBusiness](https://schema.org/LocalBusiness)

---

## Related Skills

- `seo-audit` — invokes schema-markup at Phase 5.5
- `local-seo-audit` — LocalBusiness schema for local businesses
- `review-management` — live review data for AggregateRating
- `nap-ninja` — NAP consistency enforcement — schema must match business.json
