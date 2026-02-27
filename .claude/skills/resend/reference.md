# Resend Reference

Full API coverage for the Resend email service. TypeScript throughout.

Last verified: February 2026. Check [resend.com/docs](https://resend.com/docs) for changes.

---

## 1. Setup

### Install

```bash
npm install resend
# or
pnpm add resend
yarn add resend
bun add resend
```

### Get an API key

1. Create account at [resend.com](https://resend.com)
2. Navigate to **API Keys** → **Create API Key**
3. Choose scope: `Full access` (recommended for backend) or `Sending access` (restricted)
4. Copy the key — it's shown only once

### Environment variable

```bash
# .env / .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Never commit API keys. Use `.env.local` for Next.js, `.env` for Node/other.

### SDK initialization

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
```

Instantiate once and reuse across your application. The client is stateless and safe to share.

---

## 2. Sending Emails

### Basic send (HTML)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Invoice #1042',
  html: '<p>Your invoice is attached.</p>',
});

if (error) {
  console.error('Send failed:', error);
  throw error;
}

console.log('Email ID:', data?.id);
```

### Send with plain text fallback

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Welcome',
  html: '<h1>Welcome to Acme</h1>',
  text: 'Welcome to Acme',
});
```

Resend auto-generates plain text from HTML since August 2025. Supply `text` manually to override.

### Send with CC and BCC

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  cc: ['[email protected]', '[email protected]'],
  bcc: ['[email protected]'],
  reply_to: ['[email protected]'],
  subject: 'Quarterly report',
  html: '<p>See attached.</p>',
});
```

### Custom headers

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Transactional',
  html: '<p>Hello</p>',
  headers: {
    'X-Entity-Ref-ID': 'order-123',
    'List-Unsubscribe': '<mailto:[email protected]>',
  },
});
```

### Tags (for filtering in dashboard)

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Receipt',
  html: '<p>Thanks for your order.</p>',
  tags: [
    { name: 'category', value: 'transactional' },
    { name: 'user_id', value: 'usr_789' },
  ],
});
```

Tags on batch and scheduled emails supported since September 2025.

### TypeScript types

```typescript
import type { CreateEmailOptions, CreateEmailResponse } from 'resend';

const options: CreateEmailOptions = {
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Hello',
  html: '<p>World</p>',
};

const response: { data: CreateEmailResponse | null; error: Error | null } =
  await resend.emails.send(options);
```

### Retrieve a sent email

```typescript
const { data, error } = await resend.emails.get('email-id-here');
console.log(data?.from, data?.to, data?.created_at);
```

---

## 3. Batch Sending

Send up to **100 emails in a single API call**. All emails are sent asynchronously.

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.batch.send([
  {
    from: 'Acme <[email protected]>',
    to: ['[email protected]'],
    subject: 'Order confirmed',
    html: '<p>Your order #001 is confirmed.</p>',
  },
  {
    from: 'Acme <[email protected]>',
    to: ['[email protected]'],
    subject: 'Order confirmed',
    html: '<p>Your order #002 is confirmed.</p>',
  },
]);

if (error) throw error;

// data is an array of { id: string }
data?.data.forEach((email) => console.log('Sent:', email.id));
```

### Batch with tags (supported since September 2025)

```typescript
await resend.batch.send([
  {
    from: 'Acme <[email protected]>',
    to: ['[email protected]'],
    subject: 'Newsletter',
    html: '<p>This week in Acme...</p>',
    tags: [{ name: 'type', value: 'newsletter' }],
  },
]);
```

### Limits

| Limit | Value |
|-------|-------|
| Emails per batch call | 100 |
| API rate limit | 2 req/s (default) |
| Batch validation modes | strict (default), relaxed |

Use `batchValidationMode: 'relaxed'` to allow partial success — valid emails send even if some recipients fail validation.

---

## 4. Scheduling

Schedule emails up to **72 hours** in advance. Pass `scheduledAt` as an ISO 8601 UTC string.

```typescript
const sendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const { data } = await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Reminder',
  html: '<p>Just a reminder.</p>',
  scheduledAt: sendAt,
});

// Cancel or reschedule before it sends
await resend.emails.cancel(data!.id);
await resend.emails.update({ id: data!.id, scheduledAt: '2026-03-01T14:30:00.000Z' });
```

Constraints: must be in the future, max 72 h out, ISO 8601 UTC, tags supported (September 2025).

