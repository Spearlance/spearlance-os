# React Email — Full Reference

Version: 5.x (November 2025) — React 19.2, Tailwind 4, dark mode, `CodeBlock`, `Markdown`, `CodeInline`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Setup

### Install

```bash
npm install @react-email/components react react-dom  # all components in one package
npm install @react-email/render                       # render utility
npm install react-email                               # preview dev server
```

### Project Structure

```
emails/
  welcome.tsx
  reset-password.tsx
  order-confirmation.tsx
  static/
    logo.png           # served at /static/logo.png in preview server
package.json
```

One file per template. Export the component as default. Export `PreviewProps` for the preview server.

### package.json Scripts

```json
{
  "scripts": {
    "email:dev": "email dev --dir emails --port 3001",
    "email:export": "email export --dir emails --outDir .email-export"
  }
}
```

### With Next.js (API Route Pattern)

```ts
// app/api/send/route.ts
import { render } from "@react-email/render";
import WelcomeEmail from "@/emails/welcome";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, username } = await req.json();
  const html = await render(<WelcomeEmail username={username} ctaUrl="https://app.example.com" />);
  await resend.emails.send({ from: "noreply@example.com", to: email, subject: "Welcome!", html });
  return Response.json({ ok: true });
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Core Components

All imported from `@react-email/components`.

### Html

Root element. Always include `lang` and `dir`.

```tsx
<Html lang="en" dir="ltr">{/* entire email */}</Html>
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `lang` | `string` | `"en"` | ISO language code |
| `dir` | `"ltr" \| "rtl"` | `"ltr"` | Text direction |

---

### Head

Accepts `<style>` tags, meta tags, `<Font>`. Place before `<Body>`.

