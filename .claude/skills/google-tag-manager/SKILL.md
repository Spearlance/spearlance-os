---
model: claude-sonnet-4-6
name: google-tag-manager
description: Use when setting up Google Tag Manager, configuring data layers, managing tags and triggers, implementing server-side tagging, or configuring Consent Mode v2. Also use when debugging tag firing, managing workspaces, or integrating GTM with GA4/Meta/Pinterest.
---

# Google Tag Manager

## Overview

GTM is a tag management system that lets you deploy and manage measurement code without touching your site's source. Web container runs in the browser; sGTM runs on a server you control.

| Component | Purpose | Docs |
|-----------|---------|------|
| **Web Container** | Client-side tag management | `tagmanager.google.com` |
| **Server Container (sGTM)** | Server-side tag processing | `developers.google.com/tag-platform/tag-manager/server-side` |
| **Tag Manager API v2** | Programmatic container management | `https://tagmanager.googleapis.com/tagmanager/v2` |
| **Container ID format** | GTM-XXXXXXXX | Found in GTM UI > Admin |

## Web Container Setup

### Container Snippet

Place the `<script>` tag immediately after `<head>`. Place the `<noscript>` tag immediately after `<body>`.

```html
<!-- Head snippet (as high in <head> as possible) -->
<head>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXXX');</script>
  <!-- End Google Tag Manager -->
</head>

<!-- Body noscript (immediately after opening <body>) -->
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXXX"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
```

### Multiple Environments

GTM supports environment-specific container snippets. Use the Environments feature (Admin > Environments) to create separate dev/staging/prod containers. Replace `GTM-XXXXXXXX` with the container ID and append `&gtm_auth=TOKEN&gtm_preview=env-N&gtm_cookies_win=x` for non-live environments.

### April 2025 Auto-Loading Google Tag Change

Starting April 10, 2025, GTM containers with Google Ads and Floodlight tags **automatically load a Google Tag** before firing those events. This improves tracking reliability.

**Impact:** If you have Enhanced Conversions enabled, the auto-loaded Google Tag applies them automatically. GA4 is not affected by this change.

**Recommendation:** Add a Google Tag manually via GTM (Initialization - All Pages trigger) for each Ads/Floodlight ID to maintain explicit control before the auto-load fires.

---

## Data Layer

### Initialization

Always initialize the data layer array **before** the GTM container snippet:

```html
<script>
  window.dataLayer = window.dataLayer || [];
</script>
<!-- Then immediately: GTM container snippet -->
```

### dataLayer.push() Patterns

```javascript
// Event only
dataLayer.push({ event: 'form_submission' });

// Event with variables
dataLayer.push({
  event: 'phone_click',
  phoneNumber: '+15551234567',
  pageLocation: window.location.pathname
});

// Variables without event (persists across pages)
dataLayer.push({
  userId: '12345',
  userType: 'registered',
  pageCategory: 'services'
});
```

### Standard Events for Service Businesses

| Event Name | When to Fire | Key Variables |
|------------|-------------|---------------|
| `page_view` | Every page load | `pagePath`, `pageTitle` |
| `form_submission` | Form submit success | `formId`, `formName`, `serviceCategory` |
| `phone_click` | Click on phone number | `phoneNumber`, `clickLocation` |
| `scroll_depth` | User scrolls 25/50/75/90% | `scrollDepth`, `pagePath` |
| `video_play` | Video starts | `videoTitle`, `videoUrl` |
| `cta_click` | CTA button click | `ctaText`, `ctaLocation` |
| `chat_start` | Live chat initiated | `chatTool` |
| `appointment_booked` | Booking confirmed | `serviceType`, `appointmentDate` |
| `quote_request` | Quote form submitted | `serviceType`, `zipCode` |

### Ecommerce Data Layer (GA4 Schema)

