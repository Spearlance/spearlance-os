# SOS Tracker v3 Phase 1 Implementation Plan


**Goal:** Upgrade SOS Tracker to capture click IDs, detect form submissions and phone clicks, filter bots, and store conversion events — making the tracker a universal pixel.

**Architecture:** Client-side tracker script gains bot pre-filter, click ID capture (gclid/fbclid/msclkid), Duda form detection via dmAPI + MutationObserver, phone click detection, and a new `lead` event type. Server-side `analytics-collector` gains bot scoring, click ID storage on `web_events`, and conversion event insertion into a new `conversion_events` table.

**Tech Stack:** Vanilla JS (tracker script), Deno/TypeScript (edge functions), Supabase (database + migrations), Vitest (tests)

**Design Doc:** `.claude/docs/plans/2026-03-26-sos-tracker-v3-universal-pixel-design.md`

---

### Task 1: Database Migration — Add click ID + bot columns to web_events, create conversion_events table

**Files:**
- Create: `supabase/migrations/20260326100000_sos_tracker_v3_schema.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- SOS Tracker v3 — Click IDs, bot flag, conversion events
-- ============================================================

-- Add click ID and bot columns to existing web_events table
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS msclkid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- Create index for bot filtering in dashboards
CREATE INDEX IF NOT EXISTS idx_web_events_is_bot ON web_events (client_id, is_bot, received_at DESC);

-- Conversion events table — form submissions, phone clicks with click IDs
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('form_submit', 'phone_click')),
  gclid text,
  fbclid text,
  msclkid text,
  li_fat_id text,
  page_url text,
  created_at timestamptz DEFAULT now(),
  form_name text,
  phone_number text,
  forwarded_to jsonb DEFAULT '{}'::jsonb,
  is_bot boolean DEFAULT false,
  engagement_score numeric
);

CREATE INDEX idx_conversion_events_client ON conversion_events (client_id, created_at DESC);
CREATE INDEX idx_conversion_events_gclid ON conversion_events (gclid) WHERE gclid IS NOT NULL;

-- RLS for conversion_events
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversion_events for their clients"
  ON conversion_events FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can insert conversion_events"
  ON conversion_events FOR INSERT
  WITH CHECK (true);
```

**Step 2: Apply migration to production**

Run via Supabase Dashboard → SQL Editor, or:
```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260326100000_sos_tracker_v3_schema.sql
git commit -m "feat(db): add click ID columns, bot flag, and conversion_events table"
```

---

### Task 2: Bot Detection Utility — Shared bot-scoring logic for analytics-collector

