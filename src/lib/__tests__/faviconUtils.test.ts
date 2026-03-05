import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFavicon } from '../faviconUtils';

describe('fetchFavicon', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the first favicon URL that responds ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    const result = await fetchFavicon('https://example.com/some/page');
    expect(result).toBe('https://example.com/favicon.ico');
  });

  it('falls through to google favicon when first source fails', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true } as Response);

    const result = await fetchFavicon('https://example.com');
    expect(result).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=128');
  });

  it('falls through to duckduckgo when first two sources fail', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ ok: true } as Response);

    const result = await fetchFavicon('https://example.com');
    expect(result).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
  });

  it('returns google fallback URL when all sources fail', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('all fail'));

    const result = await fetchFavicon('https://example.com');
    expect(result).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
  });

  it('returns null for an invalid URL', async () => {
    const result = await fetchFavicon('not-a-url');
    expect(result).toBeNull();
  });

  it('uses the correct hostname for subdomain URLs', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    const result = await fetchFavicon('https://blog.example.com/post/123');
    expect(result).toBe('https://blog.example.com/favicon.ico');
  });

  it('returns null when URL is empty string', async () => {
    const result = await fetchFavicon('');
    expect(result).toBeNull();
  });
});
