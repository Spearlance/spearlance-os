# PostHog Developer Reference

Full API reference for PostHog — capture, feature flags, experiments, persons, events, insights, and cohorts.

Last verified: February 2026. Check [posthog.com/docs/api](https://posthog.com/docs/api) for changes.

---

## 1. Authentication

PostHog uses two key types with different scopes.

### Project API key

Public key — safe to use client-side. Used for ingestion endpoints.

```bash
# posthog.com → Project Settings → Project API Key
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Used with: `/capture`, `/batch`, `/decide`

### Personal API key

Private key — server-side only. Used for management endpoints.

```bash
# posthog.com → Profile → Personal API Keys
POSTHOG_PERSONAL_KEY=phx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Used with: `/api/feature_flags`, `/api/persons`, `/api/events`, `/api/insights`, `/api/cohorts`

### Auth header pattern

```typescript
// Public ingestion endpoints
const publicHeaders = {
  'Content-Type': 'application/json',
  // No Authorization header needed — project key goes in request body
};

// Private management endpoints
const privateHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_KEY}`,
};
```

### Project ID

Every management API endpoint is scoped to a project:

```
https://us.posthog.com/api/projects/{project_id}/...
```

Find your project ID in: **Project Settings → Project ID**

---

## 2. Capture API

Ingest events from your application. Uses the **project API key**.

### Single event

```typescript
// POST /capture
await fetch('https://us.i.posthog.com/capture/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.POSTHOG_PROJECT_KEY,
    event: 'user_signed_up',
    distinct_id: userId,
    properties: {
      plan: 'pro',
      referrer: 'google',
      $current_url: 'https://your-app.com/signup',
    },
    timestamp: new Date().toISOString(),  // optional — defaults to now
  }),
});
```

### Capture schema

| Field | Required | Description |
|-------|----------|-------------|
| `api_key` | Yes | Project API key |
| `event` | Yes | Event name (string) |
| `distinct_id` | Yes | Unique user identifier |
| `properties` | No | Event properties (object) |
| `timestamp` | No | ISO 8601 — defaults to server time |
| `uuid` | No | Event UUID for deduplication |

### Special property keys

| Property | Effect |
|---------|--------|
| `$set` | Set person properties |
| `$set_once` | Set person properties only if not already set |
| `$unset` | Remove person properties |
| `$current_url` | URL for the pageview |
| `$referrer` | Referring URL |
| `$browser` | Browser name |
| `$os` | Operating system |

### Identify a user via capture

```typescript
await fetch('https://us.i.posthog.com/capture/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.POSTHOG_PROJECT_KEY,
    event: '$identify',
    distinct_id: userId,
    properties: {
      $set: {
        email: user.email,
        name: user.name,
        plan: user.plan,
        created_at: user.createdAt,
      },
    },
  }),
});
```

### Alias two distinct IDs

Merge an anonymous user with an identified user.

```typescript
await fetch('https://us.i.posthog.com/capture/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.POSTHOG_PROJECT_KEY,
    event: '$create_alias',
    distinct_id: userId,
    properties: {
      alias: anonymousId,
    },
  }),
});
```

---

## 3. Batch API

Send multiple events in a single HTTP call. Ideal for backend event processing.

```typescript
// POST /batch
await fetch('https://us.i.posthog.com/batch/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.POSTHOG_PROJECT_KEY,
    batch: [
      {
        event: 'api_call',
        distinct_id: userId,
        properties: { endpoint: '/api/data', latency_ms: 142 },
        timestamp: new Date().toISOString(),
      },
      {
        event: '$identify',
        distinct_id: userId,
        properties: {
          $set: { last_api_call: new Date().toISOString() },
        },
      },
      {
        event: 'feature_used',
        distinct_id: userId,
        properties: { feature: 'export', format: 'csv' },
      },
    ],
  }),
});
```

### Batch limits

| Limit | Value |
|-------|-------|
| Events per batch | No hard limit (batch size should be reasonable) |
| Rate limits (public) | No rate limits on `/capture` and `/batch` |
| Analytics endpoints | 240 req/min, 1,200 req/hour |

---

## 4. Decide API

Fetches feature flags, session recording settings, and autocapture config for a user. Called automatically by the JS SDK on init.

```typescript
// POST /decide
const decide = await fetch('https://us.i.posthog.com/decide/?v=3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.POSTHOG_PROJECT_KEY,
    distinct_id: userId,
    person_properties: {
      plan: 'pro',
      country: 'US',
    },
    group_properties: {
      company: {
        id: 'company_123',
        plan: 'enterprise',
      },
    },
  }),
});