---

## 5. React Email Templates

React Email provides typed React components that render to email-safe HTML.

### Install

```bash
npm install react-email @react-email/components
```

### Create a template

```tsx
// emails/welcome.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
}

export function WelcomeEmail({ username, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Acme, {username}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Heading>Welcome, {username}!</Heading>
          <Text>You're all set. Click below to get started.</Text>
          <Section>
            <Button href={loginUrl} style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px' }}>
              Go to dashboard
            </Button>
          </Section>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#888' }}>
            You received this because you signed up for Acme.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Render and send

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from './emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

// render() is async since v3 — always await
const html = await render(WelcomeEmail({ username: 'Taylor', loginUrl: 'https://acme.com/login' }));

await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Welcome to Acme',
  html,
});
```

### Preview locally

```bash
npx react-email preview emails/
# → localhost:3000 with live preview
```

### Tailwind v4 in React Email (React Email v5, 2025)

```tsx
import { Tailwind } from '@react-email/tailwind';

export function MyEmail() {
  return (
    <Tailwind>
      <Html>
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-lg mx-auto">
            <Heading className="text-2xl font-bold">Hello</Heading>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
```

---

## 6. Domain Verification

You must verify a domain before sending. Resend won't send from unverified domains.

### Add domain

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g. `mail.acme.com`)
4. Resend provides DNS records to add

**Use a subdomain** (`mail.acme.com`, `updates.acme.com`) to isolate transactional sending reputation from your root domain.

### DNS records to add

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| `MX` | `send.acme.com` | `feedback-smtp.us-east-1.amazonses.com` | Bounce handling |
| `TXT` | `send.acme.com` | `v=spf1 include:amazonses.com ~all` | SPF |
| `CNAME` | `resend1._domainkey.send.acme.com` | (provided by Resend) | DKIM key 1 |
| `CNAME` | `resend2._domainkey.send.acme.com` | (provided by Resend) | DKIM key 2 |
| `TXT` | `_dmarc.send.acme.com` | `v=DMARC1; p=none; rua=mailto:[email protected]` | DMARC (recommended) |

The exact CNAME values are unique per domain — copy them from the Resend dashboard.

### Verification timeline

DNS propagation takes up to 24 hours. Resend retries verification automatically. Status flow:

```
not_started → pending → verified
                      ↘ failed (72h timeout — re-add records and retry)
```

### Verify via API

```typescript
const { data } = await resend.domains.get('domain-id');
console.log(data?.status); // 'not_started' | 'pending' | 'verified' | 'failed'
```

### Domain management

```typescript
// List all domains
const { data } = await resend.domains.list();

// Remove a domain
await resend.domains.remove('domain-id');
```

---

## 7. Webhooks

Resend fires webhooks for email lifecycle events. Webhooks use Svix infrastructure and are signed for verification.

### Setup

