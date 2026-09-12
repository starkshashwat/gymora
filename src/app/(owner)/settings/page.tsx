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
  Globe,
  Copy,
  Check,
  RefreshCw,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import LogoUploader from '@/components/ui/LogoUploader';

type SettingsTab = 'general' | 'domain' | 'payments' | 'whatsapp' | 'reminders' | 'rules';

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

  // Domain & Branding Settings
  const [customDomain, setCustomDomain] = useState('');
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const [brandColor, setBrandColor] = useState('#10b981');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifyResult, setDomainVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);
  const [copiedCustomDomain, setCopiedCustomDomain] = useState(false);

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
        if (s.domain) {
          setCustomDomain(s.domain.custom_domain || '');
          setIsDomainVerified(!!s.domain.custom_domain_verified);
          setBrandColor(s.domain.brand_color || '#10b981');
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
        domain: {
          custom_domain: customDomain.trim() || null,
          custom_domain_verified: isDomainVerified,
          brand_color: brandColor,
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gym:settings-updated'));
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySubdomain = (text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedSubdomain(true);
      setTimeout(() => setCopiedSubdomain(false), 2000);
    }
  };

  const handleCopyCustomDomain = (text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedCustomDomain(true);
      setTimeout(() => setCopiedCustomDomain(false), 2000);
    }
  };

  const handleVerifyDns = async () => {
    if (!customDomain.trim()) {
      setDomainVerifyResult({
        success: false,
        message: 'Please enter a custom domain or subdomain first (e.g. portal.mygym.com).',
      });
      return;
    }

    try {
      setIsVerifyingDomain(true);
      setDomainVerifyResult(null);

      const res = await fetch('/api/settings/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain.trim() }),
      });

      const data = await res.json();
      if (data.verified) {
        setIsDomainVerified(true);
        setDomainVerifyResult({
          success: true,
          message: data.message || 'DNS verified successfully! Your custom domain is now live.',
        });
        // Auto-save the verified state
        await handleSaveSettings();
      } else {
        setIsDomainVerified(false);
        setDomainVerifyResult({
          success: false,
          message: data.message || 'DNS verification failed. Please verify your CNAME/A record points to gymora.swadyum.store and DNS has propagated.',
        });
      }
    } catch (err: any) {
      setDomainVerifyResult({
        success: false,
        message: err.message || 'Network error during domain verification.',
      });
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleDisconnectDomain = () => {
    setCustomDomain('');
    setIsDomainVerified(false);
    setDomainVerifyResult({
      success: true,
      message: 'Custom domain removed. Click "Save Changes" to apply.',
    });
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'domain' as const, label: 'Domain & Branding', icon: Globe },
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
              <LogoUploader
                value={logoUrl}
                onChange={setLogoUrl}
                label="Gym Logo"
                description="Upload new gym logo (PNG, JPG, SVG, WebP up to 3MB) or paste URL"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Domain & Branding */}
      {activeTab === 'domain' && (
        <div className="space-y-8 max-w-3xl">
          {/* Header Description */}
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Custom Domain & White-Label Branding</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Host your gym&apos;s registration portal and member experience under your own gym brand, slug, and custom domain.
            </p>
          </div>

          {/* Verification Notification Banner */}
          {domainVerifyResult && (
            <div
              className={`rounded-xl border p-4 flex items-start gap-3 text-xs leading-relaxed ${
                domainVerifyResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              }`}
            >
              {domainVerifyResult.success ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">
                  {domainVerifyResult.success ? 'Domain Status: Connected' : 'Verification Warning'}
                </span>
                <span>{domainVerifyResult.message}</span>
              </div>
            </div>
          )}

          {/* TIER 1: Free Branded Subdomain (Default) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/50 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    Tier 1: Free Branded Subdomain
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                      Default &bull; Active
                    </span>
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400">Zero DNS setup &bull; Free forever</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every gym on Gymora automatically gets an instantly live, SSL-secured branded web address. Share this link on your Instagram bio, WhatsApp, or Google Business profile.
            </p>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  https://{slug || 'your-gym'}.gymora.swadyum.store
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopySubdomain(`https://${slug || 'your-gym'}.gymora.swadyum.store`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  {copiedSubdomain ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
                <a
                  href={`/join/${slug || 'demo-gym'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition"
                >
                  <span>Preview</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Tip: You can customize the subdomain slug (<strong>{slug || 'your-gym'}</strong>) anytime under the <em>General</em> tab.
            </div>
          </div>

          {/* TIER 2: Custom Gym Domain */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/50 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    Tier 2: Custom Gym Domain
                    {isDomainVerified ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> Connected
                      </span>
                    ) : customDomain ? (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                        DNS Pending
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                        Optional
                      </span>
                    )}
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400">100% White-Label on your website</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Connect your own domain or subdomain (for example: <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">portal.ironpulsefitness.com</code> or <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">members.mygym.in</code>). Members will only see your brand URL with zero Gymora branding.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Your Custom Domain / Subdomain
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/^(https?:\/\/)/, '').replace(/\/.*$/, '').trim())}
                  placeholder="e.g. portal.mygym.com or gym.mybrand.in"
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={isVerifyingDomain || !customDomain.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {isVerifyingDomain ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Checking DNS...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Verify DNS</span>
                      </>
                    )}
                  </button>

                  {customDomain && (
                    <button
                      type="button"
                      onClick={handleDisconnectDomain}
                      className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* DNS Instructions Box */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                DNS Configuration Steps
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, Hostinger, etc.) and create this DNS record:
              </p>

              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Name / Host</th>
                      <th className="px-3 py-2 font-semibold">Points To / Target</th>
                      <th className="px-3 py-2 font-semibold">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                    <tr>
                      <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">CNAME</td>
                      <td className="px-3 py-2">
                        {customDomain ? (customDomain.split('.')[0] || 'portal') : 'portal'}
                      </td>
                      <td className="px-3 py-2 flex items-center justify-between gap-2">
                        <span>gymora.swadyum.store</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCustomDomain('gymora.swadyum.store')}
                          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          {copiedCustomDomain ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-zinc-500">A (Alternative)</td>
                      <td className="px-3 py-2">@ or root domain</td>
                      <td className="px-3 py-2">77.37.54.103</td>
                      <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong>Note:</strong> DNS changes typically propagate within 2 to 15 minutes. Once DNS propagates, click &ldquo;Verify DNS&rdquo; above and hit &ldquo;Save Changes&rdquo;.
              </div>
            </div>
          </div>

          {/* BRAND APPEARANCE & THEME COLOR */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/50 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Brand Theme & Appearance
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Customize the primary accent color of your registration portal and member interface.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Brand Accent Color
              </label>

              <div className="flex flex-wrap items-center gap-3">
                {[
                  { name: 'Emerald', hex: '#10b981' },
                  { name: 'Blue', hex: '#3b82f6' },
                  { name: 'Violet', hex: '#8b5cf6' },
                  { name: 'Amber', hex: '#f59e0b' },
                  { name: 'Rose', hex: '#ef4444' },
                  { name: 'Cyan', hex: '#06b6d4' },
                  { name: 'Dark', hex: '#18181b' },
                ].map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setBrandColor(color.hex)}
                    className={`group relative flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      brandColor === color.hex
                        ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white ring-2 ring-zinc-900 dark:ring-white ring-offset-1'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono uppercase text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
                <div
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: brandColor }}
                >
                  Live Button Preview
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <LogoUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="Gym Brand Logo"
                  description="Displays on your custom domain header, member receipts, and join portal"
                />
              </div>
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
