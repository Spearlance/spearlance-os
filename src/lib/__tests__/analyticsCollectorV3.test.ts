import { describe, it, expect } from 'vitest';

function classifyV2Events(events: Array<{ t: string; [key: string]: any }>) {
  const pageView = events.find(e => e.t === 'pv') || null;
  const cwvEvent = events.find(e => e.t === 'cwv') || null;
  const engEvent = events.find(e => e.t === 'eng') || null;
  const leadEvents = events.filter(e => e.t === 'lead');
  return { pageView, cwvEvent, engEvent, leadEvents };
}

function extractClickIds(event: Record<string, any>) {
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

  it('classifies payload with only lead events (no page view)', () => {
    const events = [
      { t: 'lead', src: 'phone', sid: 's1', ph: '+16035551234', url: 'https://example.com' },
    ];
    const { pageView, leadEvents } = classifyV2Events(events);
    expect(pageView).toBeNull();
    expect(leadEvents).toHaveLength(1);
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
