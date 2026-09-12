import { describe, it, expect } from 'vitest';
import { gymService } from '../src/lib/data/service';

describe('Redesign Architecture: Lifecycle, Registration Approval & Settings', () => {
  it('manages membership lifecycle transitions (pause, cancel, reactivate) without data loss', () => {
    // Add a fresh member
    const newMember = gymService.addMember({
      full_name: 'Lifecycle Test Member',
      phone: '9888877777',
      email: 'lifecycle@test.com',
      plan_id: 'plan-monthly-01',
      gymId: 'gym-demo-01',
    });

    expect(newMember).toBeDefined();
    const mship = newMember.membership!;
    expect(mship.lifecycle).toBe('active');

    // 1. Pause membership
    const paused = gymService.pauseMembership(mship.id, 'gym-demo-01');
    expect(paused.lifecycle).toBe('paused');
    expect(paused.paused_at).toBeDefined();

    // 2. Reactivate membership from paused
    const resumed = gymService.reactivateMembership(mship.id, 'gym-demo-01');
    expect(resumed.lifecycle).toBe('active');

    // 3. Record a payment
    gymService.recordPayment({
      member_id: newMember.id,
      membership_id: mship.id,
      amount: 500,
      payment_method: 'cash',
      notes: 'Initial deposit',
    });

    // 4. Cancel membership with reason
    const cancelled = gymService.cancelMembership(
      mship.id,
      'Relocated to another city',
      'gym-demo-01'
    );
    expect(cancelled.lifecycle).toBe('cancelled');
    expect(cancelled.cancelled_at).toBeDefined();
    expect(cancelled.cancellation_reason).toBe('Relocated to another city');

    // Financial data and member record MUST be preserved
    const inspect = gymService.getMemberById(newMember.id, 'gym-demo-01');
    expect(inspect).not.toBeNull();
    expect(inspect!.member.full_name).toBe('Lifecycle Test Member');
    expect(inspect!.payments.length).toBe(1);
    expect(Number(inspect!.payments[0].amount)).toBe(500);

    // 5. Reactivate cancelled member
    const reactivated = gymService.reactivateMembership(mship.id, 'gym-demo-01');
    expect(reactivated.lifecycle).toBe('active');
  });

  it('atomically approves QR registration with full payment received', () => {
    // 1. Create public registration with WhatsApp consent
    const reg = gymService.createRegistrationRequest({
      gym_slug: 'iron-pulse',
      full_name: 'Anita Sharma',
      phone: '9877766666',
      email: 'anita@test.com',
      plan_id: 'plan-monthly-01',
      whatsapp_opt_in: true,
    });
    expect(reg.success).toBe(true);

    // 2. Owner approves with full payment via UPI
    const approval = gymService.approveRegistrationWithPayment({
      registration_id: reg.registration_id,
      payment_received: true,
      amount_received: 1500,
      payment_method: 'upi',
      notes: 'GPay reception QR',
      gym_id: 'gym-demo-01',
    });

    expect(approval.success).toBe(true);
    expect(approval.member).toBeDefined();
    expect(approval.member.whatsapp_opt_in).toBe(true);
    expect(approval.membership.status).toBe('paid');
    expect(approval.membership.lifecycle).toBe('active');
    expect(approval.payment).toBeDefined();
    expect(approval.payment.amount).toBe(1500);
    expect(approval.payment.payment_method).toBe('upi');

    // Verify member exists in list with zero balance
    const memberDetails = gymService.getMemberById(approval.member.id, 'gym-demo-01');
    expect(memberDetails!.member.membership!.outstanding_balance).toBe(0);
    expect(memberDetails!.payments.length).toBe(1);
  });

  it('approves QR registration with partial payment', () => {
    const reg = gymService.createRegistrationRequest({
      gym_slug: 'iron-pulse',
      full_name: 'Kabir Verma',
      phone: '9811122233',
      plan_id: 'plan-monthly-01', // 1500
    });

    const approval = gymService.approveRegistrationWithPayment({
      registration_id: reg.registration_id,
      payment_received: true,
      amount_received: 500,
      payment_method: 'cash',
      gym_id: 'gym-demo-01',
    });

    expect(approval.membership.status).toBe('partial');
    const memberDetails = gymService.getMemberById(approval.member.id, 'gym-demo-01');
    expect(memberDetails!.member.membership!.outstanding_balance).toBe(1000);
  });

  it('approves QR registration with NO payment (payment pending)', () => {
    const reg = gymService.createRegistrationRequest({
      gym_slug: 'iron-pulse',
      full_name: 'Pooja Hegde',
      phone: '9822233344',
      plan_id: 'plan-monthly-01', // 1500
    });

    const approval = gymService.approveRegistrationWithPayment({
      registration_id: reg.registration_id,
      payment_received: false,
      gym_id: 'gym-demo-01',
    });

    expect(approval.membership.status).toBe('pending');
    expect(approval.payment).toBeNull();
    const memberDetails = gymService.getMemberById(approval.member.id, 'gym-demo-01');
    expect(memberDetails!.member.membership!.outstanding_balance).toBe(1500);
    expect(memberDetails!.payments.length).toBe(0);
  });

  it('manages settings and automation rules', () => {
    // 1. Get settings and automation rules
    const settings = gymService.getSettings('gym-demo-01');
    const rules = gymService.getAutomationRules('gym-demo-01');
    expect(settings).toBeDefined();
    expect(settings.general).toBeDefined();
    expect(rules.length).toBe(10); // 10 core event rules

    // 2. Update settings
    const updated = gymService.updateSettings('gym-demo-01', {
      payments: { upi_id: 'mygym@upi' },
      rules: { auto_cancel_overdue_days: 15 },
    });
    expect(updated.upi_id).toBe('mygym@upi');
    expect(updated.auto_cancel_overdue_days).toBe(15);

    // 3. Update automation rule
    const ruleId = rules[0].id;
    const updatedRule = gymService.updateAutomationRule(
      'gym-demo-01',
      ruleId,
      { is_enabled: false, template_name: 'Custom template text' }
    );
    expect(updatedRule.is_enabled).toBe(false);
    expect(updatedRule.template_name).toBe('Custom template text');
  });

  it('applies auto-cancellation to overdue members beyond threshold', () => {
    // Set auto cancel to 1 day
    gymService.updateSettings('gym-demo-01', {
      auto_cancel_overdue_days: 1,
    });

    // Check and apply
    const autoCancelled = gymService.checkAndApplyAutoCancellation('gym-demo-01');
    expect(autoCancelled).toBeDefined();
  });
});
