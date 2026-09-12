'use client';

import * as React from 'react';
import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { AuthModal } from '@/components/ui/auth-modal';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-zinc-900 selection:text-white">
      {/* Top Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 group mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg transition group-hover:scale-105">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="font-black text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
            Gymora
          </span>
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Gym Owner Registration Portal
        </p>
      </div>

      {/* Render the Exact Signup UI Design */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <AuthModal isInline={true} mode="signup" />

        {/* Back to sign in */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-zinc-900 dark:text-zinc-100 underline hover:text-zinc-600"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