1. Go to [resend.com/webhooks](https://resend.com/webhooks)
2. Click **Add Endpoint**
3. Enter your URL (must be publicly accessible)
4. Select events to subscribe to
5. Copy the **Signing Secret**

### Event types

| Event | When fired |
|-------|-----------|
| `email.sent` | Email accepted and queued |
| `email.delivered` | Mailbox confirmed delivery |
| `email.delivery_delayed` | Temporary delivery failure, Resend retrying |
| `email.bounced` | Hard or soft bounce |
| `email.complained` | Recipient marked as spam |
| `email.opened` | Open tracked (requires tracking pixel) |
| `email.clicked` | Link clicked (requires click tracking) |

### Webhook payload shape

```typescript
interface ResendWebhookPayload {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked' | 'email.delivery_delayed';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // bounce-specific
    bounce?: {
      message: string;
    };
    // click-specific
    click?: {
      link: string;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
  };
}
```

### Verify webhook signatures (recommended pattern)

```typescript
// app/api/webhooks/resend/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // CRITICAL: use raw text body — JSON parsing breaks signature verification
  const payload = await req.text();

  const headers = {
    id: req.headers.get('svix-id') ?? '',
    timestamp: req.headers.get('svix-timestamp') ?? '',
    signature: req.headers.get('svix-signature') ?? '',
  };

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'email.delivered':
      await markEmailDelivered(event.data.email_id);
      break;
    case 'email.bounced':
      await handleBounce(event.data.to[0]);
      break;
    case 'email.complained':
      await unsubscribeContact(event.data.to[0]);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Verify with Svix directly

```typescript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
const event = wh.verify(payload, {
  'svix-id': req.headers.get('svix-id')!,
  'svix-timestamp': req.headers.get('svix-timestamp')!,
  'svix-signature': req.headers.get('svix-signature')!,
});
```

Svix rejects payloads with timestamps more than 5 minutes old, protecting against replay attacks.

---

## 8. Audiences & Contacts

Resend Audiences let you manage marketing contacts and send broadcast emails.

### Create a contact

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.contacts.create({
  email: '[email protected]',
  firstName: 'Taylor',
  lastName: 'Swift',
  unsubscribed: false,
  audienceId: process.env.RESEND_AUDIENCE_ID!,
});
```

### List contacts

```typescript
const { data } = await resend.contacts.list({
  audienceId: process.env.RESEND_AUDIENCE_ID!,
});

data?.data.forEach((contact) => {
  console.log(contact.email, contact.unsubscribed);
});
```

### Update a contact

```typescript
// Update by email or contact ID
await resend.contacts.update({
  id: 'contact-id',
  audienceId: process.env.RESEND_AUDIENCE_ID!,
  unsubscribed: true,
});
```

### Remove a contact

```typescript
// Remove by contact ID or email
await resend.contacts.remove({
  audienceId: process.env.RESEND_AUDIENCE_ID!,
  email: '[email protected]',
});
```

### Audience management

```typescript
// Create an audience
const { data } = await resend.audiences.create({ name: 'Newsletter subscribers' });
const audienceId = data?.id;

// List audiences
const { data: audiences } = await resend.audiences.list();

// Delete an audience
await resend.audiences.remove(audienceId!);
```

### Unsubscribe handling

Resend automatically sets `unsubscribed: true` on bounce/complaint. Unsubscribe topics (per-category preferences) launched in 2025.

---

## 9. Attachments

### File attachment (from disk)

```typescript
import fs from 'fs';

const fileContent = fs.readFileSync('./invoice.pdf').toString('base64');

await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Your invoice',
  html: '<p>See attached.</p>',
  attachments: [
    {
      content: fileContent,       // base64-encoded string
      filename: 'invoice.pdf',
      contentType: 'application/pdf',
    },
  ],
});
```

### Attachment from URL

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Your report',
  html: '<p>See attached report.</p>',
  attachments: [
    {
      path: 'https://acme.com/reports/q4.pdf',
      filename: 'q4-report.pdf',
    },
  ],
});
```

### Inline image (CID embedding)

Embed images directly in the email body using Content IDs. The `contentId` value must be under 128 characters.

```typescript
await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Welcome to Acme',
  html: '<p>Here is our logo: <img src="cid:acme-logo" /></p>',
  attachments: [
    {
      path: 'https://acme.com/logo.png',
      filename: 'logo.png',
      contentId: 'acme-logo',     // matches cid: reference in HTML
      contentType: 'image/png',
    },
  ],
});
```

### Multiple attachments

```typescript
attachments: [
  { content: pdfBase64, filename: 'invoice.pdf', contentType: 'application/pdf' },
  { content: csvBase64, filename: 'data.csv', contentType: 'text/csv' },
],
```

---

## 10. Error Handling

### Destructure pattern (recommended)

```typescript
const { data, error } = await resend.emails.send({ /* ... */ });

if (error) {
  // error.name: string — e.g. 'validation_error', 'missing_api_key'
  // error.message: string — human-readable
  // error.statusCode?: number — HTTP status
  handleError(error);
  return;
}

