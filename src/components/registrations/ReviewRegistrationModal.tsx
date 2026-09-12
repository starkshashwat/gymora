'use client';

import React, { useState, useEffect } from 'react';
import { RegistrationRequest, PaymentMethod } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate } from '@/lib/utils/date';
import {
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  User,
  Phone,
  Mail,
  Layers,
  Calendar,
} from 'lucide-react';

interface ReviewRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RegistrationRequest | null;
  onApproved: (result: any) => void;
}

export default function ReviewRegistrationModal({
  isOpen,
  onClose,
  registration,
  onApproved,
}: ReviewRegistrationModalProps) {
  const planPrice = registration?.plan_price_snapshot || 0;

  const [paymentReceived, setPaymentReceived] = useState<boolean>(true);
  const [amountReceived, setAmountReceived] = useState<number>(planPrice);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registration) {
      setPaymentReceived(true);
      setAmountReceived(registration.plan_price_snapshot || 0);
      setPaymentMethod('upi');
      setNotes('');
      setError(null);
    }
  }, [registration, isOpen]);

  if (!isOpen || !registration) return null;

  const remainingBalance = paymentReceived ? Math.max(0, planPrice - Number(amountReceived)) : planPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (paymentReceived) {
      if (amountReceived <= 0) {
        setError('Please enter a valid amount received or select "No" for pending payment');
        return;
      }
      if (amountReceived > planPrice) {
        setError(`Amount received cannot exceed the plan price of ${formatINR(planPrice)}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: registration.id,
          payment_received: paymentReceived,
          amount_received: paymentReceived ? Number(amountReceived) : 0,
          payment_method: paymentReceived ? paymentMethod : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve registration');
      }

      onApproved(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error processing registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Review QR Registration</h2>
              <p className="text-xs text-slate-500">Verify member details and record initial payment.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Applicant Summary Card */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Applicant</span>
            {registration.whatsapp_opt_in && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                WhatsApp Updates Agreed
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 text-base">{registration.full_name}</div>
            <div className="text-xs font-medium text-slate-500">{registration.phone}</div>
          </div>
          {registration.email && (
            <div className="text-xs text-slate-500">{registration.email}</div>
          )}
          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500">Selected Plan: </span>
              <strong className="text-slate-800">{registration.plan_name_snapshot}</strong>
            </div>
            <div className="text-base font-black text-slate-900">{formatINR(planPrice)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Question: Payment Received? */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Payment Received from Member? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentReceived(true)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold border transition ${
                  paymentReceived
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/30 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${paymentReceived ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>YES, Received</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentReceived(false)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold border transition ${
                  !paymentReceived
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/30 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className={`h-4 w-4 ${!paymentReceived ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>NO, Due Later</span>
              </button>
            </div>
          </div>

          {/* Conditional Payment Details */}
          {paymentReceived ? (
            <div className="space-y-4 rounded-2xl bg-emerald-50/40 p-4 border border-emerald-100">
              {/* Amount Received Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={planPrice}
                    step="any"
                    required
                    value={amountReceived || ''}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-4 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setAmountReceived(planPrice)}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Full price: {formatINR(planPrice)}
                  </button>
                  <span className={remainingBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {remainingBalance > 0 ? `Remaining Due: ${formatINR(remainingBalance)}` : 'Fully Paid'}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'upi', label: 'UPI', desc: 'GPay/PhonePe', icon: Smartphone },
                    { id: 'cash', label: 'Cash', desc: 'Reception Counter', icon: Banknote },
                    { id: 'local_qr', label: 'Local QR', desc: 'Reception Code', icon: QrCode },
                    { id: 'online', label: 'Gateway', desc: 'Online / Card', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                          isSelected
                            ? 'border-emerald-600 bg-white ring-2 ring-emerald-600/30 text-emerald-900 font-bold shadow-sm'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold">{m.label}</div>
                          <div className="text-[10px] text-slate-500">{m.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. UTR / Transaction ID or cash note"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Member will be enrolled with Payment Pending</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                Outstanding balance will be set to <strong>{formatINR(planPrice)}</strong>. The owner can record payment via <em>Mark Paid</em> at any time later.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Approve & Enroll Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