const {
  featureFlags,       // { flag_key: true | 'variant_name' }
  featureFlagPayloads, // { flag_key: any }
  sessionRecording,   // { endpoint, consoleLogRecordingEnabled, ... }
  autocapture_opt_out,
} = await decide.json();
```

The `featureFlags` object maps flag keys to their value:
- Boolean flags: `true` or `false`
- Multivariate flags: `'control'`, `'test'`, `'variant-a'`, etc.

---

## 5. Feature Flags API

Manage feature flags programmatically. Requires **personal API key**.

### List feature flags

```typescript
// GET /api/projects/{project_id}/feature_flags
const { results } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/`,
  { headers: privateHeaders }
).then((r) => r.json());

// results[0]:
// {
//   id: 123,
//   key: 'my-flag',
//   name: 'My Feature Flag',
//   active: true,
//   rollout_percentage: 50,
//   filters: { groups: [...], payloads: {} }
// }
```

### Get a feature flag

```typescript
// GET /api/projects/{project_id}/feature_flags/{id}
const flag = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/${flagId}/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Create a feature flag

```typescript
// POST /api/projects/{project_id}/feature_flags
const flag = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      key: 'new-feature',
      name: 'New Feature Flag',
      active: true,
      filters: {
        groups: [
          {
            properties: [
              {
                key: 'plan',
                operator: 'exact',
                value: ['pro', 'enterprise'],
                type: 'person',
              },
            ],
            rollout_percentage: 100,
          },
        ],
        payloads: {
          true: JSON.stringify({ message: 'Feature enabled!' }),
        },
        multivariate: null,  // null for boolean; set for experiments
      },
    }),
  }
).then((r) => r.json());
```

### Create a multivariate flag (A/B test)

```typescript
const experimentFlag = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      key: 'checkout-experiment',
      name: 'Checkout Flow Experiment',
      active: true,
      filters: {
        groups: [{ rollout_percentage: 100 }],
        multivariate: {
          variants: [
            { key: 'control', name: 'Control', rollout_percentage: 50 },
            { key: 'one-page', name: 'One-page checkout', rollout_percentage: 50 },
          ],
        },
      },
    }),
  }
).then((r) => r.json());
```

### Update a feature flag

```typescript
// PATCH /api/projects/{project_id}/feature_flags/{id}
await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/${flagId}/`,
  {
    method: 'PATCH',
    headers: privateHeaders,
    body: JSON.stringify({
      active: false,  // disable the flag
    }),
  }
);
```

### Delete a feature flag

```typescript
// DELETE /api/projects/{project_id}/feature_flags/{id}
await fetch(
  `https://us.posthog.com/api/projects/${projectId}/feature_flags/${flagId}/`,
  { method: 'DELETE', headers: privateHeaders }
);
```

### Evaluate a flag server-side (posthog-node)

```typescript
import { PostHog } from 'posthog-node';

const client = new PostHog(process.env.POSTHOG_PROJECT_KEY!, {
  host: 'https://us.i.posthog.com',
});

// Boolean flag
const isEnabled = await client.isFeatureEnabled('my-flag', userId, {
  personProperties: { plan: 'pro' },
});

// Multivariate flag
const variant = await client.getFeatureFlag('checkout-experiment', userId, {
  personProperties: { country: 'US' },
});

