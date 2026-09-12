import { describe, it, expect } from 'vitest';
import { gymService } from '../src/lib/data/service';

describe('Gym Business Logic & Service Suite', () => {
  it('calculates dashboard metrics accurately from initial state', () => {
    const metrics = gymService.getDashboardMetrics();
    expect(metrics.active_members).toBeGreaterThanOrEqual(4);
    expect(metrics.overdue_count).toBeGreaterThanOrEqual(1);
    expect(metrics.due_today_count).toBeGreaterThanOrEqual(1);
  });

  it('records full payment and updates membership to paid', () => {
    // Find member-01 who owes ₹1500
    const member = gymService.getMemberById('member-01');
    expect(member).not.toBeNull();
    const mship = member!.member.membership;
    expect(mship).not.toBeNull();
    expect(mship!.outstanding_balance).toBe(1500);

    const res = gymService.recordPayment({
      member_id: 'member-01',
      membership_id: mship!.id,
      amount: 1500,
      payment_method: 'upi',
      notes: 'Full payment test',
    });

    expect(res.success).toBe(true);
    expect(res.new_status).toBe('paid');
    expect(res.remaining_balance).toBe(0);

    // Verify member updated
    const updated = gymService.getMemberById('member-01');
    expect(updated!.member.membership!.outstanding_balance).toBe(0);
    expect(updated!.member.membership!.status).toBe('paid');
  });

  it('records partial payment and keeps remaining balance due', () => {
    // Member-02 owes ₹4000
    const member = gymService.getMemberById('member-02');
    const mship = member!.member.membership!;
    expect(mship.outstanding_balance).toBe(4000);

    const res = gymService.recordPayment({
      member_id: 'member-02',
      membership_id: mship.id,
      amount: 1000,
      payment_method: 'cash',
    });

    expect(res.success).toBe(true);
    expect(res.new_status).toBe('partial');
    expect(res.remaining_balance).toBe(3000);

    const updated = gymService.getMemberById('member-02');
    expect(updated!.member.membership!.outstanding_balance).toBe(3000);
  });

  it('rejects payment amount exceeding remaining balance', () => {
    const member = gymService.getMemberById('member-02');
    const mship = member!.member.membership!;

    expect(() => {
      gymService.recordPayment({
        member_id: 'member-02',
        membership_id: mship.id,
        amount: 99999,
        payment_method: 'cash',
      });
    }).toThrow(/exceeds outstanding balance/);
  });

  it('handles public QR registration and subsequent conversion', () => {
    // 1. Submit public QR registration
    const regRes = gymService.createRegistrationRequest({
      gym_slug: 'iron-pulse',
      full_name: 'Vikram Singh',
      phone: '9988112233',
      email: 'vikram@example.com',
      plan_id: 'plan-monthly-01',
    });

    expect(regRes.success).toBe(true);
    expect(regRes.plan_name).toBe('Monthly Standard');

    // 2. Owner converts registration to member
    const convertRes = gymService.convertRegistrationToMember(regRes.registration_id);
    expect(convertRes.success).toBe(true);
    expect(convertRes.member_id).toBeDefined();
    expect(convertRes.membership_id).toBeDefined();

    // Verify cannot convert twice
    expect(() => {
      gymService.convertRegistrationToMember(regRes.registration_id);
    }).toThrow(/already converted/);

    // Verify new member exists in list
    const members = gymService.getMembersWithDetails();
    const created = members.find((m) => m.full_name === 'Vikram Singh');
    expect(created).toBeDefined();
    expect(created!.phone).toBe('+919988112233');
    expect(created!.membership!.plan_name_snapshot).toBe('Monthly Standard');
  });
});
