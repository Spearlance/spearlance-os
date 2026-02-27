# Acuity Scheduling API Reference

Full API coverage for Acuity Scheduling (now Squarespace Scheduling). HTTP Basic Auth throughout.

Last verified: February 2026. Check [developers.acuityscheduling.com](https://developers.acuityscheduling.com/) for changes.

---

## 1. Setup & Authentication

### Credentials

Acuity uses **HTTP Basic Auth** over SSL. No SDK required — any HTTP client works.

| Field | Value |
|-------|-------|
| Username | Numeric User ID (not your email) |
| Password | API Key |
| Base URL | `https://acuityscheduling.com/api/v1` |

Find both values at: **Acuity Dashboard → Integrations → API**

### Building the auth header

```typescript
// Node.js
const credentials = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

const headers = {
  Authorization: `Basic ${credentials}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
```

```bash
# cURL
curl -u "$ACUITY_USER_ID:$ACUITY_API_KEY" \
  https://acuityscheduling.com/api/v1/appointments
```

### OAuth 2.0 (multi-account integrations)

For apps managing multiple Acuity accounts (marketplace apps, agency tools), use OAuth 2.0:

1. Register your app at [developers.acuityscheduling.com](https://developers.acuityscheduling.com)
2. Redirect users to: `https://acuityscheduling.com/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT`
3. Exchange code: `POST https://acuityscheduling.com/oauth2/token`
4. Use returned access token as Bearer token in Authorization header

For single-account automation, stick with HTTP Basic Auth — simpler and no token expiry.

### Rate limits

| Limit | Value |
|-------|-------|
| Requests per second | 10 req/s |
| Concurrent connections | 20 |
| Scope | Per IP address |

Retry with exponential backoff on `429` responses.

### Datetime format

All datetime parameters must be parseable by PHP's `strtotime()`. Recommended format:

```
2026-03-15T14:00:00-0500    ← ISO 8601 with UTC offset
```

Timezones use IANA identifier format: `America/New_York`, `Europe/London`, `UTC`.

---

## 2. Appointments

### List appointments

```typescript
// GET /appointments
const res = await fetch(
  'https://acuityscheduling.com/api/v1/appointments?' +
    new URLSearchParams({
      minDate: '2026-03-01',
      maxDate: '2026-03-31',
      calendarID: '67890',         // optional — filter by calendar
      appointmentTypeID: '12345',  // optional — filter by type
      email: '[email protected]',       // optional — filter by client
      max: '100',                  // default 100, max 100 per page
      direction: 'ASC',            // ASC | DESC
    }),
  { headers }
);
const appointments = await res.json();
```

Response shape:

```typescript
interface Appointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;           // 'March 15, 2026'
  time: string;           // '2:00pm'
  datetime: string;       // '2026-03-15T14:00:00-0500'
  endTime: string;        // '2026-03-15T14:30:00-0500'
  duration: string;       // '30'
  type: string;           // appointment type name
  appointmentTypeID: number;
  calendarID: number;
  calendar: string;       // calendar name
  location: string;
  timezone: string;       // 'America/New_York'
  price: string;          // '50.00'
  paid: string;           // 'no' | 'yes'
  amountPaid: string;     // '0.00'
  forms: Form[];
  notes: string;
  confirmationPage: string;
}
```

### Get a single appointment

```typescript
// GET /appointments/:id
const appointment = await fetch(
  `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`,
  { headers }
).then((r) => r.json());
```

### Create an appointment

```typescript
// POST /appointments
const appointment = await fetch(
  'https://acuityscheduling.com/api/v1/appointments',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentTypeID: 12345,      // required
      datetime: '2026-03-15T14:00:00-0500', // required
      firstName: 'Taylor',           // required
      lastName: 'Swift',             // required
      email: '[email protected]',        // required
      calendarID: 67890,             // optional — uses first available if omitted
      phone: '555-1234',             // optional
      notes: 'Internal notes here',  // optional — admin-only notes
      paid: true,                    // optional — mark as already paid
      fields: [                      // optional — custom form fields
        { id: 9876, value: 'Answer to custom field' },
      ],
    }),
  }
).then((r) => r.json());
```

### Update an appointment

```typescript
// PUT /appointments/:id
const updated = await fetch(
  `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`,
  {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      firstName: 'Taylor',
      lastName: 'Alison',
      email: '[email protected]',
      phone: '555-9999',
      notes: 'Updated notes',
    }),
  }
).then((r) => r.json());
```

### Reschedule an appointment

```typescript
// PUT /appointments/:id/reschedule
const rescheduled = await fetch(
  `https://acuityscheduling.com/api/v1/appointments/${appointmentId}/reschedule`,
  {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      datetime: '2026-03-20T10:00:00-0500', // new datetime — required
      calendarID: 67890,                     // optional — move to different calendar
    }),
  }
).then((r) => r.json());
```

### Cancel an appointment

```typescript
// PUT /appointments/:id/cancel
const cancelled = await fetch(
  `https://acuityscheduling.com/api/v1/appointments/${appointmentId}/cancel`,
  {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      cancelNote: 'Client requested cancellation', // optional — shown in cancellation email
      noEmail: false,                              // optional — suppress cancellation email
    }),
  }
).then((r) => r.json());
```

### Get appointment payments

```typescript
// GET /appointments/:id/payments
const payments = await fetch(
  `https://acuityscheduling.com/api/v1/appointments/${appointmentId}/payments`,
  { headers }
).then((r) => r.json());
```

---

## 3. Availability

### Get available dates

Returns dates with at least one open slot for the specified appointment type.

```typescript
// GET /availability/dates
const dates = await fetch(
  'https://acuityscheduling.com/api/v1/availability/dates?' +
    new URLSearchParams({
      appointmentTypeID: '12345',  // required
      month: '2026-03',            // required — YYYY-MM format
      calendarID: '67890',         // optional — specific calendar
      timezone: 'America/New_York',// optional — return in this timezone
    }),
  { headers }
).then((r) => r.json());

