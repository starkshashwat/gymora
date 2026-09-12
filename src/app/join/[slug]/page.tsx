'use client';

import React, { useState, useEffect } from 'react';
import { MembershipPlan } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import {
  Dumbbell,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

interface GymPublicData {
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

export default function PublicJoinPage({ params }: { params: { slug: string } }) {
  const [gym, setGym] = useState<GymPublicData | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Multi-step Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    const fetchGym = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/public/join/${params.slug}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotFound(true);
          return;
        }
        setGym(data.gym);
        setPlans(data.plans || []);
        if (data.plans && data.plans.length > 0) {
          setSelectedPlanId(data.plans[0].id);
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGym();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (notFound || !gym) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm max-w-sm w-full border border-slate-200">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Gym Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">
            The onboarding link you followed is invalid or has expired. Please verify with reception.
          </p>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Please provide your name and phone number.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!selectedPlanId) {
      setError('Please select a membership plan.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleSubmitRegistration = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/public/join/${params.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          plan_id: selectedPlanId,
          whatsapp_opt_in: whatsappOptIn,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit registration');
      }

      setSubmittedData(data);
      setStep(4);

      // Notify owner dashboard via broadcast & storage events
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'gymora_new_registration',
            JSON.stringify({
              name: fullName.trim(),
              plan: selectedPlan?.name,
              time: Date.now(),
            })
          );
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('gymora_channel');
            bc.postMessage({
              type: 'NEW_REGISTRATION',
              name: fullName.trim(),
              plan: selectedPlan?.name,
            });
            bc.close();
          }
        } catch (e) {
          console.warn('Storage notification error:', e);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error completing registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Gym Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg mb-3">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{gym.name}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {gym.address || 'Member Onboarding Portal'}
          </p>
        </div>

        {/* Wizard Progress Indicator */}
        {step < 4 && (
          <div className="mb-6 flex items-center justify-between px-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                    step >= s
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {s}
                </div>
                <span className={`text-xs font-semibold ${step >= s ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s === 1 ? 'Your Details' : s === 2 ? 'Choose Plan' : 'Review'}
                </span>
                {s < 3 && <div className="h-0.5 w-6 bg-slate-200" />}
              </div>
            ))}
          </div>
        )}

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enter Your Details</h2>
                <p className="text-xs text-slate-500">
                  Fill in your basic information to get registered.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohan Mehta"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address <span className="font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rohan@example.com"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>
              </div>

              {/* WhatsApp Opt-in Consent */}
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <input
                  type="checkbox"
                  id="waOptInCheck"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="waOptInCheck" className="text-xs text-slate-700 cursor-pointer select-none leading-relaxed">
                  I agree to receive membership reminders and payment updates from <strong>{gym.name}</strong> on WhatsApp.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Select Membership Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Plan Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select Membership Plan</h2>
                <p className="text-xs text-slate-500">Choose the plan that suits your fitness routine.</p>
              </div>

              <div className="space-y-3">
                {plans.map((p) => {
                  const isSelected = p.id === selectedPlanId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`cursor-pointer overflow-hidden rounded-2xl border transition ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {p.image_url && (
                        <div className="aspect-video w-full overflow-hidden bg-slate-900">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                          <span className="text-base font-black text-emerald-700">{formatINR(p.price)}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Duration: {p.duration_days} days
                        </div>
                        {p.description && (
                          <p className="mt-1 text-xs text-slate-600 italic">{p.description}</p>
                        )}
                        {p.features && p.features.length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                            {p.features.map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 py-3.5 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Review & Confirm</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Review Registration</h2>
                <p className="text-xs text-slate-500">Please review your information before submitting.</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <strong className="text-slate-900">{fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <strong className="text-slate-900">{phone}</strong>
                </div>
                {email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <strong className="text-slate-900">{email}</strong>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <strong className="text-slate-900">{selectedPlan?.name}</strong>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>Payable Amount:</span>
                  <span className="text-lg font-black">{formatINR(selectedPlan?.price)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs">
                  <span className="text-slate-500">WhatsApp Updates:</span>
                  <strong className={whatsappOptIn ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {whatsappOptIn ? 'Consent Given' : 'Not Opted-In'}
                  </strong>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200 flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Payment is completed directly at reception via Cash or UPI after registration is confirmed.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 py-3.5 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Register</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">Registration Received!</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Welcome to <strong>{gym.name}</strong>, {fullName}!
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span>Selected Plan:</span>
                  <span className="font-bold text-slate-900">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount to Pay:</span>
                  <span className="font-bold text-slate-900">{formatINR(selectedPlan?.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Location:</span>
                  <span className="font-bold text-emerald-700">Reception Desk</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                Please proceed to the gym reception counter to verify your details and complete your membership activation.
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFullName('');
                  setPhone('');
                  setEmail('');
                  setWhatsappOptIn(false);
                }}
                className="w-full rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Register Another Member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
