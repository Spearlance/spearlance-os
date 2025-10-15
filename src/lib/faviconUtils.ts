export async function fetchFavicon(url: string): Promise<string | null> {
  try {
    const domain = new URL(url).origin;
    const hostname = new URL(url).hostname;
    
    // Try multiple favicon sources in order of quality
    const faviconUrls = [
      `${domain}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${hostname}.ico`
    ];
    
    for (const faviconUrl of faviconUrls) {
      try {
        const response = await fetch(faviconUrl, { method: 'HEAD' });
        if (response.ok) return faviconUrl;
      } catch {
        continue;
      }
    }
    
    // Fallback to Google's favicon service (most reliable)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return null;
  }
}
