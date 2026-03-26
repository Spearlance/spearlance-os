export interface DiscoveredServiceLocation {
  service_slug: string;
  service_name: string; // derived from slug: "web-design" → "Web Design"
  city: string;         // "Concord"
  state: string;        // "NH"
}

/**
 * Parse a URL path into a service + location combo.
 * Pattern: /{service-slug}/{city-state}
 * e.g. /web-design/concord-nh → { service_slug: "web-design", service_name: "Web Design", city: "Concord", state: "NH" }
 * Returns null if the path doesn't match the pattern.
 */
export function parseServiceLocationFromUrl(path: string): DiscoveredServiceLocation | null {
  const cleaned = path.replace(/^\/|\/$/g, ''); // trim leading/trailing slashes
  if (!cleaned) return null;

  const parts = cleaned.split('/');
  if (parts.length !== 2) return null;

  const serviceSlug = parts[0];
  const cityState = parts[1];

  // City-state pattern: {city}-{state_abbrev} where state is exactly 2 chars
  const stateMatch = cityState.match(/^(.+)-([a-z]{2})$/i);
  if (!stateMatch) return null;

  const citySlug = stateMatch[1];
  const state = stateMatch[2].toUpperCase();

  // Convert slugs to title-cased names
  const toTitleCase = (slug: string) =>
    slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const service_name = toTitleCase(serviceSlug);
  const city = toTitleCase(citySlug);

  return { service_slug: serviceSlug, service_name, city, state };
}