```javascript
// View item
dataLayer.push({
  event: 'view_item',
  ecommerce: {
    currency: 'USD',
    value: 149.00,
    items: [{
      item_id: 'SKU_123',
      item_name: 'HVAC Tune-Up',
      item_category: 'Maintenance',
      price: 149.00,
      quantity: 1
    }]
  }
});

// Purchase (fires on confirmation page)
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T-20260101-001',
    value: 149.00,
    tax: 12.33,
    shipping: 0,
    currency: 'USD',
    items: [{
      item_id: 'SKU_123',
      item_name: 'HVAC Tune-Up',
      item_category: 'Maintenance',
      price: 149.00,
      quantity: 1
    }]
  }
});
```

**GTM shortcut:** In GA4 Event tags, check "Send ecommerce data" and select "Data Layer" — GTM auto-reads the `ecommerce` object without manual variable configuration.

---

## Tags

### GA4 Configuration Tag

- **Tag Type:** Google Tag (replaces GA4 Configuration)
- **Tag ID:** Your Measurement ID (`G-XXXXXXXX`)
- **Firing Trigger:** Initialization - All Pages
- **Fields to Set:** `send_page_view` → `false` (set it manually for SPAs)

### GA4 Event Tag

- **Tag Type:** Google Analytics: GA4 Event
- **Configuration Tag:** Select your Google Tag
- **Event Name:** `{{DL - event}}` or hardcoded name
- **Parameters:** Map data layer variables to GA4 parameter names

### Meta Pixel Base Tag

```javascript
// Custom HTML tag — fires on All Pages
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{Constant - Meta Pixel ID}}');
fbq('track', 'PageView');
```

### Meta Pixel Event Tag

```javascript
// Custom HTML tag — fires on custom event trigger
fbq('track', 'Lead', {
  content_name: {{DL - formName}},
  value: {{DL - leadValue}},
  currency: 'USD'
});
```

### Pinterest Tag

```javascript
// Custom HTML tag — fires on All Pages (base)
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(
Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[];n.version="3.0";
var t=document.createElement("script");t.async=!0;t.src=e;var r=document.getElementsByTagName("script")[0];
r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '{{Constant - Pinterest Tag ID}}', {em: '{{DL - hashedEmail}}'});
pintrk('page');
```

### Microsoft Clarity Tag

- **Tag Type:** Microsoft Clarity (built-in template in GTM gallery)
- **Clarity Project ID:** Your Clarity project ID
- **Firing Trigger:** All Pages

### Custom HTML Tag Pattern

```html
<script>
  (function() {
    // Access data layer variables via GTM macros or directly
    var pageType = {{DL - pageType}};
    var userId = {{DL - userId}};

    // Your custom tracking code
    console.log('Page type:', pageType);
  })();
</script>
```

---

## Triggers

| Trigger Type | Configuration Key | Common Use Case |
|-------------|------------------|----------------|
| **All Pages** | Page view | Base tags (GA4 config, pixels) |
| **Initialization - All Pages** | Initialization | Google Tag, consent defaults |
| **Custom Event** | Event name matches | `dataLayer.push({event: 'X'})` |
| **Form Submission** | Wait for tags, check validation | Contact form lead capture |
| **Click - All Elements** | Click text/classes/IDs | CTA clicks, phone number clicks |
| **Click - Just Links** | Link URL, link text | External link tracking |
| **Element Visibility** | Selector, once per page | Scroll past section, content view |
| **Scroll Depth** | 25/50/75/90% thresholds | Engagement measurement |
| **Timer** | Interval, limit | Time on page |
| **YouTube Video** | Start/pause/complete/progress | Video engagement |
| **History Change** | — | SPA virtual page views |
| **Window Loaded** | — | Tags that need full DOM |

### Custom Event Trigger (Most Common)

- **Trigger Type:** Custom Event
- **Event Name:** `form_submission` (exact match or regex)
- **This trigger fires on:** All Custom Events (or specific conditions)

### Phone Click Trigger

- **Trigger Type:** Click - Just Links
- **Fire On:** Click URL → contains → `tel:`

---

## Variables

