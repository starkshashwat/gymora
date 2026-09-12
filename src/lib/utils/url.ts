/**
 * Resolves the public base origin for incoming requests, taking into account
 * reverse proxies (Coolify, Traefik, Nginx, Cloudflare, Docker) and environment variables.
 */
export function getPublicOrigin(request?: Request): string {
  // 1. If explicit environment variable is set in Coolify or hosting platform
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Extract from request headers if available (Reverse proxy standard)
  if (request) {
    const headers = request.headers;
    const forwardedHost = headers.get('x-forwarded-host');
    const forwardedProto = headers.get('x-forwarded-proto') || 'https';
    const host = headers.get('host');

    if (forwardedHost) {
      // Reverse proxies may chain hosts comma-separated; take the first client-facing host
      const primaryHost = forwardedHost.split(',')[0].trim();
      return `${forwardedProto}://${primaryHost}`;
    }

    if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      const proto = headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }

    try {
      const parsed = new URL(request.url);
      if (parsed.origin && parsed.origin !== 'null' && !parsed.origin.includes('localhost')) {
        return parsed.origin;
      }
    } catch {
      // ignore
    }
  }

  // 3. Browser environment fallback
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  // 4. Fallback to request URL or default
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      // ignore
    }
  }

  return 'http://localhost:3000';
}
