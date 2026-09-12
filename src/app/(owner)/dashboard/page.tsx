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
import {
  Sparkles,
  Loader2,
  Bell,
  UserCheck,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dueToday, setDueToday] = useState<MemberWithDetails[]>([]);
  const [overdue, setOverdue] = useState<MemberWithDetails[]>([]);
  const [recentPayments, setRecentPayments] = useState<(Payment & { member_name: string })[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
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

    window.addEventListener('storage', handleStorage);
    window.addEventListener('gym:member-updated', () => loadDashboard(false));
    window.addEventListener('gym:toast-notification', handleToastNotification);

    return () => {
      clearInterval(timer);
      if (bc) bc.close();
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

  // Combine overdue and due today, sort overdue first
  const needsAttention = [
    ...overdue.map(m => ({ ...m, attentionType: 'overdue' as const })),
    ...dueToday.map(m => ({ ...m, attentionType: 'due' as const }))
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Good morning
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('gym:open-add-member'))}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
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

      {/* Primary Metrics */}
      <div className="space-y-6">
        {/* Today's Collection */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-2">Today</div>
          <div className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            {formatINR(metrics?.today_collection)} <span className="text-xl text-zinc-400 font-normal">collected</span>
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            {recentPayments.filter(p => new Date(p.paid_at).toDateString() === new Date().toDateString()).length} payments today
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-1">Due Today</div>
            <div className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100">{formatINR(metrics?.due_today_amount)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-1">Overdue</div>
            <div className="text-base sm:text-lg font-medium text-rose-600 dark:text-rose-400">{formatINR(metrics?.overdue_amount)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-1">Active</div>
            <div className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100">{metrics?.active_members || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-4">
        {/* Left Column: Needs Attention */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Needs attention</h2>
          </div>

          {needsAttention.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">
              You're all clear. No members are currently due or overdue.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {needsAttention.map((m) => {
                const isOverdue = m.attentionType === 'overdue';
                const waUrl = buildWhatsAppReminderUrl({
                  phone: m.phone,
                  name: m.full_name,
                  amount: m.membership?.outstanding_balance || 0,
                  statusType: m.attentionType,
                });

                return (
                  <div key={m.id} className="py-3 flex items-center justify-between group">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/members/${m.id}`} className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline">{m.full_name}</Link>
                        <span className="text-xs text-zinc-500">• {formatINR(m.membership?.outstanding_balance)}</span>
                      </div>
                      <div className="text-xs mt-0.5">
                        {isOverdue ? (
                          <span className="text-rose-600 dark:text-rose-400">{m.membership?.days_overdue} days overdue</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-500">Due today</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-3 inline-flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        WhatsApp
                      </a>
                      <button
                        onClick={() => { setSelectedMember(m as MemberWithDetails); setIsMarkPaidOpen(true); }}
                        className="h-7 px-3 inline-flex items-center justify-center rounded bg-zinc-900 dark:bg-white text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                      >
                        Mark Paid
                      </button>
                    </div>
                  </div>
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