// Response: [{ date: '2026-03-15' }, { date: '2026-03-16' }, ...]
```

### Get available times on a date

```typescript
// GET /availability/times
const times = await fetch(
  'https://acuityscheduling.com/api/v1/availability/times?' +
    new URLSearchParams({
      appointmentTypeID: '12345',  // required
      date: '2026-03-15',          // required — YYYY-MM-DD format
      calendarID: '67890',         // optional
      timezone: 'America/New_York',// optional
    }),
  { headers }
).then((r) => r.json());

// Response: [{ time: '2026-03-15T09:00:00-0500', slotsAvailable: 1 }, ...]
```

### Check specific times

Verify whether a specific datetime is available before booking.

```typescript
// POST /availability/check-times
const check = await fetch(
  'https://acuityscheduling.com/api/v1/availability/check-times',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      datetime: '2026-03-15T14:00:00-0500',
      appointmentTypeID: 12345,
      calendarID: 67890, // optional
    }),
  }
).then((r) => r.json());

// Response: { valid: true } or { valid: false, error: 'Time not available' }
```

### Get available class times

For group appointments (classes).

```typescript
// GET /availability/classes
const classes = await fetch(
  'https://acuityscheduling.com/api/v1/availability/classes?' +
    new URLSearchParams({
      appointmentTypeID: '12345',
      includeUnavailable: 'false', // optional — include full classes
    }),
  { headers }
).then((r) => r.json());
```

---

## 4. Appointment Types

```typescript
// GET /appointment-types
const types = await fetch(
  'https://acuityscheduling.com/api/v1/appointment-types',
  { headers }
).then((r) => r.json());

// Response shape:
interface AppointmentType {
  id: number;
  name: string;
  description: string;
  duration: number;    // minutes
  price: string;       // '50.00'
  category: string;
  color: string;
  private: boolean;
  calendarIDs: number[];
  forms: number[];
  image: string;       // URL
  addon: boolean;
  classSize: number | null;  // null for 1-on-1, number for group
}
```

### Get add-ons

```typescript
// GET /appointment-addons
const addons = await fetch(
  'https://acuityscheduling.com/api/v1/appointment-addons?' +
    new URLSearchParams({ appointmentTypeID: '12345' }),
  { headers }
).then((r) => r.json());
```

---

## 5. Calendars

### List calendars

```typescript
// GET /calendars
const calendars = await fetch(
  'https://acuityscheduling.com/api/v1/calendars',
  { headers }
).then((r) => r.json());

