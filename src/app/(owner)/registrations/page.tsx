'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RegistrationRequest } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { formatDisplayDate } from '@/lib/utils/date';
import ReviewRegistrationModal from '@/components/registrations/ReviewRegistrationModal';
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
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<RegistrationRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadRegistrations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations || []);
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

  const handleOpenReview = (reg: RegistrationRequest) => {
    setSelectedReg(reg);
    setIsReviewOpen(true);
  };

  const handleApproved = (result: any) => {
    setToastMessage(`Member ${result.member?.full_name || 'record'} successfully enrolled!`);
    setTimeout(() => setToastMessage(null), 4000);
    loadRegistrations();
    window.dispatchEvent(new Event('gym:member-updated'));
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 pb-24 md:pb-12">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
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
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">{reg.full_name}</h3>
                    {reg.status === 'converted' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Converted to Member
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Pending Review
                      </span>
                    )}
                    {reg.whatsapp_opt_in && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        WA Opt-in
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

                <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <a
                    href={`tel:${reg.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    title={`Call ${reg.full_name}`}
                  >
                    <Phone className="h-4 w-4 text-emerald-600" />
                  </a>

                  {reg.status === 'converted' ? (
                    <Link
                      href={reg.converted_member_id ? `/members/${reg.converted_member_id}` : `/members?q=${encodeURIComponent(reg.full_name)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleOpenReview(reg)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Review & Approve</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review & Approval Modal */}
      <ReviewRegistrationModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        registration={selectedReg}
        onApproved={handleApproved}
      />
    </div>
  );
}
