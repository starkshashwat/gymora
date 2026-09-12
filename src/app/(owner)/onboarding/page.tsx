'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseMembersExcel } from '@/lib/utils/excelImport';
import { ImportedMemberRow } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import {
  Dumbbell,
  Building2,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import LogoUploader from '@/components/ui/LogoUploader';

interface PlanItem {
  id?: string;
  name: string;
  duration_days: number;
  price: number;
  description: string;
  image_url?: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard Steps (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Gym Details
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Step 2: Plans
  const [plans, setPlans] = useState<PlanItem[]>([
    {
      name: 'Monthly Standard',
      duration_days: 30,
      price: 1500,
      description: 'Full gym access + locker room facilities',
      image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Quarterly Pro',
      duration_days: 90,
      price: 4000,
      description: 'Full gym access + 1 trainer consultation',
      image_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Annual Elite',
      duration_days: 365,
      price: 14000,
      description: 'All-hours access + sauna & nutrition guide',
      image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    },
  ]);

  // Step 3: Excel Import
  const [importedMembers, setImportedMembers] = useState<ImportedMemberRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  // Clean and URL-safe slug formatting
  const cleanSlug = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleGymNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGymName(val);
    setSlug(cleanSlug(val));
  };

  // Plan Management Handlers
  const handleAddPlan = () => {
    setPlans([
      ...plans,
      {
        name: 'New Membership Tier',
        duration_days: 30,
        price: 2000,
        description: 'Gym floor access',
      },
    ]);
  };

  const handleUpdatePlan = (index: number, field: keyof PlanItem, value: any) => {
    const updated = [...plans];
    (updated[index] as any)[field] = value;
    setPlans(updated);
  };

  const handleRemovePlan = (index: number) => {
    if (plans.length <= 1) {
      setError('You must have at least one membership plan.');
      return;
    }
    setError(null);
    setPlans(plans.filter((_, i) => i !== index));
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
        phone: phone.trim() || '9876543210',
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        slug: slug.trim() || 'gymora',
        logo_url: logoUrl.trim() || undefined,
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

      // Success -> Navigate cleanly to Dashboard!
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

  const steps = [
    { num: 1, title: 'Gym Details', icon: Building2 },
    { num: 2, title: 'Membership Plans', icon: Layers },
    { num: 3, title: 'Import Members', icon: FileSpreadsheet },
    { num: 4, title: 'Finish', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 flex flex-col justify-center">
      <div className="mx-auto max-w-2xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm mb-3">
            <Dumbbell className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to Gymora
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Let's get your gym and membership plans set up in 2 minutes.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          {steps.map((st) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            const Icon = st.icon;

            return (
              <div key={st.num} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                    isCompleted
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : isCurrent
                      ? 'bg-zinc-900 text-white ring-2 ring-zinc-400 dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : st.num}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    isCurrent
                      ? 'text-zinc-900 dark:text-zinc-50 font-semibold'
                      : isCompleted
                      ? 'text-zinc-700 dark:text-zinc-300'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {st.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Gym Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Gym Information</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This info appears on your reception QR page and receipts.
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Gym Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gymName}
                    onChange={handleGymNameChange}
                    placeholder="e.g. Iron Pulse Fitness"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Business Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Email Address <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourgym.com"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Muscle Beach Way, Bandra West, Mumbai"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <LogoUploader
                    value={logoUrl}
                    onChange={setLogoUrl}
                    label="Gym Logo (Upload File)"
                    description="Upload PNG, JPG, or SVG (phone camera or gallery supported)"
                  />
                </div>

                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/80 p-3.5 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Public QR Registration Link: </span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                    gymora.swadyum.store/join/{slug || 'your-gym'}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!gymName.trim() || !phone.trim()) {
                      setError('Please provide Gym Name and Official Phone.');
                      return;
                    }
                    setError(null);
                    setCurrentStep(2);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 px-5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
                >
                  <span>Next: Membership Plans</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Membership Plans */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Membership Plans</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Set up the initial plans members can purchase. You can add more later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPlan}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Plan</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {plans.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdatePlan(idx, 'name', e.target.value)}
                        placeholder="Plan Name"
                        className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePlan(idx)}
                        className="text-zinc-400 hover:text-rose-600 transition p-1"
                        title="Remove plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          value={p.price}
                          onChange={(e) => handleUpdatePlan(idx, 'price', Number(e.target.value))}
                          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 px-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          value={p.duration_days}
                          onChange={(e) => handleUpdatePlan(idx, 'duration_days', Number(e.target.value))}
                          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 px-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                        Description / Included Benefits
                      </label>
                      <input
                        type="text"
                        value={p.description}
                        onChange={(e) => handleUpdatePlan(idx, 'description', e.target.value)}
                        placeholder="e.g. Access to gym floor + locker room"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 px-2.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 px-3.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (plans.length === 0) {
                      setError('Please add at least one plan.');
                      return;
                    }
                    setError(null);
                    setCurrentStep(3);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 px-5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
                >
                  <span>Next: Import Members</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Existing Members (Optional Excel Import) */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Import Existing Members</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Already have members in an Excel sheet? Upload it now, or skip and add members manually.
                </p>
              </div>

              {/* Upload Box */}
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 text-center space-y-3">
                <Upload className="mx-auto h-8 w-8 text-zinc-400" />
                <div>
                  <label className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100 underline hover:text-zinc-700">
                    <span>Click to choose Excel file (.xlsx)</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-zinc-500 mt-0.5">Supports name, phone, plan, amount due, and due date.</p>
                </div>

                <div className="pt-1">
                  <a
                    href="/api/onboarding/sample-template"
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download sample Excel template</span>
                  </a>
                </div>
              </div>

              {isParsingExcel && (
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Parsing Excel file...</span>
                </div>
              )}

              {fileName && importedMembers.length > 0 && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span><strong>{fileName}</strong>: {importedMembers.length} members ready to import!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportedMembers([]);
                      setFileName(null);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="font-semibold">Import Notices:</div>
                  {importErrors.slice(0, 3).map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 px-3.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImportedMembers([]);
                      setCurrentStep(4);
                    }}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 px-2"
                  >
                    Skip for Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 px-5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
                  >
                    <span>Next: Review & Launch</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Launch */}
          {currentStep === 4 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  You're Ready to Launch!
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Everything is configured. Click below to enter your operational dashboard.
                </p>
              </div>

              {/* Summary Box */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-4 text-left text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Gym Name:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{gymName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Phone:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reception QR Slug:</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">gymora.fit/join/{slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Configured Plans:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{plans.length} tiers ({plans.map(p => p.name).join(', ')})</span>
                </div>
                {importedMembers.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Members to Import:</span>
                    <span className="font-semibold text-emerald-600">{importedMembers.length} members</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 px-3.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteOnboarding(importedMembers.length === 0)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 px-6 text-sm font-semibold shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Entering Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
