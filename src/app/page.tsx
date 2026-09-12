'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  ArrowRight,
  ShieldCheck,
  QrCode,
  FileSpreadsheet,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AuthModal } from '@/components/ui/auth-modal';

export default function RootLandingPage() {
  const [isExistingSession, setIsExistingSession] = useState(false);

  // Check if real Supabase auth session exists
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsExistingSession(true);
        }
      });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-100 selection:text-zinc-900">
      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR                                          */}
      {/* ============================================================== */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950 font-black shadow-sm">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-white block leading-none">
                Gymora
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Gym Payment CRM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition hidden sm:block"
            >
              See Demo
            </Link>
            {isExistingSession ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 px-4 text-xs font-semibold shadow-sm transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => {
                  document.cookie = 'gymora_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                }}
                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-4 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION & SINGLE UNIFIED AUTH PORTAL                   */}
      {/* ============================================================== */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-12 space-y-8 text-center max-w-4xl mx-auto flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>The Modern Gym Payment & Member Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
                Collect Gym Dues on <span className="text-emerald-400">Autopilot</span>.
                <br />
                Stop Chasing Payments.
              </h1>

              <p className="text-base sm:text-xl text-zinc-400 max-w-2xl leading-relaxed font-normal">
                Everything gym owners need to run seamless operations: zero-fee UPI QR, instant
                reception desk registration, automated WhatsApp fee reminders, and 1-click Excel migration.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link
                  href="/signup"
                  onClick={() => {
                    document.cookie = 'gymora_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200"
                >
                  Try Now Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 px-8 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  See Demo
                </Link>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 w-full max-w-4xl">
                <div className="flex flex-col items-center gap-2 text-sm font-semibold text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-center">Direct UPI QR + Gateways</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-sm font-semibold text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-center">1-Tap WhatsApp Alerts</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-sm font-semibold text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-center">Front Desk QR Standee</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-sm font-semibold text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-center">Bulk Excel Import</span>
                </div>
              </div>

              {/* Security & Multi-tenant note */}
              <div className="pt-4 flex flex-wrap justify-center items-center gap-4 text-xs font-semibold text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>End-to-end Encrypted</span>
                </div>
                <div className="hidden sm:block h-3 w-[1px] bg-zinc-800" />
                <span>Multi-tenant Subdomain Ready</span>
                <div className="hidden sm:block h-3 w-[1px] bg-zinc-800" />
                <span>Zero Transaction Fees on UPI</span>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FOUR CORE CAPABILITIES BREAKDOWN                           */}
        {/* ============================================================== */}
        <section className="border-t border-zinc-900 bg-zinc-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Engineered for Fitness Businesses
              </h3>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Designed to eliminate late dues & manual Excel tracking
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/60 p-6 space-y-3 ring-1 ring-zinc-900/20">
                <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Payment Gateways & UPI</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Support zero-fee direct UPI QR codes or integrate Razorpay, Cashfree & PhonePe with verified API keys.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/60 p-6 space-y-3 ring-1 ring-zinc-900/20">
                <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">WhatsApp Automation</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Choose free 1-tap local WhatsApp deep links or link Meta Cloud API for background automated reminders.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/60 p-6 space-y-3 ring-1 ring-zinc-900/20">
                <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Front Desk QR Standee</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Print ready-to-use reception standees. Members scan, self-register, pay, and appear instantly in your dashboard.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/60 p-6 space-y-3 ring-1 ring-zinc-900/20">
                <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">1-Click Excel Migration</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Already have members in an Excel sheet? Drag and drop to import all member profiles, phones & dues in seconds.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* 4. FOOTER                                                      */}
      {/* ============================================================== */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-zinc-400">
            <Dumbbell className="h-4 w-4 text-emerald-400" />
            <span>Gymora CRM — Powering Gyms Across India</span>
          </div>
          <div>© {new Date().getFullYear()} Gymora. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