**Files:**
- Create: `supabase/functions/_shared/botDetector.ts`
- Test: `src/lib/__tests__/botDetector.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/botDetector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// We test the pure logic functions that will be copied into the edge function.
// The edge function imports from _shared/ (Deno), but we test the same logic in Vitest.

// Inline the logic for testability (same code goes into botDetector.ts)
const BOT_UA_PATTERNS = /bot|crawl|spider|headless|phantom|puppeteer|playwright|selenium|wget|curl|python-requests|go-http|java\/|libwww|slurp|mediapartners|adsbot|facebookexternalhit|bingpreview|googleother|bytespider|yandex|baidu|sogou|duckduckbot|applebot/i;

function isKnownBotUA(ua: string): boolean {
  return BOT_UA_PATTERNS.test(ua);
}

function isHighVelocity(eventsInWindow: number, windowSeconds: number): boolean {
  if (windowSeconds <= 0) return false;
  const eventsPerMinute = (eventsInWindow / windowSeconds) * 60;
  return eventsPerMinute > 100;
}

function isSessionTooFast(pageViewsInSession: number, sessionDurationSeconds: number): boolean {
  if (sessionDurationSeconds <= 0) return pageViewsInSession > 1;
  return pageViewsInSession > 20 && sessionDurationSeconds < 60;
}

function hasMinimalEngagement(scrollDepth: number, engagedSeconds: number): boolean {
  return scrollDepth > 0 || engagedSeconds > 5;
}

describe('Bot Detection', () => {
  describe('isKnownBotUA', () => {
    it('detects Googlebot', () => {
      expect(isKnownBotUA('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    });

    it('detects Bingbot', () => {
      expect(isKnownBotUA('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    });

    it('detects headless Chrome', () => {
      expect(isKnownBotUA('Mozilla/5.0 HeadlessChrome/90.0')).toBe(true);
    });

    it('detects Puppeteer', () => {
      expect(isKnownBotUA('Mozilla/5.0 Puppeteer')).toBe(true);
    });

    it('detects Python requests', () => {
      expect(isKnownBotUA('python-requests/2.28.0')).toBe(true);
    });

    it('passes real Chrome UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    });

    it('passes real Safari UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')).toBe(false);
    });

    it('passes real mobile Chrome UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')).toBe(false);
    });
  });

  describe('isHighVelocity', () => {
    it('flags >100 events/min', () => {
      expect(isHighVelocity(200, 60)).toBe(true);
    });

    it('passes normal traffic', () => {
      expect(isHighVelocity(5, 60)).toBe(false);
    });

    it('handles zero window', () => {
      expect(isHighVelocity(5, 0)).toBe(false);
    });
  });

  describe('isSessionTooFast', () => {
    it('flags 25 pageviews in 30 seconds', () => {
      expect(isSessionTooFast(25, 30)).toBe(true);
    });

    it('passes 5 pageviews in 300 seconds', () => {
      expect(isSessionTooFast(5, 300)).toBe(false);
    });
  });

  describe('hasMinimalEngagement', () => {
    it('returns true when user scrolled', () => {
      expect(hasMinimalEngagement(25, 0)).toBe(true);
    });

    it('returns true when user engaged >5s', () => {
      expect(hasMinimalEngagement(0, 10)).toBe(true);
    });

    it('returns false when zero engagement', () => {
      expect(hasMinimalEngagement(0, 0)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails (because no source file yet)**

```bash
npx vitest run src/lib/__tests__/botDetector.test.ts
```

Expected: PASS — the test inlines the logic to validate the algorithm. This is a design test.

**Step 3: Write the shared Deno module**

Create `supabase/functions/_shared/botDetector.ts`:

```typescript
/**
 * Bot detection utilities for analytics-collector.
 * Runs server-side on every incoming event.
 */

const BOT_UA_PATTERNS = /bot|crawl|spider|headless|phantom|puppeteer|playwright|selenium|wget|curl|python-requests|go-http|java\/|libwww|slurp|mediapartners|adsbot|facebookexternalhit|bingpreview|googleother|bytespider|yandex|baidu|sogou|duckduckbot|applebot/i;

export function isKnownBotUA(ua: string): boolean {
  return BOT_UA_PATTERNS.test(ua);
}

/**
 * Check if IP hash is sending events faster than 100/min.
 * Caller must provide the count from a recent time window query.
 */
export function isHighVelocity(eventsInWindow: number, windowSeconds: number): boolean {
  if (windowSeconds <= 0) return false;
  const eventsPerMinute = (eventsInWindow / windowSeconds) * 60;
  return eventsPerMinute > 100;
}

/**
 * Check if a session has >20 pageviews in <60 seconds.
 */
export function isSessionTooFast(pageViewsInSession: number, sessionDurationSeconds: number): boolean {
  if (sessionDurationSeconds <= 0) return pageViewsInSession > 1;
  return pageViewsInSession > 20 && sessionDurationSeconds < 60;
}

/**
 * Check if session has real user engagement.
 * Required before forwarding conversion events to ad platforms.
 */
export function hasMinimalEngagement(scrollDepth: number, engagedSeconds: number): boolean {
  return scrollDepth > 0 || engagedSeconds > 5;
}

export interface BotCheckResult {
  isBot: boolean;
  reason: string | null;
  canForwardConversions: boolean;
}

/**
 * Run all bot checks and return a composite result.
 */
