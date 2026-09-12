import { describe, it, expect } from 'vitest';

import { getSubdomain } from '../src/middleware';

/**
 * Route protection logic mirrored from src/middleware.ts
 */
function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/registrations') ||
    pathname.startsWith('/qr')
  );
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/registrations') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/join') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  );
}

function resolveRedirectTarget(userHasGym: boolean, nextUrl?: string): string {
  if (!userHasGym) {
    return '/onboarding';
  }
  return nextUrl || '/dashboard';
}

describe('Middleware Subdomain Resolution & Security Routing', () => {
  describe('Subdomain Detection', () => {
    it('detects localhost subdomains accurately', () => {
      expect(getSubdomain('iron-pulse.localhost:3000')).toBe('iron-pulse');
      expect(getSubdomain('cult-fit.localhost:3000')).toBe('cult-fit');
      expect(getSubdomain('gold-gym.localhost')).toBe('gold-gym');
    });

    it('detects production subdomains accurately', () => {
      expect(getSubdomain('iron-pulse.gymora.fit')).toBe('iron-pulse');
      expect(getSubdomain('fitzone.gymora.fit:443')).toBe('fitzone');
      expect(getSubdomain('iron-pulse.gymora.swadyum.store')).toBe('iron-pulse');
    });

    it('ignores non-subdomain roots and reserved prefixes', () => {
      expect(getSubdomain('localhost:3000')).toBeNull();
      expect(getSubdomain('127.0.0.1:3000')).toBeNull();
      expect(getSubdomain('gymora.fit')).toBeNull();
      expect(getSubdomain('www.gymora.fit')).toBeNull();
      expect(getSubdomain('gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('www.gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('swadyum.store')).toBeNull();
      expect(getSubdomain('app.gymora.fit')).toBeNull();
      expect(getSubdomain('api.gymora.fit')).toBeNull();
      expect(getSubdomain('admin.localhost:3000')).toBeNull();
    });
  });

  describe('Route Protection Classification', () => {
    it('marks private CRM screens as protected', () => {
      expect(isProtectedRoute('/dashboard')).toBe(true);
      expect(isProtectedRoute('/dashboard/analytics')).toBe(true);
      expect(isProtectedRoute('/members')).toBe(true);
      expect(isProtectedRoute('/plans')).toBe(true);
      expect(isProtectedRoute('/registrations')).toBe(true);
      expect(isProtectedRoute('/qr')).toBe(true);
    });

    it('marks customer onboarding, landing, and auth as public', () => {
      expect(isPublicRoute('/')).toBe(true);
      expect(isPublicRoute('/login')).toBe(true);
      expect(isPublicRoute('/join/iron-pulse')).toBe(true);
      expect(isPublicRoute('/auth/callback')).toBe(true);
      expect(isPublicRoute('/api/registrations')).toBe(true);
      expect(isPublicRoute('/favicon.ico')).toBe(true);
    });
  });

  describe('Progressive Onboarding Routing', () => {
    it('redirects new gym owners without a gym to onboarding', () => {
      const target = resolveRedirectTarget(false);
      expect(target).toBe('/onboarding');
    });

    it('redirects returning gym owners with a gym to dashboard', () => {
      const target = resolveRedirectTarget(true);
      expect(target).toBe('/dashboard');
    });

    it('respects custom next parameter for returning owners', () => {
      const target = resolveRedirectTarget(true, '/members');
      expect(target).toBe('/members');
    });
  });

  describe('Reverse Proxy Public Origin Resolution', () => {
    it('resolves external domain from x-forwarded-host and proto behind Coolify/Traefik', async () => {
      const { getPublicOrigin } = await import('../src/lib/utils/url');
      const req = new Request('http://localhost:3000/demo', {
        headers: {
          'x-forwarded-host': 'mygym.coolify.site',
          'x-forwarded-proto': 'https',
        },
      });
      expect(getPublicOrigin(req)).toBe('https://mygym.coolify.site');
    });

    it('handles multiple forwarded hosts from proxy chains', async () => {
      const { getPublicOrigin } = await import('../src/lib/utils/url');
      const req = new Request('http://127.0.0.1:3000/auth/callback', {
        headers: {
          'x-forwarded-host': 'gymora.com, 10.0.0.1',
          'x-forwarded-proto': 'https',
        },
      });
      expect(getPublicOrigin(req)).toBe('https://gymora.com');
    });

    it('falls back to standard host for local dev', async () => {
      const { getPublicOrigin } = await import('../src/lib/utils/url');
      const req = new Request('http://localhost:3000/dashboard', {
        headers: {
          host: 'localhost:3000',
        },
      });
      expect(getPublicOrigin(req)).toBe('http://localhost:3000');
    });
  });
});
