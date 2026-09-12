'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MemberWithDetails, MembershipLifecycle, MemberFilterType } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate, isExpiringSoon } from '@/lib/utils/date';
import { buildWhatsAppReminderUrl } from '@/lib/utils/whatsapp';
import { exportMembersToExcel } from '@/lib/utils/excelExport';
import MarkPaidModal from '@/components/payments/MarkPaidModal';
import RenewPlanModal from '@/components/members/RenewPlanModal';
import MemberFilterModal from '@/components/members/MemberFilterModal';
import {
  Search,
  CheckCircle,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Filter,
  Loader2,
  User,
  UserPlus,
  Pause,
  Play,
  Ban,
  MoreVertical,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  HelpCircle,
  RefreshCw,
  X,
  Phone,
  Download,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilterType>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const filterCounts: Partial<Record<MemberFilterType, number>> = {
    all: members.length,
    due: members.filter((m) => (m.membership?.outstanding_balance || 0) > 0 && !m.membership?.is_overdue).length,
    overdue: members.filter((m) => m.membership?.is_overdue).length,
    expiring_soon: members.filter((m) => isExpiringSoon(m.membership?.end_date)).length,
    paid: members.filter((m) => m.membership && m.membership.outstanding_balance === 0).length,
    paused: members.filter((m) => m.membership?.lifecycle === 'paused').length,
    cancelled: members.filter((m) => m.membership?.lifecycle === 'cancelled').length,
  };

  const getFilterLabel = (f: MemberFilterType) => {
    switch (f) {
      case 'due': return 'Due Today / Partial';
      case 'overdue': return 'Overdue';
      case 'expiring_soon': return 'Expiring Soon';
      case 'paid': return 'Fully Paid';
      case 'paused': return 'Paused';
      case 'cancelled': return 'Cancelled';
      default: return 'All Members';
    }
  };

  // Multi-select for Batch WhatsApp & Export
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mark Paid modal
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);

  // Renew modal
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<MemberWithDetails | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active action menu row ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [cancelModalMember, setCancelModalMember] = useState<MemberWithDetails | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const handleOpenRenew = (member: MemberWithDetails) => {
    setSelectedMemberForRenew(member);
    setIsRenewModalOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length && members.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.id));
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportExcel = (subset: 'all' | 'selected' = 'all') => {
    const listToExport =
      subset === 'selected'
        ? members.filter((m) => selectedIds.includes(m.id))
        : members;

    if (listToExport.length === 0) {
      setToastMessage('No members to export in current selection');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    exportMembersToExcel(listToExport, `gymora-members-${filter}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setToastMessage(`Exported ${listToExport.length} members to Excel!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBatchWhatsApp = () => {
    const selectedMembers = members.filter((m) => selectedIds.includes(m.id));
    if (selectedMembers.length === 0) return;

    const first = selectedMembers[0];
    const waUrl = buildWhatsAppReminderUrl({
      phone: first.phone,
      name: first.full_name,
      amount: first.membership?.outstanding_balance || 0,
      statusType: first.membership?.is_overdue ? 'overdue' : 'due',
    });
    window.open(waUrl, '_blank');
    setToastMessage(`Opened WhatsApp reminder for ${first.full_name} (${selectedMembers.length} selected in queue)`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePaymentSuccess = (res: any) => {
    setToastMessage(`Payment of ₹${res.amount_recorded || res.amount} recorded successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
    loadMembers();
  };

  const handleLifecycleAction = async (
    memberId: string,
    action: 'pause' | 'cancel' | 'reactivate',
    reason?: string
  ) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/members/${memberId}/lifecycle`, {
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
      setCancelModalMember(null);
      setCancellationReason('');
      setActiveMenuId(null);
      loadMembers();
      window.dispatchEvent(new Event('gym:member-updated'));
    } catch (err: any) {
      alert(err.message || 'Error updating membership lifecycle');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getLifecycleBadge = (lifecycle?: MembershipLifecycle) => {
    switch (lifecycle) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            <Pause className="h-3 w-3" />
            Paused
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
            <Ban className="h-3 w-3" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
            Expired
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
            Active
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (m: MemberWithDetails) => {
    const mship = m.membership;
    if (!mship) {
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          No Plan
        </span>
      );
    }

    if (mship.outstanding_balance === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Paid</span>
        </span>
      );
    }

    if (mship.is_overdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          <span>{mship.days_overdue}d Overdue</span>
        </span>
      );
    }

    if (mship.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>Partial Due</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span>Due</span>
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case 'upi':
        return (
          <span title="Last payment via UPI">
            <Smartphone className="h-3 w-3 text-emerald-600" />
          </span>
        );
      case 'cash':
        return (
          <span title="Last payment via Cash">
            <Banknote className="h-3 w-3 text-amber-600" />
          </span>
        );
      case 'online':
        return (
          <span title="Last payment via Online Gateway">
            <CreditCard className="h-3 w-3 text-blue-600" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 pb-24 md:pb-12">
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
            Active memberships, payment tracking, and WhatsApp communication hub.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExportExcel('all')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition"
            title="Export members list to Excel"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition dark:bg-white dark:text-zinc-900"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
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

        {/* Mobile Filter Trigger Sheet Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex-1 flex items-center justify-between gap-2 rounded-xl border py-2.5 px-3.5 text-xs font-bold shadow-sm transition ${
              filter !== 'all'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Filter className={`h-3.5 w-3.5 ${filter !== 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{getFilterLabel(filter)}</span>
              {filterCounts[filter] !== undefined && (
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold">
                  {filterCounts[filter]}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 shadow-sm"
              title="Reset filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop Filter Tabs (hidden on mobile, visible on sm and above) */}
        <div className="hidden sm:flex items-center rounded-xl bg-slate-200/80 p-1 text-xs font-bold text-slate-600 shrink-0 overflow-x-auto no-scrollbar">
          {(['all', 'due', 'overdue', 'expiring_soon', 'paid', 'paused', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-1.5 capitalize transition whitespace-nowrap ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab === 'expiring_soon' ? 'Expiring (7d)' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 sm:px-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <span>{selectedIds.length} member{selectedIds.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp Blast</span>
            </button>
            <button
              onClick={() => handleExportExcel('selected')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Subheader with Select All */}
        {members.length > 0 && !isLoading && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 hover:text-slate-900 transition font-bold"
            >
              {selectedIds.length === members.length && members.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Select All ({members.length})</span>
            </button>
            <span>Showing {members.length} members</span>
          </div>
        )}

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
              const lifecycle = mship?.lifecycle || 'active';
              const hasOutstanding = (mship?.outstanding_balance || 0) > 0;
              const waUrl = buildWhatsAppReminderUrl({
                phone: m.phone,
                name: m.full_name,
                amount: mship?.outstanding_balance || 0,
                statusType: mship?.is_overdue ? 'overdue' : 'due',
              });

              return (
                <div
                  key={m.id}
                  onClick={() => router.push(`/members/${m.id}`)}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition cursor-pointer ${
                    selectedIds.includes(m.id) ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Member Info with Checkbox */}
                  <div className="min-w-0 flex-1 flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectMember(m.id);
                      }}
                      className="mt-1 p-0.5 text-slate-400 hover:text-emerald-600 shrink-0 transition"
                      title={selectedIds.includes(m.id) ? 'Deselect' : 'Select'}
                    >
                      {selectedIds.includes(m.id) ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/members/${m.id}`}
                          className="text-base font-bold text-slate-900 hover:text-emerald-600 transition truncate"
                        >
                          {m.full_name}
                        </Link>
                        {getLifecycleBadge(lifecycle)}
                        {getPaymentStatusBadge(m)}
                        {m.whatsapp_opt_in && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            WA Opted-in
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span>{m.phone}</span>
                        {m.email && <span>• {m.email}</span>}
                        <span>• Plan: <strong className="text-slate-700">{mship?.plan_name_snapshot || 'None'}</strong></span>
                        <span>• Member Since: {formatDisplayDate(m.joined_at)}</span>
                        {mship?.due_date && (
                          <span>
                            • Due: <strong className={mship.is_overdue ? 'text-rose-600' : 'text-slate-700'}>{formatDisplayDate(mship.due_date)}</strong>
                          </span>
                        )}
                        {m.last_payment_method && (
                          <span className="inline-flex items-center gap-1">
                            • Last: {getPaymentMethodIcon(m.last_payment_method)}
                            <span className="uppercase text-[11px]">{m.last_payment_method}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial amounts & Actions */}
                  <div
                    className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-left md:text-right mr-2 hidden sm:block">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Outstanding</div>
                      <div className={`text-base font-black ${hasOutstanding ? (mship?.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600'}`}>
                        {formatINR(mship?.outstanding_balance || 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      {/* Call Action Button */}
                      <a
                        href={`tel:${m.phone}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        title="Call member"
                      >
                        <Phone className="h-4 w-4 text-slate-600" />
                      </a>

                      {/* WhatsApp Button */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs"
                        title="Open WhatsApp chat or reminder"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </a>

                      {/* Contextual Primary Action Button */}
                      {hasOutstanding ? (
                        <button
                          onClick={() => handleOpenMarkPaid(m)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                          title="Record payment"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Collect {formatINR(mship?.outstanding_balance || 0)}</span>
                        </button>
                      ) : isExpiringSoon(mship?.end_date) || lifecycle === 'expired' ? (
                        <button
                          onClick={() => handleOpenRenew(m)}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition"
                          title="Renew membership"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Renew</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenMarkPaid(m)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                          title="Record payment"
                        >
                          <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Pay</span>
                        </button>
                      )}

                      {/* More Menu Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === m.id ? null : m.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 transition"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === m.id && (
                          <div className="absolute right-0 mt-1 w-48 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-100 z-40 animate-in fade-in slide-in-from-top-2 text-xs">
                            <Link
                              href={`/members/${m.id}`}
                              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 transition"
                            >
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>View Profile</span>
                            </Link>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenRenew(m);
                              }}
                              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Renew Plan</span>
                            </button>

                            {lifecycle === 'active' && (
                              <button
                                onClick={() => handleLifecycleAction(m.id, 'pause')}
                                disabled={isActionLoading}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-amber-700 hover:bg-amber-50 transition"
                              >
                                <Pause className="h-3.5 w-3.5 text-amber-600" />
                                <span>Pause Membership</span>
                              </button>
                            )}

                            {lifecycle === 'paused' && (
                              <button
                                onClick={() => handleLifecycleAction(m.id, 'reactivate')}
                                disabled={isActionLoading}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-emerald-700 hover:bg-emerald-50 transition"
                              >
                                <Play className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Resume Membership</span>
                              </button>
                            )}

                            {lifecycle !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setCancelModalMember(m);
                                }}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Ban className="h-3.5 w-3.5 text-rose-500" />
                                <span>Cancel Membership</span>
                              </button>
                            )}

                            {lifecycle === 'cancelled' && (
                              <button
                                onClick={() => handleLifecycleAction(m.id, 'reactivate')}
                                disabled={isActionLoading}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-emerald-700 hover:bg-emerald-50 transition"
                              >
                                <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Reactivate</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/members/${m.id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
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

      {/* Cancel Modal */}
      {cancelModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 border border-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">Cancel Membership</h3>
              </div>
              <button
                onClick={() => setCancelModalMember(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 text-sm text-slate-600 space-y-3">
              <p>
                Cancel active membership for <strong className="text-slate-900">{cancelModalMember.full_name}</strong>.
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ℹ️ Membership will be marked as <strong>Cancelled</strong>. Payment and attendance history are preserved.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Relocating, Medical reason"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalMember(null)}
                disabled={isActionLoading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLifecycleAction(cancelModalMember.id, 'cancel', cancellationReason)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition"
              >
                {isActionLoading ? (
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

      {/* Mark Paid Modal */}
      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => setIsMarkPaidOpen(false)}
        member={selectedMember}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Renew Plan Modal */}
      <RenewPlanModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        member={selectedMemberForRenew}
        onRenewSuccess={() => {
          loadMembers();
          window.dispatchEvent(new Event('gym:member-updated'));
        }}
      />

      {/* Member Filter Modal (Mobile Bottom Sheet) */}
      <MemberFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilter={filter}
        onSelectFilter={setFilter}
        counts={filterCounts}
      />
    </div>
  );
}