// Response shape:
interface Calendar {
  id: number;
  name: string;
  description: string;
  replyTo: string;   // email
  image: string;
  location: string;
  thumbnail: string;
  timezone: string;  // 'America/New_York'
  email: string;     // calendar owner email
}
```

---

## 6. Clients

### List clients

```typescript
// GET /clients
const clients = await fetch(
  'https://acuityscheduling.com/api/v1/clients?' +
    new URLSearchParams({
      firstName: 'Taylor',     // optional search filters
      lastName: 'Swift',
      email: '[email protected]',
    }),
  { headers }
).then((r) => r.json());
```

### Create a client

```typescript
// POST /clients
const client = await fetch(
  'https://acuityscheduling.com/api/v1/clients',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      firstName: 'Taylor',
      lastName: 'Swift',
      email: '[email protected]',
      phone: '555-1234',
    }),
  }
).then((r) => r.json());
```

### Update a client

```typescript
// PUT /clients
const updated = await fetch(
  'https://acuityscheduling.com/api/v1/clients',
  {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      id: 11111,
      email: '[email protected]',
      phone: '555-9999',
    }),
  }
).then((r) => r.json());
```

### Delete a client

```typescript
// DELETE /clients
await fetch(
  'https://acuityscheduling.com/api/v1/clients',
  {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id: 11111 }),
  }
);
```

---

## 7. Blocks (Time Blocking)

Block time on a calendar to prevent bookings.

### List blocks

```typescript
// GET /blocks
const blocks = await fetch(
  'https://acuityscheduling.com/api/v1/blocks?' +
    new URLSearchParams({ calendarID: '67890' }),
  { headers }
).then((r) => r.json());
```

### Create a block

```typescript
// POST /blocks
const block = await fetch(
  'https://acuityscheduling.com/api/v1/blocks',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      calendarID: 67890,
      start: '2026-03-20T09:00:00-0500',
      end: '2026-03-20T11:00:00-0500',
      notes: 'Team meeting',  // optional
    }),
  }
).then((r) => r.json());
```

### Delete a block

```typescript
// DELETE /blocks/:id
await fetch(
  `https://acuityscheduling.com/api/v1/blocks/${blockId}`,
  { method: 'DELETE', headers }
);
```

---

## 8. Certificates & Gift Certificates

### List certificates

```typescript
// GET /certificates
const certs = await fetch(
  'https://acuityscheduling.com/api/v1/certificates',
  { headers }
).then((r) => r.json());

interface Certificate {
  id: number;
  certificate: string;   // the code (e.g., 'GIFT50')
  type: string;          // 'gift' | 'package' | 'subscription'
  productID: number;
  value: string;         // dollar value or number of credits
  uses: number;          // times it's been applied
  expires: string | null;
  email: string;         // recipient email
  firstName: string;
  lastName: string;
}
```

### Create a certificate

```typescript
// POST /certificates
const cert = await fetch(
  'https://acuityscheduling.com/api/v1/certificates',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productID: 54321,              // ID from /products
      email: '[email protected]',
      firstName: 'Taylor',
      lastName: 'Swift',
      certificate: 'GIFT50',         // optional — auto-generated if omitted
    }),
  }
).then((r) => r.json());
```

### Check a certificate

Validate a certificate code before applying it to a booking.

```typescript
// GET /certificates/check
const check = await fetch(
  'https://acuityscheduling.com/api/v1/certificates/check?' +
    new URLSearchParams({ certificate: 'GIFT50' }),
  { headers }
).then((r) => r.json());

// { valid: true, value: '50.00', expires: null } or { valid: false }
```

### Delete a certificate

```typescript
// DELETE /certificates/:id
await fetch(
  `https://acuityscheduling.com/api/v1/certificates/${certId}`,
  { method: 'DELETE', headers }
);
```

---

## 9. Webhooks

Acuity sends POST requests to your endpoint when appointments or orders change.

### Event types

| Event | When |
|-------|------|
| `appointment.scheduled` | New appointment booked |
| `appointment.rescheduled` | Appointment datetime changed |
| `appointment.canceled` | Appointment canceled |
| `appointment.changed` | Any appointment field changed |
| `order.completed` | Package or subscription purchase completed |

### Payload format

Webhooks are sent as `application/x-www-form-urlencoded` POST requests.

| Field | Description |
|-------|-------------|
| `action` | Event type (e.g., `appointment.scheduled`) |
| `id` | Appointment or order ID |
| `calendarID` | Calendar ID (appointments only) |
| `appointmentTypeID` | Appointment type ID (appointments only) |

Fetch full details using the ID against `/appointments/:id` or `/orders/:id`.

### Create a dynamic webhook

```typescript
// POST /webhooks
const webhook = await fetch(
  'https://acuityscheduling.com/api/v1/webhooks',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      target: 'https://your-app.com/api/webhooks/acuity',
      event: 'appointment.scheduled',
    }),
  }
).then((r) => r.json());