// Always shutdown to flush
await client.shutdown();
```

---

## 6. Experiments API

Experiments are feature flags with additional metadata. Managed through the same flag system but with experiment tracking.

### List experiments

```typescript
// GET /api/projects/{project_id}/experiments
const { results } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/experiments/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Create an experiment

```typescript
// POST /api/projects/{project_id}/experiments
const experiment = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/experiments/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      name: 'Pricing Page Test',
      description: 'Testing annual-first vs monthly-first pricing layout.',
      feature_flag_key: 'pricing-experiment',
      parameters: {
        minimum_detectable_effect: 5,  // percentage
      },
      secondary_metrics: [],
      filters: {
        events: [
          { id: 'upgrade_clicked', type: 'events', order: 0 },
        ],
        insight: 'TRENDS',
      },
      start_date: new Date().toISOString(),
    }),
  }
).then((r) => r.json());
```

### Get experiment results

```typescript
// GET /api/projects/{project_id}/experiments/{id}/results
const results = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/experiments/${experimentId}/results/`,
  { headers: privateHeaders }
).then((r) => r.json());
// results.probability: { control: 0.25, 'annual-first': 0.75 }
// results.significant: true | false
```

---

## 7. Persons API

Query and manage person profiles. Requires **personal API key**.

### List persons

```typescript
// GET /api/projects/{project_id}/persons
const { results, next } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/persons/?` +
    new URLSearchParams({
      properties: JSON.stringify([
        { key: 'plan', operator: 'exact', value: 'pro', type: 'person' },
      ]),
      limit: '100',
    }),
  { headers: privateHeaders }
).then((r) => r.json());

// results[0]:
// { id: 'uuid', distinct_ids: ['user_123'], properties: { email: '...', plan: 'pro' }, created_at: '...' }
```

### Get a person

```typescript
// GET /api/projects/{project_id}/persons/{id}
const person = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/persons/${personId}/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Update person properties

```typescript
// PATCH /api/projects/{project_id}/persons/{id}
await fetch(
  `https://us.posthog.com/api/projects/${projectId}/persons/${personId}/`,
  {
    method: 'PATCH',
    headers: privateHeaders,
    body: JSON.stringify({
      properties: { plan: 'enterprise', mrr: 999 },
    }),
  }
);
```

### Delete a person (GDPR)

Deletes the person and all their events.

```typescript
// DELETE /api/projects/{project_id}/persons/{id}
await fetch(
  `https://us.posthog.com/api/projects/${projectId}/persons/${personId}/?delete_events=true`,
  { method: 'DELETE', headers: privateHeaders }
);
```

---

## 8. Events API

Query historical events. Requires **personal API key**.

### List events

```typescript
// GET /api/projects/{project_id}/events
const { results, next } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/events/?` +
    new URLSearchParams({
      event: 'purchase_completed',
      distinct_id: userId,
      after: '2026-01-01T00:00:00Z',
      before: '2026-02-01T00:00:00Z',
      limit: '100',
      orderBy: '["timestamp"]',
    }),
  { headers: privateHeaders }
).then((r) => r.json());

// results[0]:
// {
//   id: 'event_uuid',
//   event: 'purchase_completed',
//   distinct_id: 'user_123',
//   properties: { amount: 49.99, plan: 'pro' },
//   timestamp: '2026-01-15T14:23:00Z',
//   person: { id: 'person_uuid' }
// }
```

### Get a single event

```typescript
// GET /api/projects/{project_id}/events/{id}
const event = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/events/${eventId}/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

---

## 9. Insights API

Create and retrieve analytics insights. Requires **personal API key**.

### List insights

```typescript
// GET /api/projects/{project_id}/insights
const { results } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/insights/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Create a trends insight

