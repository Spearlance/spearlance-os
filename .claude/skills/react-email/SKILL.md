---
model: claude-sonnet-4-6
name: react-email
description: Use when building email templates with React Email — component library, styling, preview server, or rendering to HTML. Also use when creating responsive email layouts or debugging email rendering across email clients.
---

# React Email

Component library for building HTML emails with React. Renders to email-safe HTML. Works with any email service — Resend, Nodemailer, SendGrid, etc.

**Current version:** 5.x — React 19.2, Tailwind 4, dark mode, `CodeBlock`, `Markdown`, `CodeInline`.

## Component Imports Cheatsheet

```ts
import {
  Html, Head, Body, Preview, Font,
  Container, Section, Row, Column,
  Heading, Text, Link, Button,
  Img, Hr, Markdown, CodeBlock, CodeInline,
  Tailwind, pixelBasedPreset,
} from "@react-email/components";
import { render, toPlainText } from "@react-email/render";
```

All components in one package. No individual installs needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Basic Email Template

```tsx
interface WelcomeEmailProps { username: string; ctaUrl: string; }

export default function WelcomeEmail({ username, ctaUrl }: WelcomeEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to the app, {username}!</Preview>
      <Body style={{ backgroundColor: "#f4f4f4", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#fff" }}>
          <Section style={{ padding: "24px" }}>
            <Heading as="h1" style={{ color: "#111" }}>Hey, {username}!</Heading>
            <Text>Thanks for signing up. Get started below.</Text>
            <Button href={ctaUrl} style={{ backgroundColor: "#0070f3", color: "#fff", padding: "12px 24px", borderRadius: "4px" }}>
              Get Started
            </Button>
            <Hr style={{ margin: "24px 0" }} />
            <Text style={{ color: "#999", fontSize: "12px" }}>If you didn't sign up, ignore this.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = { username: "Jane", ctaUrl: "https://example.com" } satisfies WelcomeEmailProps;
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## render() Usage

```ts
import { render, toPlainText } from "@react-email/render";

const html = await render(<WelcomeEmail username="Zach" ctaUrl="https://example.com" />);
const text = toPlainText(html);                          // plain text for spam score
const pretty = await render(<WelcomeEmail />, { pretty: true }); // debugging only
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `flexbox` / CSS Grid for layout | Use `<Row>` + `<Column>` — renders as `<table>` |
| Relative image URLs (`/logo.png`) | Must be absolute: `https://cdn.example.com/logo.png` |
| CSS class names for critical styles | Inline all — Gmail strips `<style>` blocks |
| `border-radius` on buttons in Outlook | Accept square corners; Outlook New supports it |
| Web fonts without fallback | Always append `Arial, sans-serif` |
| Tailwind `rem` units | Add `presets: [pixelBasedPreset]` to `<Tailwind>` config |
| MSO conditional comments in JSX | React strips HTML comments — post-process the HTML string |
| Missing `<Preview>` | Inbox shows first body text instead — always include it |
| Testing only in preview server | Test in real Outlook, Gmail web, iOS Mail |
| No `lang` on `<Html>` | Required for a11y and RTL support |

See `reference.md` for full API coverage.
