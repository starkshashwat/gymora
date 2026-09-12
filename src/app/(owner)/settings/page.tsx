'use client';

import React, { useState, useEffect } from 'react';
import { SettingsPayload, AutomationRule, GatewayProvider, WhatsAppMode } from '@/lib/types/database';
import {
  Building2,
  CreditCard,
  MessageCircle,
  Bell,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  ExternalLink,
  QrCode,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';

type SettingsTab = 'general' | 'payments' | 'whatsapp' | 'reminders' | 'rules';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Settings
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Payments Settings
  const [upiId, setUpiId] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(false);
  const [gatewayProvider, setGatewayProvider] = useState<GatewayProvider>('razorpay');
  const [gatewayKeyId, setGatewayKeyId] = useState('');
  const [gatewayKeySecret, setGatewayKeySecret] = useState('');

  // WhatsApp Settings
  const [whatsappMode, setWhatsappMode] = useState<WhatsAppMode>('local_click_to_chat');
  const [fbWabaId, setFbWabaId] = useState('');
  const [fbPhoneNumberId, setFbPhoneNumberId] = useState('');

  // Membership Rules
  const [autoCancelDays, setAutoCancelDays] = useState<number | null>(null);

  // Automation Rules
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s: SettingsPayload = data.settings;
        if (s.general) {
          setGymName(s.general.name || '');
          setPhone(s.general.phone || '');
          setEmail(s.general.email || '');
          setAddress(s.general.address || '');
          setSlug(s.general.slug || '');
          setLogoUrl(s.general.logo_url || '');
        }
        if (s.payments) {
          setUpiId(s.payments.upi_id || '');
          setUpiQrUrl(s.payments.upi_qr_url || '');
          setPaymentInstructions(s.payments.payment_instructions || '');
          setIsGatewayEnabled(!!s.payments.is_gateway_enabled);
          setGatewayProvider(s.payments.gateway_provider || 'razorpay');
          setGatewayKeyId(s.payments.gateway_key_id || '');
        }
        if (s.whatsapp) {
          setWhatsappMode(s.whatsapp.whatsapp_mode || 'local_click_to_chat');
          setFbWabaId(s.whatsapp.fb_waba_id || '');
          setFbPhoneNumberId(s.whatsapp.fb_phone_number_id || '');
        }
        if (s.rules) {
          setAutoCancelDays(s.rules.auto_cancel_overdue_days ?? null);
        }
      }
      if (data.automationRules) {
        setAutomationRules(data.automationRules);
      }
    } catch (e: any) {
      setError('Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const payload: SettingsPayload = {
        general: {
          name: gymName,
          phone,
          email,
          address,
          slug,
          logo_url: logoUrl,
        },
        payments: {
          upi_id: upiId,
          upi_qr_url: upiQrUrl,
          payment_instructions: paymentInstructions,
          is_gateway_enabled: isGatewayEnabled,
          gateway_provider: gatewayProvider,
          gateway_key_id: gatewayKeyId,
          gateway_key_secret: gatewayKeySecret || undefined,
        },
        whatsapp: {
          whatsapp_mode: whatsappMode,
          fb_waba_id: fbWabaId,
          fb_phone_number_id: fbPhoneNumberId,
        },
        rules: {
          auto_cancel_overdue_days: autoCancelDays,
        },
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'payments' as const, label: 'Payments', icon: CreditCard },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
    { id: 'reminders' as const, label: 'Reminders & Automations', icon: Bell },
    { id: 'rules' as const, label: 'Membership Rules', icon: ShieldAlert },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gym Settings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your gym profile, payment collection methods, messaging, and automation rules.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3.5 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3.5 flex items-center gap-2 text-xs font-medium text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: General */}
      {activeTab === 'general' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">General Information</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Basic details about your gym displayed across QR registration and member receipts.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Gym Name *
              </label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Official Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Gym Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Public QR Slug *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Public onboarding link: <strong>gymora.fit/join/{slug}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-8 max-w-2xl">
          {/* Section 1: Manual Payments */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Manual Payments</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Support Cash, UPI, and Counter QR payments with 0% gateway fees.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 9876543210@ybl or gymname@okaxis"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Local Counter QR Image URL
                </label>
                <input
                  type="url"
                  value={upiQrUrl}
                  onChange={(e) => setUpiQrUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Payment Instructions for Reception
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="e.g. Please show the UPI transaction screenshot or pay cash at the desk."
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Online Payment Gateway */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Online Payment Gateway</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Accept automated payments online via Razorpay, PhonePe, Cashfree, or Paytm.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGatewayEnabled}
                  onChange={(e) => setIsGatewayEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white"></div>
              </label>
            </div>

            {isGatewayEnabled ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Gateway Provider
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['razorpay', 'phonepe', 'cashfree', 'paytm'] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setGatewayProvider(prov)}
                        className={`rounded-lg py-2 px-3 text-xs font-semibold capitalize border transition ${
                          gatewayProvider === prov
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {prov === 'phonepe' ? 'PhonePe PG' : prov}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {gatewayProvider.toUpperCase()} Key ID
                  </label>
                  <input
                    type="text"
                    value={gatewayKeyId}
                    onChange={(e) => setGatewayKeyId(e.target.value)}
                    placeholder="Key ID"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Key Secret
                  </label>
                  <input
                    type="password"
                    value={gatewayKeySecret}
                    onChange={(e) => setGatewayKeySecret(e.target.value)}
                    placeholder="Leave empty to keep current secret"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Webhook URL:</span>{' '}
                  <code className="font-mono text-zinc-900 dark:text-zinc-100">https://gymora.fit/api/webhooks/{gatewayProvider}</code>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-5 text-center text-xs text-zinc-400">
                Online gateway is currently disabled. Toggle the switch above to connect Razorpay, PhonePe, or Cashfree.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">WhatsApp Messaging Modes</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Choose between 1-tap manual click-to-chat or automated WhatsApp Business Cloud API notifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setWhatsappMode('local_click_to_chat')}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                whatsappMode === 'local_click_to_chat'
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/60 ring-1 ring-zinc-900 dark:ring-white'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                100% Free • Ready to Use
              </span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1.5">Manual WhatsApp (1-Tap)</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Clicking WhatsApp on any member opens your phone app or WhatsApp Web with prefilled message.
              </p>
            </div>

            <div
              onClick={() => setWhatsappMode('cloud_api')}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                whatsappMode === 'cloud_api'
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/60 ring-1 ring-zinc-900 dark:ring-white'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Automated Background
              </span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1.5">WhatsApp Business Cloud API</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Automate reminders and receipts via Meta's official Cloud API using pre-approved templates.
              </p>
            </div>
          </div>

          {whatsappMode === 'cloud_api' && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Connection Status</span>
                <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {fbWabaId ? 'Connected' : 'Not connected'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  WhatsApp Business Account (WABA) ID
                </label>
                <input
                  type="text"
                  value={fbWabaId}
                  onChange={(e) => setFbWabaId(e.target.value)}
                  placeholder="e.g. 102938475610293"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={fbPhoneNumberId}
                  onChange={(e) => setFbPhoneNumberId(e.target.value)}
                  placeholder="e.g. 987654321012345"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Reminders & Automations */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Automation Rules & Trigger Engine</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Control when automated payment reminders and updates are triggered. Messages respect member WhatsApp opt-out preferences.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-semibold text-zinc-500">
                  <th className="py-3 px-4">Event Trigger</th>
                  <th className="py-3 px-4">Timing Offset</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4 text-right">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {automationRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                      {rule.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {rule.timing_offset_days === 0
                        ? 'Immediate / On date'
                        : rule.timing_offset_days < 0
                        ? `${Math.abs(rule.timing_offset_days)} days before`
                        : `${rule.timing_offset_days} days after`}
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-zinc-400">
                      {rule.channel}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {rule.template_name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Membership Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Membership Auto-Cancellation Rule</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Automatically cancel memberships that remain unpaid past a specified grace period.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Automatically cancel overdue memberships after:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { days: null, label: 'Never (Manual)' },
                  { days: 3, label: '3 Days Overdue' },
                  { days: 7, label: '7 Days Overdue' },
                  { days: 14, label: '14 Days Overdue' },
                  { days: 30, label: '30 Days Overdue' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setAutoCancelDays(opt.days)}
                    className={`rounded-lg py-2 px-3 text-xs font-semibold border transition ${
                      autoCancelDays === opt.days
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong className="text-zinc-900 dark:text-zinc-100">Financial History Guarantee:</strong>{' '}
              Cancelling an unpaid membership moves the membership lifecycle to <em>Cancelled</em> and deactivates access. The member's full profile, past payments, and subscription history remain fully preserved and searchable.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
