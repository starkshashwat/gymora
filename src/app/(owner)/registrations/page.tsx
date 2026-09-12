'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RegistrationRequest } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate } from '@/lib/utils/date';
import {
  UserCheck,
  Phone,
  Mail,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadRegistrations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleConvert = async (id: string) => {
    try {
      setConvertingId(id);
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert registration');
      }

      setToastMessage('Registration successfully converted to Active Member!');
      setTimeout(() => setToastMessage(null), 4000);
      loadRegistrations();
    } catch (err: any) {
      alert(err.message || 'Error converting registration');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Public QR Submissions
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Prospective members who scanned the gym reception QR code and signed up online.
          </p>
        </div>

        <Link
          href="/qr"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition shrink-0"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>View Reception QR</span>
        </Link>
      </div>

      {/* Registrations List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-base font-bold text-slate-900">No QR submissions yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Print your reception QR code so walk-in members can scan and register quickly.
            </p>
            <Link
              href="/qr"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
            >
              Go to QR Page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900">{reg.full_name}</h3>
                    {reg.status === 'converted' ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        Converted to Member
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        New Submission (Payment Pending)
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {reg.phone}
                    </span>
                    {reg.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {reg.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      Plan: <strong className="text-slate-700">{reg.plan_name_snapshot}</strong> ({formatINR(reg.plan_price_snapshot)})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Submitted: {formatDisplayDate(reg.created_at)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {reg.status === 'converted' ? (
                    <Link
                      href="/members"
                      className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      View in Members
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleConvert(reg.id)}
                      disabled={convertingId === reg.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
                    >
                      {convertingId === reg.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Converting...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Approve & Convert to Member</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
