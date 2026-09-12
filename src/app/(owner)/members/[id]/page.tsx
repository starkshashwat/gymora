'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MemberWithDetails, Payment } from '@/lib/types/database';
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
} from 'lucide-react';

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const [member, setMember] = useState<MemberWithDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/members/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setMember(data.member);
        setPayments(data.payments);
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
    setToastMessage(`Payment of ₹${res.amount_recorded} recorded successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
    loadData();
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
  const hasOutstanding = (mship?.outstanding_balance || 0) > 0;
  const waUrl = hasOutstanding
    ? buildWhatsAppReminderUrl({
        phone: member.phone,
        name: member.full_name,
        amount: mship?.outstanding_balance || 0,
        statusType: mship?.is_overdue ? 'overdue' : 'due',
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
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

      {/* Member Header Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {member.full_name}
            </h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase">
              {member.status}
            </span>
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
              <span>Joined: {formatDisplayDate(member.joined_at)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {hasOutstanding && waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <span>Send WhatsApp</span>
            </a>
          )}

          {hasOutstanding ? (
            <button
              onClick={() => setIsMarkPaidOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Mark Paid</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Up to Date</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Membership Breakdown */}
      {mship ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="mt-1 text-xs text-slate-500">Plan price</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Paid So Far</span>
            <div className="mt-1 text-lg font-black text-emerald-600">{formatINR(mship.total_paid)}</div>
            <div className="mt-1 text-xs text-slate-500">Verified received</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400">Remaining Balance</span>
            <div className={`mt-1 text-lg font-black ${hasOutstanding ? (mship.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600'}`}>
              {formatINR(mship.outstanding_balance)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {hasOutstanding
                ? mship.is_overdue
                  ? `Overdue since ${formatDisplayDate(mship.due_date)}`
                  : `Due on ${formatDisplayDate(mship.due_date)}`
                : 'Fully settled'}
            </div>
          </div>
        </div>
      ) : null}

      {/* Payment History (Immutable Financial Records) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
          <p className="text-xs text-slate-500">Immutable financial ledger of all transactions.</p>
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-slate-400">
            No payments recorded yet for this member.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {formatINR(p.amount)}
                    </span>
                    {getMethodBadge(p.payment_method)}
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Paid: {formatDisplayDate(p.paid_at)} {p.notes && `• "${p.notes}"`}
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  TX: {p.id.slice(0, 12)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
