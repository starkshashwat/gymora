'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  DashboardMetrics,
  MemberWithDetails,
  Payment,
  RegistrationRequest,
} from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { buildWhatsAppReminderUrl } from '@/lib/utils/whatsapp';
import { formatDisplayDate } from '@/lib/utils/date';
import MarkPaidModal from '@/components/payments/MarkPaidModal';
import ReviewRegistrationModal from '@/components/registrations/ReviewRegistrationModal';
import RenewPlanModal from '@/components/members/RenewPlanModal';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  Loader2,
  Bell,
  UserCheck,
  Plus,
  Phone,
  Search,
  Banknote,
  Smartphone,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle2,
  QrCode,
  Layers,
  MessageCircle,
  CheckCircle,
  RotateCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dueToday, setDueToday] = useState<MemberWithDetails[]>([]);
  const [overdue, setOverdue] = useState<MemberWithDetails[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<MemberWithDetails[]>([]);
  const [recentPayments, setRecentPayments] = useState<(Payment & { member_name: string })[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filters & Search for Needs Attention
  const [needsAttentionSearch, setNeedsAttentionSearch] = useState('');
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'due' | '1-7' | '7+' | 'expiring'>('all');

  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<MemberWithDetails | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedRegForReview, setSelectedRegForReview] = useState<RegistrationRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle?: string; type?: 'success' | 'alert' } | null>(null);

  const prevPendingCountRef = useRef<number | null>(null);

  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // ignore
    }
  };

  const loadDashboard = async (isInitial = false) => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setDueToday(data.dueToday || []);
        setOverdue(data.overdue || []);
        setExpiringSoon(data.expiringSoon || []);
        setRecentPayments(data.recentPayments || []);
        setIsDemoMode(data.isDemoMode || false);
        setPendingRegistrations(data.pendingRegistrations || []);

        const pending = data.pendingRegistrations || [];
        if (prevPendingCountRef.current !== null && pending.length > prevPendingCountRef.current) {
          playChime();
          const latest = pending[0];
          showToast('🔔 New Registration Received!', `${latest.full_name} applied for ${latest.plan_name_snapshot || 'membership'}.`);
        }
        prevPendingCountRef.current = pending.length;
      } else if (data.requireOnboarding) {
        window.location.href = '/onboarding';
      } else if (res.status === 401 || data.error === 'Unauthorized') {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);
    const timer = setInterval(() => loadDashboard(false), 4000);
    
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gymora_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') {
          playChime();
          showToast('🔔 Instant QR Signup!', `${event.data.name} just registered!`);
          loadDashboard(false);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gymora_new_registration' && e.newValue) {
        try {
          const item = JSON.parse(e.newValue);
          playChime();
          showToast('🔔 New Registration Received!', `${item.name} just registered for ${item.plan || 'membership'}!`);
          loadDashboard(false);
        } catch {}
      }
    };

    const handleToastNotification = (e: any) => {
      if (e.detail?.title) {
        showToast(e.detail.title, e.detail.subtitle);
      }
    };

    let supabaseChannel: any = null;
    try {
      const supabase = createClient();
      supabaseChannel = supabase
        .channel('realtime_registrations')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'registration_requests',
          },
          (payload: any) => {
            playChime();
            const newRow = payload.new;
            showToast(
              '🔔 New QR Registration!',
              `${newRow?.full_name || 'A customer'} applied for ${newRow?.plan_name_snapshot || 'membership'}.`
            );
            loadDashboard(false);
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('Realtime subscription unavailable, fallback to active polling:', realtimeErr);
    }

    return () => {
      clearInterval(timer);
      if (bc) bc.close();
      if (supabaseChannel) {
        supabaseChannel.unsubscribe();
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('gym:member-updated', () => loadDashboard(false));
      window.removeEventListener('gym:toast-notification', handleToastNotification);
    };
  }, []);

  const showToast = (title: string, subtitle?: string) => {
    setToastMessage({ title, subtitle, type: 'success' });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePaymentSuccess = (res: any) => {
    showToast(`Payment of ₹${res.amount_recorded || ''} recorded successfully!`);
    loadDashboard();
    window.dispatchEvent(new Event('gym:member-updated'));
  };
  


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Build attention list with sub-filters and search
  let attentionList: (MemberWithDetails & { attentionType: 'overdue' | 'due' | 'expiring' })[] = [
    ...overdue.map((m) => ({ ...m, attentionType: 'overdue' as const })),
    ...dueToday.map((m) => ({ ...m, attentionType: 'due' as const })),
  ];

  if (attentionFilter === 'expiring') {
    attentionList = expiringSoon.map((m) => ({ ...m, attentionType: 'expiring' as const }));
  } else if (attentionFilter === 'due') {
    attentionList = dueToday.map((m) => ({ ...m, attentionType: 'due' as const }));
  } else if (attentionFilter === '1-7') {
    attentionList = overdue
      .filter((m) => (m.membership?.days_overdue || 0) <= 7)
      .map((m) => ({ ...m, attentionType: 'overdue' as const }));
  } else if (attentionFilter === '7+') {
    attentionList = overdue
      .filter((m) => (m.membership?.days_overdue || 0) > 7)
      .map((m) => ({ ...m, attentionType: 'overdue' as const }));
  }

  if (needsAttentionSearch.trim()) {
    const q = needsAttentionSearch.toLowerCase().trim();
    attentionList = attentionList.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.membership?.plan_name_snapshot && m.membership.plan_name_snapshot.toLowerCase().includes(q))
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 rounded-lg p-4 shadow-lg border bg-zinc-900 text-white border-zinc-800 transition animate-in fade-in slide-in-from-top-4 max-w-sm">
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">{toastMessage.title}</div>
            {toastMessage.subtitle && (
              <div className="text-xs text-zinc-400 mt-0.5">{toastMessage.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Demo Banner */}
      {isDemoMode && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-amber-900 dark:text-amber-400 gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Demo Account:</span> Sandboxed and secure.
            </div>
          </div>
          <Link href="/signup" className="text-xs font-semibold underline hover:text-amber-500">
            Create your free account
          </Link>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Good morning
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Mobile Quick Action Strip */}
      <div className="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mt-1">
        <button
          onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition dark:bg-white dark:text-zinc-900 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Member</span>
        </button>

        <Link
          href="/qr"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm active:scale-95 transition shrink-0"
        >
          <QrCode className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Gym QR</span>
        </Link>

        <Link
          href="/registrations"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-sm active:scale-95 transition shrink-0"
        >
          <UserCheck className="h-3.5 w-3.5 text-amber-600" />
          <span>Signups ({pendingRegistrations.length})</span>
        </Link>

        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm active:scale-95 transition shrink-0"
        >
          <Layers className="h-3.5 w-3.5 text-zinc-500" />
          <span>Plans</span>
        </Link>
      </div>
      
      {/* Pending Registrations Alert */}
      {pendingRegistrations.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-700 dark:text-amber-500" />
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                New QR Signups ({pendingRegistrations.length})
              </h2>
            </div>
          </div>
          <div className="space-y-3">
            {pendingRegistrations.slice(0, 3).map((reg) => (
              <div key={reg.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{reg.full_name}</span>
                  <span className="text-xs text-zinc-500 ml-2">• {reg.plan_name_snapshot}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedRegForReview(reg);
                    setIsReviewModalOpen(true);
                  }}
                  className="h-7 px-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm transition-colors"
                >
                  <UserCheck className="h-3 w-3" />
                  Review & Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Metrics: Collection + Cash/UPI Drawer Reconciliation */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Today's Collection</div>
              <div className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {formatINR(metrics?.today_collection)}{' '}
                <span className="text-xl text-zinc-400 font-normal">collected</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {recentPayments.filter(p => new Date(p.paid_at).toDateString() === new Date().toDateString()).length} payments recorded today
              </div>
            </div>

            {/* Cash Drawer Method Breakdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Banknote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Cash: {formatINR(metrics?.today_cash_collection || 0)}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>UPI: {formatINR(metrics?.today_upi_collection || 0)}</span>
              </div>
              {(metrics?.today_online_collection || 0) > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 px-3 py-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Online: {formatINR(metrics?.today_online_collection)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary KPIs: Due Today, Overdue, Expiring Soon, Active Members */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 py-1 sm:py-2">
          <div className="rounded-xl p-3 sm:p-4 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5">Due Today</div>
            <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatINR(metrics?.due_today_amount)}</div>
          </div>
          <div className="rounded-xl p-3 sm:p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30">
            <div className="text-[10px] font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase mb-0.5">Overdue</div>
            <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">{formatINR(metrics?.overdue_amount)}</div>
          </div>
          <div className="rounded-xl p-3 sm:p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <div className="text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase mb-0.5">Expiring (7d)</div>
            <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
              {metrics?.expiring_soon_count || expiringSoon.length || 0} <span className="text-xs font-normal text-zinc-500">members</span>
            </div>
          </div>
          <div className="rounded-xl p-3 sm:p-4 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5">Active Members</div>
            <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">{metrics?.active_members || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-2">
        {/* Left Column: Needs Attention */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Needs attention</h2>
                <span className="text-xs font-bold text-zinc-400">({attentionList.length})</span>
              </div>
            </div>

            {/* Quick Search inside Needs Attention */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={needsAttentionSearch}
                onChange={(e) => setNeedsAttentionSearch(e.target.value)}
                placeholder="Search due or overdue members..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
              />
            </div>

            {/* Sub-filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-bold text-zinc-600 dark:text-zinc-400 pt-1">
              {[
                { id: 'all', label: 'All Due' },
                { id: 'due', label: 'Due Today' },
                { id: '1-7', label: '1–7d Overdue' },
                { id: '7+', label: '7d+ Critical' },
                { id: 'expiring', label: `Expiring Soon (${expiringSoon.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAttentionFilter(tab.id as any)}
                  className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                    attentionFilter === tab.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {attentionList.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">
              You&apos;re all clear. No members match the current attention filter.
            </div>
          ) : (
            <div className="space-y-3 md:space-y-0 md:divide-y md:divide-zinc-100 dark:md:divide-zinc-800/50">
              {attentionList.map((m) => {
                const isOverdue = m.attentionType === 'overdue';
                const isExpiring = m.attentionType === 'expiring';
                const waUrl = buildWhatsAppReminderUrl({
                  phone: m.phone,
                  name: m.full_name,
                  amount: m.membership?.outstanding_balance || 0,
                  statusType: isOverdue ? 'overdue' : 'due',
                });

                return (
                  <React.Fragment key={m.id}>
                    {/* MOBILE CARD (< md) */}
                    <div className="block md:hidden p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link href={`/members/${m.id}`} className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:underline truncate block">
                            {m.full_name}
                          </Link>
                          <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                            <span>{m.phone}</span> • <span>{m.membership?.plan_name_snapshot || 'Plan'}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                            {formatINR(m.membership?.outstanding_balance || 0)}
                          </div>
                          <div className="mt-0.5">
                            {isOverdue ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                                {m.membership?.days_overdue}d overdue
                              </span>
                            ) : isExpiring ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                Exp: {formatDisplayDate(m.membership?.end_date)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                Due today
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 4 Balanced Touch Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        <a
                          href={`tel:${m.phone}`}
                          className="flex flex-col items-center justify-center py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition shadow-2xs"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-bold mt-0.5">Call</span>
                        </a>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 active:scale-95 transition shadow-2xs"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-[10px] font-bold mt-0.5">WhatsApp</span>
                        </a>

                        <button
                          onClick={() => {
                            setSelectedMemberForRenew(m as MemberWithDetails);
                            setIsRenewModalOpen(true);
                          }}
                          className="flex flex-col items-center justify-center py-2 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 active:scale-95 transition shadow-2xs"
                        >
                          <RotateCw className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-[10px] font-bold mt-0.5">Renew</span>
                        </button>

                        <button
                          onClick={() => { setSelectedMember(m as MemberWithDetails); setIsMarkPaidOpen(true); }}
                          className="flex flex-col items-center justify-center py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 active:scale-95 transition shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold mt-0.5">Paid</span>
                        </button>
                      </div>
                    </div>

                    {/* DESKTOP ROW (>= md) */}
                    <div className="hidden md:flex py-3 items-center justify-between gap-3 group">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/members/${m.id}`} className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline truncate">
                            {m.full_name}
                          </Link>
                          <span className="text-xs text-zinc-500 shrink-0">• {formatINR(m.membership?.outstanding_balance || 0)}</span>
                        </div>
                        <div className="text-xs mt-0.5">
                          {isOverdue ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">{m.membership?.days_overdue} days overdue</span>
                          ) : isExpiring ? (
                            <span className="text-amber-600 dark:text-amber-500 font-medium">Expires {formatDisplayDate(m.membership?.end_date)}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-500 font-medium">Due today</span>
                          )}
                          <span className="text-zinc-400 ml-2">({m.membership?.plan_name_snapshot})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1-Tap Call */}
                        <a
                          href={`tel:${m.phone}`}
                          title={`Call ${m.full_name}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </a>

                        {/* WhatsApp Reminder */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 inline-flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          WhatsApp
                        </a>

                        {/* Renew Button */}
                        <button
                          onClick={() => {
                            setSelectedMemberForRenew(m as MemberWithDetails);
                            setIsRenewModalOpen(true);
                          }}
                          className="h-7 px-2.5 inline-flex items-center justify-center rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                        >
                          Renew
                        </button>

                        {/* Mark Paid Button */}
                        <button
                          onClick={() => { setSelectedMember(m as MemberWithDetails); setIsMarkPaidOpen(true); }}
                          className="h-7 px-2.5 inline-flex items-center justify-center rounded bg-zinc-900 dark:bg-white text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Payments */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent Payments</h2>
          </div>
          
          {recentPayments.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">
              No payments recorded recently.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {p.member_name}
                    </td>
                    <td className="py-2.5 text-zinc-500 dark:text-zinc-400">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-2.5 text-right text-xs text-zinc-400 capitalize">
                      {p.payment_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => setIsMarkPaidOpen(false)}
        member={selectedMember}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <RenewPlanModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        member={selectedMemberForRenew}
        onSuccess={() => {
          loadDashboard();
          window.dispatchEvent(new Event('gym:member-updated'));
        }}
      />

      <ReviewRegistrationModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        registration={selectedRegForReview}
        onApproved={(result) => {
          showToast('Registration Approved!', `Enrolled ${result.member?.full_name || 'member'}.`);
          loadDashboard();
          window.dispatchEvent(new Event('gym:member-updated'));
        }}
      />
    </div>
  );
}
