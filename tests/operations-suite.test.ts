import { describe, it, expect } from 'vitest';
import { gymService } from '../src/lib/data/service';
import { isExpiringSoon, getDaysUntil, formatISODate } from '../src/lib/utils/date';
import { exportMembersToExcel } from '../src/lib/utils/excelExport';

describe('Operations & Gym Management Suite', () => {
  describe('1. Daily Cash vs UPI Collection Breakdown', () => {
    it('accurately calculates cash, upi, and online breakdown from today payments', () => {
      // Record a cash payment
      gymService.recordPayment({
        member_id: 'member-01',
        membership_id: 'mship-01',
        amount: 500,
        payment_method: 'cash',
        notes: 'Test cash drawer',
      });

      // Record a UPI payment
      gymService.recordPayment({
        member_id: 'member-02',
        membership_id: 'mship-02',
        amount: 1200,
        payment_method: 'upi',
        notes: 'Test UPI QR',
      });

      const metrics = gymService.getDashboardMetrics();
      expect(metrics.today_cash_collection).toBeGreaterThanOrEqual(500);
      expect(metrics.today_upi_collection).toBeGreaterThanOrEqual(1200);
      expect(metrics.today_collection).toBe(
        metrics.today_cash_collection + metrics.today_upi_collection + metrics.today_online_collection
      );
    });
  });

  describe('2. Expiring Soon Date Utilities & Filter', () => {
    it('identifies dates within 7 days as expiring soon', () => {
      const now = new Date();
      
      // Exactly 3 days from now
      const in3Days = new Date(now);
      in3Days.setDate(in3Days.getDate() + 3);
      const str3Days = formatISODate(in3Days);

      expect(isExpiringSoon(str3Days, 7)).toBe(true);
      expect(getDaysUntil(str3Days)).toBe(3);

      // 10 days from now (outside 7 day window)
      const in10Days = new Date(now);
      in10Days.setDate(in10Days.getDate() + 10);
      const str10Days = formatISODate(in10Days);

      expect(isExpiringSoon(str10Days, 7)).toBe(false);

      // Yesterday (already past, not expiring soon)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const strYesterday = formatISODate(yesterday);

      expect(isExpiringSoon(strYesterday, 7)).toBe(false);
      expect(getDaysUntil(strYesterday)).toBeLessThan(0);
    });

    it('filters members list by expiring_soon', () => {
      const expiringList = gymService.getMembersWithDetails({ filter: 'expiring_soon' });
      expect(Array.isArray(expiringList)).toBe(true);
      expiringList.forEach((m) => {
        expect(m.membership).not.toBeNull();
        expect(isExpiringSoon(m.membership!.end_date, 7)).toBe(true);
      });
    });
  });

  describe('3. 1-Click Plan Renewal Engine', () => {
    it('renews membership with new plan duration and records payment', () => {
      const plans = gymService.getPlans();
      const selectedPlan = plans[0]; // 1-month or 3-month

      const renewalResult = gymService.renewMembership({
        member_id: 'member-01',
        plan_id: selectedPlan.id,
        amount_paid: selectedPlan.price,
        payment_method: 'upi',
        notes: 'Annual renewal discount applied',
      });

      expect(renewalResult.success).toBe(true);
      expect(renewalResult.membership).toBeDefined();
      expect(renewalResult.membership.plan_id).toBe(selectedPlan.id);
      expect(renewalResult.membership.status).toBe('paid');
      expect(renewalResult.member.membership!.outstanding_balance).toBe(0);
      expect(renewalResult.payment).toBeDefined();
      expect(renewalResult.payment!.amount).toBe(selectedPlan.price);
      expect(renewalResult.payment!.payment_method).toBe('upi');

      // Verify member state is active
      const member = gymService.getMemberById('member-01');
      expect(member!.member.membership?.lifecycle).toBe('active');
    });

    it('renews membership with partial payment and leaves balance due', () => {
      const plans = gymService.getPlans();
      const plan = plans.find((p) => p.price >= 2000) || plans[0];
      const partialPay = Math.floor(plan.price / 2);

      const renewalResult = gymService.renewMembership({
        member_id: 'member-03',
        plan_id: plan.id,
        amount_paid: partialPay,
        payment_method: 'cash',
        notes: 'Half now, half next week',
      });

      expect(renewalResult.success).toBe(true);
      expect(renewalResult.membership.amount_due).toBe(plan.price);
      expect(renewalResult.member.membership!.outstanding_balance).toBe(plan.price - partialPay);
      expect(renewalResult.membership.status).toBe('partial');
    });
  });

  describe('4. Excel Export Utility', () => {
    it('formats member records into an Excel workbook structure without errors', () => {
      const members = gymService.getMembersWithDetails();
      expect(members.length).toBeGreaterThan(0);

      // In Node/Vitest environment, test that exportMembersToExcel generates without error
      expect(() => {
        exportMembersToExcel(members, 'test-export.xlsx');
      }).not.toThrow();
    });
  });
});
