'use client';

import React, { useState, useEffect } from 'react';
import { MemberWithDetails, MembershipPlan, PaymentMethod } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { getTodayDateString, formatDisplayDate } from '@/lib/utils/date';
import {
  RefreshCw,
  X,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RenewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithDetails | null;
  onSuccess?: (result: any) => void;
  onRenewSuccess?: (result?: any) => void;
}

export default function RenewPlanModal({
  isOpen,
  onClose,
  member,
  onSuccess,
  onRenewSuccess,
}: RenewPlanModalProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans on mount or open
  useEffect(() => {
    if (!isOpen) return;

    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true);
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (data.success && data.plans) {
          setPlans(data.plans);
          // Pre-select member's current plan or first active plan
          const currentPlanId = member?.membership?.plan_id;
          const match = data.plans.find((p: MembershipPlan) => p.id === currentPlanId) || data.plans[0];
          if (match) {
            setSelectedPlanId(match.id);
            setAmountPaid(match.price);
          }
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();

    // Default start date calculation:
    // If member's current plan is active and ends in the future, start on that day
    const today = getTodayDateString();
    const currentEnd = member?.membership?.end_date;
    if (currentEnd && currentEnd > today && member?.membership?.lifecycle === 'active') {
      setStartDate(currentEnd);
    } else {
      setStartDate(today);
    }
  }, [isOpen, member]);

  // When selected plan changes, update default amount to pay
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setAmountPaid(plan.price);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Calculate new end date preview
  const calculateEndDate = () => {
    if (!selectedPlan || !startDate) return '—';
    try {
      const d = new Date(startDate);
      d.setDate(d.getDate() + selectedPlan.duration_days);
      return d.toISOString().slice(0, 10);
    } catch {
      return '—';
    }
  };

  const calculatedEndDate = calculateEndDate();

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedPlanId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/members/${member.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          start_date: startDate,
          amount_paid: Number(amountPaid) || 0,
          payment_method: paymentMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to renew membership');
      }

      window.dispatchEvent(
        new CustomEvent('gym:toast-notification', {
          detail: {
            title: '✅ Membership Renewed!',
            subtitle: `${member.full_name}'s plan has been extended to ${formatDisplayDate(calculatedEndDate)}.`,
          },
        })
      );
      window.dispatchEvent(new Event('gym:member-updated'));

      if (onSuccess) onSuccess(data);
      if (onRenewSuccess) onRenewSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during renewal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Renew Membership Plan
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Extend membership cycle & log renewal payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member Preview Strip */}
        <div className="bg-zinc-50 dark:bg-zinc-950/60 px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{member.full_name}</span>
            <span className="text-zinc-400 ml-2">({member.phone})</span>
          </div>
          <div className="text-zinc-500">
            Current: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{member.membership?.plan_name_snapshot || 'None'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRenew} className="p-6 space-y-4">
          {/* Plan Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Select Renewal Plan
            </label>
            {isLoadingPlans ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading plans...
              </div>
            ) : (
              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.duration_days} Days) — {formatINR(p.price)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Range Calculation Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 p-3.5 space-y-3">
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>Calculated Membership Cycle</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  Cycle Starts On
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  Cycle Expires On
                </label>
                <div className="w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/50 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatDisplayDate(calculatedEndDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Payment Received Now (₹)
              </label>
              {selectedPlan && (
                <span className="text-xs font-semibold text-zinc-500">
                  Plan Fee: {formatINR(selectedPlan.price)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-8 pr-4 py-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'cash' as const, label: 'Cash', icon: Banknote },
                { id: 'upi' as const, label: 'UPI QR', icon: Smartphone },
                { id: 'online' as const, label: 'Online', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Renewed for festive quarter"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPlanId}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Renewing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Renewal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
