---
model: claude-sonnet-4-6
name: firecrawl
description: Use when scraping websites, crawling pages, extracting structured data from the web, converting sites to markdown, or building AI data pipelines with Firecrawl. Also use when configuring the Firecrawl MCP server, using the Firecrawl CLI, or working with the Browser Sandbox.
---

# Firecrawl

## Overview

The Web Data API for AI. Turns websites into LLM-ready markdown or structured data. API v2, SDKs for Python/Node/Go/Rust, MCP server, and CLI. (as of February 2026)

## Quick Reference

| Item | Value |
|------|-------|
| Base URL | `https://api.firecrawl.dev` |
| Auth | Bearer token: `Authorization: Bearer fc-YOUR_API_KEY` |
| API Version | v2 (v1 endpoints still at `/v1/`, v0 deprecated April 2025) |
| Python | `pip install firecrawl-py` |
| Node.js | `npm install @mendable/firecrawl-js` |
| CLI | `npm install -g firecrawl-cli` |
| MCP | `npx -y firecrawl-mcp` |
| Dashboard | `firecrawl.dev/app/api-keys` |

## Authentication

```typescript
import Firecrawl from "@mendable/firecrawl-js";
const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
```

```python
from firecrawl import Firecrawl
app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
```

API key format: `fc-YOUR_API_KEY`. Set `FIRECRAWL_API_KEY` env var — SDKs read it automatically.

## Core Endpoints

| Endpoint | Method | Path | Credits | Purpose |
|----------|--------|------|---------|---------|
| Scrape | POST | `/v2/scrape` | 1/page | Single page → markdown/HTML/JSON |
| Crawl | POST | `/v2/crawl` | 1/page | Multi-page site crawl |
| Map | POST | `/v1/map` | 1/call | Discover all URLs on a site |
| Search | POST | `/v2/search` | 2/10 results | Web search + content extraction |
| Agent | POST | `/v2/agent` | Dynamic | AI-powered autonomous data gathering |
| Batch Scrape | POST | `/v2/batch-scrape` | 1/page | Scrape multiple known URLs |
| Browser | POST | `/v2/browser` | 2/min | Managed browser sandbox sessions |

## Common Operations

### Scrape a page to markdown

```typescript
const result = await app.scrape("https://example.com", {
  formats: ["markdown", "html"],
  onlyMainContent: true,
});
console.log(result.markdown);
```

### Crawl a site

```typescript
const crawl = await app.crawl("https://example.com", {
  limit: 50,
  scrapeOptions: { formats: ["markdown"] },
});
```

### Search the web + scrape results

```typescript
const results = await app.search("firecrawl web scraping", {
  limit: 5,
  scrapeOptions: { formats: ["markdown"] },
});
```

### Extract structured data with Agent

```typescript
import { z } from "zod";

const data = await app.agent({
  prompt: "Find the pricing tiers for this product",
  urls: ["https://example.com/pricing"],
  schema: z.object({
    tiers: z.array(z.object({
      name: z.string(),
      price: z.string(),
      features: z.array(z.string()),
    })),
  }),
});
```

## Pricing (February 2026)

| Plan | Price | Credits/mo | Concurrent | Extra Credits |
|------|-------|------------|------------|---------------|
| Free | $0 | 500 (one-time, non-renewing) | 2 | — |
| Hobby | $16/mo | 3,000 | 5 | $9/1k |
| Standard | $83/mo | 100,000 | 50 | $47/35k |
| Growth | $333/mo | 500,000 | 100 | $177/175k |
| Scale | $599/mo | 1,000,000 | 150 | Custom |
| Enterprise | Custom | Unlimited | Custom | Bulk discount |

Credit costs: scrape/crawl = 1/page, search = 2/10 results, browser = 2/min (5 hours free), Enhanced Mode = 5/request.

## Rate Limits (Requests Per Minute)

| Plan | /scrape | /crawl | /search | /agent | /map |
|------|---------|--------|---------|--------|------|
| Free | 10 | 1 | 5 | 10 | 10 |
| Hobby | 100 | 15 | 50 | 100 | 100 |
| Standard | 500 | 50 | 250 | 500 | 500 |
| Growth | 5,000 | 250 | 2,500 | 1,000 | 5,000 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not setting `onlyMainContent: true` | Enabled by default, but if disabled you get nav/footer noise |
| Ignoring `maxAge` caching | Default is 2 days; set `maxAge: 0` for fresh scrape |
| Using `/extract` instead of `/agent` | `/agent` is the evolution — faster, doesn't need URLs upfront |
| Scraping with markdown when you need structured data | Use `formats: ["json"]` with a schema for extraction |
| Not handling 429 rate limits | Implement exponential backoff; SDKs handle retries |
| Enhanced Mode on every request | Costs 5 credits — use only as retry for 401/403/500 |
| Browser sessions left open | Set `ttl` and `activityTtl` to auto-close; max 20 concurrent |

See reference.md for full API coverage.
