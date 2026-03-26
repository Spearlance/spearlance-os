# Service-Based Keyword Tracking — Design Document

**Date:** 2026-03-26
**Status:** Approved
**Parent:** SOS Optimization Engine

## Overview

Replace flat keyword lists with a structured service x location matrix. Auto-discover services and cities from crawled pages, generate keyword variations per combo, and feed expansion targets into the recommendation engine.

## New Table: `client_service_locations`

```sql
id uuid PK
client_id uuid REFERENCES clients(id) ON DELETE CASCADE
service_name text NOT NULL        -- "Web Design"
service_slug text NOT NULL        -- "web-design"
city text NOT NULL                -- "Concord"
state text NOT NULL               -- "NH"
location_code integer             -- DataforSEO location code
has_page boolean DEFAULT false    -- does page exist for this combo?
page_url text                     -- actual URL if page exists
is_expansion_target boolean DEFAULT false
priority text DEFAULT 'secondary' CHECK IN ('primary', 'secondary')
active boolean DEFAULT true
created_at timestamptz DEFAULT now()
discovered_by text DEFAULT 'manual' CHECK IN ('manual', 'auto', 'ai')
UNIQUE(client_id, service_slug, city, state)
```

## Keyword Generation

3 variations per active service-location combo:
- `"{service_name} {city} {state}"`
- `"{service_name} company {city} {state}"`
- `"{service_name} services {city} {state}"`

## Auto-Discovery

During optimization-crawl, parse page_audits URL patterns:
- `/{service-slug}/{city-state}` → extract service + city + state, set has_page=true
- `/{service-slug}/` → extract service (pillar), no location row

## Changes to Existing Code

- `dataforseo-sync`: read from client_service_locations instead of tracked_keywords
- `optimization-crawl`: add auto-discovery step
- `optimization-recommend`: flag expansion targets as new page recommendations
- `dataforseo_configs`: deprecate tracked_keywords column
