import { describe, it, expect } from 'vitest';
import { getSubdomain, isCustomDomain } from '../src/middleware';
import { gymService } from '../src/lib/data/service';

describe('Custom Domain & Subdomain Routing System', () => {
  describe('Tier 1: Free Branded Subdomain Detection', () => {
    it('correctly extracts gym slug from production gymora.swadyum.store subdomains', () => {
      expect(getSubdomain('iron-pulse.gymora.swadyum.store')).toBe('iron-pulse');
      expect(getSubdomain('cult-fit.gymora.swadyum.store:443')).toBe('cult-fit');
      expect(getSubdomain('crossfit-delhi.gymora.swadyum.store')).toBe('crossfit-delhi');
    });

    it('correctly extracts gym slug from localhost development subdomains', () => {
      expect(getSubdomain('iron-pulse.localhost:3000')).toBe('iron-pulse');
      expect(getSubdomain('fitclub.localhost')).toBe('fitclub');
    });

    it('protects root platform domains from being treated as gym subdomains', () => {
      expect(getSubdomain('gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('www.gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('gymora.fit')).toBeNull();
      expect(getSubdomain('swadyum.store')).toBeNull();
      expect(getSubdomain('localhost:3000')).toBeNull();
      expect(getSubdomain('127.0.0.1:3000')).toBeNull();
    });

    it('filters out reserved system subdomains', () => {
      expect(getSubdomain('admin.gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('api.gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('coolify.gymora.swadyum.store')).toBeNull();
      expect(getSubdomain('auth.gymora.swadyum.store')).toBeNull();
    });
  });

  describe('Tier 2: Custom Gym Domain Detection', () => {
    it('identifies valid white-label custom domains', () => {
      expect(isCustomDomain('portal.ironpulse.com')).toBe(true);
      expect(isCustomDomain('portal.ironpulse.com:443')).toBe(true);
      expect(isCustomDomain('members.mygym.in')).toBe(true);
      expect(isCustomDomain('join.delhifitness.org')).toBe(true);
      expect(isCustomDomain('mygymportal.com')).toBe(true);
    });

    it('rejects platform domains and local addresses from being custom domains', () => {
      expect(isCustomDomain('gymora.swadyum.store')).toBe(false);
      expect(isCustomDomain('iron-pulse.gymora.swadyum.store')).toBe(false);
      expect(isCustomDomain('gymora.fit')).toBe(false);
      expect(isCustomDomain('swadyum.store')).toBe(false);
      expect(isCustomDomain('localhost')).toBe(false);
      expect(isCustomDomain('demo.localhost:3000')).toBe(false);
      expect(isCustomDomain('127.0.0.1:3000')).toBe(false);
    });
  });

  describe('Domain Normalization Logic', () => {
    const normalizeDomain = (domain: string) => {
      return domain
        .toLowerCase()
        .trim()
        .replace(/^(https?:\/\/)/, '')
        .replace(/\/.*$/, '')
        .split(':')[0];
    };

    it('cleans protocols, paths, ports, and trailing slashes', () => {
      expect(normalizeDomain('https://portal.mygym.com/')).toBe('portal.mygym.com');
      expect(normalizeDomain('http://members.fitness.in/join')).toBe('members.fitness.in');
      expect(normalizeDomain('  PORTAL.IRONPULSE.COM:443/  ')).toBe('portal.ironpulse.com');
    });
  });

  describe('Gym Service Domain Integration', () => {
    it('retrieves gym by custom domain when configured', async () => {
      await gymService.updateSettings({
        domain: {
          custom_domain: 'portal.ironpulsefitness.com',
          custom_domain_verified: true,
          brand_color: '#10b981',
        },
      });

      const gymByDomain = await gymService.getGymByCustomDomain('portal.ironpulsefitness.com');
      expect(gymByDomain).toBeDefined();
      expect(gymByDomain?.custom_domain).toBe('portal.ironpulsefitness.com');
      expect(gymByDomain?.custom_domain_verified).toBe(true);

      const publicGym = await gymService.getPublicGymBySlug('portal.ironpulsefitness.com');
      expect(publicGym).toBeDefined();
      expect(publicGym?.gym.name).toBeDefined();
    });

    it('returns null for non-configured custom domain', async () => {
      const nonExistent = await gymService.getGymByCustomDomain('unregistered-domain-123.com');
      expect(nonExistent).toBeNull();
    });
  });
});
