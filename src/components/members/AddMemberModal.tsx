'use client';

import React, { useState } from 'react';
import { MembershipPlan } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { getTodayDateString } from '@/lib/utils/date';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: MembershipPlan[];
  onMemberAdded: () => void;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  plans,
  onMemberAdded,
}: AddMemberModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (plans.length > 0 && !planId) {
      setPlanId(plans[0].id);
    }
  }, [plans, planId]);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === planId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      setError('Please enter member name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!planId) {
      setError('Please select a membership plan');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          plan_id: planId,
          start_date: startDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add member');
      }

      // Notify owner that member was successfully saved to database
      window.dispatchEvent(
        new CustomEvent('gym:toast-notification', {
          detail: {
            title: '✅ Member Saved to Database!',
            subtitle: `${fullName.trim()} has been successfully saved to your database.`,
            type: 'success',
          },
        })
      );

      onMemberAdded();
      onClose();
      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong while adding member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Add New Member</h2>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
            <p className="mt-1 text-xs text-slate-400">Used for manual WhatsApp payment reminders</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Email Address <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@example.com"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Plan *
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition bg-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.price)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>
          </div>

          {selectedPlan && (
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
              <span>Duration: <strong className="text-slate-800">{selectedPlan.duration_days} days</strong></span>
              <span>Amount Due: <strong className="text-emerald-700 text-sm">{formatINR(selectedPlan.price)}</strong></span>
            </div>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Member...</span>
                </>
              ) : (
                <span>Save Member & Generate Due</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
