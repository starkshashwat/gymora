'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MemberWithDetails } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate } from '@/lib/utils/date';
import { buildWhatsAppReminderUrl } from '@/lib/utils/whatsapp';
import MarkPaidModal from '@/components/payments/MarkPaidModal';
import {
  Search,
  CheckCircle,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  User,
  UserPlus,
  Trash2,
  X,
} from 'lucide-react';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue' | 'paid'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mark Paid modal
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Delete Member state
  const [memberToDelete, setMemberToDelete] = useState<MemberWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (filter !== 'all') queryParams.set('filter', filter);

      const res = await fetch(`/api/members?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, filter]);

  useEffect(() => {
    const handleRefresh = () => loadMembers();
    const handleToast = (e: any) => {
      if (e.detail?.title) {
        setToastMessage(`${e.detail.title} ${e.detail.subtitle || ''}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    };
    window.addEventListener('gym:member-updated', handleRefresh);
    window.addEventListener('gym:toast-notification', handleToast);
    return () => {
      window.removeEventListener('gym:member-updated', handleRefresh);
      window.removeEventListener('gym:toast-notification', handleToast);
    };
  }, []);

  const handleOpenMarkPaid = (member: MemberWithDetails) => {
    setSelectedMember(member);
    setIsMarkPaidOpen(true);
  };

  const handlePaymentSuccess = (res: any) => {
    setToastMessage(`Payment of ₹${res.amount_recorded || res.amount} recorded successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
    loadMembers();
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/members/${memberToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete member');
      }

      setToastMessage(`Member ${memberToDelete.full_name} deleted from database successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
      setMemberToDelete(null);
      loadMembers();
      window.dispatchEvent(new Event('gym:member-updated'));
    } catch (err: any) {
      alert(err.message || 'Error deleting member');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (m: MemberWithDetails) => {
    const mship = m.membership;
    if (!mship) {
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          No Plan
        </span>
      );
    }

    if (mship.outstanding_balance === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Paid</span>
        </span>
      );
    }

    if (mship.is_overdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          <span>{mship.days_overdue}d Overdue</span>
        </span>
      );
    }

    if (mship.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>Partial Due</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span>Due</span>
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-4 max-w-md">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Gym Members
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Search members, inspect subscription cycles, and manage dues.
          </p>
        </div>

        <button
          onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition dark:bg-white dark:text-zinc-900"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center rounded-xl bg-slate-200/80 p-1 text-xs font-bold text-slate-600 shrink-0">
          {(['all', 'due', 'overdue', 'paid'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3.5 py-1.5 capitalize transition ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No members found</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              {search ? 'Try refining your search or filter criteria.' : 'Start managing your gym by adding your first member.'}
            </p>
            <button
              onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Your First Member</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const mship = m.membership;
              const hasOutstanding = (mship?.outstanding_balance || 0) > 0;
              const waUrl = hasOutstanding
                ? buildWhatsAppReminderUrl({
                    phone: m.phone,
                    name: m.full_name,
                    amount: mship?.outstanding_balance || 0,
                    statusType: mship?.is_overdue ? 'overdue' : 'due',
                  })
                : undefined;

              return (
                <div
                  key={m.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/members/${m.id}`}
                        className="text-base font-bold text-slate-900 hover:text-emerald-600 transition truncate"
                      >
                        {m.full_name}
                      </Link>
                      {getStatusBadge(m)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span>{m.phone}</span>
                      {m.email && <span>• {m.email}</span>}
                      <span>• Plan: <strong className="text-slate-700">{mship?.plan_name_snapshot || 'None'}</strong></span>
                      {mship?.due_date && (
                        <span>• Due: <strong>{formatDisplayDate(mship.due_date)}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Financial amounts & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Outstanding</div>
                      <div className={`text-base font-black ${hasOutstanding ? (mship?.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600'}`}>
                        {formatINR(mship?.outstanding_balance || 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasOutstanding && waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          title="WhatsApp reminder"
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                          <span className="hidden md:inline">WhatsApp</span>
                        </a>
                      )}

                      {hasOutstanding ? (
                        <button
                          onClick={() => handleOpenMarkPaid(m)}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">
                          Paid
                        </span>
                      )}

                      {/* Delete Member Button */}
                      <button
                        onClick={() => setMemberToDelete(m)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete member from database"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <Link
                        href={`/members/${m.id}`}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        title="View member details"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Delete Member</h3>
              <button
                onClick={() => setMemberToDelete(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              <p>
                Are you sure you want to delete <strong className="text-slate-900">{memberToDelete.full_name}</strong>?
              </p>
              <p className="mt-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                ⚠️ This will permanently remove this member along with their membership cycles and payment history from the database.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
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
                    <span>Yes, Delete</span>
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
        member={selectedMember}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
