# Google Tag Manager -- Comprehensive Developer Reference

> Last updated: February 2026. Covers GTM web containers, server-side tagging (sGTM), Consent Mode v2, and Tag Manager API v2.

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication](#2-authentication)
3. [Tag Manager API v2 Endpoints](#3-tag-manager-api-v2-endpoints)
4. [Data Layer Event Schema](#4-data-layer-event-schema)
5. [Consent Mode v2 Implementation](#5-consent-mode-v2-implementation)
6. [Tag Configuration Templates](#6-tag-configuration-templates)
7. [Trigger Configuration Patterns](#7-trigger-configuration-patterns)
8. [Variable Configuration Patterns](#8-variable-configuration-patterns)
9. [Server-Side Tagging (sGTM) Client API](#9-server-side-tagging-sgtm-client-api)
10. [Container Snippet Reference](#10-container-snippet-reference)
11. [Recent Changes (2025-2026)](#11-recent-changes-2025-2026)

---

## 1. API Overview

| Component | Base URL | OAuth Scope |
|-----------|----------|-------------|
| **Tag Manager API v2** | `https://tagmanager.googleapis.com/tagmanager/v2` | `tagmanager.edit.containers` |
| **Read-only access** | Same | `tagmanager.readonly` |
| **Delete containers** | Same | `tagmanager.delete.containers` |
| **Manage accounts** | Same | `tagmanager.manage.accounts` |
| **Manage users** | Same | `tagmanager.manage.users` |

### OAuth Scopes Reference

| Scope | Access |
|-------|--------|
| `https://www.googleapis.com/auth/tagmanager.readonly` | Read-only access to all resources |
| `https://www.googleapis.com/auth/tagmanager.edit.containers` | Edit container configurations |
| `https://www.googleapis.com/auth/tagmanager.delete.containers` | Delete containers |
| `https://www.googleapis.com/auth/tagmanager.edit.containerversions` | Edit container versions |
| `https://www.googleapis.com/auth/tagmanager.publish` | Publish container versions |
| `https://www.googleapis.com/auth/tagmanager.manage.accounts` | Manage account access |
| `https://www.googleapis.com/auth/tagmanager.manage.users` | Manage user permissions |

### Resource Hierarchy

```
Account
  └── Container (GTM-XXXXXXXX)
        ├── Workspace (concurrent editing)
        │     ├── Tags
        │     ├── Triggers
        │     ├── Variables
        │     ├── Built-in Variables
        │     ├── Folders
        │     ├── Clients (sGTM only)
        │     ├── Transformations
        │     └── Google Tag Config
        ├── Versions (published snapshots)
        ├── Environments (dev/staging/prod)
        └── Destinations (sGTM only)
```

---

## 2. Authentication

### Service Account (Recommended)

```javascript
const { google } = require('googleapis');

// Option 1: Environment variable
// Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.publish'
  ]
});

const tagmanager = google.tagmanager({ version: 'v2', auth });
```

```python
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.publish'
]

credentials = service_account.Credentials.from_service_account_file(
    '/path/to/service-account.json',
    scopes=SCOPES
)

service = build('tagmanager', 'v2', credentials=credentials)
```

### Required IAM Permissions in GTM

Service account email must be added to the GTM Account with at least **Editor** role:
GTM UI → Admin → User Management → Add user → Set role per container

---

## 3. Tag Manager API v2 Endpoints

All paths relative to base: `https://tagmanager.googleapis.com/tagmanager/v2`

### Accounts

| Method | HTTP | Path |
|--------|------|------|
| Get account | GET | `/accounts/{accountId}` |
| List accounts | GET | `/accounts` |
| Update account | PUT | `/accounts/{accountId}` |

### Containers

| Method | HTTP | Path |
|--------|------|------|
| Create container | POST | `/accounts/{accountId}/containers` |
| Delete container | DELETE | `/accounts/{accountId}/containers/{containerId}` |
| Get container | GET | `/accounts/{accountId}/containers/{containerId}` |
| List containers | GET | `/accounts/{accountId}/containers` |
| Get snippet | GET | `/accounts/{accountId}/containers/{containerId}:snippet` |
| Lookup by tag ID | GET | `/accounts/containers:lookup?tagId=GTM-XXXXXXXX` |
| Update container | PUT | `/accounts/{accountId}/containers/{containerId}` |
| Combine containers | POST | `/accounts/{accountId}/containers/{containerId}:combine` |

### Workspaces

| Method | HTTP | Path |
|--------|------|------|
| Create workspace | POST | `/accounts/{accountId}/containers/{containerId}/workspaces` |
| Delete workspace | DELETE | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}` |
| Get workspace | GET | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}` |
| List workspaces | GET | `/accounts/{accountId}/containers/{containerId}/workspaces` |
| Get status | GET | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/status` |
| Sync workspace | POST | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:sync` |
| Quick preview | POST | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:quick_preview` |
| Create version | POST | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:create_version` |
| Resolve conflict | POST | `/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:resolve_conflict` |

### Tags

| Method | HTTP | Path |
|--------|------|------|
| Create tag | POST | `…/workspaces/{workspaceId}/tags` |
| Delete tag | DELETE | `…/workspaces/{workspaceId}/tags/{tagId}` |
| Get tag | GET | `…/workspaces/{workspaceId}/tags/{tagId}` |
| List tags | GET | `…/workspaces/{workspaceId}/tags` |
| Update tag | PUT | `…/workspaces/{workspaceId}/tags/{tagId}` |
| Revert tag | POST | `…/workspaces/{workspaceId}/tags/{tagId}:revert` |

### Triggers

| Method | HTTP | Path |
|--------|------|------|
| Create trigger | POST | `…/workspaces/{workspaceId}/triggers` |
| Delete trigger | DELETE | `…/workspaces/{workspaceId}/triggers/{triggerId}` |
| Get trigger | GET | `…/workspaces/{workspaceId}/triggers/{triggerId}` |
| List triggers | GET | `…/workspaces/{workspaceId}/triggers` |
| Update trigger | PUT | `…/workspaces/{workspaceId}/triggers/{triggerId}` |
| Revert trigger | POST | `…/workspaces/{workspaceId}/triggers/{triggerId}:revert` |

### Variables

| Method | HTTP | Path |
|--------|------|------|
| Create variable | POST | `…/workspaces/{workspaceId}/variables` |
| Delete variable | DELETE | `…/workspaces/{workspaceId}/variables/{variableId}` |
| Get variable | GET | `…/workspaces/{workspaceId}/variables/{variableId}` |
| List variables | GET | `…/workspaces/{workspaceId}/variables` |
| Update variable | PUT | `…/workspaces/{workspaceId}/variables/{variableId}` |
| Revert variable | POST | `…/workspaces/{workspaceId}/variables/{variableId}:revert` |

### Built-In Variables

| Method | HTTP | Path |
|--------|------|------|
| List enabled | GET | `…/workspaces/{workspaceId}/built_in_variables` |
| Enable | POST | `…/workspaces/{workspaceId}/built_in_variables?type=PAGE_URL&type=PAGE_HOSTNAME` |
| Disable | DELETE | `…/workspaces/{workspaceId}/built_in_variables?type=PAGE_URL` |
| Revert | POST | `…/workspaces/{workspaceId}/built_in_variables:revert?type=PAGE_URL` |

### Container Versions

| Method | HTTP | Path |
|--------|------|------|
| Get version | GET | `…/containers/{containerId}/versions/{versionId}` |
| Get live version | GET | `…/containers/{containerId}/versions:live` |
| List version headers | GET | `…/containers/{containerId}/version_headers` |
| Publish version | POST | `…/containers/{containerId}/versions/{versionId}:publish` |
| Set latest | POST | `…/containers/{containerId}/versions/{versionId}:set_latest` |
| Update version | PUT | `…/containers/{containerId}/versions/{versionId}` |
| Delete version | DELETE | `…/containers/{containerId}/versions/{versionId}` |
| Undelete version | POST | `…/containers/{containerId}/versions/{versionId}:undelete` |

### Folders

| Method | HTTP | Path |
|--------|------|------|
| Create folder | POST | `…/workspaces/{workspaceId}/folders` |
| Delete folder | DELETE | `…/workspaces/{workspaceId}/folders/{folderId}` |
| Get folder | GET | `…/workspaces/{workspaceId}/folders/{folderId}` |
| List folders | GET | `…/workspaces/{workspaceId}/folders` |
| List folder entities | POST | `…/workspaces/{workspaceId}/folders/{folderId}:entities` |
| Move entities to folder | POST | `…/workspaces/{workspaceId}/folders/{folderId}:move_entities_to_folder` |
| Update folder | PUT | `…/workspaces/{workspaceId}/folders/{folderId}` |

### Environments

| Method | HTTP | Path |
|--------|------|------|
| Create environment | POST | `…/containers/{containerId}/environments` |
| Delete environment | DELETE | `…/containers/{containerId}/environments/{environmentId}` |
| Get environment | GET | `…/containers/{containerId}/environments/{environmentId}` |
| List environments | GET | `…/containers/{containerId}/environments` |
| Update environment | PUT | `…/containers/{containerId}/environments/{environmentId}` |
| Re-authorize | POST | `…/containers/{containerId}/environments/{environmentId}:reauthorize` |

### API Examples (Node.js)

```javascript
const { google } = require('googleapis');

async function getTagManagerClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers']
  });
  return google.tagmanager({ version: 'v2', auth });
}

// List all containers for an account
async function listContainers(accountId) {
  const gtm = await getTagManagerClient();
  const res = await gtm.accounts.containers.list({
    parent: `accounts/${accountId}`
  });
  return res.data.container || [];
}

// List workspaces
async function listWorkspaces(accountId, containerId) {
  const gtm = await getTagManagerClient();
  const res = await gtm.accounts.containers.workspaces.list({
    parent: `accounts/${accountId}/containers/${containerId}`
  });
  return res.data.workspace || [];
}

// Create a GA4 event tag
async function createGA4EventTag(accountId, containerId, workspaceId, {
  name, measurementId, eventName, parameters = []
}) {
  const gtm = await getTagManagerClient();
  const res = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name,
      type: 'gaawe', // GA4 Event tag type
      parameter: [
        { type: 'template', key: 'measurementId', value: measurementId },
        { type: 'template', key: 'eventName', value: eventName },
        ...parameters
      ]
    }
  });
  return res.data;
}

// Create a custom event trigger
async function createCustomEventTrigger(accountId, containerId, workspaceId, eventName) {
  const gtm = await getTagManagerClient();
  const res = await gtm.accounts.containers.workspaces.triggers.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: `CE - ${eventName}`,
      type: 'customEvent',
      customEventFilter: [{
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{_event}}' },
          { type: 'template', key: 'arg1', value: eventName }
        ]
      }]
    }
  });
  return res.data;
}

// Publish container version
async function publishVersion(accountId, containerId, versionId) {
  const gtm = await getTagManagerClient();
  const res = await gtm.accounts.containers.versions.publish({
    path: `accounts/${accountId}/containers/${containerId}/versions/${versionId}`
  });
  return res.data;
}

// Create workspace and publish in one flow
async function deployChanges(accountId, containerId, workspaceName) {
  const gtm = await getTagManagerClient();

  // Create version from workspace
  const workspaces = await listWorkspaces(accountId, containerId);
  const workspace = workspaces.find(w => w.name.endsWith(workspaceName));

  const versionRes = await gtm.accounts.containers.workspaces.create_version({
    path: workspace.path,
    requestBody: {
      name: `Deploy - ${new Date().toISOString()}`,
      notes: 'Automated deployment'
    }
  });

  // Publish the version
  await publishVersion(accountId, containerId, versionRes.data.containerVersion.containerVersionId);
  return versionRes.data;
}
```

---

## 4. Data Layer Event Schema

### Standard Event Schema

Every `dataLayer.push()` with an `event` key triggers GTM's custom event listener.

```javascript
// Minimal event
dataLayer.push({
  event: 'event_name'             // string, required for trigger matching
});

// Full event with variables
dataLayer.push({
  event: 'event_name',            // triggers tag firing
  eventCategory: 'category',      // custom variable (legacy UA pattern, still useful)
  eventLabel: 'label',
  someVariable: 'value',          // any arbitrary data
  nestedData: {                   // nested objects accessible via dot notation
    key: 'value'
  }
});
```

### Service Business Event Schemas

```javascript
// Form submission (contact, quote, appointment request)
dataLayer.push({
  event: 'form_submission',
  formId: 'contact-form-hero',
  formName: 'Contact Form',
  serviceType: 'hvac-repair',
  zipCode: '90210',
  leadSource: 'organic-search'
});

// Phone click
dataLayer.push({
  event: 'phone_click',
  phoneNumber: '+15551234567',
  clickLocation: 'header',         // header, footer, cta-section
  pageType: 'service-page'
});

// CTA click
dataLayer.push({
  event: 'cta_click',
  ctaText: 'Get Free Estimate',
  ctaLocation: 'hero-section',
  destinationUrl: '/contact'
});

// Appointment booked (confirmation page)
dataLayer.push({
  event: 'appointment_booked',
  serviceType: 'ac-installation',
  appointmentDate: '2026-03-15',
  appointmentTime: 'morning',
  estimatedValue: 3500,
  currency: 'USD',
  transactionId: 'APT-20260315-001'
});

// Chat initiated
dataLayer.push({
  event: 'chat_start',
  chatTool: 'tidio',
  pageLocation: window.location.pathname
});

// Scroll depth (fired by GTM scroll trigger)
dataLayer.push({
  event: 'scroll_depth',
  scrollDepth: 50,                 // 25, 50, 75, 90
  pagePath: '/services/hvac-repair'
});
```

### Ecommerce Event Schemas (GA4)

```javascript
// view_item_list (category/search results page)
dataLayer.push({
  event: 'view_item_list',
  ecommerce: {
    item_list_id: 'hvac_services',
    item_list_name: 'HVAC Services',
    items: [{
      item_id: 'SKU-HVAC-001',
      item_name: 'AC Tune-Up',
      item_category: 'maintenance',
      price: 89.00,
      index: 0
    }, {
      item_id: 'SKU-HVAC-002',
      item_name: 'Furnace Repair',
      item_category: 'repair',
      price: 149.00,
      index: 1
    }]
  }
});

// view_item (service detail page)
dataLayer.push({
  event: 'view_item',
  ecommerce: {
    currency: 'USD',
    value: 149.00,
    items: [{
      item_id: 'SKU-HVAC-002',
      item_name: 'Furnace Repair',
      item_category: 'repair',
      item_variant: 'residential',
      price: 149.00,
      quantity: 1
    }]
  }
});

// add_to_cart (add service to booking cart)
dataLayer.push({
  event: 'add_to_cart',
  ecommerce: {
    currency: 'USD',
    value: 149.00,
    items: [{
      item_id: 'SKU-HVAC-002',
      item_name: 'Furnace Repair',
      item_category: 'repair',
      price: 149.00,
      quantity: 1
    }]
  }
});

// begin_checkout (checkout/booking page)
dataLayer.push({
  event: 'begin_checkout',
  ecommerce: {
    currency: 'USD',
    value: 149.00,
    coupon: 'WINTER10',
    items: [{ item_id: 'SKU-HVAC-002', item_name: 'Furnace Repair', price: 149.00, quantity: 1 }]
  }
});

// purchase (confirmation page — most important)
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T-20260101-001',    // unique, deduplication key
    value: 149.00,
    tax: 12.33,
    shipping: 0,
    currency: 'USD',
    coupon: 'WINTER10',
    items: [{
      item_id: 'SKU-HVAC-002',
      item_name: 'Furnace Repair',
      item_category: 'repair',
      item_variant: 'residential',
      price: 149.00,
      quantity: 1
    }]
  }
});
```

**Critical:** Always clear the previous ecommerce object before pushing a new one to prevent data bleeding:

```javascript
dataLayer.push({ ecommerce: null });  // Clear previous ecommerce
dataLayer.push({
  event: 'view_item',
  ecommerce: { ... }
});
```

---

## 5. Consent Mode v2 Implementation

### Full Implementation Pattern

```html
<!-- Step 1: Initialize dataLayer BEFORE GTM -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
</script>

<!-- Step 2: Set default consent (BEFORE GTM snippet) -->
<script>
  // Global default: granted
  gtag('consent', 'default', {
    'ad_storage': 'granted',
    'analytics_storage': 'granted',
    'ad_user_data': 'granted',
    'ad_personalization': 'granted'
  });

  // EEA/UK override: denied until consent given
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'wait_for_update': 500,
    'region': [
      'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
      'DE','GR','HU','IS','IE','IT','LV','LI','LT','LU',
      'MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','GB'
    ]
  });
</script>

<!-- Step 3: GTM container snippet -->
<!-- Google Tag Manager -->
<script>/* GTM snippet here */</script>
<!-- End Google Tag Manager -->

<!-- Step 4: Update consent after CMP loads (in your CMP callback) -->
<script>
  // Called by your CMP when user makes a choice
  function onConsentUpdated(consentChoices) {
    gtag('consent', 'update', {
      'ad_storage': consentChoices.advertising ? 'granted' : 'denied',
      'analytics_storage': consentChoices.analytics ? 'granted' : 'denied',
      'ad_user_data': consentChoices.advertising ? 'granted' : 'denied',
      'ad_personalization': consentChoices.personalization ? 'granted' : 'denied'
    });
  }
</script>
```

### Consent State Values

| Value | Meaning |
|-------|---------|
| `'granted'` | User has consented |
| `'denied'` | User has declined OR no choice yet |

### Advanced: URL Passthrough and Data Redaction

```javascript
// Preserve ad click data without cookies when ad_storage=denied
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'url_passthrough': true     // passes gclid/gbraid/wbraid in URL
});

// Strip all ad identifiers from requests when denied
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ads_data_redaction': true  // removes click IDs and ad cookies from requests
});
```

### GTM Consent Initialization Tag

In GTM: create a **Consent Initialization trigger** tag:
- Trigger: **Consent Initialization - All Pages** (fires before all other tags)
- Tag type: Custom HTML
- Content: the default consent code above

This ensures consent defaults fire in the correct order even if your CMP is loaded via GTM.

### Checking Consent State in Custom Tags

```javascript
// Read current consent state (available in GTM Custom JavaScript Variables)
function() {
  return window.google_tag_data && window.google_tag_data.ics
    ? window.google_tag_data.ics.entries
    : null;
}
```

---

## 6. Tag Configuration Templates

### Google Tag (replaces GA4 Configuration Tag)

```json
{
  "name": "Google Tag - G-XXXXXXXXXX",
  "type": "googtag",
  "parameter": [
    { "type": "template", "key": "tagId", "value": "G-XXXXXXXXXX" },
    { "type": "boolean", "key": "sendPageView", "value": "false" }
  ],
  "firingTriggerId": ["INITIALIZATION_TRIGGER_ID"],
  "consentSettings": {
    "consentStatus": "notSet"
  }
}
```

### GA4 Event Tag

```json
{
  "name": "GA4 - form_submission",
  "type": "gaawe",
  "parameter": [
    { "type": "template", "key": "measurementId", "value": "G-XXXXXXXXXX" },
    { "type": "template", "key": "eventName", "value": "form_submission" },
    {
      "type": "list",
      "key": "eventParameters",
      "list": [
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "name", "value": "form_id" },
            { "type": "template", "key": "value", "value": "{{DL - formId}}" }
          ]
        },
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "name", "value": "service_type" },
            { "type": "template", "key": "value", "value": "{{DL - serviceType}}" }
          ]
        }
      ]
    }
  ]
}
```

### Meta Pixel Base + Event Tags

```json
{
  "name": "Meta Pixel - Base",
  "type": "html",
  "parameter": [
    {
      "type": "template",
      "key": "html",
      "value": "<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;\nn.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,\ndocument,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '{{Constant - Meta Pixel ID}}');\nfbq('track', 'PageView');\n</script>"
    },
    { "type": "boolean", "key": "supportDocumentWrite", "value": "false" }
  ]
}
```

```javascript
// Meta Lead event tag (Custom HTML)
fbq('track', 'Lead', {
  content_name: {{DL - formName}},
  content_category: {{DL - serviceType}},
  value: {{DL - leadValue}} || 0,
  currency: 'USD'
});

// Meta Purchase event tag (Custom HTML)
fbq('track', 'Purchase', {
  value: {{DL - ecommerce.value}},
  currency: 'USD',
  content_ids: [{{DL - ecommerce.items.0.item_id}}],
  content_type: 'product'
});
```

### Pinterest Tag

```javascript
// Base tag (All Pages)
!function(e){if(!window.pintrk){window.pintrk=function(){
  window.pintrk.queue.push(Array.prototype.slice.call(arguments))};
  var n=window.pintrk;n.queue=[];n.version="3.0";
  var t=document.createElement("script");t.async=!0;
  t.src=e;var r=document.getElementsByTagName("script")[0];
  r.parentNode.insertBefore(t,r)
}}("https://s.pinimg.com/ct/core.js");

pintrk('load', '{{Constant - Pinterest Tag ID}}', {
  em: {{DL - hashedEmail}} || ''
});
pintrk('page');

// Lead event tag
pintrk('track', 'lead', {
  lead_type: {{DL - formName}},
  value: {{DL - leadValue}} || 0,
  currency: 'USD'
});

// Checkout event tag
pintrk('track', 'checkout', {
  value: {{DL - ecommerce.value}},
  order_quantity: 1,
  currency: 'USD',
  order_id: {{DL - ecommerce.transaction_id}},
  line_items: [{
    product_id: {{DL - ecommerce.items.0.item_id}},
    product_name: {{DL - ecommerce.items.0.item_name}},
    product_price: {{DL - ecommerce.value}}
  }]
});
```

### Microsoft Clarity Tag

```json
{
  "name": "Microsoft Clarity",
  "type": "html",
  "parameter": [
    {
      "type": "template",
      "key": "html",
      "value": "<script type=\"text/javascript\">\n(function(c,l,a,r,i,t,y){\nc[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};\nt=l.createElement(r);t.async=1;t.src=\"https://www.clarity.ms/tag/\"+i;\ny=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);\n})(window, document, \"clarity\", \"script\", \"{{Constant - Clarity Project ID}}\");\n</script>"
    }
  ],
  "firingTriggerId": ["ALL_PAGES_TRIGGER_ID"]
}
```

---

## 7. Trigger Configuration Patterns

### All Pages (Page View)

```json
{
  "name": "All Pages",
  "type": "pageview"
}
```

### Initialization - All Pages

```json
{
  "name": "Initialization - All Pages",
  "type": "consentInit"
}
```

Use for: consent defaults, Google Tag configuration. Fires before all other tags.

### Custom Event Trigger

```json
{
  "name": "CE - form_submission",
  "type": "customEvent",
  "customEventFilter": [{
    "type": "equals",
    "parameter": [
      { "type": "template", "key": "arg0", "value": "{{_event}}" },
      { "type": "template", "key": "arg1", "value": "form_submission" }
    ]
  }]
}
```

### Click - Phone Number

```json
{
  "name": "Click - Phone Number",
  "type": "linkClick",
  "filter": [{
    "type": "contains",
    "parameter": [
      { "type": "template", "key": "arg0", "value": "{{Click URL}}" },
      { "type": "template", "key": "arg1", "value": "tel:" }
    ]
  }],
  "waitForTags": true,
  "checkValidation": false
}
```

### Form Submission (GTM Native)

```json
{
  "name": "Form Submit - Contact",
  "type": "formSubmission",
  "filter": [{
    "type": "contains",
    "parameter": [
      { "type": "template", "key": "arg0", "value": "{{Form ID}}" },
      { "type": "template", "key": "arg1", "value": "contact-form" }
    ]
  }],
  "waitForTags": true,
  "checkValidation": true
}
```

### Scroll Depth

```json
{
  "name": "Scroll - 50%",
  "type": "scrollDepth",
  "verticalThresholdUnits": "PERCENT",
  "verticalThresholds": "50",
  "horizontalThresholdsEnabled": false,
  "visibilitySelector": "body",
  "onScreenRatio": "0.5",
  "filter": [{
    "type": "equals",
    "parameter": [
      { "type": "template", "key": "arg0", "value": "{{Page Path}}" },
      { "type": "template", "key": "arg1", "value": "/" }
    ]
  }]
}
```

### Element Visibility (Content Section)

```json
{
  "name": "Visible - Testimonials Section",
  "type": "elementVisibility",
  "visibilitySelector": "#testimonials",
  "onScreenRatio": "0.5",
  "continuousTimeMinMilliseconds": "1000",
  "visibilityFrequency": "once_per_page"
}
```

### History Change (SPA Page Views)

```json
{
  "name": "History Change - Virtual Page View",
  "type": "historyChange"
}
```

### YouTube Video

```json
{
  "name": "YouTube - Video Start",
  "type": "youTubeVideo",
  "videoStatusesEnabled": true,
  "videoStartEnabled": true,
  "videoCompleteEnabled": true,
  "videoProgressEnabled": true,
  "videoProgressThresholds": "25,50,75",
  "onScreenRequired": false
}
```

---

## 8. Variable Configuration Patterns

### Data Layer Variables

```json
{
  "name": "DL - formId",
  "type": "v",
  "parameter": [
    { "type": "integer", "key": "dataLayerVersion", "value": "2" },
    { "type": "boolean", "key": "setDefaultValue", "value": "false" },
    { "type": "template", "key": "name", "value": "formId" }
  ]
}
```

Nested object access:

```json
{
  "name": "DL - ecommerce.value",
  "type": "v",
  "parameter": [
    { "type": "integer", "key": "dataLayerVersion", "value": "2" },
    { "type": "template", "key": "name", "value": "ecommerce.value" }
  ]
}
```

### URL Variables

```json
{
  "name": "Page Path",
  "type": "u",
  "parameter": [
    { "type": "template", "key": "component", "value": "PATH" }
  ]
}
```

URL components: `PROTOCOL`, `HOST`, `PORT`, `PATH`, `QUERY`, `FRAGMENT`, `URL`

For query parameters:

```json
{
  "name": "URL - utm_source",
  "type": "u",
  "parameter": [
    { "type": "template", "key": "component", "value": "QUERY" },
    { "type": "template", "key": "queryKey", "value": "utm_source" }
  ]
}
```

### Constant Variable (Pixel IDs, Keys)

```json
{
  "name": "Constant - Meta Pixel ID",
  "type": "c",
  "parameter": [
    { "type": "template", "key": "value", "value": "1234567890123456" }
  ]
}
```

### Custom JavaScript Variable

```json
{
  "name": "CJS - Page Type",
  "type": "jsm",
  "parameter": [
    {
      "type": "template",
      "key": "javascript",
      "value": "function() {\n  var path = window.location.pathname;\n  if (path === '/') return 'home';\n  if (path.indexOf('/services/') !== -1) return 'service';\n  if (path.indexOf('/contact') !== -1) return 'contact';\n  if (path.indexOf('/blog/') !== -1) return 'blog';\n  return 'other';\n}"
    }
  ]
}
```

### Lookup Table

```json
{
  "name": "LT - Page Category",
  "type": "smm",
  "parameter": [
    { "type": "template", "key": "input", "value": "{{Page Path}}" },
    {
      "type": "list",
      "key": "map",
      "list": [
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "key", "value": "/" },
            { "type": "template", "key": "value", "value": "home" }
          ]
        },
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "key", "value": "/contact" },
            { "type": "template", "key": "value", "value": "contact" }
          ]
        }
      ]
    },
    { "type": "boolean", "key": "setDefaultValue", "value": "true" },
    { "type": "template", "key": "defaultValue", "value": "other" }
  ]
}
```

### RegEx Table

```json
{
  "name": "RT - Service Category",
  "type": "remm",
  "parameter": [
    { "type": "template", "key": "input", "value": "{{Page Path}}" },
    {
      "type": "list",
      "key": "map",
      "list": [
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "key", "value": "^/services/hvac.*" },
            { "type": "template", "key": "value", "value": "hvac" }
          ]
        },
        {
          "type": "map",
          "map": [
            { "type": "template", "key": "key", "value": "^/services/plumbing.*" },
            { "type": "template", "key": "value", "value": "plumbing" }
          ]
        }
      ]
    },
    { "type": "boolean", "key": "setDefaultValue", "value": "true" },
    { "type": "template", "key": "defaultValue", "value": "other" }
  ]
}
```

### First-Party Cookie

```json
{
  "name": "Cookie - _ga",
  "type": "k",
  "parameter": [
    { "type": "template", "key": "name", "value": "_ga" },
    { "type": "boolean", "key": "decodeCookie", "value": "false" }
  ]
}
```

### Auto-Event Variables (Click/Form tracking)

Built-in variables to enable in GTM Settings:

| Variable | Type | Value |
|----------|------|-------|
| Click Element | `aev` | The clicked DOM element |
| Click Classes | `aev` | `{{Click Element}}.className` |
| Click ID | `aev` | `{{Click Element}}.id` |
| Click Target | `aev` | `{{Click Element}}.target` |
| Click URL | `aev` | `{{Click Element}}.href` |
| Click Text | `aev` | `{{Click Element}}.innerText` |
| Form Element | `aev` | The form DOM element |
| Form Classes | `aev` | Form class attribute |
| Form ID | `aev` | Form ID attribute |
| Form Target | `aev` | Form target attribute |
| Form URL | `aev` | Form action URL |
| Form Text | `aev` | Text content within form |

---

## 9. Server-Side Tagging (sGTM) Client API

### sGTM Architecture

```
Web Browser
  │
  │  GA4 hit (modified transport URL)
  │  POST https://metrics.yourdomain.com/g/collect
  ▼
sGTM Container (Cloud Run / GCP)
  │
  ├─ GA4 Client          → parses GA4 protocol
  ├─ Universal Analytics  → parses UA protocol (legacy)
  └─ Custom Client        → parses any incoming request
       │
       ├─ GA4 Server Tag   → https://www.google-analytics.com
       ├─ Meta CAPI Tag    → https://graph.facebook.com
       ├─ Pinterest CAPI   → https://api.pinterest.com
       └─ Custom Tag       → any endpoint
```

### sGTM Client Configuration

Point GA4 web tag at sGTM by setting the server container URL in the GA4 config tag:
- GTM Web Container → Google Tag → Configuration Settings
- Field: `server_container_url` → `https://metrics.yourdomain.com`

Or in the GA4 Configuration Tag:
- Fields to Set: `transport_url` → `https://metrics.yourdomain.com`

### sGTM Client API (Custom Clients)

Custom sGTM clients use the `runContainer` API to process requests:

```javascript
// sGTM Custom Client template
const claimRequest = require('claimRequest');
const runContainer = require('runContainer');
const returnResponse = require('returnResponse');
const getRequestPath = require('getRequestPath');
const getRequestBody = require('getRequestBody');
const parseUrl = require('parseUrl');

const requestPath = getRequestPath();

// Only handle requests to /my-custom-endpoint
if (requestPath !== '/my-custom-endpoint') return;

claimRequest();

const body = JSON.parse(getRequestBody());

// Transform incoming data into event data
const eventData = {
  event_name: body.eventName,
  client_id: body.clientId,
  page_location: body.pageUrl,
  // ... map fields
};

runContainer(eventData, () => returnResponse());
```

### sGTM Event Data Object

sGTM passes a standardized event data object between clients and tags:

| Field | Type | Description |
|-------|------|-------------|
| `event_name` | string | GA4 event name |
| `client_id` | string | GA4 client ID |
| `user_id` | string | User ID (if set) |
| `page_location` | string | Full page URL |
| `page_title` | string | Page title |
| `ip_override` | string | Client IP (for geo) |
| `user_agent` | string | Client user agent |
| `x-ga-gcd` | string | Consent signal string |
| `x-ga-gcs` | string | Consent signal |

### Consent Mode in sGTM

Consent signals are forwarded from the web container to sGTM via the hit payload. sGTM tags can read and enforce them:

```javascript
// In sGTM Custom Tag template
const getAllEventData = require('getAllEventData');
const eventData = getAllEventData();

const consentString = eventData['x-ga-gcd'];
// Format: "11p1p1p1p0" — each digit represents a consent type
// Position 0: ad_storage, Position 1: analytics_storage, etc.

// More explicit consent check via gcs field
const gcs = eventData['x-ga-gcs'];
// G1xx = ad_storage denied, G10x = analytics_storage denied
```

---

## 10. Container Snippet Reference

### Web Container (Production)

```html
<!-- Place immediately after opening <head> -->
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Place immediately after opening <body> -->
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

### Non-Production Environment Snippet

```html
<!-- Dev/Staging — uses environment auth token -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl+'&gtm_auth=AUTH_TOKEN&gtm_preview=env-2&gtm_cookies_win=x';
f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXXX');</script>
```

Get environment tokens from: GTM Admin → Environments → (environment name) → Get Snippet

### Custom dataLayer Name

If `dataLayer` conflicts with existing code, rename it:

```html
<script>
  window.myDataLayer = window.myDataLayer || [];
</script>
<script>
  // In GTM snippet: replace 'dataLayer' with 'myDataLayer' in the l parameter
  // The snippet becomes: ...,'myDataLayer','GTM-XXXXXXXX'...
</script>
```

### Full Page Template (Service Business)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <!-- 1. Initialize dataLayer -->
  <script>window.dataLayer = window.dataLayer || [];</script>

  <!-- 2. Consent Mode defaults (before GTM) -->
  <script>
    function gtag() { dataLayer.push(arguments); }
    gtag('consent', 'default', {
      'ad_storage': 'granted',
      'analytics_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted'
    });
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'wait_for_update': 500,
      'region': ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
                 'DE','GR','HU','IS','IE','IT','LV','LI','LT','LU',
                 'MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','GB']
    });
  </script>

  <!-- 3. GTM container snippet -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXXX');</script>

</head>
<body>

  <!-- 4. GTM noscript (immediately after <body>) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXXX"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <!-- page content -->

</body>
</html>
```

---

## 11. Recent Changes (2025-2026)

### April 2025: Auto-Loading Google Tag

- GTM containers with Google Ads/Floodlight tags now automatically inject a Google Tag before those events fire
- GA4 is **not** affected
- Enhanced Conversions and User-Provided Data apply automatically via the auto-loaded tag
- **Action required:** Add Google Tags manually in GTM with Initialization trigger to preview/control behavior

### 2025: Consent Mode v2 Enforcement

- Required for EEA/UK since March 2024 — enforcement continues into 2025
- Without implementation: Google Ads and GA4 data from non-consenting EEA users is not captured and cannot be modeled
- Behavioral modeling compensates for ~80% of signal loss when Consent Mode is implemented correctly

### 2025: sGTM Same-Origin Deployment

- New option to deploy sGTM on the same origin as your website (not just a subdomain)
- Improves first-party cookie treatment further
- Requires manual server configuration — not available via automatic GCP provisioning

### Environment Variables for GTM Integration

```bash
# In your app's .env
GTM_CONTAINER_ID=GTM-XXXXXXXX
GTM_SERVER_URL=https://metrics.yourdomain.com  # sGTM custom domain
META_PIXEL_ID=1234567890
PINTEREST_TAG_ID=1234567890
CLARITY_PROJECT_ID=xxxxxxxxxx
```

---

## Sources

- [Google Tag Manager API v2 Overview](https://developers.google.com/tag-platform/tag-manager/api/v2)
- [Tag Manager API REST Reference](https://developers.google.com/tag-platform/tag-manager/api/reference/rest)
- [GTM Developer's Guide](https://developers.google.com/tag-platform/tag-manager/api/v2/devguide)
- [The Data Layer](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [Set up Consent Mode on Websites](https://developers.google.com/tag-platform/security/guides/consent)
- [Server-Side Tagging Overview](https://developers.google.com/tag-platform/tag-manager/server-side/overview)
- [sGTM Introduction](https://developers.google.com/tag-platform/tag-manager/server-side/intro)
- [Consent Mode with Server-Side GTM](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode)
- [EEA Consent Mode Update (March 2024)](https://support.google.com/tagmanager/answer/13695607)
- [GTM April 2025 Auto-Loading Update](https://support.google.com/tagmanager/thread/330117115)
- [GA4 Ecommerce Tracking via GTM](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtm)
