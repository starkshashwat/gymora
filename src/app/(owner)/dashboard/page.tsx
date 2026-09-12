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
import {
  Coins,
  AlertCircle,
  Clock,
  Users,
  CheckCircle,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Smartphone,
  Banknote,
  CreditCard,
  HelpCircle,
  Loader2,
  Bell,
  UserCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dueToday, setDueToday] = useState<MemberWithDetails[]>([]);
  const [overdue, setOverdue] = useState<MemberWithDetails[]>([]);
  const [recentPayments, setRecentPayments] = useState<(Payment & { member_name: string })[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mark Paid modal state
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle?: string; type?: 'success' | 'alert' } | null>(null);
  const [convertingRegId, setConvertingRegId] = useState<string | null>(null);

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
        setRecentPayments(data.recentPayments || []);

        const pending = data.pendingRegistrations || [];
        setPendingRegistrations(pending);

        // Chime for new live registrations
        if (prevPendingCountRef.current !== null && pending.length > prevPendingCountRef.current) {
          playChime();
          const latest = pending[0];
          setToastMessage({
            title: '🔔 New Registration Received!',
            subtitle: `${latest.full_name} applied for ${latest.plan_name_snapshot || 'membership'}.`,
            type: 'alert',
          });
          setTimeout(() => setToastMessage(null), 6000);
        }

        prevPendingCountRef.current = pending.length;
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);

    const timer = setInterval(() => {
      loadDashboard(false);
    }, 4000);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gymora_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') {
          playChime();
          setToastMessage({
            title: '🔔 Instant QR Signup!',
            subtitle: `${event.data.name} just registered!`,
            type: 'alert',
          });
          setTimeout(() => setToastMessage(null), 6000);
          loadDashboard(false);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gymora_new_registration' && e.newValue) {
        try {
          const item = JSON.parse(e.newValue);
          playChime();
          setToastMessage({
            title: '🔔 New Registration Received!',
            subtitle: `${item.name} just registered for ${item.plan || 'membership'}!`,
            type: 'alert',
          });
          setTimeout(() => setToastMessage(null), 6000);
          loadDashboard(false);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('gym:member-updated', () => loadDashboard(false));

    return () => {
      clearInterval(timer);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('gym:member-updated', () => loadDashboard(false));
    };
  }, []);

  const showToast = (title: string, subtitle?: string) => {
    setToastMessage({ title, subtitle, type: 'success' });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenMarkPaid = (member: MemberWithDetails) => {
    setSelectedMember(member);
    setIsMarkPaidOpen(true);
  };

  const handlePaymentSuccess = (res: any) => {
    showToast(`Payment of ₹${res.amount_recorded || ''} recorded successfully!`);
    loadDashboard();
    window.dispatchEvent(new Event('gym:member-updated'));
  };

  const handleConvertRegistration = async (id: string) => {
    try {
      setConvertingRegId(id);
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert registration');
      }

      showToast('Registration Approved!', 'Member created and cycle generated.');
      loadDashboard();
      window.dispatchEvent(new Event('gym:member-updated'));
    } catch (err: any) {
      alert(err.message || 'Error converting registration');
    } finally {
      setConvertingRegId(null);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />;
      case 'upi':
        return <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'online':
        return <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <HelpCircle className="h-4 w-4 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800 dark:text-zinc-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            "fixed top-5 right-5 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-2xl border transition animate-in fade-in slide-in-from-top-4 max-w-sm",
            toastMessage.type === "alert"
              ? "bg-zinc-950 text-zinc-50 border-amber-500/40 ring-1 ring-amber-500/20"
              : "bg-zinc-950 text-zinc-50 border-zinc-800 ring-1 ring-zinc-950/10",
          )}
        >
          {toastMessage.type === 'alert' ? (
            <div className="rounded-full bg-amber-500/20 p-2 text-amber-400">
              <Bell className="h-4 w-4 animate-bounce" />
            </div>
          ) : (
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">{toastMessage.title}</div>
            {toastMessage.subtitle && (
              <div className="text-xs text-zinc-400 mt-0.5">{toastMessage.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Header with Sleek Design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gymora Dashboard
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="text-sm font-normal text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor incoming collections, track dues, approve QR signups & send instant WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/members"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Users className="h-4 w-4 text-zinc-400" />
            <span>Members</span>
          </Link>
          <Link
            href="/qr"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Reception QR</span>
          </Link>
        </div>
      </div>

      {/* LIVE ALERT: New QR Registrations Pending Approval */}
      {pendingRegistrations.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 p-6 shadow-xl ring-1 ring-zinc-950/5">
          <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100">
                  New QR Signups ({pendingRegistrations.length})
                </h2>
              </div>
              <span className="rounded-full bg-amber-200/60 dark:bg-amber-900/60 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                Payment Pending
              </span>
            </div>

            <Link
              href="/registrations"
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-amber-200/40 dark:divide-amber-900/40">
            {pendingRegistrations.slice(0, 3).map((reg) => (
              <div
                key={reg.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{reg.full_name}</span>
                    <span className="text-xs text-zinc-500">• {reg.phone}</span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-3">
                    <span>
                      Plan: <strong className="text-zinc-800 dark:text-zinc-200">{reg.plan_name_snapshot}</strong> ({formatINR(reg.plan_price_snapshot)})
                    </span>
                    <span>• {formatDisplayDate(reg.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConvertRegistration(reg.id)}
                    disabled={convertingRegId === reg.id}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    {convertingRegId === reg.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Approve & Convert</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards — Exact AuthModal Aesthetic */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Today's Collection */}
        <div className="rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Today's Collection</span>
            <div className="flex aspect-square h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatINR(metrics?.today_collection)}
            </div>
            <div className="mt-1 text-xs text-zinc-500 font-normal">
              This month: <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{formatINR(metrics?.month_collection)}</span>
            </div>
          </div>
        </div>

        {/* Total Pending */}
        <div className="rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Pending</span>
            <div className="flex aspect-square h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
              {formatINR(metrics?.total_outstanding)}
            </div>
            <div className="mt-1 text-xs text-zinc-500 font-normal">
              Across active dues
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Due Today</span>
            <div className="flex aspect-square h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <TrendingUp className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {metrics?.due_today_count || 0}
            </div>
            <div className="mt-1 text-xs text-zinc-500 font-normal">
              Amount: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatINR(metrics?.due_today_amount)}</span>
            </div>
          </div>
        </div>

        {/* Overdue Dues */}
        <div className="rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overdue Dues</span>
            <div className="flex aspect-square h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-rose-600 dark:text-rose-400">
              {metrics?.overdue_count || 0}
            </div>
            <div className="mt-1 text-xs text-zinc-500 font-normal">
              Amount: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatINR(metrics?.overdue_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Due Today & Overdue Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Due Today Queue */}
        <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Due Today</h2>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {dueToday.length}
              </span>
            </div>
            <Link href="/members?filter=due" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
              View all
            </Link>
          </div>

          {dueToday.length === 0 ? (
            <div className="py-12 text-center text-sm font-normal text-zinc-400">
              🎉 No payments due today!
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {dueToday.map((m) => {
                const waUrl = buildWhatsAppReminderUrl({
                  phone: m.phone,
                  name: m.full_name,
                  amount: m.membership?.outstanding_balance || 0,
                  statusType: 'due',
                });

                return (
                  <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${m.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline text-sm truncate block">
                        {m.full_name}
                      </Link>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {m.phone} • {m.membership?.plan_name_snapshot}
                      </div>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        Due: {formatINR(m.membership?.outstanding_balance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition dark:bg-emerald-950/20 dark:text-emerald-400"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleOpenMarkPaid(m)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 active:scale-95 transition dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Mark Paid</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Queue */}
        <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Overdue Payments</h2>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {overdue.length}
              </span>
            </div>
            <Link href="/members?filter=overdue" className="text-xs font-medium text-rose-600 hover:underline">
              View all
            </Link>
          </div>

          {overdue.length === 0 ? (
            <div className="py-12 text-center text-sm font-normal text-zinc-400">
              ✨ Great job! Zero overdue memberships.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {overdue.map((m) => {
                const waUrl = buildWhatsAppReminderUrl({
                  phone: m.phone,
                  name: m.full_name,
                  amount: m.membership?.outstanding_balance || 0,
                  statusType: 'overdue',
                });

                return (
                  <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/members/${m.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline text-sm truncate block">
                          {m.full_name}
                        </Link>
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 shrink-0">
                          {m.membership?.days_overdue}d overdue
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {m.phone} • {m.membership?.plan_name_snapshot}
                      </div>
                      <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        Due: {formatINR(m.membership?.outstanding_balance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition dark:bg-emerald-950/20 dark:text-emerald-400"
                        title="Send Overdue WhatsApp Reminder"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleOpenMarkPaid(m)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 active:scale-95 transition dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Mark Paid</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Feed */}
      <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex aspect-square h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Recent Payments</h2>
          </div>
          <Link href="/members" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline flex items-center gap-1">
            <span>Members directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-12 text-center text-sm font-normal text-zinc-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {recentPayments.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                    {getMethodIcon(p.payment_method)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.member_name}</div>
                    <div className="text-xs text-zinc-400">
                      {formatDisplayDate(p.paid_at)} • {p.notes || 'Direct payment'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatINR(p.amount)}
                  </div>
                  <span className="inline-block uppercase text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full mt-0.5">
                    {p.payment_method}
                  </span>
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
        member={selectedMember}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
