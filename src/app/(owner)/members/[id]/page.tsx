'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MemberWithDetails, Payment, MembershipLifecycle } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate } from '@/lib/utils/date';
import { buildWhatsAppReminderUrl } from '@/lib/utils/whatsapp';
import MarkPaidModal from '@/components/payments/MarkPaidModal';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Banknote,
  Smartphone,
  HelpCircle,
  ShieldCheck,
  Loader2,
  Trash2,
  X,
  Pause,
  Play,
  Ban,
  MoreVertical,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [member, setMember] = useState<MemberWithDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lifecycle action states
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);

  // Delete Member state (deep danger zone)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/members/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setMember(data.member);
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handlePaymentSuccess = (res: any) => {
    setToastMessage(`Payment of ₹${res.amount_recorded || res.amount} recorded successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
    loadData();
    window.dispatchEvent(new Event('gym:member-updated'));
  };

  const handleLifecycleAction = async (action: 'pause' | 'cancel' | 'reactivate', reason?: string) => {
    try {
      setIsLifecycleLoading(true);
      const res = await fetch(`/api/members/${params.id}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action} membership`);
      }

      setToastMessage(data.message || `Membership ${action}d successfully`);
      setTimeout(() => setToastMessage(null), 4000);
      setIsCancelModalOpen(false);
      setCancellationReason('');
      setIsMoreMenuOpen(false);
      loadData();
      window.dispatchEvent(new Event('gym:member-updated'));
    } catch (err: any) {
      alert(err.message || `Error updating membership lifecycle`);
    } finally {
      setIsLifecycleLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/members/${params.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete member');
      }

      window.dispatchEvent(new Event('gym:member-updated'));
      router.push('/members');
    } catch (err: any) {
      alert(err.message || 'Error deleting member');
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const getLifecycleBadge = (lifecycle?: MembershipLifecycle) => {
    switch (lifecycle) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <Pause className="h-3 w-3" />
            Paused
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <Ban className="h-3 w-3" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
            Expired
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
            Active
          </span>
        );
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 uppercase">
            <Smartphone className="h-3 w-3" /> UPI
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 uppercase">
            <Banknote className="h-3 w-3" /> Cash
          </span>
        );
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 uppercase">
            <CreditCard className="h-3 w-3" /> Online
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 uppercase">
            <HelpCircle className="h-3 w-3" /> Other
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900">Member Not Found</h2>
        <Link href="/members" className="mt-4 inline-block text-emerald-600 font-bold hover:underline">
          Back to members
        </Link>
      </div>
    );
  }

  const mship = member.membership;
  const lifecycle = mship?.lifecycle || 'active';
  const hasOutstanding = (mship?.outstanding_balance || 0) > 0;
  const waUrl = buildWhatsAppReminderUrl({
    phone: member.phone,
    name: member.full_name,
    amount: mship?.outstanding_balance || 0,
    statusType: mship?.is_overdue ? 'overdue' : 'due',
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6 pb-12">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button */}
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to members</span>
        </Link>
      </div>

      {/* Lifecycle Alerts if Cancelled or Paused */}
      {lifecycle === 'cancelled' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Ban className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Membership Cancelled</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Cancelled on {formatDisplayDate(mship?.cancelled_at || mship?.updated_at)}.
                {mship?.cancellation_reason && (
                  <span className="ml-1 font-semibold">Reason: &ldquo;{mship.cancellation_reason}&rdquo;</span>
                )}
              </p>
              <p className="text-xs text-rose-600/80 mt-1">
                Historical payment and attendance records remain preserved for accounting.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleLifecycleAction('reactivate')}
            disabled={isLifecycleLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition shrink-0"
          >
            {isLifecycleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>Reactivate Membership</span>
          </button>
        </div>
      )}

      {lifecycle === 'paused' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Pause className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Membership Paused</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Billing cycle frozen on {formatDisplayDate(mship?.paused_at || mship?.updated_at)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleLifecycleAction('reactivate')}
            disabled={isLifecycleLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition shrink-0"
          >
            {isLifecycleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>Resume Membership</span>
          </button>
        </div>
      )}

      {/* Member Header Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {member.full_name}
            </h1>
            {getLifecycleBadge(lifecycle)}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              Payment: {mship?.status || 'None'}
            </span>
            {member.whatsapp_opt_in ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                WhatsApp Opted-In
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                WhatsApp: Manual
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{member.phone}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{member.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Member Since: {formatDisplayDate(member.joined_at)}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons & Operations Menu */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* WhatsApp Primary */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp</span>
          </a>

          {/* Mark Paid Primary */}
          <button
            onClick={() => setIsMarkPaidOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mark Paid</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <span>More</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 text-sm">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lifecycle Controls
                </div>

                {lifecycle === 'active' && (
                  <button
                    onClick={() => handleLifecycleAction('pause')}
                    disabled={isLifecycleLoading}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                  >
                    <Pause className="h-4 w-4 text-amber-600" />
                    <span>Pause Membership</span>
                  </button>
                )}

                {lifecycle === 'paused' && (
                  <button
                    onClick={() => handleLifecycleAction('reactivate')}
                    disabled={isLifecycleLoading}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <Play className="h-4 w-4 text-emerald-600" />
                    <span>Resume Membership</span>
                  </button>
                )}

                {lifecycle !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsCancelModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
                  >
                    <Ban className="h-4 w-4 text-rose-600" />
                    <span>Cancel Membership</span>
                  </button>
                )}

                {lifecycle === 'cancelled' && (
                  <button
                    onClick={() => handleLifecycleAction('reactivate')}
                    disabled={isLifecycleLoading}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <RefreshCw className="h-4 w-4 text-emerald-600" />
                    <span>Reactivate Membership</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Destructive Zone
                </div>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Member...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Membership Breakdown */}
      {mship ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Current Plan</span>
            <div className="mt-1 text-lg font-black text-slate-900">{mship.plan_name_snapshot}</div>
            <div className="mt-1 text-xs text-slate-500">
              Cycle: {formatDisplayDate(mship.start_date)} – {formatDisplayDate(mship.end_date)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Total Cycle Cost</span>
            <div className="mt-1 text-lg font-black text-slate-900">{formatINR(mship.amount_due)}</div>
            <div className="mt-1 text-xs text-slate-500">Plan price for active cycle</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Paid So Far</span>
            <div className="mt-1 text-lg font-black text-emerald-600">{formatINR(mship.total_paid)}</div>
            <div className="mt-1 text-xs text-slate-500">Confirmed receipts</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Balance Pending</span>
            <div className={`mt-1 text-lg font-black ${mship.outstanding_balance > 0 ? (mship.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}`}>
              {formatINR(mship.outstanding_balance)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {mship.outstanding_balance > 0
                ? mship.is_overdue
                  ? `Due date was ${formatDisplayDate(mship.due_date)} (${mship.days_overdue}d overdue)`
                  : `Due on ${formatDisplayDate(mship.due_date)}`
                : 'Fully Settled'}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Clock className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-base font-bold text-slate-900">No Active Membership Plan</h3>
          <p className="text-sm text-slate-500 mt-1">This member does not have an active billing cycle assigned.</p>
        </div>
      )}

      {/* Payment History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Payment History</h3>
            <p className="text-xs text-slate-500">All recorded transactions and receipts for this member.</p>
          </div>
          <button
            onClick={() => setIsMarkPaidOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
            <span>Record Payment</span>
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center">
            <Banknote className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">No payment records found.</p>
            <button
              onClick={() => setIsMarkPaidOpen(true)}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              Record First Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">Method</th>
                  <th className="py-3 px-5">Notes</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5 font-medium text-slate-700">
                      {formatDisplayDate(p.paid_at)}
                    </td>
                    <td className="py-3.5 px-5 font-black text-slate-900">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3.5 px-5">
                      {getMethodBadge(p.payment_method)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                      {p.notes || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                        <CheckCircle className="h-3 w-3" /> Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Membership Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 border border-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">Cancel Membership</h3>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 text-sm text-slate-600 space-y-3">
              <p>
                Cancel active membership for <strong className="text-slate-900">{member.full_name}</strong>.
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ℹ️ This updates membership status to <strong>Cancelled</strong>. Historical payment records are preserved. You can reactivate at any time.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Relocating, Medical reason, Switched gym"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isLifecycleLoading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleLifecycleAction('cancel', cancellationReason)}
                disabled={isLifecycleLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition"
              >
                {isLifecycleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal (Deep Destructive Zone) */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">Permanently Delete Member</h3>
              </div>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              <p>
                Are you sure you want to completely erase <strong className="text-slate-900">{member.full_name}</strong>?
              </p>
              <p className="mt-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium leading-relaxed">
                ⚠️ <strong>Severe Warning:</strong> This will delete all membership history, financial transactions, and audit records. To temporarily stop membership, use <strong>Pause</strong> or <strong>Cancel</strong> instead.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => setIsMarkPaidOpen(false)}
        member={member}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
