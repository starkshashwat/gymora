import { describe, it, expect, beforeEach } from 'vitest';
import { gymService } from '../src/lib/data/service';
import { db } from '../src/lib/data/mockDb';

// Mock Supabase RPC logic using the in-memory store for unit test validation
describe('Payment Integrity & Idempotency', () => {
  const testGymId = 'gym-gymora-01';

  beforeEach(() => {
    // Reset DB state for clean tests
    gymService.payments = [];
    gymService.memberships = [];
    gymService.members = [];
    gymService.registrationRequests = [];
    
    if (!gymService.plans.find(p => p.id === 'plan-01')) {
      gymService.plans.push({
        id: 'plan-01',
        gym_id: testGymId,
        name: 'Test Plan',
        price: 2000,
        duration_days: 30,
        is_active: true,
      } as any);
    }

    // Seed initial test data
    gymService.addMember(
      { full_name: 'John Doe', phone: '9999999999', plan_id: 'plan-01', start_date: new Date().toISOString() },
      testGymId
    );
  });

  it('11. prevents duplicate payments with the same idempotency key (Double-click)', async () => {
    const member = gymService.getMembersWithDetails(testGymId).members[0];
    const membership = member.membership!;
    const idempotencyKey = 'idemp_12345';
    
    expect(membership.outstanding_balance).toBe(2000); // default plan price

    // First request
    const res1 = gymService.recordPayment({
      member_id: member.id,
      membership_id: membership.id,
      amount: 1000,
      payment_method: 'upi',
      idempotency_key: idempotencyKey
    });

    expect(res1.payment_id).toBeDefined();

    // Second request (double-click)
    const res2 = gymService.recordPayment({
      member_id: member.id,
      membership_id: membership.id,
      amount: 1000,
      payment_method: 'upi',
      idempotency_key: idempotencyKey
    });

    // Should return the exact same payment_id and NOT deduct balance twice
    expect(res2.payment_id).toBe(res1.payment_id);
    expect(res2.message).toContain('idempotent');

    const updatedMember = gymService.getMembersWithDetails(testGymId).members.find(m => m.id === member.id);
    expect(updatedMember?.membership?.outstanding_balance).toBe(1000);
    expect(gymService.payments.length).toBe(1); // Only ONE payment recorded
  });

  it('5. prevents overpayment (reject amount > outstanding)', async () => {
    const member = gymService.getMembersWithDetails(testGymId).members[0];
    const membership = member.membership!;

    expect(() => {
      gymService.recordPayment({
        member_id: member.id,
        membership_id: membership.id,
        amount: 2500, // outstanding is 2000
        payment_method: 'upi'
      });
    }).toThrow(/Amount ₹2500 exceeds outstanding/);
  });

  it('29. handles concurrency (10 concurrent requests for same outstanding balance)', async () => {
    // Since this is synchronous JS in-memory simulation, true thread race conditions aren't perfectly simulated,
    // but we can ensure our idempotent API enforces the correct state.
    const member = gymService.getMembersWithDetails(testGymId).members[0];
    const membership = member.membership!;
    const idempotencyKey = 'concurrent_payment';

    const reqs = Array(10).fill(0).map(() => {
      try {
        return gymService.recordPayment({
          member_id: member.id,
          membership_id: membership.id,
          amount: 2000,
          payment_method: 'upi',
          idempotency_key: idempotencyKey
        });
      } catch (e: any) {
        return { error: e.message };
      }
    });

    const successful = reqs.filter(r => r.payment_id);
    const updatedMember = gymService.getMembersWithDetails(testGymId).members.find(m => m.id === member.id);

    // Because idempotency is used, they all succeed with the SAME payment ID, but only ONE record is created.
    expect(successful.length).toBe(10);
    expect(successful[0].payment_id).toBe(successful[1].payment_id);
    expect(gymService.payments.length).toBe(1);
    expect(updatedMember?.membership?.outstanding_balance).toBe(0);
    expect(updatedMember?.membership?.status).toBe('paid');
  });

  it('14. excludes refunded payments from valid balance calculations', () => {
    const member = gymService.getMembersWithDetails(testGymId).members[0];
    const membership = member.membership!;

    gymService.recordPayment({
      member_id: member.id,
      membership_id: membership.id,
      amount: 2000,
      payment_method: 'upi'
    });

    let updatedMember = gymService.getMembersWithDetails(testGymId).members.find(m => m.id === member.id);
    expect(updatedMember?.membership?.outstanding_balance).toBe(0);

    // Mock voiding the payment
    const payment = gymService.payments[0];
    payment.status = 'void';

    updatedMember = gymService.getMembersWithDetails(testGymId).members.find(m => m.id === member.id);
    expect(updatedMember?.membership?.outstanding_balance).toBe(2000);
    expect(updatedMember?.membership?.status).toBe('pending');
  });
});