```typescript
// POST /api/projects/{project_id}/insights
const insight = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/insights/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      name: 'Daily Active Users',
      filters: {
        insight: 'TRENDS',
        events: [
          {
            id: '$pageview',
            type: 'events',
            order: 0,
            math: 'dau',  // daily active users
          },
        ],
        date_from: '-30d',
        interval: 'day',
      },
    }),
  }
).then((r) => r.json());
```

### Get insight results

```typescript
// GET /api/projects/{project_id}/insights/{id}
const insight = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/insights/${insightId}/`,
  { headers: privateHeaders }
).then((r) => r.json());
// insight.result[0].data = array of values per time period
// insight.result[0].labels = array of date strings
```

### Create a funnel insight

```typescript
const funnel = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/insights/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      name: 'Signup Funnel',
      filters: {
        insight: 'FUNNELS',
        events: [
          { id: '$pageview', type: 'events', order: 0, properties: [{ key: '$current_url', operator: 'icontains', value: '/pricing' }] },
          { id: 'signup_started', type: 'events', order: 1 },
          { id: 'signup_completed', type: 'events', order: 2 },
        ],
        funnel_window_interval: 14,
        funnel_window_interval_unit: 'day',
        date_from: '-30d',
      },
    }),
  }
).then((r) => r.json());
```

---

## 10. Cohorts API

Manage user cohorts. Requires **personal API key**.

### List cohorts

```typescript
// GET /api/projects/{project_id}/cohorts
const { results } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/cohorts/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Get a cohort

```typescript
// GET /api/projects/{project_id}/cohorts/{id}
const cohort = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/cohorts/${cohortId}/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Create a cohort

```typescript
// POST /api/projects/{project_id}/cohorts
const cohort = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/cohorts/`,
  {
    method: 'POST',
    headers: privateHeaders,
    body: JSON.stringify({
      name: 'Pro Plan Users',
      description: 'All users currently on the Pro plan',
      is_static: false,  // false = dynamic (recalculates); true = static snapshot
      filters: {
        properties: {
          type: 'AND',
          values: [
            {
              type: 'AND',
              values: [
                {
                  key: 'plan',
                  operator: 'exact',
                  value: ['pro'],
                  type: 'person',
                },
              ],
            },
          ],
        },
      },
    }),
  }
).then((r) => r.json());
```

### List persons in a cohort

```typescript
// GET /api/projects/{project_id}/cohorts/{id}/persons
const { results } = await fetch(
  `https://us.posthog.com/api/projects/${projectId}/cohorts/${cohortId}/persons/`,
  { headers: privateHeaders }
).then((r) => r.json());
```

### Delete a cohort

```typescript
// DELETE /api/projects/{project_id}/cohorts/{id}
await fetch(
  `https://us.posthog.com/api/projects/${projectId}/cohorts/${cohortId}/`,
  { method: 'DELETE', headers: privateHeaders }
);
```

---

## 11. Rate Limits

| Endpoint type | Limit |
|--------------|-------|
| `/capture`, `/batch` | No rate limits |
| `/decide` | No rate limits |
| Analytics endpoints (`/api/...`) | 240 req/min, 1,200 req/hour |

Rate limits apply to the **entire team** — all users sharing one project share the same quota pool.

---

## 12. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using personal API key for capture | Use project API key (`phc_...`) in `api_key` field of capture payloads |
| Using project API key for management endpoints | Management endpoints (`/api/...`) require personal API key (`phx_...`) as Bearer token |
| Not scoping API URLs to project ID | Management endpoints pattern: `/api/projects/{project_id}/...` |
| Using wrong host for EU data | EU projects: `https://eu.i.posthog.com` for capture, `https://eu.posthog.com` for management |
| Calling `/decide` with region mismatch | Capture host and decide host must match region |
| Not awaiting `client.shutdown()` | Node.js SDK batches; shutdown flushes the queue — skip it and events are lost |
| Deleting person without `delete_events=true` | Without this param, person is deleted but events remain linked to the person ID |
| Creating duplicate insights | Insights are not deduplicated — check existing insights before creating new ones |
