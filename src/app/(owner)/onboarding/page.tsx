'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseMembersExcel } from '@/lib/utils/excelImport';
import {
  PaymentMode,
  GatewayProvider,
  WhatsAppMode,
  ImportedMemberRow,
} from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import {
  Dumbbell,
  Building2,
  CreditCard,
  MessageCircle,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Smartphone,
  ShieldCheck,
  Upload,
  Download,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard Steps (1 to 5)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Gym Details
  const [gymName, setGymName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');

  // Step 2: Payment Mode & Gateway
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('local_qr');
  const [upiId, setUpiId] = useState('');
  const [gatewayProvider, setGatewayProvider] = useState<GatewayProvider>('razorpay');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [isVerifyingGateway, setIsVerifyingGateway] = useState(false);
  const [gatewayVerificationStatus, setGatewayVerificationStatus] = useState<{
    verified: boolean;
    message?: string;
  } | null>(null);

  // Step 3: WhatsApp Mode
  const [whatsappMode, setWhatsappMode] = useState<WhatsAppMode>('local_click_to_chat');
  const [isFacebookConnecting, setIsFacebookConnecting] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [fbWabaId, setFbWabaId] = useState('');
  const [fbPhoneNumberId, setFbPhoneNumberId] = useState('');

  // Step 4: Plans
  const [plans, setPlans] = useState([
    { name: 'Monthly Standard', duration_days: 30, price: 1500, description: 'Full gym access + locker facilities' },
    { name: 'Quarterly Pro', duration_days: 90, price: 4000, description: 'Gym access + trainer consultation' },
    { name: 'Annual Elite', duration_days: 365, price: 14000, description: 'All-hours access + sauna & nutrition guide' },
  ]);

  // Step 5: Excel Import
  const [importedMembers, setImportedMembers] = useState<ImportedMemberRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // Auto-generate slug from gym name
  const handleGymNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGymName(val);
    if (!slug || slug === gymName.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  // Test Payment Gateway Keys
  const handleVerifyGatewayKeys = async () => {
    if (!keyId.trim() || !keySecret.trim()) {
      setGatewayVerificationStatus({
        verified: false,
        message: 'Please enter both Key ID and Key Secret',
      });
      return;
    }

    try {
      setIsVerifyingGateway(true);
      const res = await fetch('/api/onboarding/verify-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: gatewayProvider,
          key_id: keyId.trim(),
          key_secret: keySecret.trim(),
        }),
      });
      const data = await res.json();
      setGatewayVerificationStatus({
        verified: data.valid,
        message: data.message,
      });
    } catch (err: any) {
      setGatewayVerificationStatus({
        verified: false,
        message: 'Could not connect to gateway server',
      });
    } finally {
      setIsVerifyingGateway(false);
    }
  };

  // Mock Facebook Embedded Signup Flow
  const handleFacebookConnect = () => {
    setIsFacebookConnecting(true);
    // Simulate Meta Embedded Signup popup
    setTimeout(() => {
      setIsFacebookConnecting(false);
      setFacebookConnected(true);
      setFbWabaId('waba_act_' + Math.floor(1000000000 + Math.random() * 9000000000));
      setFbPhoneNumberId('phone_id_' + Math.floor(1000000000 + Math.random() * 9000000000));
    }, 1200);
  };

  // Handle Excel Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsingExcel(true);
      setFileName(file.name);
      setImportErrors([]);

      const buffer = await file.arrayBuffer();
      const { members, errors } = parseMembersExcel(buffer);

      setImportedMembers(members);
      setImportErrors(errors);
    } catch (err: any) {
      setImportErrors(['Failed to read file: ' + err.message]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Final Submit (Save All Settings)
  const handleCompleteOnboarding = async (skipExcel = false) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        gym_name: gymName.trim() || 'My Gym',
        address: address.trim() || undefined,
        phone: phone.trim() || '9876543210',
        slug: slug.trim() || 'gymora',
        payment_mode: paymentMode,
        upi_id: paymentMode === 'local_qr' ? upiId.trim() || undefined : undefined,
        gateway_provider: paymentMode === 'gateway' ? gatewayProvider : undefined,
        gateway_key_id: paymentMode === 'gateway' ? keyId.trim() || undefined : undefined,
        gateway_key_secret: paymentMode === 'gateway' ? keySecret.trim() || undefined : undefined,
        whatsapp_mode: whatsappMode,
        fb_waba_id: whatsappMode === 'cloud_api' ? fbWabaId : undefined,
        fb_phone_number_id: whatsappMode === 'cloud_api' ? fbPhoneNumberId : undefined,
        plans,
        imported_members: !skipExcel && importedMembers.length > 0 ? importedMembers : undefined,
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to finish onboarding');
      }

      // Success -> Set cookies and navigate cleanly to Dashboard!
      if (data.gym_id) {
        document.cookie = `gymora_gym_id=${data.gym_id}; path=/; max-age=2592000; SameSite=Lax`;
      }
      document.cookie = 'gymora_session=true; path=/; max-age=2592000; SameSite=Lax';
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Something went wrong during onboarding.');
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Gym Details', icon: Building2 },
    { num: 2, title: 'Payment Setup', icon: CreditCard },
    { num: 3, title: 'WhatsApp Setup', icon: MessageCircle },
    { num: 4, title: 'Plans', icon: Layers },
    { num: 5, title: 'Import Members', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Top Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/10 mb-3">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome to Gymora
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Let's configure your gym, payments & member messaging in 3 minutes.
          </p>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="mb-8 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center justify-between min-w-[560px] bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
            {stepTitles.map((st) => {
              const Icon = st.icon;
              const isCompleted = currentStep > st.num;
              const isCurrent = currentStep === st.num;

              return (
                <div key={st.num} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-slate-900 text-white ring-4 ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : st.num}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {st.title}
                  </span>
                  {st.num < 5 && <div className="h-0.5 w-6 bg-slate-100 mx-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Step Card Container */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-xs font-bold text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 1: Gym Details                                              */}
          {/* ================================================================ */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 1: Tell us about your gym</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  This information will be displayed to your members on the reception QR onboarding.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Gym Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gymName}
                    onChange={handleGymNameChange}
                    placeholder="e.g. Iron Pulse Fitness"
                    className="w-full rounded-xl border border-slate-300 py-3 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Muscle Beach Way, Bandra West, Mumbai"
                    className="w-full rounded-xl border border-slate-300 py-3 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Business Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border border-slate-300 py-3 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Unique QR Link Slug *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g. iron-pulse"
                        className="w-full rounded-xl border border-slate-300 py-3 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200">
                  Your public reception link will be:{' '}
                  <strong className="text-emerald-700 font-mono">
                    gymora.fit/join/{slug || 'your-gym'}
                  </strong>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!gymName.trim() || !phone.trim()) {
                      setError('Please provide your Gym Name and Phone number.');
                      return;
                    }
                    setError(null);
                    setCurrentStep(2);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Next: Payment Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: Payment Collection Setup                                 */}
          {/* ================================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 2: How will you collect payments?</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between a simple direct PhonePe/UPI QR or an automated Payment Gateway.
                </p>
              </div>

              {/* Mode Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentMode('local_qr')}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    paymentMode === 'local_qr'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                      0% Transaction Fee
                    </span>
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Direct UPI / Counter QR</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Zero hassle. Enter your PhonePe/GPay UPI ID or upload your counter QR. Money goes straight to your bank account with zero fees.
                  </p>
                </div>

                <div
                  onClick={() => setPaymentMode('gateway')}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    paymentMode === 'gateway'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 uppercase">
                      Automated Online
                    </span>
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Payment Gateway</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Accept UPI, Credit Cards, NetBanking online. Dues auto-mark as paid via Razorpay, Cashfree, or PhonePe PG.
                  </p>
                </div>
              </div>

              {/* Sub-form: Direct UPI */}
              {paymentMode === 'local_qr' && (
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-sm font-bold text-slate-900">Your UPI Collection Details</h4>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      UPI ID (VPA) *
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. 9876543210@ybl or gymname@okaxis"
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      When members scan your reception QR, this UPI ID will be used for instant payment.
                    </p>
                  </div>
                </div>
              )}

              {/* Sub-form: Gateway Key ID & Key Secret */}
              {paymentMode === 'gateway' && (
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Configure Gateway Credentials</h4>
                    <span className="text-xs text-slate-400">Key ID & Secret</span>
                  </div>

                  {/* Provider Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {(['razorpay', 'phonepe', 'cashfree', 'paytm'] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => {
                          setGatewayProvider(prov);
                          setGatewayVerificationStatus(null);
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                          gatewayProvider === prov
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {prov === 'phonepe' ? 'PhonePe PG' : prov}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        {gatewayProvider.toUpperCase()} Key ID *
                      </label>
                      <a
                        href={
                          gatewayProvider === 'razorpay'
                            ? 'https://dashboard.razorpay.com/app/keys'
                            : 'https://merchant.phonepe.com'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <span>Where to find keys?</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      placeholder={gatewayProvider === 'razorpay' ? 'rzp_live_xxxxxxxx or rzp_test_xxxx' : 'Merchant Key ID'}
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Key Secret *
                    </label>
                    <input
                      type="password"
                      value={keySecret}
                      onChange={(e) => setKeySecret(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition font-mono"
                    />
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleVerifyGatewayKeys}
                      disabled={isVerifyingGateway}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {isVerifyingGateway ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>Verify Keys</span>
                        </>
                      )}
                    </button>

                    {gatewayVerificationStatus && (
                      <span
                        className={`text-xs font-bold ${
                          gatewayVerificationStatus.verified ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {gatewayVerificationStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentStep(3);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Next: WhatsApp Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: WhatsApp Notification Branching                          */}
          {/* ================================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 3: How to notify customers on WhatsApp?</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how fee reminders and receipts should be sent to your members.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch A: Local WhatsApp */}
                <div
                  onClick={() => setWhatsappMode('local_click_to_chat')}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    whatsappMode === 'local_click_to_chat'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                      100% Free • No API Key
                    </span>
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">Local WhatsApp (1-Tap Send)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Zero setup. When you click WhatsApp, your phone app opens with the customer's number & prefilled fee message. You just hit <strong>Enter/Send</strong>.
                  </p>
                </div>

                {/* Branch B: WhatsApp Business Cloud API */}
                <div
                  onClick={() => setWhatsappMode('cloud_api')}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    whatsappMode === 'cloud_api'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 uppercase">
                      Automated Background
                    </span>
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">WhatsApp Business Cloud API</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Automated sending via Meta. Log in with your Facebook account once and Gymora automatically manages notifications.
                  </p>
                </div>
              </div>

              {/* Detail view for Local WhatsApp */}
              {whatsappMode === 'local_click_to_chat' && (
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-2 text-xs text-slate-600 animate-in fade-in duration-150">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>How it works on your phone/laptop:</span>
                  </div>
                  <p>
                    1. On your Dashboard, click the <strong>WhatsApp</strong> button on any due or overdue member.
                  </p>
                  <p>
                    2. Your WhatsApp automatically opens with the message:{' '}
                    <em>"Hi Rajesh, your gym membership payment of ₹1,500 is due..."</em>
                  </p>
                  <p>3. You simply tap <strong>Send</strong>. No per-message fees or Meta verification needed!</p>
                </div>
              )}

              {/* Detail view for WhatsApp Cloud API Embedded Signup */}
              {whatsappMode === 'cloud_api' && (
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Meta Embedded Signup</h4>
                      <p className="text-xs text-slate-500">
                        Log in with Facebook to automatically link your WhatsApp Business number.
                      </p>
                    </div>
                    {facebookConnected ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Connected
                      </span>
                    ) : null}
                  </div>

                  {!facebookConnected ? (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-3">
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Click the button below to open Meta's secure dialog, select your WhatsApp business account, and grant notification permissions.
                      </p>
                      <button
                        type="button"
                        onClick={handleFacebookConnect}
                        disabled={isFacebookConnecting}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#166fe5] active:scale-95 disabled:opacity-50 transition"
                      >
                        {isFacebookConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Connecting with Meta...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Login with Facebook for WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>WhatsApp Business Account Linked!</span>
                      </div>
                      <p>WABA ID: <code className="font-mono">{fbWabaId}</code></p>
                      <p>Phone Number ID: <code className="font-mono">{fbPhoneNumberId}</code></p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Next: Review Plans</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 4: Initial Membership Plans                                 */}
          {/* ================================================================ */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 4: Your Membership Plans</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  We have pre-filled standard pricing. You can adjust the fee or keep these defaults.
                </p>
              </div>

              <div className="space-y-3">
                {plans.map((plan, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => {
                          const updated = [...plans];
                          updated[idx].name = e.target.value;
                          setPlans(updated);
                        }}
                        className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">{plan.duration_days} days</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                          Fee (₹)
                        </label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[idx].price = Number(e.target.value);
                            setPlans(updated);
                          }}
                          className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm font-bold text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          value={plan.duration_days}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[idx].duration_days = Number(e.target.value);
                            setPlans(updated);
                          }}
                          className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Next: Import Existing Members</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 5: Excel Member Import (With Prominent Skip Button)          */}
          {/* ================================================================ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Step 5: Import Existing Members (Optional)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Already have a member register or notebook? Upload your Excel or CSV sheet to import everyone in 5 seconds.
                </p>
              </div>

              {/* Dropzone & Sample Download */}
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/50 transition">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-emerald-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>

                <div>
                  <label htmlFor="excelInput" className="cursor-pointer font-bold text-sm text-emerald-600 hover:underline">
                    Click to browse file
                  </label>
                  <span className="text-xs text-slate-500"> or drag and drop Excel (.xlsx, .xls, .csv)</span>
                  <input
                    id="excelInput"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="pt-2">
                  <a
                    href="/api/onboarding/sample-template"
                    download="gymora_member_import_template.csv"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>Download Sample Excel Template</span>
                  </a>
                </div>
              </div>

              {/* Parsing status */}
              {isParsingExcel && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>Parsing spreadsheet...</span>
                </div>
              )}

              {/* Errors list */}
              {importErrors.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>Some rows had issues:</span>
                  </div>
                  {importErrors.slice(0, 3).map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                  {importErrors.length > 3 && (
                    <div>...and {importErrors.length - 3} more rows skipped.</div>
                  )}
                </div>
              )}

              {/* Preview of parsed members */}
              {importedMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      Ready to Import: <strong className="text-emerald-600">{importedMembers.length} members</strong>
                    </span>
                    <span className="text-slate-400 font-normal">File: {fileName}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {importedMembers.slice(0, 8).map((m, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between bg-white">
                        <div>
                          <span className="font-bold text-slate-900">{m.full_name}</span>
                          <span className="text-slate-400 ml-2">({m.phone})</span>
                        </div>
                        <span className="font-bold text-slate-700">{formatINR(m.amount_due)}</span>
                      </div>
                    ))}
                    {importedMembers.length > 8 && (
                      <div className="p-2 text-center text-slate-400 italic bg-slate-50">
                        + {importedMembers.length - 8} more members in file
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons: Import vs SKIP FOR NOW */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 order-2 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex items-center gap-3 order-1 sm:order-2">
                  {/* The Crucial SKIP BUTTON */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCompleteOnboarding(true)}
                    className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white py-3 px-5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition"
                  >
                    Skip for now → Go to Dashboard
                  </button>

                  {/* Import Button */}
                  {importedMembers.length > 0 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleCompleteOnboarding(false)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-6 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Import ({importedMembers.length}) & Finish</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