// { id: 999, event: 'appointment.scheduled', target: 'https://...' }
```

### List webhooks

```typescript
// GET /webhooks
const webhooks = await fetch(
  'https://acuityscheduling.com/api/v1/webhooks',
  { headers }
).then((r) => r.json());
```

### Delete a webhook

```typescript
// DELETE /webhooks/:id
await fetch(
  `https://acuityscheduling.com/api/v1/webhooks/${webhookId}`,
  { method: 'DELETE', headers }
);
```

### Verify webhook signatures

```typescript
import crypto from 'crypto';

// Express / Next.js API route
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-acuity-signature') ?? '';

  const expected = crypto
    .createHmac('sha256', process.env.ACUITY_API_KEY!)
    .update(rawBody)
    .digest('base64');

  if (signature !== expected) {
    return new Response('Invalid signature', { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const action = params.get('action');
  const id = params.get('id');

  // Fetch full appointment details
  const appointment = await fetch(
    `https://acuityscheduling.com/api/v1/appointments/${id}`,
    { headers }
  ).then((r) => r.json());

  // Handle event...
  return new Response('OK');
}
```

### Webhook limits and retry behavior

| Item | Value |
|------|-------|
| Max webhooks per account | 25 |
| Retry window | 24 hours |
| Retry strategy | Exponential backoff |
| Triggers retry | 500 errors or connection failures only |
| Auto-disable | After 5 days of continuous failures |

---

## 10. Forms

Retrieve intake form definitions and responses.

```typescript
// GET /forms
const forms = await fetch(
  'https://acuityscheduling.com/api/v1/forms',
  { headers }
).then((r) => r.json());

// Each form has { id, name, fields: [{ id, name, type, required, options }] }
```

Form responses are embedded in appointment objects under the `forms` array.

---

## 11. Orders

For packages, subscriptions, and gift certificate orders.

```typescript
// GET /orders
const orders = await fetch(
  'https://acuityscheduling.com/api/v1/orders',
  { headers }
).then((r) => r.json());

// GET /orders/:id
const order = await fetch(
  `https://acuityscheduling.com/api/v1/orders/${orderId}`,
  { headers }
).then((r) => r.json());
```

---

## 12. Account Info

### Get authenticated user

```typescript
// GET /me
const me = await fetch(
  'https://acuityscheduling.com/api/v1/me',
  { headers }
).then((r) => r.json());

// { id: 123456, name: 'Jane Doe', email: '...', timezone: 'America/New_York', ... }
```

---

## 13. Common Patterns

### Full booking flow

```typescript
async function bookAppointment(
  appointmentTypeID: number,
  date: string,
  clientInfo: { firstName: string; lastName: string; email: string }
) {
  // 1. Get available times
  const times = await fetch(
    `https://acuityscheduling.com/api/v1/availability/times?` +
      new URLSearchParams({ appointmentTypeID: String(appointmentTypeID), date }),
    { headers }
  ).then((r) => r.json()) as { time: string; slotsAvailable: number }[];

  if (!times.length) throw new Error('No availability on this date');

  const slot = times[0].time;

  // 2. Verify the slot is still open
  const check = await fetch(
    'https://acuityscheduling.com/api/v1/availability/check-times',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ datetime: slot, appointmentTypeID }),
    }
  ).then((r) => r.json());

  if (!check.valid) throw new Error('Slot no longer available');

  // 3. Book it
  const appointment = await fetch(
    'https://acuityscheduling.com/api/v1/appointments',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ appointmentTypeID, datetime: slot, ...clientInfo }),
    }
  ).then((r) => r.json());

  return appointment;
}
```

### Rate-limited bulk operations

```typescript
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
      continue;
    }
    return res;
  }
  throw new Error('Max retries exceeded');
}
```

---

## 14. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using email as Basic Auth username | Username is your **numeric User ID** — find it at Integrations → API |
| Missing timezone in datetime | Always include UTC offset (e.g., `-0500`) — Acuity uses PHP's `strtotime()` |
| Booking without checking availability | Race condition — always call `/availability/check-times` before `/appointments` POST |
| Not verifying webhook signatures | Compute HMAC-SHA256 with API key against raw body; compare to `x-acuity-signature` |
| Parsing webhook body as JSON | Webhooks send `application/x-www-form-urlencoded` — use `URLSearchParams` |
| Creating webhooks beyond the 25 limit | Delete stale webhooks first; list active ones with GET `/webhooks` |
| Ignoring retry-after on 429 | Implement exponential backoff — 10 req/s is the hard limit |
| Fetching only appointment IDs from webhook | Always fetch full appointment via GET `/appointments/:id` — webhook only sends the ID |
