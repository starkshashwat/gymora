'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Payment } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatExactDateTime } from '@/lib/utils/date';
import {
  X,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  MessageCircle,
  ExternalLink,
  Receipt,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: (Payment & { member_name?: string; plan_name?: string }) | null;
}

export default function PaymentDetailsModal({
  isOpen,
  onClose,
  payment,
}: PaymentDetailsModalProps) {
  const router = useRouter();

  if (!isOpen || !payment) return null;

  const memberName = payment.member_name || 'Member';
  const exactTime = formatExactDateTime(payment.paid_at || payment.created_at);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
            <Smartphone className="h-3.5 w-3.5" /> UPI Transfer
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
            <Banknote className="h-3.5 w-3.5" /> Cash at Desk
          </span>
        );
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
            <CreditCard className="h-3.5 w-3.5" /> Online Gateway
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            <CreditCard className="h-3.5 w-3.5" /> {method}
          </span>
        );
    }
  };

  const handleNavigateToMember = () => {
    onClose();
    if (payment.member_id) {
      router.push(`/members/${payment.member_id}`);
    }
  };

  const handleShareReceiptWhatsApp = () => {
    const text = encodeURIComponent(
      `*Payment Receipt*\n\n` +
      `Dear ${memberName},\n` +
      `We have received your payment of *${formatINR(payment.amount)}*.\n` +
      `• Date & Time: ${exactTime}\n` +
      `• Payment Mode: ${payment.payment_method.toUpperCase()}\n` +
      `• Status: Confirmed & Settled\n\n` +
      `Thank you for staying active!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Receipt className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Payment Details
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Verified transaction record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hero Amount */}
        <div className="my-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-5 text-center border border-zinc-100 dark:border-zinc-800">
          <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatINR(payment.amount)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Paid & Verified
            </span>
            {getMethodBadge(payment.payment_method)}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 text-sm">
          {/* Member Row */}
          <div className="flex items-center justify-between rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 p-3 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              <span>Member</span>
            </div>
            {payment.member_id ? (
              <button
                onClick={handleNavigateToMember}
                className="group flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 transition"
              >
                <span>{memberName}</span>
                <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-emerald-600 transition" />
              </button>
            ) : (
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {memberName}
              </span>
            )}
          </div>

          {/* Timestamp Row */}
          <div className="flex items-center justify-between rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 p-3 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>Exact Time</span>
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {exactTime}
            </span>
          </div>

          {/* Plan Name Snapshot (if exists) */}
          {payment.plan_name && (
            <div className="flex items-center justify-between rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 p-3 border border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>Plan</span>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {payment.plan_name}
              </span>
            </div>
          )}

          {/* Notes (if any) */}
          {payment.notes && (
            <div className="rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 p-3 border border-zinc-100 dark:border-zinc-800/60 text-xs">
              <div className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider mb-1">
                Transaction Notes
              </div>
              <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                {payment.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2.5">
          <button
            onClick={handleShareReceiptWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Send WhatsApp Receipt</span>
          </button>

          {payment.member_id && (
            <button
              onClick={handleNavigateToMember}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white py-2.5 text-xs font-bold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition shadow-sm"
            >
              <span>View Profile</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
