'use client';

import React, { useState } from 'react';
import { PaymentMethod, MemberWithDetails } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { X, CheckCircle2, CreditCard, Banknote, Smartphone, HelpCircle, Loader2 } from 'lucide-react';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithDetails | null;
  onPaymentSuccess: (res: {
    total_paid: number;
    remaining_balance: number;
    new_status: string;
  }) => void;
}

export default function MarkPaidModal({
  isOpen,
  onClose,
  member,
  onPaymentSuccess,
}: MarkPaidModalProps) {
  const membership = member?.membership;
  const initialOutstanding = membership?.outstanding_balance ?? 0;

  const [amount, setAmount] = useState<number>(initialOutstanding);
  const [method, setMethod] = useState<PaymentMethod>(
    member?.last_payment_method || 'upi'
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when member changes or opens
  React.useEffect(() => {
    if (member?.membership) {
      setAmount(member.membership.outstanding_balance);
      setMethod(member.last_payment_method || 'upi');
      setNotes('');
      setError(null);
    }
  }, [member, isOpen]);

  if (!isOpen || !member || !membership) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // double-click safeguard

    if (amount <= 0) {
      setError('Please enter an amount greater than 0');
      return;
    }
    if (amount > initialOutstanding) {
      setError(`Amount cannot exceed the pending balance of ${formatINR(initialOutstanding)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Call API or internal service
      const res = await fetch('/api/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          membership_id: membership.id,
          amount: Number(amount),
          payment_method: method,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      onPaymentSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFullPayment = Number(amount) === initialOutstanding;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
            <p className="text-sm text-slate-500">{member.full_name} • {membership.plan_name_snapshot}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Outstanding Balance Badge */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-500">Current Outstanding</p>
              <p className="text-2xl font-black text-slate-900">{formatINR(initialOutstanding)}</p>
            </div>
            {membership.is_overdue ? (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                Overdue by {membership.days_overdue} days
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                Payment Due
              </span>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Payment Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                max={initialOutstanding}
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-4 text-xl font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                placeholder="0"
                disabled={isSubmitting}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setAmount(initialOutstanding)}
                className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Pay full balance ({formatINR(initialOutstanding)})
              </button>
              {!isFullPayment && amount > 0 && amount < initialOutstanding && (
                <span className="text-amber-600 font-medium">
                  Remaining balance: {formatINR(initialOutstanding - amount)}
                </span>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                disabled={isSubmitting}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left font-medium transition ${
                  method === 'upi'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Smartphone className={`h-5 w-5 ${method === 'upi' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold">UPI</div>
                  <div className="text-xs text-slate-500">GPay, PhonePe, Paytm</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cash')}
                disabled={isSubmitting}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left font-medium transition ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Banknote className={`h-5 w-5 ${method === 'cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold">Cash</div>
                  <div className="text-xs text-slate-500">Handed at reception</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('online')}
                disabled={isSubmitting}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left font-medium transition ${
                  method === 'online'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <CreditCard className={`h-5 w-5 ${method === 'online' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold">Online / Card</div>
                  <div className="text-xs text-slate-500">POS / Bank transfer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('other')}
                disabled={isSubmitting}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left font-medium transition ${
                  method === 'other'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <HelpCircle className={`h-5 w-5 ${method === 'other' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold">Other</div>
                  <div className="text-xs text-slate-500">Cheque, adjustment</div>
                </div>
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Notes <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Transaction ID, remarks"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-base font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>
                    Confirm {formatINR(amount)} Payment
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