| Variable Type | When to Use | Example |
|--------------|-------------|---------|
| **Data Layer Variable** | Read values from `dataLayer.push()` | `ecommerce.transaction_id` |
| **URL** | Current page URL components | Page path, hostname, query param |
| **Cookie** | Read first-party cookie value | Session token, user preference |
| **First-Party Cookie** | GA/GTM-specific cookie reader | `_ga` cookie |
| **Constant** | Static value reused across tags | Pixel IDs, API endpoints |
| **Custom JavaScript** | Computed/dynamic values | DOM scraping, calculations |
| **Lookup Table** | Map one value to another | Page type → event category |
| **RegEx Table** | Pattern-based mapping | URL patterns → categories |
| **Auto-Event Variable** | Values from the firing element | Click text, click URL, form ID |
| **JavaScript Variable** | Access any JS global | `window.userId` |

### Data Layer Variable Setup

- **Variable Type:** Data Layer Variable
- **Data Layer Variable Name:** `ecommerce.value` (dot notation for nested objects)
- **Data Layer Version:** Version 2 (required for nested objects)

### Custom JavaScript Variable Example

```javascript
// Fired as GTM Custom JavaScript Variable
function() {
  var path = window.location.pathname;
  if (path.indexOf('/services/') !== -1) return 'services';
  if (path.indexOf('/contact') !== -1) return 'contact';
  if (path === '/') return 'home';
  return 'other';
}
```

---

## Server-Side Tagging (sGTM)

### Architecture

```
Browser
  │
  │  dataLayer.push() + GTM web container
  │
  ▼
sGTM Server (your subdomain: metrics.yourdomain.com)
  │
  ├── GA4 Client → Google Analytics servers
  ├── Meta CAPI Client → Meta Graph API
  ├── Pinterest CAPI Client → Pinterest API
  └── Custom Client → Any endpoint
```

### Benefits vs. Client-Side

| Factor | Client-Side | Server-Side |
|--------|------------|-------------|
| Ad blockers | Blocked | Bypassed (first-party domain) |
| ITP/cookie limits | 7-day expiry (Safari) | Server-set = up to 400 days |
| Page performance | JS weight on browser | Offloaded to server |
| Data control | All data hits vendor | You filter before sending |
| PII stripping | No | Yes — strip before forwarding |
| Cost | Free | ~$30-50/month (Cloud Run) |

### sGTM Setup Steps

1. Create a new container in GTM — select **"Server"** as target platform
2. Deploy tagging server: GTM Admin > Container Settings > Automatic provisioning (creates a GCP project + Cloud Run)
3. Configure a custom subdomain: `metrics.yourdomain.com` → CNAME to the sGTM Cloud Run URL
4. Point your web GTM container at sGTM: update GA4 config tag server URL to `https://metrics.yourdomain.com`
5. Upgrade to minimum 3 instances for production (prevents data loss on scale)

### When to Use sGTM

- EEA audience + Consent Mode v2 — sGTM lets you enforce consent server-side
- High-value conversion tracking — reduces signal loss from ad blockers
- Need first-party cookies with long expiry for attribution
- Sending to multiple ad platforms from one hit (deduplicate server-side)
- Stricter PII control — strip emails/phones before they leave your server

---

## Consent Mode v2

**Required since March 2024** for EEA/UK users if you run Google Ads or use GA4 for advertising.

### Default State (Before User Consent)

Set defaults **before** the GTM container snippet loads. Use `gtag('consent', 'default', ...)` in a separate `<script>` block above GTM:

```javascript
// BEFORE the GTM container snippet
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

// Set denied defaults for all users (EEA-specific region targeting below)
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'wait_for_update': 500  // ms to wait for CMP to load
});
```

### Region-Specific Defaults (EEA only, allow elsewhere)

```javascript
gtag('consent', 'default', {
  'ad_storage': 'granted',
  'analytics_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted'
});

// Override for EEA
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'region': ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
             'HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL',
             'PT','RO','SK','SI','ES','SE','GB']
});
```

### Update (After User Grants Consent)

Call this after your CMP captures user consent:

```javascript
// User accepted all
gtag('consent', 'update', {
  'ad_storage': 'granted',
  'analytics_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted'
});

// User accepted analytics only (rejected ads)
gtag('consent', 'update', {
  'ad_storage': 'denied',
  'analytics_storage': 'granted',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied'
});
```

