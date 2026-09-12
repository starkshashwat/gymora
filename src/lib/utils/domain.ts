const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'gymora',
  'coolify',
  'auth',
  'mail',
  'smtp',
]);

/**
 * Extracts gym slug subdomain from the incoming Host header.
 * Supports:
 * - Localhost development: [slug].localhost:3000 or [slug].localhost
 * - Production: [slug].gymora.fit or [slug].gymora.swadyum.store
 * Ignores reserved subdomains and main app root domains like gymora.swadyum.store.
 */
export function getSubdomain(host: string): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  // If host is localhost or raw IP address (e.g. 127.0.0.1), no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Exact root application domains
  if (
    hostname === 'gymora.fit' ||
    hostname === 'www.gymora.fit' ||
    hostname === 'gymora.swadyum.store' ||
    hostname === 'www.gymora.swadyum.store' ||
    hostname === 'swadyum.store' ||
    hostname === 'www.swadyum.store'
  ) {
    return null;
  }

  // Localhost pattern: e.g. "iron-pulse.localhost"
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace('.localhost', '');
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
  }

  // If domain is on *.gymora.swadyum.store, e.g. "iron-pulse.gymora.swadyum.store"
  if (hostname.endsWith('.gymora.swadyum.store')) {
    const sub = hostname.replace('.gymora.swadyum.store', '');
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
    return null;
  }

  // If domain is on *.gymora.fit, e.g. "iron-pulse.gymora.fit"
  if (hostname.endsWith('.gymora.fit')) {
    const sub = hostname.replace('.gymora.fit', '');
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
    return null;
  }

  // Production domain pattern with reserved checks: e.g. "iron-pulse.domain.com"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
  }

  return null;
}

export function isCustomDomain(host: string): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0].toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return false;
  }
  if (
    hostname === 'gymora.fit' ||
    hostname.endsWith('.gymora.fit') ||
    hostname === 'gymora.swadyum.store' ||
    hostname.endsWith('.gymora.swadyum.store') ||
    hostname === 'swadyum.store' ||
    hostname === 'www.swadyum.store'
  ) {
    return false;
  }
  return hostname.includes('.');
}

/**
 * Normalizes a gym name into a URL-safe, clean slug.
 * e.g. "Iron Pulse Fitness & Gym!" -> "iron-pulse-fitness-gym"
 */
export function slugifyGymName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
