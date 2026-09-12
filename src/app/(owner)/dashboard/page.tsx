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
  Phone,
  Layers,
  ChevronRight,
} from 'lucide-react';

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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // ignore browser audio restrictions
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

        // Check if a new registration just came in
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
      console.error(e);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);

    // Auto-poll every 4 seconds for live reception updates
    const timer = setInterval(() => {
      loadDashboard(false);
    }, 4000);

    // Cross-tab broadcast listener for instant notification
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gymora_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') {
          playChime();
          setToastMessage({
            title: '🔔 New Registration Received!',
            subtitle: `${event.data.name} scanned QR and registered for ${event.data.plan || 'membership'}!`,
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
        } catch (err) {}
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
        return <Banknote className="h-4 w-4 text-amber-600" />;
      case 'upi':
        return <Smartphone className="h-4 w-4 text-emerald-600" />;
      case 'online':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <HelpCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
      {/* Toast / Alert Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-2xl border transition animate-in fade-in slide-in-from-top-4 max-w-sm ${
            toastMessage.type === 'alert'
              ? 'bg-slate-900 text-white border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMessage.type === 'alert' ? (
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
          ) : (
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm font-black">{toastMessage.title}</div>
            {toastMessage.subtitle && (
              <div className="text-xs text-slate-300 mt-0.5">{toastMessage.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Header with Gymora Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Gymora Dashboard
            </h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Monitor incoming collections, track dues, approve QR signups & send instant WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span>All Members</span>
          </Link>
          <Link
            href="/qr"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Reception QR</span>
          </Link>
        </div>
      </div>

      {/* LIVE ALERT: New QR Registrations Pending Approval */}
      {pendingRegistrations.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-700" />
                <h2 className="text-base sm:text-lg font-black text-amber-950">
                  New QR Signups ({pendingRegistrations.length})
                </h2>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-black text-amber-900">
                Payment Pending
              </span>
            </div>

            <Link
              href="/registrations"
              className="text-xs font-black text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1"
            >
              <span>View all in Submissions</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-amber-200/50">
            {pendingRegistrations.slice(0, 3).map((reg) => (
              <div
                key={reg.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{reg.full_name}</span>
                    <span className="text-xs text-slate-500">• {reg.phone}</span>
                  </div>
                  <div className="text-xs text-amber-900/80 font-medium mt-0.5 flex items-center gap-3">
                    <span>
                      Plan: <strong>{reg.plan_name_snapshot}</strong> ({formatINR(reg.plan_price_snapshot)})
                    </span>
                    <span>• Submitted: {formatDisplayDate(reg.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConvertRegistration(reg.id)}
                    disabled={convertingRegId === reg.id}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
                  >
                    {convertingRegId === reg.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        <span>Approve & Convert to Member</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Today's Collection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Collection</span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatINR(metrics?.today_collection)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              This month: <span className="text-slate-700 font-bold">{formatINR(metrics?.month_collection)}</span>
            </div>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pending</span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {formatINR(metrics?.total_outstanding)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Across active dues
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Due Today</span>
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics?.due_today_count || 0}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Amount: <span className="font-bold text-slate-700">{formatINR(metrics?.due_today_amount)}</span>
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Dues</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {metrics?.overdue_count || 0}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Amount: <span className="font-bold text-rose-600">{formatINR(metrics?.overdue_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Due Today & Overdue Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Today Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-blue-500" />
              <h2 className="text-lg font-bold text-slate-900">Due Today</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-blue-700">
                {dueToday.length}
              </span>
            </div>
            <Link href="/members?filter=due" className="text-xs font-bold text-emerald-600 hover:underline">
              View all
            </Link>
          </div>

          {dueToday.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-slate-400">
              🎉 No payments due today!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
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
                      <Link href={`/members/${m.id}`} className="font-bold text-slate-900 hover:text-emerald-600 text-sm truncate block">
                        {m.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {m.phone} • {m.membership?.plan_name_snapshot}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        Due: {formatINR(m.membership?.outstanding_balance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleOpenMarkPaid(m)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                      >
                        <CheckCircle className="h-4 w-4" />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900">Overdue Payments</h2>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">
                {overdue.length}
              </span>
            </div>
            <Link href="/members?filter=overdue" className="text-xs font-bold text-rose-600 hover:underline">
              View all
            </Link>
          </div>

          {overdue.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-slate-400">
              ✨ Great job! Zero overdue memberships.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
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
                        <Link href={`/members/${m.id}`} className="font-bold text-slate-900 hover:text-rose-600 text-sm truncate block">
                          {m.full_name}
                        </Link>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 shrink-0">
                          {m.membership?.days_overdue}d overdue
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.phone} • {m.membership?.plan_name_snapshot}
                      </div>
                      <div className="text-xs font-bold text-rose-600 mt-0.5">
                        Due: {formatINR(m.membership?.outstanding_balance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="Send Overdue WhatsApp Reminder"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleOpenMarkPaid(m)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                      >
                        <CheckCircle className="h-4 w-4" />
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Recent Payments</h2>
          </div>
          <Link href="/members" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
            <span>Members directory</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-slate-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5">
                    {getMethodIcon(p.payment_method)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{p.member_name}</div>
                    <div className="text-xs text-slate-400">
                      {formatDisplayDate(p.paid_at)} • {p.notes || 'No notes'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">
                    +{formatINR(p.amount)}
                  </div>
                  <span className="inline-block uppercase text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
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
