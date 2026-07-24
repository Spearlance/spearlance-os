# SpearlanceOS

Spearlance's client portal for managing all marketing services.

## Stack

- **Framework:** React + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (auth, database, edge functions, storage)
- **AI:** OpenRouter (Claude Sonnet, Gemini Flash)
- **Payments:** Stripe
- **Scheduling:** Cal.com
- **Deployment:** Vercel

## Development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

See `.env.example` for all required variables. For Vercel deployment, set these in the Vercel dashboard under Project Settings > Environment Variables.

## Deployment

Deployed on Vercel. Pushes to `main` trigger automatic production deploys.

Custom domain: `os.spearlance.com`

## Reporting Layer (Phase 1)

Normalized lead + metric reporting in the `reporting` Postgres schema, fed by
edge function endpoints. All endpoints authenticate with an
`x-spearlance-key: <WEBHOOK_SECRET>` header (Supabase secret; different value
per environment). `client` accepts a slugified client name
(`invictus-northwest-group`), a `clients.id` uuid, or a Duda site_id.

| Endpoint | Method | Purpose |
|---|---|---|
| `/functions/v1/ingest-lead` | POST | Universal lead front door (Lovable LP, Zapier, CallRail, manual). Idempotent via `source_ref`; 24h email/phone dedupe without it. |
| `/functions/v1/ingest-metric` | POST | Upsert daily aggregates (`duda_calls`, `ad_spend`, ...) into `reporting.metrics_daily`. |
| `/functions/v1/hubspot-status` | POST | HubSpot lifecycle stage webhook → marks leads SQL (or creates a `hubspot` lead). |
| `/functions/v1/report` | GET | `?client=&from=&to=` → funnel, daily series, source breakdown, MQL→SQL rate, metrics. |

Example lead ingest:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ingest-lead" \
  -H "x-spearlance-key: $WEBHOOK_SECRET" -H "Content-Type: application/json" \
  -d '{"client":"invictus-northwest-group","source":"lovable_lp","name":"Jane Doe",
       "email":"jane@example.com","phone":"555-123-4567","message":"Need a quote",
       "utm_source":"google","utm_medium":"cpc","gclid":"abc","landing_url":"https://..."}'
```

Duda form submissions are mapped into `reporting.leads` automatically by a
trigger on `website_form_submissions` (source `duda_form`, status `mql`).
Dashboards read from the `reporting.v_*` views (RLS: internal staff see all,
client users see their own client). Full payload docs live in comment blocks in
`supabase/functions/{ingest-lead,ingest-metric,hubspot-status,report}/index.ts`.

Note: the `reporting` schema must be in the project's PostgREST exposed
schemas (Dashboard → Settings → API). Already done on dev; repeat at prod
promotion.
