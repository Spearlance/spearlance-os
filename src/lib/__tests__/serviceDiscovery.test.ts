import { describe, it, expect } from 'vitest';
import { parseServiceLocationFromUrl } from '../serviceDiscovery';

describe('parseServiceLocationFromUrl', () => {
  it('parses /web-design/concord-nh correctly', () => {
    const result = parseServiceLocationFromUrl('/web-design/concord-nh');
    expect(result).toEqual({
      service_slug: 'web-design',
      service_name: 'Web Design',
      city: 'Concord',
      state: 'NH',
    });
  });

  it('parses /seo/manchester-nh correctly', () => {
    const result = parseServiceLocationFromUrl('/seo/manchester-nh');
    expect(result).toEqual({
      service_slug: 'seo',
      service_name: 'Seo',
      city: 'Manchester',
      state: 'NH',
    });
  });

  it('parses /pediatric-therapy/tampa-fl correctly (multi-word service)', () => {
    const result = parseServiceLocationFromUrl('/pediatric-therapy/tampa-fl');
    expect(result).toEqual({
      service_slug: 'pediatric-therapy',
      service_name: 'Pediatric Therapy',
      city: 'Tampa',
      state: 'FL',
    });
  });

  it('parses /roof-repair/new-york-ny correctly (multi-word city)', () => {
    const result = parseServiceLocationFromUrl('/roof-repair/new-york-ny');
    expect(result).toEqual({
      service_slug: 'roof-repair',
      service_name: 'Roof Repair',
      city: 'New York',
      state: 'NY',
    });
  });

  it('returns null for root path /', () => {
    expect(parseServiceLocationFromUrl('/')).toBeNull();
  });

  it('returns null for single-segment /about', () => {
    expect(parseServiceLocationFromUrl('/about')).toBeNull();
  });

  it('returns null for blog paths /blog/some-post', () => {
    expect(parseServiceLocationFromUrl('/blog/some-post')).toBeNull();
  });

  it('returns null for three-segment paths /a/b/c', () => {
    expect(parseServiceLocationFromUrl('/a/b/c')).toBeNull();
  });

  it('returns null for city-state without valid 2-char state /web-design/concord', () => {
    expect(parseServiceLocationFromUrl('/web-design/concord')).toBeNull();
  });

  it('handles trailing slashes /web-design/concord-nh/', () => {
    const result = parseServiceLocationFromUrl('/web-design/concord-nh/');
    expect(result).toEqual({
      service_slug: 'web-design',
      service_name: 'Web Design',
      city: 'Concord',
      state: 'NH',
    });
  });
});
