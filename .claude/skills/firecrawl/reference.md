# Firecrawl Developer Reference

> **Last Updated:** February 2026
> **API Version:** v2
> **Base URL:** `https://api.firecrawl.dev`
> **SDKs:** Python (`firecrawl-py`), Node.js (`@mendable/firecrawl-js`), Go, Rust
> **CLI:** `firecrawl-cli`

---

## Table of Contents

1. [Setup](#setup)
2. [Scrape Endpoint](#scrape-endpoint)
3. [Crawl Endpoint](#crawl-endpoint)
4. [Map Endpoint](#map-endpoint)
5. [Search Endpoint](#search-endpoint)
6. [Agent Endpoint](#agent-endpoint)
7. [Batch Scrape](#batch-scrape)
8. [Browser Sandbox](#browser-sandbox)
9. [Output Formats](#output-formats)
10. [Actions (Browser Automation)](#actions-browser-automation)
11. [Webhooks](#webhooks)
12. [MCP Server](#mcp-server)
13. [CLI](#cli)
14. [Pricing and Credits](#pricing-and-credits)
15. [Rate Limits](#rate-limits)
16. [Error Handling](#error-handling)
17. [Self-Hosting](#self-hosting)
18. [Common Mistakes](#common-mistakes)

---

## Setup

### Install

```bash
# Node.js
npm install @mendable/firecrawl-js

# Python
pip install firecrawl-py

# CLI
npm install -g firecrawl-cli

# MCP Server
npx -y firecrawl-mcp
```

### Environment Variable

```bash
# .env
FIRECRAWL_API_KEY=fc-your-api-key-here
```

Never commit API keys. Get yours at `firecrawl.dev/app/api-keys`.

### Client Initialization

**Node.js:**

```typescript
import Firecrawl from "@mendable/firecrawl-js";

// Uses FIRECRAWL_API_KEY env var automatically
const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
```

**Python:**

```python
from firecrawl import Firecrawl

# Sync client
app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))

# Async client
from firecrawl import AsyncFirecrawl
app = AsyncFirecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
```

**cURL:**

```bash
curl -X POST 'https://api.firecrawl.dev/v2/scrape' \
  -H 'Authorization: Bearer fc-YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com"}'
```

---

## Scrape Endpoint

**POST `/v2/scrape`** — Extract content from a single URL.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | URL to scrape |
| `formats` | string[] | `["markdown"]` | Output formats: `markdown`, `html`, `rawHtml`, `links`, `screenshot`, `json`, `summary` |
| `onlyMainContent` | boolean | `true` | Exclude nav/header/footer |
| `includeTags` | string[] | — | Whitelist HTML elements by tag, `#id`, or `.class` |
| `excludeTags` | string[] | — | Blacklist HTML elements |
| `maxAge` | number | `172800000` | Cache freshness (ms). `0` = always fresh. Default = 2 days |
| `waitFor` | number | — | Wait for JS rendering (ms) |
| `timeout` | number | — | Request timeout (ms) |
| `mobile` | boolean | `false` | Emulate mobile viewport |
| `headers` | object | — | Custom request headers |
| `actions` | Action[] | — | Browser automation actions (click, scroll, wait, write) |
| `location` | object | — | `{ country: "US", languages: ["en"] }` |
| `skipTlsVerification` | boolean | `false` | Skip SSL cert validation |
| `removeBase64Images` | boolean | `false` | Strip base64 images from output |
| `blockAds` | boolean | `true` | Block ads during scrape |
| `proxy` | string | — | Proxy URL |
| `storeInCache` | boolean | — | Cache the result |
| `zeroDataRetention` | boolean | `false` | Don't persist any scraped data (enterprise) |

### JSON Extraction

Use `formats: ["json"]` with either a prompt or schema:

```typescript
// Prompt-based extraction
const result = await app.scrape("https://example.com/pricing", {
  formats: ["json"],
  jsonOptions: {
    prompt: "Extract all pricing tiers with name, price, and features",
  },
});

// Schema-based extraction (Zod)
import { z } from "zod";

const result = await app.scrape("https://example.com/pricing", {
  formats: ["json"],
  jsonOptions: {
    schema: z.object({
      tiers: z.array(z.object({
        name: z.string(),
        price: z.number(),
        features: z.array(z.string()),
      })),
    }),
  },
});
```

**Python with Pydantic:**

```python
from pydantic import BaseModel

class PricingTier(BaseModel):
    name: str
    price: float
    features: list[str]

class Pricing(BaseModel):
    tiers: list[PricingTier]

result = app.scrape("https://example.com/pricing",
    formats=["json"],
    json_options={"schema": Pricing}
)
```

### Response

```json
{
  "success": true,
  "data": {
    "markdown": "# Page Title\n\nContent here...",
    "html": "<h1>Page Title</h1>...",
    "metadata": {
      "title": "Page Title",
      "description": "Meta description",
      "language": "en",
      "url": "https://example.com",
      "statusCode": 200,
      "creditsUsed": 1
    },
    "links": ["https://example.com/about", "..."],
    "screenshot": "data:image/png;base64,...",
    "json": { "tiers": [...] }
  }
}
```

### Credit Cost

1 credit per page. Enhanced Mode retries cost 5 credits.

---

## Crawl Endpoint

**POST `/v2/crawl`** — Crawl multiple pages from a starting URL. Asynchronous by default.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Starting URL |
| `limit` | number | — | Max pages to crawl |
| `maxDiscoveryDepth` | number | — | Link depth from start URL |
| `includePaths` | string[] | — | Whitelist URL patterns (e.g., `["/blog/*"]`) |
| `excludePaths` | string[] | — | Blacklist URL patterns |
| `allowExternalLinks` | boolean | `false` | Follow links to other domains |
| `allowSubdomains` | boolean | `false` | Follow subdomain links |
| `crawlEntireDomain` | boolean | `false` | Traverse full domain |
| `deduplicateSimilarURLs` | boolean | — | Skip near-duplicate pages |
| `ignoreQueryParameters` | boolean | — | Treat URLs with different query params as same |
| `prompt` | string | — | Natural language crawl intent (v2) |
| `scrapeOptions` | object | — | Same params as scrape endpoint (formats, tags, etc.) |
| `webhook` | string/object | — | URL or `{ url, events, secret }` |

### Usage

```typescript
// Synchronous — blocks until done
const crawl = await app.crawl("https://example.com", {
  limit: 100,
  scrapeOptions: { formats: ["markdown"] },
});

// Asynchronous — returns job ID
const job = await app.startCrawl("https://example.com", {
  limit: 100,
  scrapeOptions: { formats: ["markdown"] },
});

// Poll status
const status = await app.getCrawlStatus(job.id);

// Cancel
await app.cancelCrawl(job.id);
```

**Python async with watcher:**

```python
async with app.crawl("https://example.com", limit=50) as crawl:
    async for page in crawl:
        print(page.markdown)
```

### Crawl Status Response

```json
{
  "success": true,
  "status": "completed",
  "completed": 42,
  "total": 42,
  "creditsUsed": 42,
  "data": [
    { "markdown": "...", "metadata": { "url": "..." } }
  ]
}
```

Status values: `scraping`, `completed`, `failed`, `cancelled`.

### Params Preview (v2)

**POST `/v2/crawl/params-preview`** — Preview derived parameters before executing a crawl. Useful for estimating scope and cost.

### Credit Cost

1 credit per page crawled.

---

## Map Endpoint

**POST `/v1/map`** — Discover all accessible URLs on a website without scraping content.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Site URL to map |
| `search` | string | — | Filter URLs by keyword |
| `ignoreSitemap` | boolean | `false` | Skip sitemap discovery |
| `includeSubdomains` | boolean | `false` | Include subdomain URLs |
| `limit` | number | — | Max URLs to return (up to 100k) |

### Usage

```typescript
const urls = await app.map("https://example.com", { limit: 1000 });
console.log(urls); // string[]
```

### Credit Cost

1 credit per call.

---

## Search Endpoint

**POST `/v2/search`** — Web search with optional content extraction on each result.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search terms |
| `limit` | number | `3` | Results to return (max 20) |
| `sources` | string[] | `["web"]` | `"web"`, `"news"`, `"images"` |
| `categories` | string[] | — | `"github"`, `"research"` |
| `location` | string | — | Geographic region (e.g., `"Germany"`, `"San Francisco"`) |
| `country` | string | `"US"` | ISO country code |
| `tbs` | string | — | Time filter: `"qdr:d"` (day), `"qdr:w"` (week), `"qdr:m"` (month) |
| `timeout` | number | — | Request timeout (ms) |
| `ignoreInvalidURLs` | boolean | `false` | Skip invalid URLs |
| `scrapeOptions` | object | — | Enable content extraction: `{ formats: ["markdown"] }` |

### Usage

```typescript
// Basic search — returns URLs, titles, descriptions
const results = await app.search("firecrawl pricing 2026", { limit: 5 });

// Search + scrape — gets full markdown content per result
const results = await app.search("firecrawl pricing", {
  limit: 5,
  scrapeOptions: { formats: ["markdown"] },
});
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "url": "https://...",
      "title": "...",
      "description": "...",
      "markdown": "...",
      "metadata": { "title": "...", "url": "..." }
    }
  ]
}
```

### Image Search Operators

When `sources: ["images"]`, use size operators: `imagesize:1920x1080`, `larger:1920x1080`.

### Credit Cost

2 credits per 10 results (without scraping). Standard scrape credits apply when `scrapeOptions` is set.

---

## Agent Endpoint

**POST `/v2/agent`** — AI-powered autonomous data gathering. Searches, navigates, clicks through multi-page flows, and returns structured data. Evolution of `/extract`.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Natural language description of what data to find |
| `urls` | string[] | — | Optional starting URLs (agent can search on its own) |
| `schema` | object | — | Zod (JS) or Pydantic (Python) schema for structured output |
| `model` | string | — | `"spark-1-fast"`, `"spark-1-mini"`, `"spark-1-pro"` |
| `webhook` | string | — | Webhook URL for completion notification |

### Spark Model Family

| Model | Use Case |
|-------|----------|
| `spark-1-fast` | Instant retrieval, simple lookups |
| `spark-1-mini` | Complex research queries |
| `spark-1-pro` | Advanced extraction tasks |

### Usage

```typescript
import { z } from "zod";

const result = await app.agent({
  prompt: "Find the founding team members and their roles",
  urls: ["https://example.com/about"],
  schema: z.object({
    team: z.array(z.object({
      name: z.string(),
      role: z.string(),
      bio: z.string().optional(),
    })),
  }),
});
```

**Python:**

```python
from pydantic import BaseModel

class TeamMember(BaseModel):
    name: str
    role: str
    bio: str | None = None

class Team(BaseModel):
    team: list[TeamMember]

result = app.agent(
    prompt="Find the founding team members and their roles",
    urls=["https://example.com/about"],
    schema=Team,
)
```

### Parallel Agents (v2.8.0+)

Run thousands of agent queries simultaneously with automatic failure handling:

```typescript
// Parallel execution is managed server-side
// Use batch patterns with webhooks for large-scale agent work
const job = await app.agent({
  prompt: "Extract pricing for each competitor",
  urls: competitorUrls, // hundreds of URLs
  webhook: "https://myapp.com/webhook/agent-complete",
});
```

### Agent vs Extract

| Feature | `/agent` | `/extract` (legacy) |
|---------|----------|---------------------|
| URLs required | No — agent searches | Yes |
| Navigation | Clicks, scrolls, paginates | Static page only |
| Models | Spark 1 family | LLM-based |
| Status | Active development | Being phased out |

### Credit Cost

Dynamic pricing. 5 daily runs free, then token-based billing. Parallel agents: 10 credits per cell with Spark-1 Fast.

---

## Batch Scrape

**POST `/v2/batch-scrape`** — Scrape multiple known URLs in a single request. Shares rate limits with `/crawl`.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `urls` | string[] | URLs to scrape |
| `formats` | string[] | Output formats |
| `maxConcurrency` | number | Max concurrent scrapes (defaults to plan limit) |
| `ignoreInvalidURLs` | boolean | Skip invalid URLs |
| `webhook` | string/object | Completion notification |

All scrape parameters from the scrape endpoint apply (`onlyMainContent`, `includeTags`, etc.).

### Usage

```typescript
// Synchronous
const batch = await app.batchScrape(
  ["https://a.com", "https://b.com", "https://c.com"],
  { formats: ["markdown"] }
);

// Asynchronous
const job = await app.startBatchScrape(
  ["https://a.com", "https://b.com"],
  { formats: ["markdown"] }
);
const status = await app.getBatchScrapeStatus(job.id);
```

### Credit Cost

1 credit per page (same as scrape).

---

## Browser Sandbox

**POST `/v2/browser`** — Managed browser environment for web automation. Launched February 2026.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v2/browser` | Create session |
| POST | `/v2/browser/{id}/execute` | Execute code |
| GET | `/v2/browser?status=active` | List sessions |
| DELETE | `/v2/browser/{id}` | Close session |

### Create Session Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `ttl` | number | `300` | 30–3600s | Total session lifetime |
| `activityTtl` | number | `120` | 10–3600s | Auto-close after inactivity |

### Session Response

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cdpUrl": "wss://cdp-proxy.firecrawl.dev/cdp/...",
  "liveViewUrl": "https://liveview.firecrawl.dev/..."
}
```

### Execute Code

Supports Python, Node.js, and Bash. Playwright pre-installed.

```typescript
const session = await app.browser({ ttl: 120, activityTtl: 60 });

// Node.js execution
const result = await app.browserExecute(session.id, {
  code: `
    await page.goto("https://example.com");
    const title = await page.title();
    console.log(title);
  `,
  language: "node",
});

// Python execution
await app.browserExecute(session.id, {
  code: 'await page.goto("https://example.com")\nprint(await page.title())',
  language: "python",
});

// Cleanup
await app.deleteBrowser(session.id);
```

### CDP Direct Access

Connect local Playwright to the remote browser:

```typescript
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP(session.cdpUrl);
const context = browser.contexts()[0];
const page = context.pages()[0] || (await context.newPage());
await page.goto("https://example.com");
```

### Limits

- Max 20 concurrent sessions per account
- Session TTL: 30–3600 seconds
- 5 hours free, then 2 credits per browser minute

---

## Output Formats

Available across scrape, crawl, batch scrape, and search endpoints:

| Format | Key | Description |
|--------|-----|-------------|
| Markdown | `markdown` | Clean, LLM-ready text. Default format |
| HTML | `html` | Cleaned HTML structure |
| Raw HTML | `rawHtml` | Unmodified source HTML |
| Links | `links` | Array of extracted hyperlinks |
| Screenshot | `screenshot` | Base64 PNG of visible viewport |
| Full-page Screenshot | `screenshot@fullPage` | Full page capture |
| JSON | `json` | Structured extraction (requires prompt or schema) |
| Summary | `summary` | AI-generated page summary (v2.0+) |

### Branding Format (v2.6.0+)

Extract brand identity elements (logo, colors, fonts) from any site:

```typescript
const result = await app.scrape("https://example.com", {
  formats: ["branding"],
});
// Returns: logo URL, primary/secondary colors, fonts, favicon
```

Enhanced accuracy for Wix, Framer, and modern site builders (as of Feb 2026).

---

## Actions (Browser Automation)

Use `actions` parameter on scrape/batch-scrape for JavaScript-rendered pages:

```typescript
const result = await app.scrape("https://example.com/search", {
  formats: ["markdown"],
  actions: [
    { type: "wait", milliseconds: 2000 },
    { type: "click", selector: "#search-button" },
    { type: "write", text: "firecrawl", selector: "#search-input" },
    { type: "click", selector: "#submit" },
    { type: "wait", milliseconds: 3000 },
    { type: "scroll", direction: "down" },
    { type: "screenshot" },
  ],
});
```

### Action Types

| Type | Parameters | Description |
|------|-----------|-------------|
| `wait` | `milliseconds` | Wait for rendering |
| `click` | `selector` | Click an element |
| `write` | `text`, `selector` | Type into an input |
| `scroll` | `direction` (`"up"` / `"down"`) | Scroll the page |
| `screenshot` | — | Capture after actions |

---

## Webhooks

Configure webhooks on crawl, batch scrape, and agent endpoints:

```typescript
await app.startCrawl("https://example.com", {
  limit: 100,
  webhook: {
    url: "https://myapp.com/api/webhook",
    events: ["page", "completed", "failed"],
    secret: "whsec_my_secret",
  },
});
```

### Event Types

| Event | Triggered When |
|-------|---------------|
| `started` | Job begins |
| `page` | Each page completes |
| `completed` | Entire job finishes |
| `failed` | Job encounters fatal error |

Webhook signatures available for verification (v2.2.0+).

---

## MCP Server

### Claude Code

```bash
claude mcp add-json "firecrawl" '{
  "command": "npx",
  "args": ["-y", "firecrawl-mcp"],
  "env": {
    "FIRECRAWL_API_KEY": "fc-YOUR_API_KEY"
  }
}'
```

### Cursor (v0.48.6+)

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR_API_KEY"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-server-firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR_API_KEY",
        "FIRECRAWL_RETRY_MAX_ATTEMPTS": "5",
        "FIRECRAWL_RETRY_INITIAL_DELAY": "2000",
        "FIRECRAWL_RETRY_MAX_DELAY": "30000",
        "FIRECRAWL_RETRY_BACKOFF_FACTOR": "3",
        "FIRECRAWL_CREDIT_WARNING_THRESHOLD": "2000",
        "FIRECRAWL_CREDIT_CRITICAL_THRESHOLD": "500"
      }
    }
  }
}
```

### MCP Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIRECRAWL_API_KEY` | required | API key |
| `FIRECRAWL_API_URL` | `https://api.firecrawl.dev` | Custom endpoint (self-hosted) |
| `FIRECRAWL_RETRY_MAX_ATTEMPTS` | `3` | Max retry attempts |
| `FIRECRAWL_RETRY_INITIAL_DELAY` | `1000` | Initial retry delay (ms) |
| `FIRECRAWL_RETRY_MAX_DELAY` | `10000` | Max retry delay (ms) |
| `FIRECRAWL_RETRY_BACKOFF_FACTOR` | `2` | Backoff multiplier |
| `FIRECRAWL_CREDIT_WARNING_THRESHOLD` | `1000` | Credit warning level |
| `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` | `100` | Credit critical level |

### MCP Tools Available

| Tool | Purpose |
|------|---------|
| `firecrawl_scrape` | Single page extraction |
| `firecrawl_batch_scrape` | Multiple known URLs |
| `firecrawl_map` | Discover site URLs |
| `firecrawl_crawl` | Multi-page crawl |
| `firecrawl_search` | Web search + extraction |
| `firecrawl_extract` | Structured data extraction |
| `firecrawl_agent` | AI-powered data gathering |
| `firecrawl_browser_*` | Browser sandbox sessions |

---

## CLI

### Installation

```bash
npm install -g firecrawl-cli

# Or one-shot with skill installation
npx -y firecrawl-cli@latest init --all --browser
```

### Commands

```bash
# Scrape a page
firecrawl scrape https://example.com

# Search the web
firecrawl search "firecrawl pricing"

# Crawl a site
firecrawl crawl https://example.com --limit 50

# Map a site
firecrawl map https://example.com

# Browser sandbox
firecrawl browser "open https://example.com"
firecrawl browser "snapshot"
firecrawl browser "scrape"
firecrawl browser execute --python 'await page.goto("https://example.com")'
firecrawl browser launch-session --ttl 120
firecrawl browser list
firecrawl browser close
```

---

## Pricing and Credits

### Plans (February 2026)

| Plan | Monthly Price | Credits/Month | Concurrent Browsers |
|------|--------------|---------------|---------------------|
| Free | $0 | 500 (one-time, non-renewing) | 2 |
| Hobby | $16 | 3,000 | 5 |
| Standard | $83 | 100,000 | 50 |
| Growth | $333 | 500,000 | 100 |
| Scale | $599 | 1,000,000 | 150 |
| Enterprise | Custom | Unlimited | Custom |

### Credit Costs

| Operation | Credits |
|-----------|---------|
| Scrape (1 page) | 1 |
| Crawl (per page) | 1 |
| Map (per call) | 1 |
| Search (per 10 results) | 2 |
| Browser (per minute) | 2 |
| Enhanced Mode (per request) | 5 |
| Agent — Spark-1 Fast (per cell) | 10 |
| Agent — daily free runs | 5 free |

### Extra Credit Packs

| Plan | Extra Credits | Price |
|------|--------------|-------|
| Hobby | 1,000 | $9 |
| Standard | 35,000 | $47 |
| Growth | 175,000 | $177 |

---

## Rate Limits

### Requests Per Minute by Plan

| Plan | /scrape | /map | /crawl | /search | /agent | /crawl/status | /agent/status |
|------|---------|------|--------|---------|--------|---------------|---------------|
| Free | 10 | 10 | 1 | 5 | 10 | 1,500 | 500 |
| Hobby | 100 | 100 | 15 | 50 | 100 | 1,500 | 25,000 |
| Standard | 500 | 500 | 50 | 250 | 500 | 1,500 | 25,000 |
| Growth | 5,000 | 5,000 | 250 | 2,500 | 1,000 | 1,500 | 25,000 |

### Concurrent Browsers

| Plan | Concurrent Sessions |
|------|-------------------|
| Free | 2 |
| Hobby | 5 |
| Standard | 50 |
| Growth | 100 |
| Scale/Enterprise | 150+ |

### Shared Limits

- `/extract` shares limits with `/agent`
- `/batch-scrape` shares limits with `/crawl`

Rate limit exceeded → 429 response. Implement exponential backoff.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | — |
| 400 | Invalid parameters | Check request body |
| 401 | Missing/invalid API key | Verify `FIRECRAWL_API_KEY` |
| 402 | Payment required (credits exhausted) | Top up credits or upgrade plan |
| 404 | Resource not found | Check job ID or endpoint path |
| 429 | Rate limit exceeded | Backoff and retry |
| 5xx | Server error | Retry with exponential backoff |

### Firecrawl Error Codes (5xx)

| Code | Description | Fix |
|------|-------------|-----|
| `SCRAPE_ALL_ENGINES_FAILED` | All scraping methods failed | Try Enhanced Mode |
| `SCRAPE_SSL_ERROR` | Invalid SSL certificate | Set `skipTlsVerification: true` |
| `SCRAPE_SITE_ERROR` | Unrecoverable site problem | Check URL is accessible |
| `SCRAPE_DNS_RESOLUTION_ERROR` | DNS lookup failed | Verify domain exists |
| `SCRAPE_ACTION_ERROR` | Page action failed | Check selectors in `actions` |
| `SCRAPE_PDF_PREFETCH_FAILED` | PDF preprocessing error | Retry or check PDF accessibility |
| `SCRAPE_PDF_INSUFFICIENT_TIME_ERROR` | PDF processing timeout | Increase timeout |
| `SCRAPE_PDF_ANTIBOT_ERROR` | Anti-bot blocked PDF | Use Enhanced Mode |
| `SCRAPE_ZDR_VIOLATION_ERROR` | Zero data retention conflict | Disable features requiring temp storage |
| `SCRAPE_UNSUPPORTED_FILE_ERROR` | Unsupported file type or >10MB | Check file format and size |
| `UNKNOWN_ERROR` | Unclassified | Contact support |

### Retry Strategy

```typescript
// SDKs handle retries automatically
// For raw HTTP, implement exponential backoff:
const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
```

Use Enhanced Mode as a retry mechanism for 401, 403, 500 errors (costs 5 credits).

---

## Self-Hosting

Firecrawl is open-source and self-hostable.

### Docker

```bash
git clone https://github.com/firecrawl/firecrawl.git
cd firecrawl
docker compose up -d
```

### Requirements

- Docker with Docker Compose
- ARM64 support (Apple Silicon) via multi-arch images (v2.7.0+)
- Kubernetes deployment supported
- SearXNG for self-hosted `/search` endpoint
- Playwright microservice for browser rendering

### Self-Host API URL

Set `FIRECRAWL_API_URL` in SDKs/MCP to point to your instance instead of the cloud API.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not using `onlyMainContent` | Enabled by default — disable only when you need full page including nav/footer |
| Ignoring `maxAge` cache | Default 2-day cache. Set `maxAge: 0` for real-time data |
| Using `/extract` instead of `/agent` | `/agent` is the successor — no URLs required, handles navigation |
| Markdown format for structured data | Use `formats: ["json"]` with a Zod/Pydantic schema |
| Not handling 429 rate limits | SDKs retry automatically. Raw HTTP: exponential backoff |
| Enhanced Mode on every request | 5 credits per request — use only as retry for specific errors |
| Browser sessions left open | Always set `ttl` + `activityTtl`. Max 20 concurrent |
| Scraping without `waitFor` on JS sites | Dynamic content needs `waitFor` or `actions` to render |
| Using v0 endpoints | Deprecated April 2025. Use `/v2/` endpoints |
| Sending schema to `/search` | Search uses `scrapeOptions`, not `schema`. Use `/agent` for extraction |
| Not checking crawl status | Crawls are async — poll `getCrawlStatus()` or use webhooks |
| Storing API key client-side | Server-side only. Use env vars, never expose in browser code |

---

## Version History (Key Releases)

| Version | Date | Highlights |
|---------|------|-----------|
| v2.8.0 | Feb 2026 | Parallel agents, Spark model family, CLI, Firecrawl Skill |
| — | Feb 2026 | Browser Sandbox launch |
| v2.7.0 | Dec 2025 | Zero data retention search, partner integrations, branding format |
| v2.6.0 | Nov 2025 | Unified billing (credits + tokens merged), branding format across SDKs |
| v2.5.0 | Oct 2025 | Semantic Index, 5x cheaper search, Excel scraping |
| v2.4.0 | Oct 2025 | PDF search category, 10x semantic crawling, x402 search |
| v2.3.0 | Sep 2025 | YouTube transcripts, ODT/RTF parsing, 50x faster Docx |
| v2.2.0 | Sep 2025 | MCP v3 (HTTP+SSE), webhook signatures, 15x faster map |
| v2.1.0 | Aug 2025 | Search categories, image extraction, map up to 100k results |
| v2.0.0 | Aug 2025 | 2-day caching, summary format, smart crawling with prompts |
| v1.15.0 | Jul 2025 | SSO for enterprise |
| v1.14.0 | Jul 2025 | Authenticated scraping, zero data retention |
| v1.13.0 | Jun 2025 | Crawl subdomains, PDF generation, higher-res screenshots |
| v1.12.0 | Jun 2025 | Concurrency control per request, Google Docs scraping |
| v1.11.0 | Jun 2025 | Firecrawl Index (500% faster), Java SDK |
| — | Jun 2025 | Search API launch |
| v1.9.0 | May 2025 | Map limit raised to 30k, change tracking in SDK 2.0 |
| — | May 2025 | Enhanced Mode pricing: 5 credits/request |