### Consent Types

| Signal | What It Controls |
|--------|-----------------|
| `ad_storage` | Advertising cookies and storage (Google Ads, Floodlight) |
| `analytics_storage` | Analytics cookies (GA4 measurement) |
| `ad_user_data` | Sending user data to Google for advertising purposes |
| `ad_personalization` | Personalized advertising, remarketing, similar audiences |
| `functionality_storage` | Cookies for site functionality (non-advertising) |
| `security_storage` | Security-related cookies |
| `personalization_storage` | Personalization cookies (non-advertising) |

### Per-Tag Consent in GTM

Each tag has a **"Consent Settings"** panel (Advanced Settings > Consent Settings). Options:

- **No additional consent required** — fires regardless of consent state
- **Require additional consent** — add specific consent types that must be `granted`

GA4 and Google Ads tags automatically respect `ad_storage` and `analytics_storage` without per-tag settings. Custom HTML tags require explicit consent gating.

### Behavioral Modeling

When consent is denied, Google uses **behavioral modeling** to fill gaps — estimating conversions and user behavior from consented users with similar patterns. This preserves ~80% of signal loss from non-consented users.

---

## Debug

### GTM Preview Mode

1. GTM UI > Preview button → opens Tag Assistant
2. Enter your site URL
3. Each interaction shows which tags fired, which triggered, which blocked
4. Green = fired, Red = did not fire, Yellow = blocked by consent

### GTM/GA4 Console Debug

```javascript
// Check current dataLayer state
console.log(window.dataLayer);

// Check if specific event was pushed
window.dataLayer.filter(d => d.event === 'form_submission');

// Listen for new pushes (dev only)
var _push = window.dataLayer.push.bind(window.dataLayer);
window.dataLayer.push = function(obj) {
  console.log('dataLayer.push:', obj);
  return _push(obj);
};
```

### GA4 DebugView

1. Enable: Chrome extension "Google Analytics Debugger" or add `?gtm_debug=1` to URL
2. GA4 Admin > DebugView shows real-time event stream
3. Verify event names, parameters, and user properties

### Tag Assistant

- Chrome extension for real-time tag validation
- Shows all GTM and Google tag activity on the page
- Flags consent mode issues and misconfigured tags

---

## Tag Manager API v2

For programmatic container management — CI/CD deployments, bulk tag creation, workspace automation.

### Authentication

Service account with **Tag Manager** access. Scope: `https://www.googleapis.com/auth/tagmanager.edit.containers`

```javascript
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers']
});

const tagmanager = google.tagmanager({ version: 'v2', auth });
```

### Common Operations

```javascript
// List workspaces
const res = await tagmanager.accounts.containers.workspaces.list({
  parent: 'accounts/ACCOUNT_ID/containers/CONTAINER_ID'
});

// Create a tag
await tagmanager.accounts.containers.workspaces.tags.create({
  parent: 'accounts/ACCOUNT_ID/containers/CONTAINER_ID/workspaces/WORKSPACE_ID',
  requestBody: {
    name: 'GA4 - Page View',
    type: 'googtag',
    parameter: [
      { type: 'template', key: 'tagId', value: 'G-XXXXXXXXXX' }
    ],
    firingTriggerId: ['TRIGGER_ID']
  }
});

// Publish a container version
await tagmanager.accounts.containers.versions.publish({
  path: 'accounts/ACCOUNT_ID/containers/CONTAINER_ID/versions/VERSION_ID'
});
```

See `reference.md` for complete endpoint reference, resource schemas, and additional examples.

---

## Cross-References

| Skill | Relationship |
|-------|-------------|
| `ga4-api` | GA4 Event tags are the most common GTM use case — GTM fires them |
| `server-side-tracking` | GTM (web + sGTM) is the delivery mechanism for the unified tracking pipeline |
| `microsoft-clarity` | Deploy Clarity via GTM Custom HTML or built-in template |
| `tracking-foundation` | GTM is Phase 2 — installed after foundation audit, before tag deployment |