console.log(data?.id);
```

### Error codes

| Status | Error name | Meaning |
|--------|-----------|---------|
| 400 | `validation_error` | Invalid payload (bad email, missing required field) |
| 401 | `missing_api_key` | No API key provided |
| 403 | `invalid_api_key` | API key invalid or revoked |
| 403 | `invalid_from_address` | `from` domain not verified |
| 403 | `invalid_to_address` | Sandbox mode, non-verified recipient |
| 422 | `invalid_attachment` | Attachment too large or malformed |
| 429 | `rate_limit_exceeded` | Too many requests per second |
| 429 | `daily_quota_exceeded` | Daily email limit hit |
| 429 | `monthly_quota_exceeded` | Monthly email limit hit |
| 500 | `internal_server_error` | Resend infrastructure error |

### Rate limit headers

Every response includes:

```
ratelimit-limit: 2
ratelimit-remaining: 1
ratelimit-reset: 1
retry-after: 1
```

### Retry with exponential backoff

```typescript
async function sendWithRetry(
  payload: Parameters<typeof resend.emails.send>[0],
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data, error } = await resend.emails.send(payload);

    if (!error) return data!.id;

    const isRetryable =
      error.name === 'rate_limit_exceeded' ||
      error.name === 'internal_server_error';

    if (!isRetryable || attempt === maxRetries - 1) throw error;

    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error('Unreachable');
}
```

### Idempotency keys (2025 feature)

Prevent duplicate sends on retry by providing an idempotency key:

```typescript
await resend.emails.send(
  {
    from: 'Acme <[email protected]>',
    to: ['[email protected]'],
    subject: 'Receipt',
    html: '<p>Thanks!</p>',
  },
  {
    idempotencyKey: `order-${orderId}-receipt`,
  }
);
```

If the same key is sent twice, Resend returns the original email ID without sending a duplicate.

---

## 11. Pricing & Limits

Verify current pricing at [resend.com/pricing](https://resend.com/pricing).

### Transactional email plans

| Plan | Monthly emails | Daily limit | Domains | Cost |
|------|---------------|-------------|---------|------|
| Free | 3,000 | 100 | 1 | $0 |
| Pro | 50,000 | unlimited | 10 | $20/mo |
| Scale | 100,000 | unlimited | 1,000 | $90/mo |
| Enterprise | custom | unlimited | flexible | custom |

Overage on Pro/Scale: $0.90 per 1,000 emails. Pay-as-you-go option available as of December 2025.

### Rate limits

| Limit | Default | Notes |
|-------|---------|-------|
| Requests/second | 2 | Applies per team across all API keys |
| Batch emails/call | 100 | All plans |
| Schedule horizon | 72 hours | Cannot schedule further out |
| Idempotency key TTL | 24 hours | Same key reused after 24h sends new email |

Request higher rate limits via the Resend support team (available for trusted senders).

### Feature availability by plan

| Feature | Free | Pro | Scale |
|---------|------|-----|-------|
| API & SMTP | ✓ | ✓ | ✓ |
| Webhooks | 1 endpoint | 10 endpoints | 10 endpoints |
| Team members | 1 | 5 | 100 |
| Data retention | 1 day | 3 days | 7 days |
| Analytics | ✗ | ✓ | ✓ |
| Multi-region sending | ✗ | ✓ | ✓ |
| Dedicated IPs | ✗ | add-on | add-on |
| Slack support | ✗ | ✗ | ✓ |

### Marketing (Audiences) plan

| Plan | Contacts | Cost |
|------|----------|------|
| Free | 1,000 | $0 |
| Pro | custom | custom |

---

## 12. Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | **`from` uses unverified domain** | Add and verify domain in Resend dashboard. Until verified, all sends return 403. |
| 2 | **Sandbox sends to unverified recipients** | In sandbox mode (dev API keys), all `to` addresses must be verified in your account. Use production keys for real users. |
| 3 | **Missing SPF/DKIM → spam folder** | Both records required. Skipping either tanks deliverability. DMARC is optional but strongly recommended. |
| 4 | **Parsing JSON before webhook verification** | Frameworks like Express/Next.js may parse + re-stringify the body. Pass the raw string — even one character difference breaks the HMAC signature. |
| 5 | **Scheduling beyond 72 hours** | Resend rejects `scheduledAt` values more than 72 hours from now. Calculate carefully. |
| 6 | **Batch array exceeds 100** | Resend returns a validation error. Split into chunks of ≤ 100. |
| 7 | **Not awaiting `render()` from React Email** | Since React Email v3, `render()` returns a Promise. `const html = await render(<MyTemplate />)` — missing `await` gives you `[object Promise]` in the HTML. |
| 8 | **Free tier daily cap** | Free tier hits 100/day before 3,000/month. On high-traffic days you'll get `daily_quota_exceeded`. Upgrade or spread sends across days. |
| 9 | **Reusing idempotency keys across different emails** | Idempotency keys deduplicate by exact key. If two different emails share a key, only the first sends. Use order/user IDs scoped to the specific email type. |
| 10 | **Sending `from` as shared domain** (`onboarding@resend.dev`) in production | `resend.dev` is a sandbox domain for testing only. Production sends require your own verified domain. |
