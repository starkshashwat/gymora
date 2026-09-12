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
    const members = gymService.getMembersWithDetails().members;
    const created = members.find((m) => m.full_name === 'Vikram Singh');
    expect(created).toBeDefined();
    expect(created!.phone).toBe('+919988112233');
    expect(created!.membership!.plan_name_snapshot).toBe('Monthly Standard');
  });

  it('deletes member and all related memberships and payments', () => {
    // 1. Create a member to delete
    const added = gymService.addMember({
      full_name: 'Test Delete Member',
      phone: '9123456780',
      plan_id: 'plan-monthly-01',
    });
    expect(added).toBeDefined();

    // Verify member exists
    const beforeList = gymService.getMembersWithDetails().members;
    expect(beforeList.some((m) => m.id === added.id)).toBe(true);

    // 2. Delete member
    const deleteSuccess = gymService.deleteMember(added.id);
    // 3. Verify member is inactive, not deleted
    const afterList = gymService.getMembersWithDetails().members;
    const deactivatedMember = afterList.find(m => m.id === added.id);
    expect(deactivatedMember).toBeDefined();
    expect(deactivatedMember?.status).toBe('inactive');
  });

  it('maintains strict multi-tenant data isolation by gymId', () => {
    const gymA = 'custom-gym-alpha';
    const gymB = 'custom-gym-beta';

    // Add member to Gym A
    const memberA = gymService.addMember({
      gymId: gymA,
      full_name: 'Alpha Member',
      phone: '9000000001',
      plan_id: 'plan-monthly-01',
    });

    // Add member to Gym B
    const memberB = gymService.addMember({
      gymId: gymB,
      full_name: 'Beta Member',
      phone: '9000000002',
      plan_id: 'plan-monthly-01',
    });

    // Query Gym A: must contain memberA and NOT memberB
    const membersA = gymService.getMembersWithDetails(gymA).members;
    expect(membersA.some((m) => m.id === memberA.id)).toBe(true);
    expect(membersA.some((m) => m.id === memberB.id)).toBe(false);

    // Query Gym B: must contain memberB and NOT memberA
    const membersB = gymService.getMembersWithDetails(gymB).members;
    expect(membersB.some((m) => m.id === memberB.id)).toBe(true);
    expect(membersB.some((m) => m.id === memberA.id)).toBe(false);
  });
});