```tsx
<Head>
  <meta name="color-scheme" content="light dark" />
  <style>{`@media (prefers-color-scheme: dark) { .bg { background: #1a1a1a !important; } }`}</style>
</Head>
```

---

### Body

Set global background and font reset.

```tsx
<Body style={{ backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
```

---

### Preview

Inbox preview text. Place after `<Head>`. Max ~140 chars. Pad with `\u00a0` to prevent body text leakage.

```tsx
<Preview>Your order #1234 has shipped and arrives Thursday.</Preview>

{/* Prevent body text leaking into preview: */}
<Preview>{"Short preview."}{Array(150).fill("\u00a0").join("")}</Preview>
```

---

### Container

600px centered wrapper. The standard email layout shell.

```tsx
<Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff" }}>
```

---

### Section

Block-level content area. Renders as `<table>` for Outlook compatibility.

```tsx
<Section style={{ padding: "24px 32px" }}>
  <Text>Content here</Text>
</Section>
```

---

### Row + Column

Multi-column layouts. `Row` → `<tr>`, `Column` → `<td>`.

```tsx
<Row>
  <Column style={{ width: "160px", verticalAlign: "top", paddingRight: "24px" }}>
    <Img src="https://cdn.example.com/product.png" width={160} height={160} alt="Product" />
  </Column>
  <Column style={{ verticalAlign: "top" }}>
    <Heading as="h2" style={{ margin: "0 0 8px", fontSize: "18px" }}>Product Name</Heading>
    <Text style={{ margin: 0 }}>$49.99</Text>
  </Column>
</Row>
```

---

### Text

Paragraph text. Renders as `<p>`.

```tsx
<Text style={{ fontSize: "16px", lineHeight: "24px", color: "#374151", margin: "0 0 16px" }}>
  Thanks for your purchase.
</Text>
```

---

### Link

Always set `color` explicitly — email clients reset link colors.

```tsx
<Link href="https://example.com" style={{ color: "#0070f3", textDecoration: "underline" }}>
  View your order
</Link>
```

---

### Button

Table-based CTA button. `href` is required. `border-radius` works in all clients except classic Outlook.

```tsx
<Button
  href="https://example.com/confirm"
  style={{
    backgroundColor: "#0070f3",
    color: "#ffffff",
    borderRadius: "4px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
  }}
>
  Confirm Email
</Button>
```

| Prop | Type | Notes |
|------|------|-------|
| `href` | `string` | Required |
| `style` | `CSSProperties` | Applied to the inner `<a>` |
| `target` | `string` | e.g. `"_blank"` |

---

### Img

`src` must be an **absolute URL**. Always set `width`, `height`, `alt`.

```tsx
<Img
  src="https://cdn.example.com/logo.png"
  width={200}
  height={60}
  alt="Company Logo"
  style={{ display: "block" }}  // prevents gap below image in Gmail
/>
```

For HiDPI: serve `@2x` image, set display size to half: `width={200}` on a 400px file.

---

### Hr

```tsx
<Hr style={{ borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />
```

---

### Heading

```tsx
<Heading as="h1" style={{ fontSize: "32px", fontWeight: "700", color: "#111827", margin: "0 0 16px" }}>
  Order Confirmed
</Heading>
```

| Prop | Type | Default |
|------|------|---------|
| `as` | `"h1"–"h6"` | `"h1"` |
| `m` / `mx` / `my` | `string` | — |

---

### Font

Embed a web font inside `<Head>`. Fallback renders in Outlook and Gmail.

```tsx
<Head>
  <Font
    fontFamily="Inter"
    fallbackFontFamily="Arial"
    webFont={{ url: "https://fonts.gstatic.com/s/inter/v13/...woff2", format: "woff2" }}
    fontWeight={400}
    fontStyle="normal"
  />
</Head>
```

| Prop | Type | Notes |
|------|------|-------|
| `fontFamily` | `string` | CSS font-family name |
| `fallbackFontFamily` | `string \| string[]` | Shown when web font fails |
| `webFont` | `{ url: string; format: string }` | `"woff2"`, `"woff"`, `"ttf"` |
| `fontWeight` | `number` | 100–900 |
| `fontStyle` | `string` | `"normal"`, `"italic"` |

---

### Markdown

Render markdown content from a CMS or dynamic source.

```tsx
<Markdown
  markdownCustomStyles={{
    h1: { color: "#111827", fontSize: "32px" },
    p: { color: "#374151", lineHeight: "24px" },
    a: { color: "#0070f3" },
  }}
  markdownContainerStyles={{ fontFamily: "Arial, sans-serif" }}
>
  {`# Hello\n\nThis is **bold** and [a link](https://example.com).`}
</Markdown>
```

---

### CodeBlock

Syntax highlighting via Prism.js. Good for dev-focused transactional emails.

```tsx
import { CodeBlock, dracula } from "@react-email/components";

<CodeBlock code={`const x = "hello";`} language="javascript" theme={dracula} lineNumbers />
```

Available themes: `dracula`, `github`, `nord`, `okaidia`, `solarizedlight`, `twilight`.

---

### CodeInline

Inline code — OTP codes, short identifiers.

```tsx
<CodeInline style={{ backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
  {otpCode}
</CodeInline>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Styling

### Inline Styles — Primary Approach

Extract styles into a typed object. Works everywhere.

```tsx
const s = {
  container: { maxWidth: "600px", margin: "0 auto", backgroundColor: "#fff" } as React.CSSProperties,
  text: { fontSize: "16px", lineHeight: "1.6", color: "#374151", margin: "0 0 16px" } as React.CSSProperties,
};

<Container style={s.container}>
  <Text style={s.text}>Content</Text>
</Container>
```

### Tailwind with React Email

Wrap the full template in `<Tailwind>`. Use `pixelBasedPreset` — converts `rem` to `px`.

```tsx
import { Tailwind, pixelBasedPreset } from "@react-email/components";

<Tailwind
  config={{
    presets: [pixelBasedPreset],
    theme: { extend: { colors: { brand: "#0070f3" } } },
  }}
>
  <Html lang="en">
    <Body className="bg-gray-100 font-sans">
      <Container className="max-w-[600px] mx-auto bg-white">
        <Text className="text-base text-gray-700 leading-6 mb-4">Hello!</Text>
        <Button href="https://example.com" className="bg-brand text-white px-6 py-3 rounded no-underline">
          Click me
        </Button>
      </Container>
    </Body>
  </Html>
</Tailwind>
```

**Tailwind limitations in email:**
- No `prose` plugin
- Avoid `group-hover:`, `peer-`, `has-` selectors
- `flex` and `grid` classes fail in classic Outlook — use `<Row>` + `<Column>`

### Safe Font Stacks

```ts
const fonts = {
  sansSerif: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
};
```

Web fonts (via `<Font>`) render in Apple Mail and iOS. Outlook and Gmail fall back to system fonts.

### Body CSS Reset

```tsx
<Body style={{ margin: 0, padding: 0, backgroundColor: "#f6f9fc", WebkitTextSizeAdjust: "100%", MsTextSizeAdjust: "100%" }}>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Rendering

### render() — HTML + Plain Text

```ts
import { render, toPlainText } from "@react-email/render";

const html = await render(<WelcomeEmail username="Zach" ctaUrl="https://example.com" />);
const text = toPlainText(html);

// Options
const debugHtml = await render(<WelcomeEmail />, { pretty: true });  // prettified (debugging only)
```

Always send both `html` and `text`. Spam filters score better with both present.

### Resend

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const html = await render(<WelcomeEmail username="Zach" ctaUrl="..." />);
await resend.emails.send({
  from: "Zach <noreply@example.com>",
  to: "user@example.com",
  subject: "Welcome!",
  html,
  text: toPlainText(html),
});
```

### Nodemailer

```ts
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransporter({ host: "smtp.example.com", port: 587, auth: { user, pass } });

const html = await render(<ResetPasswordEmail resetUrl="..." />);
await transporter.sendMail({
  from: '"My App" <noreply@example.com>',
  to: "user@example.com",
  subject: "Reset your password",
  html,
  text: toPlainText(html),
});
```

### SendGrid

```ts
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const html = await render(<InvoiceEmail invoiceId="INV-001" total={250} />);
await sgMail.send({ to: "client@example.com", from: "billing@example.com", subject: "Invoice ready", html, text: toPlainText(html) });
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Layout Patterns

### Standard 600px Shell

```tsx
<Html lang="en" dir="ltr">
  <Head />
  <Preview>Preview text here</Preview>
  <Body style={{ backgroundColor: "#f4f4f4", margin: 0, fontFamily: "Arial, sans-serif" }}>
    <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#fff" }}>
      {/* header */}
      <Section style={{ backgroundColor: "#0070f3", padding: "32px", textAlign: "center" }}>
        <Img src="https://cdn.example.com/logo.png" width={120} height={36} alt="Logo" style={{ margin: "0 auto", display: "block" }} />
      </Section>
      {/* body */}
      <Section style={{ padding: "32px" }}>
        <Heading as="h1" style={{ margin: "0 0 16px" }}>Title</Heading>
        <Text style={{ margin: "0 0 24px" }}>Body content.</Text>
        <Button href="https://example.com" style={{ backgroundColor: "#0070f3", color: "#fff", padding: "12px 24px", borderRadius: "4px" }}>
          CTA
        </Button>
      </Section>
      {/* footer */}
      <Section style={{ backgroundColor: "#f9fafb", padding: "24px", textAlign: "center" }}>
        <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px" }}>
          © 2025 My Company · <Link href="https://example.com/unsubscribe" style={{ color: "#9ca3af" }}>Unsubscribe</Link>
        </Text>
      </Section>
    </Container>
  </Body>
</Html>
```

### MSO Conditional Comments

React JSX cannot render HTML comments — `<!--[if mso]>` is stripped. Options:

**Post-process the rendered HTML string:**
```ts
const raw = await render(<MyEmail />);
const html = raw
  .replace(/<div data-mso="true">/g, "<!--[if mso]>")
  .replace(/<\/div data-mso="true">/g, "<![endif]-->");
```

**Use jsx-email** (React Email fork with native `<Conditional>` component):
```tsx
import { Conditional } from "jsx-email";
<Conditional test="mso">
  <table width="600">...</table>
</Conditional>
```

### Responsive with Media Queries

```tsx
<Head>
  <style>{`
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .column { display: block !important; width: 100% !important; }
      .hide-mobile { display: none !important; }
    }
  `}</style>
</Head>
```

Gmail app (mobile) supports media queries. Gmail web does not. Classic Outlook does not.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Dynamic Content

### TypeScript Props + PreviewProps

```tsx
interface OrderEmailProps {
  customerName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number; imageUrl: string }>;
  total: number;
  trackingUrl?: string;
}

export default function OrderEmail({ customerName, orderId, items, total, trackingUrl }: OrderEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Order #{orderId} confirmed!</Preview>
      <Body style={{ backgroundColor: "#f6f9fc" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#fff" }}>
          <Section style={{ padding: "32px" }}>
            <Heading as="h1">Thanks, {customerName}!</Heading>
            <Text>Order #{orderId}</Text>

            {/* Loop */}
            {items.map((item, i) => (
              <Row key={i} style={{ marginBottom: "16px" }}>
                <Column style={{ width: "80px" }}>
                  <Img src={item.imageUrl} width={72} height={72} alt={item.name} />
                </Column>
                <Column>
                  <Text style={{ margin: 0, fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ margin: 0 }}>Qty: {item.quantity} · ${item.price.toFixed(2)}</Text>
                </Column>
              </Row>
            ))}

            {/* Conditional section */}
            {trackingUrl && (
              <Section style={{ backgroundColor: "#f0f9ff", padding: "16px", marginTop: "16px" }}>
                <Button href={trackingUrl} style={{ backgroundColor: "#0070f3", color: "#fff", padding: "10px 20px" }}>
                  Track Package
                </Button>
              </Section>
            )}

            <Text style={{ fontWeight: "700", fontSize: "18px", marginTop: "16px" }}>
              Total: ${total.toFixed(2)}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

OrderEmail.PreviewProps = {
  customerName: "Jane Doe",
  orderId: "ORD-2025-001",
  items: [{ name: "Widget Pro", quantity: 1, price: 49.99, imageUrl: "https://placehold.co/72x72" }],
  total: 55.98,
  trackingUrl: "https://example.com/track/abc123",
} satisfies OrderEmailProps;
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Images

### Requirements

| Rule | Detail |
|------|--------|
| Absolute URLs | `https://cdn.example.com/img.png` — relative paths don't resolve in email |
| Set `width` + `height` | Prevents layout shift when images are blocked |
| `alt` text | Required for a11y; shown when images are blocked |
| `display: block` | Prevents 4px gap below image in Gmail |

### Hosting

| Option | Notes |
|--------|-------|
| CDN (S3, R2, Cloudflare) | Best — you control availability and cache headers |
| Resend | Handles hosted attachments when using Resend API |
| `localhost` URLs | Never — breaks in all real email clients |

### HiDPI Images

```tsx
<Img
  src="https://cdn.example.com/logo@2x.png"  // actual file: 400×120px
  width={200}                                  // display at 200×60px
  height={60}
  alt="Logo"
  style={{ display: "block" }}
/>
```

### Background Images

CSS `background-image` is stripped in classic Outlook. Supported in Gmail, Apple Mail, Outlook New.

```tsx
<Section style={{ backgroundImage: "url('https://cdn.example.com/bg.jpg')", backgroundSize: "cover" }}>
```

For Outlook support: use VML via post-processed HTML or the `jsx-email` `<Conditional>` component.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. Email Client Compatibility

### Feature Support Matrix

| Feature | Gmail web | Apple Mail | Outlook New | Classic Outlook | Yahoo |
|---------|-----------|-----------|-------------|-----------------|-------|
| CSS class names | ✗ | ✓ | ✓ | ✓ | ✗ |
| `<style>` in head | ✗ | ✓ | ✓ | ✓ | ◐ |
| Media queries | ✗ | ✓ | ✓ | ✗ | ◐ |
| Flexbox | ✗ | ✓ | ✓ | ✗ | ✗ |
| CSS Grid | ✗ | ✓ | ✓ | ✗ | ✗ |
| `border-radius` | ✓ | ✓ | ✓ | ✗ | ✓ |
| Web fonts | ✗ | ✓ | ✓ | ✗ | ✗ |
| Background images | ✓ | ✓ | ✓ | ✗ | ✓ |

### Gmail Notes

- Strips `<style>` and `<link>` from `<head>` for non-promoted messages
- CSS class names in `<style>` blocks don't apply — inline all critical styles
- Gmail app on Android/iOS supports media queries; Gmail web does not

### Classic Outlook (Windows, Word-rendering engine, 2007–2021)

- No flexbox, no CSS Grid — use `<Row>` + `<Column>` (table-based)
- No `border-radius` — buttons appear square
- No CSS `background-image` — use VML
- `max-width` on `<table>` ignored — use fixed `width` in pixels
- `padding` on `<div>` unreliable — set padding on `<td>` elements
- Unitless `line-height` sometimes ignored — use `px`

### Outlook New (Microsoft 365, Windows 11)

Replaced Word engine with Chromium in 2024–2025. Supports flexbox, grid, `border-radius`, media queries. Much better compatibility going forward.

### Common CSS Gotchas

| Property | Issue | Fix |
|----------|-------|-----|
| `font-size` | iOS enforces 13px minimum | Design at 14px+ |
| `line-height` | Unitless ignored in some clients | Use `px` or `em` |
| `margin: auto` on table | Ignored in Outlook | Use `<Container>` component |
| `display: none` | May not hide in some clients | Add `mso-hide: all` for Outlook |
| `width: 100%` on images | May overflow | Add `style={{ maxWidth: "100%" }}` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. Preview Server

### Commands

```bash
npx email dev                          # emails/ directory, port 3000
npx email dev --dir src/emails         # custom directory
npx email dev --port 3001              # custom port
npx email dev --dir src/emails --port 3001
```

### Features

- Hot reload on save
- Renders all `.tsx`, `.jsx`, `.ts`, `.js` files in `--dir`
- Virtual email client preview sidebar
- HTML source view
- Dark mode preview toggle (v5.0+)
- Static files: `emails/static/file.png` → `http://localhost:3001/static/file.png`

### PreviewProps

```tsx
// Attached to the component as a static property
WelcomeEmail.PreviewProps = {
  username: "Jane",
  ctaUrl: "https://example.com",
} satisfies WelcomeEmailProps;

// Or as a named export
export const PreviewProps: WelcomeEmailProps = {
  username: "Jane",
  ctaUrl: "https://example.com",
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Testing

### Tools

| Tool | Type | Notes |
|------|------|-------|
| [Litmus](https://litmus.com) | Screenshot testing | 90+ client screenshots; paid |
| [Email on Acid](https://emailonacid.com) | Screenshot testing | Similar to Litmus; paid |
| [Can I Email](https://caniemail.com) | CSS compatibility | Free; like caniuse for email |
| [Mail Tester](https://www.mail-tester.com) | Spam score | Free; send real email to test address |
| [MXToolbox](https://mxtoolbox.com) | Deliverability | SPF/DKIM/DMARC checker |

### Vitest Unit Tests

```tsx
import { describe, it, expect } from "vitest";
import { render, toPlainText } from "@react-email/render";
import WelcomeEmail from "./welcome";

describe("WelcomeEmail", () => {
  it("renders username in output", async () => {
    const html = await render(<WelcomeEmail username="Zach" ctaUrl="https://example.com" />);
    expect(html).toContain("Zach");
    expect(html).toContain("https://example.com");
  });

  it("renders plain text without HTML tags", async () => {
    const html = await render(<WelcomeEmail username="Zach" ctaUrl="https://example.com" />);
    const text = toPlainText(html);
    expect(text).toContain("Zach");
    expect(text).not.toContain("<");
  });
});
```

### Real Device Checklist

```
○ Preview server looks correct
○ Gmail web (browser)
○ Gmail mobile (Android or iOS)
○ Outlook desktop
○ Apple Mail / iOS Mail
○ Images load (absolute URLs confirmed)
○ All links/buttons work
○ Plain text version readable
○ Spam score checked (mail-tester.com)
○ Unsubscribe link functional
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. Common Mistakes

| # | Mistake | Why It Breaks | Fix |
|---|---------|--------------|-----|
| 1 | `display: flex` / CSS Grid for layout | Classic Outlook ignores both — content collapses | Use `<Row>` + `<Column>` (renders as `<table>`) |
| 2 | Relative image URLs (`/images/logo.png`) | No base URL in email clients — image fails to load | Use absolute URLs: `https://cdn.example.com/logo.png` |
| 3 | CSS class names as only styling approach | Gmail strips `<style>` blocks — classes don't apply | Inline all critical styles |
| 4 | Missing `width` + `height` on `<Img>` | Layout shifts when images blocked; Outlook ignores CSS sizing | Always set both as attributes |
| 5 | Missing `alt` on images | Accessibility failure; blank when images blocked | Every `<Img>` needs `alt`; use `alt=""` for decorative |
| 6 | Expecting `border-radius` in classic Outlook | Word engine renders square corners only | Accept square or use Outlook New (Chromium-based) |
| 7 | Tailwind without `pixelBasedPreset` | Email clients don't honor root font-size — `rem` renders wrong | Add `presets: [pixelBasedPreset]` to `<Tailwind>` config |
| 8 | MSO conditional comments in JSX | React strips HTML comments during render | Post-process HTML string or use jsx-email |
| 9 | Only testing in preview server | Preview uses a real browser — email clients differ wildly | Test in real Outlook, Gmail, iOS Mail |
| 10 | `<Preview>` text leaks into body | First body text appears in inbox preview | Pad with 150× `\u00a0` or keep preview concise |
