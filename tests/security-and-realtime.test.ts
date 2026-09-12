import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { slugifyGymName, getSubdomain } from '../src/lib/utils/domain';
import { resolveCurrentGym } from '../src/lib/data/dbSync';
import { gymService } from '../src/lib/data/service';
import { initialGym } from '../src/lib/data/mockDb';

describe('Multi-Tenancy Security & Real-Time QR Registration Suite', () => {
  describe('Automatic Slug Generation', () => {
    it('generates clean, URL-safe slugs from gym names', () => {
      expect(slugifyGymName('Iron Pulse Fitness')).toBe('iron-pulse-fitness');
      expect(slugifyGymName('  Gold\'s Gym & CrossFit - Delhi!  ')).toBe('golds-gym-crossfit-delhi');
      expect(slugifyGymName('Cult.Fit 24/7 Club')).toBe('cultfit-247-club');
      expect(slugifyGymName('Fit---Zone___Pro')).toBe('fit-zone-pro');
    });
  });

  describe('Multi-Tenancy Subdomain Hijack Protection', () => {
    const gymA = gymService.onboardGymOwner({
      gym_name: 'Iron Pulse Hub',
      phone: '9888811111',
      slug: 'iron-pulse-hub',
      plans: [],
    });

    const mockSupabase = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: 'owner-user-01',
              user_metadata: { gym_id: gymA.gym_id },
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { gym_id: gymA.gym_id } }),
          }),
        }),
      }),
    };

    it('allows authenticated owner accessing their own gym subdomain', async () => {
      const req = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          host: 'iron-pulse-hub.gymora.swadyum.store',
        },
      });

      const auth = await resolveCurrentGym(req, mockSupabase);
      expect(auth.isCrossTenantForbidden).toBe(false);
      expect(auth.gymId).toBe(gymA.gym_id);
    });

    it('blocks authenticated owner of Gym A attempting to access Gym B subdomain', async () => {
      // Create a separate second gym in memory
      gymService.onboardGymOwner({
        gym_name: 'Metro Beast Fitness',
        phone: '9888877777',
        slug: 'metro-beast',
        plans: [],
      });

      const req = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          host: 'metro-beast.gymora.swadyum.store',
        },
      });

      const auth = await resolveCurrentGym(req, mockSupabase);
      // Because user owns gymA, but the subdomain points to metro-beast
      expect(auth.isCrossTenantForbidden).toBe(true);
      expect(auth.gymId).toBeUndefined();
    });

    it('rejects unauthenticated visitor attempting to spoof gym ID via cookie without session', async () => {
      const unauthSupabase = {
        auth: {
          getUser: async () => ({ data: { user: null } }),
        },
      };

      const req = new NextRequest('http://localhost:3000/api/dashboard', {
        headers: {
          cookie: 'gymora_gym_id=some-secret-gym-id',
        },
      });

      const auth = await resolveCurrentGym(req, unauthSupabase);
      expect(auth.gymId).toBeUndefined();
      expect(auth.user).toBeNull();
      expect(auth.isDemoMode).toBe(false);
    });
  });

  describe('Real-Time QR Registration Notifications & Conversion', () => {
    it('creates registration request and updates pending count', () => {
      const initialPending = gymService
        .getRegistrations(initialGym.id)
        .filter((r) => r.status === 'pending').length;

      const reg = gymService.createRegistrationRequest({
        gym_slug: initialGym.slug,
        full_name: 'Rohit Sharma',
        phone: '9876501234',
        email: 'rohit@example.com',
        plan_id: 'plan-monthly-01',
        whatsapp_opt_in: true,
      });

      expect(reg.success).toBe(true);
      expect(reg.registration_id).toBeDefined();
      expect(reg.plan_name).toBe('Monthly Standard');

      const updatedPending = gymService
        .getRegistrations(initialGym.id)
        .filter((r) => r.status === 'pending');

      expect(updatedPending.length).toBe(initialPending + 1);
      expect(updatedPending[0].full_name).toBe('Rohit Sharma');
      expect(updatedPending[0].status).toBe('pending');
    });

    it('approves registration with payment and records member', () => {
      const reg = gymService.createRegistrationRequest({
        gym_slug: initialGym.slug,
        full_name: 'Pooja Verma',
        phone: '9876549999',
        plan_id: 'plan-monthly-01',
      });

      const approveRes = gymService.approveRegistrationWithPayment({
        registration_id: reg.registration_id,
        gym_id: initialGym.id,
        payment_received: true,
        amount_received: 1500,
        payment_method: 'cash',
        notes: 'Reception payment',
      });

      expect(approveRes.success).toBe(true);
      expect(approveRes.member.full_name).toBe('Pooja Verma');
      expect(approveRes.member.status).toBe('active');
      expect(approveRes.payment?.amount).toBe(1500);

      // Verify registration is marked converted
      const allRegs = gymService.getRegistrations(initialGym.id);
      const convertedReg = allRegs.find((r) => r.id === reg.registration_id);
      expect(convertedReg?.status).toBe('converted');
    });
  });
});
