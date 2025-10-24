export function getLateApiKey(): string {
  const raw = Deno.env.get('LATE_API_KEY');
  if (!raw) {
    throw new Error('Missing LATE_API_KEY secret');
  }
  const key = raw.trim();
  if (!key) {
    throw new Error('Empty LATE_API_KEY after trim');
  }
  return key;
}

export async function lateFetch(path: string, init: RequestInit = {}): Promise<any> {
  const key = getLateApiKey();
  const url = path.startsWith('http')
    ? path
    : `https://getlate.dev/api/v1${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${key}`);
  }
  if (!headers.has('Content-Type') && init.method && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  console.log('Late API request:', { url, method: init.method || 'GET' });

  const res = await fetch(url, { ...init, headers });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Late API error:', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text?.slice(0, 2000)
    });
    throw new Error(`Late API ${res.status} on ${url}: ${text}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}
