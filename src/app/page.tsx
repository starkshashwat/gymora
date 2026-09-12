'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  ArrowRight,
  ShieldCheck,
  Zap,
  QrCode,
  FileSpreadsheet,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Loader2,
  Sparkles,
  Lock,
  Mail,
} from 'lucide-react';

export default function RootLandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@gymora.fit');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExistingSession, setIsExistingSession] = useState(false);

  // Check if session already exists
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsExistingSession(true);
        }
      });
      if (document.cookie.includes('gymora_session=true')) {
        setIsExistingSession(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (oauthError) {
        console.warn('Google OAuth error:', oauthError.message);
        setError(oauthError.message);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to initialize Google Sign In');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Set active session cookie for middleware route clearance
    document.cookie = 'gymora_session=true; path=/; max-age=2592000; SameSite=Lax';

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 400);
  };

  const handleDemoSignIn = () => {
    document.cookie = 'gymora_session=true; path=/; max-age=2592000; SameSite=Lax';
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR                                          */}
      {/* ============================================================== */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block leading-none">
                Gymora
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Gym Payment CRM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isExistingSession ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-xs font-black shadow-md transition"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 text-xs font-black shadow-md shadow-emerald-500/20 transition hidden sm:inline-flex items-center gap-1"
                >
                  <span>Setup Gym</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION & AUTHENTICATION PORTAL                       */}
      {/* ============================================================== */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Modern Gym Payment & Member CRM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Collect Gym Dues on <span className="text-emerald-400">Autopilot</span>.
                <br />
                Stop Chasing Payments.
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed font-normal">
                Everything gym owners need to run seamless operations: zero-fee UPI QR, instant
                reception desk registration, automated WhatsApp fee reminders, and 1-click Excel migration.
              </p>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Direct UPI QR + Razorpay / PhonePe</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>1-Tap WhatsApp Payment Alerts</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Front Desk QR Member Self-Onboarding</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Bulk Excel / CSV Member Import</span>
                </div>
              </div>

              {/* Security & Multi-tenant note */}
              <div className="pt-4 flex items-center gap-4 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>End-to-end Encrypted</span>
                </div>
                <div className="h-3 w-[1px] bg-slate-700" />
                <span>Multi-tenant Subdomain Ready</span>
                <div className="h-3 w-[1px] bg-slate-700" />
                <span>Zero Transaction Fees on UPI</span>
              </div>
            </div>

            {/* Right Column: High-Converting Sign-In Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-800/60 p-7 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
                <div className="text-center pb-6 border-b border-slate-700/60">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Sign in to Gymora
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Access your gym dashboard, members & payment records
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-400">
                    {error}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-white py-3.5 px-4 text-sm font-bold text-slate-900 shadow-md hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 transition"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-slate-700/80 w-full" />
                    <span className="bg-slate-800 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 absolute">
                      Or continue with email
                    </span>
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-3">
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                          placeholder="owner@gymora.fit"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 py-3 px-4 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50 transition"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Quick Demo Access */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDemoSignIn}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 py-2.5 px-4 text-xs font-bold text-emerald-400 transition"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Instant Demo Owner Sign-In</span>
                    </button>
                  </div>

                  {/* New Gym Owner Prompt */}
                  <div className="pt-4 border-t border-slate-700/60 text-center">
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <span>New Gym Owner? Setup your Gym in 3 Minutes</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FOUR CORE CAPABILITIES BREAKDOWN                           */}
        {/* ============================================================== */}
        <section className="border-t border-slate-800 bg-slate-950/60 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                Engineered for Fitness Businesses
              </h3>
              <h2 className="text-3xl font-black text-white tracking-tight">
                Designed to eliminate late dues & manual Excel tracking
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-white">Payment Gateways & UPI</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Support zero-fee direct UPI QR codes or integrate Razorpay, Cashfree & PhonePe with verified API keys.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-white">WhatsApp Automation</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose free 1-tap local WhatsApp deep links or link Meta Cloud API for background automated reminders.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-white">Front Desk QR Standee</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Print ready-to-use reception standees. Members scan, self-register, pay, and appear instantly in your dashboard.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-white">1-Click Excel Migration</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
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
      <footer className="border-t border-slate-800 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Dumbbell className="h-4 w-4 text-emerald-400" />
            <span>Gymora CRM — Powering Gyms Across India</span>
          </div>
          <div>© {new Date().getFullYear()} Gymora. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
