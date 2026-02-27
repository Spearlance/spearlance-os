---
model: claude-sonnet-4-6
name: acuity-scheduling
description: Use when integrating with Acuity Scheduling (Squarespace Scheduling) API — booking appointments, checking availability, managing calendars, handling clients, or setting up webhooks. Also use when automating appointment workflows or building scheduling integrations.
---

# acuity-scheduling

your friendly armadillo is here to serve you

## install

No official SDK — use direct HTTP with Basic Auth.

```bash
# Node.js example — set these env vars
ACUITY_USER_ID=your_numeric_user_id
ACUITY_API_KEY=your_api_key
```

Find credentials at: **Acuity Dashboard → Integrations → API**

## base URL

```
https://acuityscheduling.com/api/v1
```

## authenticate a request

```typescript
const credentials = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

const headers = {
  Authorization: `Basic ${credentials}`,
  'Content-Type': 'application/json',
};

const res = await fetch('https://acuityscheduling.com/api/v1/appointments', { headers });
const appointments = await res.json();
```

## book an appointment

```typescript
const appointment = await fetch(
  'https://acuityscheduling.com/api/v1/appointments',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentTypeID: 12345,
      calendarID: 67890,       // optional — omit to use first available
      datetime: '2026-03-15T14:00:00-0500',
      firstName: 'Taylor',
      lastName: 'Swift',
      email: '[email protected]',
      phone: '555-1234',       // optional
    }),
  }
).then((r) => r.json());

console.log(appointment.id, appointment.datetime);
```

## check availability

```typescript
// Step 1: get available dates
const dates = await fetch(
  'https://acuityscheduling.com/api/v1/availability/dates?' +
    new URLSearchParams({
      appointmentTypeID: '12345',
      month: '2026-03',
      calendarID: '67890',   // optional
    }),
  { headers }
).then((r) => r.json());

// Step 2: get available times on a date
const times = await fetch(
  'https://acuityscheduling.com/api/v1/availability/times?' +
    new URLSearchParams({
      appointmentTypeID: '12345',
      date: '2026-03-15',
    }),
  { headers }
).then((r) => r.json());
```

## webhook setup

```typescript
// Create a dynamic webhook
await fetch('https://acuityscheduling.com/api/v1/webhooks', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    target: 'https://your-app.com/api/webhooks/acuity',
    event: 'appointment.scheduled',
  }),
});
```

## common mistakes

| Mistake | Fix |
|---------|-----|
| Using email/password instead of User ID + API key | Get numeric User ID from Integrations → API page |
| Passing `datetime` without timezone offset | Always include UTC offset (e.g., `-0500`) or Acuity may misinterpret |
| Exceeding 25 webhooks per account | Delete unused webhooks before creating new ones |
| Not verifying webhook signatures | Compute HMAC-SHA256 with your API key against payload; compare to `x-acuity-signature` |
| Rate limit exceeded | 10 req/s per IP — add request queuing for bulk operations |

See reference.md for full API coverage.