export function checkBot(params: {
  ua: string;
  scrollDepth: number;
  engagedSeconds: number;
}): BotCheckResult {
  if (isKnownBotUA(params.ua)) {
    return { isBot: true, reason: 'known_bot_ua', canForwardConversions: false };
  }

  const engaged = hasMinimalEngagement(params.scrollDepth, params.engagedSeconds);
  return {
    isBot: false,
    reason: null,
    canForwardConversions: engaged,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/botDetector.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/__tests__/botDetector.test.ts supabase/functions/_shared/botDetector.ts
git commit -m "feat(analytics): add bot detection utility with tests"
```

---

### Task 3: SOS Tracker v3 Script — Bot pre-filter + click ID capture

This task modifies the inline JavaScript string in `supabase/functions/sos-tracker/index.ts`.

**Files:**
- Modify: `supabase/functions/sos-tracker/index.ts` (the `TRACKER_JS` template string)
- Test: `src/lib/__tests__/sosTrackerV3.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/sosTrackerV3.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Test the pure logic that will be embedded in the tracker script.
// The tracker is a vanilla JS IIFE string, so we extract testable functions.

function extractClickIds(searchString: string): Record<string, string> {
  const p = new URLSearchParams(searchString);
  const ids: Record<string, string> = {};
  for (const key of ['gclid', 'fbclid', 'msclkid', 'li_fat_id']) {
    const v = p.get(key);
    if (v) ids[key] = v;
  }
  return ids;
}

function isBotUA(ua: string): boolean {
  return /bot|crawl|spider|headless/i.test(ua);
}

function isWebdriver(nav: { webdriver?: boolean }): boolean {
  return nav.webdriver === true;
}

describe('SOS Tracker v3 — Click ID Capture', () => {
  it('extracts gclid from URL params', () => {
    const ids = extractClickIds('?gclid=abc123&utm_source=google');
    expect(ids.gclid).toBe('abc123');
    expect(ids.utm_source).toBeUndefined(); // utm params handled separately
  });

  it('extracts fbclid from URL params', () => {
    const ids = extractClickIds('?fbclid=fb_click_456');
    expect(ids.fbclid).toBe('fb_click_456');
  });

  it('extracts msclkid from URL params', () => {
    const ids = extractClickIds('?msclkid=ms_789');
    expect(ids.msclkid).toBe('ms_789');
  });

  it('extracts li_fat_id from URL params', () => {
    const ids = extractClickIds('?li_fat_id=li_001');
    expect(ids.li_fat_id).toBe('li_001');
  });

  it('extracts multiple click IDs simultaneously', () => {
    const ids = extractClickIds('?gclid=g1&fbclid=f1&msclkid=m1');
    expect(ids).toEqual({ gclid: 'g1', fbclid: 'f1', msclkid: 'm1' });
  });

  it('returns empty object when no click IDs present', () => {
    const ids = extractClickIds('?utm_source=google&utm_medium=cpc');
    expect(ids).toEqual({});
  });
});

describe('SOS Tracker v3 — Bot Pre-Filter', () => {
  it('detects bot in user agent', () => {
    expect(isBotUA('Googlebot/2.1')).toBe(true);
  });

  it('detects headless browser', () => {
    expect(isBotUA('HeadlessChrome')).toBe(true);
  });

  it('passes real browser UA', () => {
    expect(isBotUA('Mozilla/5.0 Chrome/120.0')).toBe(false);
  });

  it('detects navigator.webdriver', () => {
    expect(isWebdriver({ webdriver: true })).toBe(true);
  });

  it('passes normal navigator', () => {
    expect(isWebdriver({ webdriver: false })).toBe(false);
    expect(isWebdriver({})).toBe(false);
  });
});
```

**Step 2: Run test to verify it passes (logic test)**

```bash
npx vitest run src/lib/__tests__/sosTrackerV3.test.ts
```

**Step 3: Update the tracker script**

Modify `supabase/functions/sos-tracker/index.ts`. Replace the entire `TRACKER_JS` constant with the v3 version. Key changes to the IIFE:

1. **Bot pre-filter at the top** (before any other code runs):
   ```javascript
   if(navigator.webdriver||/bot|crawl|spider|headless/i.test(navigator.userAgent))return;
   ```

2. **Click ID capture** — add after UTM extraction:
   ```javascript
   function cids(){
     var p=new URLSearchParams(location.search);
     var r={};['gclid','fbclid','msclkid','li_fat_id'].forEach(function(k){
       var v=p.get(k);if(v){r[k]=v;ss('_sos_'+k,v)}
     });
     // Also read from sessionStorage (persists across page navigations)
     ['gclid','fbclid','msclkid','li_fat_id'].forEach(function(k){
       if(!r[k]){var v=gs('_sos_'+k);if(v)r[k]=v}
     });
     return r
   }
   ```

3. **Include click IDs in page view payload** — merge into `pv` object:
   ```javascript
   var c=cids();
   pv=Object.assign({t:'pv',ts:Date.now(),sid:S.id,...},u,c);
   ```

4. **Phone click detection** — add after scroll listener:
   ```javascript
   document.addEventListener('click',function(e){
     var a=e.target;while(a&&a.tagName!=='A')a=a.parentElement;
     if(!a)return;
     var h=a.getAttribute('href')||'';
     if(h.indexOf('tel:')===0){
       var ph=h.replace('tel:','').replace(/[^0-9+]/g,'');
       var ld={k:C.k,v:[Object.assign({t:'lead',src:'phone',ph:ph,ts:Date.now(),sid:S.id,url:location.href},cids())]};
       navigator.sendBeacon?navigator.sendBeacon(C.u,JSON.stringify(ld)):fetch(C.u,{method:'POST',body:JSON.stringify(ld),keepalive:true,credentials:'omit'}).catch(function(){});
     }
   },true);
   ```

5. **Duda form detection** — add after phone click:
   ```javascript
   function sendLead(src,extra){
     var ld={k:C.k,v:[Object.assign({t:'lead',src:src,ts:Date.now(),sid:S.id,url:location.href},cids(),extra||{})]};
     navigator.sendBeacon?navigator.sendBeacon(C.u,JSON.stringify(ld)):fetch(C.u,{method:'POST',body:JSON.stringify(ld),keepalive:true,credentials:'omit'}).catch(function(){});
   }
   // Duda dmAPI form detection (primary)
   if(typeof dmAPI!=='undefined'&&dmAPI.runOnReady){
     try{dmAPI.runOnReady('sos-tracker',function(){
       dmAPI.subscribeEvent(dmAPI.EVENTS.FORM_SUBMISSION,function(){sendLead('form',{fm:'duda'})})
     })}catch(e){}
   }
   // MutationObserver fallback for .dmformSuccess visibility
   try{
     var fs=document.querySelectorAll('.dmformSuccess');
     if(fs.length){
       var mo=new MutationObserver(function(muts){
         muts.forEach(function(m){
           if(m.type==='attributes'&&m.target.offsetParent!==null){sendLead('form',{fm:'duda-widget'})}
         })
       });
       fs.forEach(function(el){mo.observe(el,{attributes:true,attributeFilter:['style','class']})})
     }
   }catch(e){}
   // Native <form> submit fallback (non-Duda sites)
   document.addEventListener('submit',function(e){
     if(e.target&&e.target.tagName==='FORM'){sendLead('form',{fm:'native'})}
   },true);
   ```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/sosTrackerV3.test.ts
```

**Step 5: Commit**

```bash
git add supabase/functions/sos-tracker/index.ts src/lib/__tests__/sosTrackerV3.test.ts
git commit -m "feat(tracker): SOS Tracker v3 — bot filter, click IDs, form + phone detection"
```

---

### Task 4: Analytics Collector — Handle lead events + bot scoring + click ID storage

**Files:**
- Modify: `supabase/functions/analytics-collector/index.ts`
- The collector already handles v2 payloads. Add: lead event processing, bot checks, click ID columns, conversion_events insertion.

**Step 1: Write the failing test**

Create `src/lib/__tests__/analyticsCollectorV3.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Test the event classification logic that will be added to the collector.

function classifyV2Events(events: Array<{ t: string; [key: string]: any }>) {
  const pageView = events.find(e => e.t === 'pv') || null;
  const cwvEvent = events.find(e => e.t === 'cwv') || null;
  const engEvent = events.find(e => e.t === 'eng') || null;
  const leadEvents = events.filter(e => e.t === 'lead');
  return { pageView, cwvEvent, engEvent, leadEvents };
}

function extractClickIds(event: Record<string, any>): {
  gclid: string | null;
  fbclid: string | null;
  msclkid: string | null;
} {
  return {
    gclid: event.gclid || null,
    fbclid: event.fbclid || null,
    msclkid: event.msclkid || null,
  };
}

function mapLeadToConversion(lead: Record<string, any>, clientId: string) {
  return {
    client_id: clientId,
    session_id: lead.sid,
    event_type: lead.src === 'phone' ? 'phone_click' : 'form_submit',
    gclid: lead.gclid || null,
    fbclid: lead.fbclid || null,
    msclkid: lead.msclkid || null,
    page_url: lead.url || null,
    phone_number: lead.ph || null,
    form_name: lead.fm || null,
    is_bot: false,
  };
}

describe('Analytics Collector v3 — Event Classification', () => {
  it('extracts lead events from v2 payload', () => {
    const events = [
      { t: 'pv', url: 'https://example.com' },
      { t: 'lead', src: 'form', sid: 's1', gclid: 'g1' },
    ];
    const { leadEvents, pageView } = classifyV2Events(events);
    expect(leadEvents).toHaveLength(1);
    expect(leadEvents[0].src).toBe('form');
    expect(pageView).not.toBeNull();
  });

  it('handles payload with no lead events', () => {
    const events = [{ t: 'pv' }, { t: 'cwv', lcp: 1200 }];
    const { leadEvents } = classifyV2Events(events);
    expect(leadEvents).toHaveLength(0);
  });
});

describe('Analytics Collector v3 — Click ID Extraction', () => {
  it('extracts gclid from event', () => {
    const ids = extractClickIds({ gclid: 'abc123', url: 'https://example.com' });
    expect(ids.gclid).toBe('abc123');
  });

  it('returns null for missing click IDs', () => {
    const ids = extractClickIds({ url: 'https://example.com' });
    expect(ids.gclid).toBeNull();
    expect(ids.fbclid).toBeNull();
  });
});

describe('Analytics Collector v3 — Lead to Conversion Mapping', () => {
  it('maps form lead to form_submit conversion', () => {
    const conv = mapLeadToConversion(
      { sid: 's1', src: 'form', gclid: 'g1', url: 'https://example.com', fm: 'contact' },
      'client-uuid'
    );
    expect(conv.event_type).toBe('form_submit');
    expect(conv.gclid).toBe('g1');
    expect(conv.form_name).toBe('contact');
  });

  it('maps phone lead to phone_click conversion', () => {
    const conv = mapLeadToConversion(
      { sid: 's1', src: 'phone', ph: '+16035551234', url: 'https://example.com' },
      'client-uuid'
    );
    expect(conv.event_type).toBe('phone_click');
    expect(conv.phone_number).toBe('+16035551234');
  });
});
```

**Step 2: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/analyticsCollectorV3.test.ts
```

**Step 3: Modify analytics-collector/index.ts**

Changes to `handleV2()` function in `supabase/functions/analytics-collector/index.ts`:

1. **Add import at top:**
   ```typescript
   import { checkBot } from '../_shared/botDetector.ts';
   ```

2. **After extracting events (line ~148), also extract lead events:**
   ```typescript
   const leadEvents = payload.v.filter(e => e.t === 'lead');
   ```

3. **After domain validation, add bot check:**
   ```typescript
   const ua = req.headers.get('user-agent') || pageView?.ua || 'Unknown';
   const botResult = checkBot({
     ua,
     scrollDepth: engEvent?.scroll || 0,
     engagedSeconds: engEvent?.time || 0,
   });
   ```

4. **Add click IDs to the web_events insert object (line ~192):**
   ```typescript
   gclid: pageView.gclid || null,
   fbclid: pageView.fbclid || null,
   msclkid: pageView.msclkid || null,
   is_bot: botResult.isBot,
   ```

5. **After web_events insert, process lead events:**
   ```typescript
   // Process lead events (form submissions, phone clicks)
   for (const lead of leadEvents) {
     const conversionRow = {
       client_id: clientId,
       session_id: lead.sid || pageView?.sid,
       event_type: lead.src === 'phone' ? 'phone_click' : 'form_submit',
       gclid: lead.gclid || pageView?.gclid || null,
       fbclid: lead.fbclid || pageView?.fbclid || null,
       msclkid: lead.msclkid || pageView?.msclkid || null,
       li_fat_id: lead.li_fat_id || null,
       page_url: lead.url || pageView?.url || null,
       phone_number: lead.ph || null,
       form_name: lead.fm || null,
       is_bot: botResult.isBot,
       engagement_score: (engEvent?.scroll || 0) + (engEvent?.time || 0),
     };

     const { error: convError } = await supabase.from('conversion_events').insert(conversionRow);
     if (convError) {
       console.error('conversion_events insert error:', convError);
     }
   }
   ```

6. **Gate GA4 fan-out on bot check (line ~243):**
   ```typescript
   // GA4 Measurement Protocol fan-out — skip for bots
   if (!botResult.isBot) {
     const { data: ga4Config } = await supabase
       // ... existing GA4 code ...
   }
   ```

7. **For lead events, also fan-out to GA4 as conversion events:**
   ```typescript
   if (!botResult.isBot && botResult.canForwardConversions && ga4Config && leadEvents.length > 0) {
     for (const lead of leadEvents) {
       const ga4ConvPayload = {
         client_id: lead.sid || pageView?.sid,
         events: [{
           name: lead.src === 'phone' ? 'phone_call_click' : 'generate_lead',
           params: {
             page_location: lead.url || pageView?.url,
             engagement_time_msec: (engEvent?.time || 0) * 1000,
           }
         }]
       };
       fetch(ga4Url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(ga4ConvPayload),
       }).catch(err => console.error('GA4 conversion fan-out error:', err));
     }
   }
   ```

**Step 4: Run all tests**

```bash
npx vitest run src/lib/__tests__/analyticsCollectorV3.test.ts
npx vitest run src/lib/__tests__/botDetector.test.ts
```

**Step 5: Commit**

```bash
git add supabase/functions/analytics-collector/index.ts src/lib/__tests__/analyticsCollectorV3.test.ts
git commit -m "feat(collector): handle lead events, bot scoring, click ID storage, conversion fan-out"
```

---

### Task 5: Handle standalone lead payloads in analytics-collector

The tracker sends lead events independently (not bundled with a page view) for phone clicks and form submissions that happen after the initial page load flush. The collector needs to handle payloads where there is no `pv` event — only `lead` events.

**Files:**
- Modify: `supabase/functions/analytics-collector/index.ts`

**Step 1: Write the failing test**

Add to `src/lib/__tests__/analyticsCollectorV3.test.ts`:

```typescript
describe('Analytics Collector v3 — Standalone Lead Payloads', () => {
  it('classifies payload with only lead events (no page view)', () => {
    const events = [
      { t: 'lead', src: 'phone', sid: 's1', ph: '+16035551234', url: 'https://example.com' },
    ];
    const { pageView, leadEvents } = classifyV2Events(events);
    expect(pageView).toBeNull();
    expect(leadEvents).toHaveLength(1);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run src/lib/__tests__/analyticsCollectorV3.test.ts
```

**Step 3: Modify handleV2 to not early-return when pageView is null but leadEvents exist**

In `analytics-collector/index.ts`, change the early return:

```typescript
// Old:
if (!pageView) {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// New:
if (!pageView && leadEvents.length === 0) {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

Also update domain validation and event insertion to be conditional on `pageView` existence, and process `leadEvents` independently:

```typescript
// Only do domain validation + web_events insert if we have a page view
if (pageView) {
  // ... existing domain validation, web_events insert, CWV insert ...
}

// Process lead events regardless (they carry their own session ID + click IDs)
for (const lead of leadEvents) {
  // ... conversion_events insert (same code as Task 4) ...
}
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/analyticsCollectorV3.test.ts
```

**Step 5: Commit**

```bash
git add supabase/functions/analytics-collector/index.ts src/lib/__tests__/analyticsCollectorV3.test.ts
git commit -m "feat(collector): handle standalone lead payloads without page view"
```

---

### Task 6: Update Supabase types to include new columns

**Files:**
- Modify: `src/integrations/supabase/types.ts` (if manually maintained)

**Step 1: Check if types are auto-generated or manual**

```bash
head -5 src/integrations/supabase/types.ts
```

If the file says "automatically generated", regenerate with:
```bash
npx supabase gen types typescript --project-id "$VITE_SUPABASE_PROJECT_ID" > src/integrations/supabase/types.ts
```

If manually maintained, add the new table type and columns.

**Step 2: Verify build passes**

```bash
npx vite build
```

**Step 3: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "chore: regenerate Supabase types with conversion_events + click ID columns"
```

---

### Task 7: Build verification + full test suite

**Files:** None — verification only.

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: ALL tests pass, including the 3 new test files.

**Step 2: Build check**

```bash
npx vite build
```

Expected: Build succeeds.

**Step 3: Manual verification checklist**

- [ ] `supabase/functions/sos-tracker/index.ts` — TRACKER_JS includes bot filter, click ID capture, phone detection, Duda form detection
- [ ] `supabase/functions/analytics-collector/index.ts` — imports botDetector, processes lead events, inserts conversion_events, gates GA4 fan-out on bot check
- [ ] `supabase/functions/_shared/botDetector.ts` — exports checkBot, isKnownBotUA, hasMinimalEngagement
- [ ] `supabase/migrations/20260326100000_sos_tracker_v3_schema.sql` — creates conversion_events, adds columns to web_events
- [ ] Migration applied to production database

**Step 4: Commit (if any cleanup needed)**

```bash
git commit -m "test: verify SOS Tracker v3 Phase 1 — all tests pass, build clean"
```
