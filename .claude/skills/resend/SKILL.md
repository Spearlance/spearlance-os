---
model: claude-sonnet-4-6
name: resend
description: Use when sending emails with Resend — transactional emails, domain setup, React Email templates, or webhook handling. Also use when choosing an email service or integrating email into a web application.
---

# resend

## install

```bash
npm install resend
```

Set `RESEND_API_KEY` from [resend.com/api-keys](https://resend.com/api-keys).

## send an email

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Acme <[email protected]>',
  to: ['[email protected]'],
  subject: 'Hello',
  html: '<p>It works!</p>',
});

if (error) throw new Error(error.message);
console.log(data?.id);
```

`from` must use a **verified domain**. Sandbox mode only sends to verified addresses.

## domain setup checklist

| Step | Record | Status |
|------|--------|--------|
| Add domain in dashboard | — | required |
| SPF TXT record | `v=spf1 include:amazonses.com ~all` | required |
| DKIM CNAME (×2) | provided by Resend | required |
| MX record (bounces) | `feedback-smtp.us-east-1.amazonses.com` | required |
| DMARC TXT | `v=DMARC1; p=none;` | recommended |

DNS propagation can take up to 24 hours.

## pricing (verify at [resend.com/pricing](https://resend.com/pricing))

| Plan | Monthly emails | Daily limit | Cost |
|------|---------------|-------------|------|
| Free | 3,000 | 100 | $0 |
| Pro | 50,000 | unlimited | $20/mo |
| Scale | 100,000 | unlimited | $90/mo |
| Enterprise | custom | unlimited | custom |

Rate limit: **2 req/s** (all plans). Request higher limits via support.

## common mistakes

1. `from` address uses unverified domain → 403 error
2. Sandbox mode: only verified email addresses receive mail
3. SPF/DKIM missing → spam folder, low deliverability
4. Passing parsed JSON body to webhook verifier → signature fails (use raw body)
5. Scheduling beyond 72 hours → rejected
6. Batch limit is 100 emails per call
7. Free tier: 100/day cap hits before 3,000/mo cap
8. `scheduledAt` must be ISO 8601 format
9. DMARC optional but skipping it leaves you open to spoofing complaints
10. React Email `render()` is async since v3 — always `await` it

See reference.md for full API coverage.
