'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SettingsPayload, AutomationRule, GatewayProvider, WhatsAppMode } from '@/lib/types/database';
import {
  Building2,
  CreditCard,
  MessageCircle,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  QrCode,
  Sparkles,
  Clock,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Palette,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import LogoUploader from '@/components/ui/LogoUploader';

export type SettingsSection = 'profile' | 'payments' | 'whatsapp' | 'automation' | 'branding';

interface SettingsSnapshot {
  gymName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  upiId: string;
  upiQrUrl: string;
  paymentInstructions: string;
  isGatewayEnabled: boolean;
  gatewayProvider: GatewayProvider;
  gatewayKeyId: string;
  gatewayKeySecret: string;
  whatsappMode: WhatsAppMode;
  fbWabaId: string;
  fbPhoneNumberId: string;
  autoCancelDays: number | null;
  dashboardDomain: string;
  landingDomain: string;
  isDomainVerified: boolean;
  brandColor: string;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  // Group 1: Gym Profile
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [copiedDerivedUrl, setCopiedDerivedUrl] = useState(false);

  // Group 2: Payments
  const [upiId, setUpiId] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(false);
  const [gatewayProvider, setGatewayProvider] = useState<GatewayProvider>('razorpay');
  const [gatewayKeyId, setGatewayKeyId] = useState('');
  const [gatewayKeySecret, setGatewayKeySecret] = useState('');

  // Group 3: WhatsApp
  const [whatsappMode, setWhatsappMode] = useState<WhatsAppMode>('local_click_to_chat');
  const [fbWabaId, setFbWabaId] = useState('');
  const [fbPhoneNumberId, setFbPhoneNumberId] = useState('');

  // Group 4: Automation
  const [autoCancelDays, setAutoCancelDays] = useState<number | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  // Group 5: Domain & Branding
  const [logoUrl, setLogoUrl] = useState('');
  const [dashboardDomain, setDashboardDomain] = useState('');
  const [landingDomain, setLandingDomain] = useState('');
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const [brandColor, setBrandColor] = useState('#10b981');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifyResult, setDomainVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCustomDomain, setCopiedCustomDomain] = useState(false);

  // Initial snapshot to track dirty state
  const initialSnapshotRef = useRef<SettingsSnapshot | null>(null);

  // Auto-derived slug from Gym Name
  const derivedSlug = useMemo(() => {
    return (
      gymName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'my-gym'
    );
  }, [gymName]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s: SettingsPayload = data.settings;
        const gName = s.general?.name || '';
        const gPhone = s.general?.phone || '';
        const gEmail = s.general?.email || '';
        const gAddress = s.general?.address || '';
        const gLogo = s.general?.logo_url || '';

        const dDashDomain = s.domain?.dashboard_domain || '';
        const dLandingDomain = s.domain?.landing_page_domain || s.domain?.custom_domain || '';
        const dVerified = !!s.domain?.custom_domain_verified;
        const dColor = s.domain?.brand_color || '#10b981';

        const pUpi = s.payments?.upi_id || '';
        const pQr = s.payments?.upi_qr_url || '';
        const pInstructions = s.payments?.payment_instructions || '';
        const pGatewayEnabled = !!s.payments?.is_gateway_enabled;
        const pProvider = s.payments?.gateway_provider || 'razorpay';
        const pKeyId = s.payments?.gateway_key_id || '';

        const wMode = s.whatsapp?.whatsapp_mode || 'local_click_to_chat';
        const wWaba = s.whatsapp?.fb_waba_id || '';
        const wPhoneId = s.whatsapp?.fb_phone_number_id || '';

        const rDays = s.rules?.auto_cancel_overdue_days ?? null;

        setGymName(gName);
        setPhone(gPhone);
        setEmail(gEmail);
        setAddress(gAddress);
        setLogoUrl(gLogo);

        setDashboardDomain(dDashDomain);
        setLandingDomain(dLandingDomain);
        setIsDomainVerified(dVerified);
        setBrandColor(dColor);

        // Apply brand color immediately
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--brand-color', dColor);
        }

        setUpiId(pUpi);
        setUpiQrUrl(pQr);
        setPaymentInstructions(pInstructions);
        setIsGatewayEnabled(pGatewayEnabled);
        setGatewayProvider(pProvider);
        setGatewayKeyId(pKeyId);

        setWhatsappMode(wMode);
        setFbWabaId(wWaba);
        setFbPhoneNumberId(wPhoneId);

        setAutoCancelDays(rDays);

        initialSnapshotRef.current = {
          gymName: gName,
          phone: gPhone,
          email: gEmail,
          address: gAddress,
          logoUrl: gLogo,
          upiId: pUpi,
          upiQrUrl: pQr,
          paymentInstructions: pInstructions,
          isGatewayEnabled: pGatewayEnabled,
          gatewayProvider: pProvider,
          gatewayKeyId: pKeyId,
          gatewayKeySecret: '',
          whatsappMode: wMode,
          fbWabaId: wWaba,
          fbPhoneNumberId: wPhoneId,
          autoCancelDays: rDays,
          dashboardDomain: dDashDomain,
          landingDomain: dLandingDomain,
          isDomainVerified: dVerified,
          brandColor: dColor,
        };
        setSnapshotVersion((v) => v + 1);
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

  // Compute dirty status with snapshotVersion dependency
  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    const init = initialSnapshotRef.current;
    return (
      gymName !== init.gymName ||
      phone !== init.phone ||
      email !== init.email ||
      address !== init.address ||
      logoUrl !== init.logoUrl ||
      upiId !== init.upiId ||
      upiQrUrl !== init.upiQrUrl ||
      paymentInstructions !== init.paymentInstructions ||
      isGatewayEnabled !== init.isGatewayEnabled ||
      gatewayProvider !== init.gatewayProvider ||
      gatewayKeyId !== init.gatewayKeyId ||
      gatewayKeySecret !== init.gatewayKeySecret ||
      whatsappMode !== init.whatsappMode ||
      fbWabaId !== init.fbWabaId ||
      fbPhoneNumberId !== init.fbPhoneNumberId ||
      autoCancelDays !== init.autoCancelDays ||
      dashboardDomain !== init.dashboardDomain ||
      landingDomain !== init.landingDomain ||
      isDomainVerified !== init.isDomainVerified ||
      brandColor !== init.brandColor
    );
  }, [
    gymName,
    phone,
    email,
    address,
    logoUrl,
    upiId,
    upiQrUrl,
    paymentInstructions,
    isGatewayEnabled,
    gatewayProvider,
    gatewayKeyId,
    gatewayKeySecret,
    whatsappMode,
    fbWabaId,
    fbPhoneNumberId,
    autoCancelDays,
    dashboardDomain,
    landingDomain,
    isDomainVerified,
    brandColor,
    snapshotVersion,
  ]);

  const handleBrandColorChange = (color: string) => {
    setBrandColor(color);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-color', color);
    }
  };

  const handleDiscard = () => {
    if (!initialSnapshotRef.current) return;
    const init = initialSnapshotRef.current;
    setGymName(init.gymName);
    setPhone(init.phone);
    setEmail(init.email);
    setAddress(init.address);
    setLogoUrl(init.logoUrl);
    setUpiId(init.upiId);
    setUpiQrUrl(init.upiQrUrl);
    setPaymentInstructions(init.paymentInstructions);
    setIsGatewayEnabled(init.isGatewayEnabled);
    setGatewayProvider(init.gatewayProvider);
    setGatewayKeyId(init.gatewayKeyId);
    setGatewayKeySecret('');
    setWhatsappMode(init.whatsappMode);
    setFbWabaId(init.fbWabaId);
    setFbPhoneNumberId(init.fbPhoneNumberId);
    setAutoCancelDays(init.autoCancelDays);
    setDashboardDomain(init.dashboardDomain);
    setLandingDomain(init.landingDomain);
    setIsDomainVerified(init.isDomainVerified);
    setBrandColor(init.brandColor);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-color', init.brandColor);
    }
    setError(null);
    setSnapshotVersion((v) => v + 1);
  };

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
          slug: derivedSlug,
          logo_url: logoUrl,
        },
        domain: {
          custom_domain: landingDomain.trim() || null,
          dashboard_domain: dashboardDomain.trim() || null,
          landing_page_domain: landingDomain.trim() || null,
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

      initialSnapshotRef.current = {
        gymName,
        phone,
        email,
        address,
        logoUrl,
        upiId,
        upiQrUrl,
        paymentInstructions,
        isGatewayEnabled,
        gatewayProvider,
        gatewayKeyId,
        gatewayKeySecret: '',
        whatsappMode,
        fbWabaId,
        fbPhoneNumberId,
        autoCancelDays,
        dashboardDomain,
        landingDomain,
        isDomainVerified,
        brandColor,
      };

      setGatewayKeySecret('');
      setSnapshotVersion((v) => v + 1);
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

  const handleCopyDerivedUrl = (text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedDerivedUrl(true);
      setTimeout(() => setCopiedDerivedUrl(false), 2000);
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
    const domainToVerify = landingDomain.trim() || dashboardDomain.trim();
    if (!domainToVerify) {
      setDomainVerifyResult({
        success: false,
        message: 'Please enter a custom domain first (e.g. portal.mygym.com or gym.mybrand.in).',
      });
      return;
    }

    try {
      setIsVerifyingDomain(true);
      setDomainVerifyResult(null);

      const res = await fetch('/api/settings/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainToVerify }),
      });

      const data = await res.json();
      if (data.verified) {
        setIsDomainVerified(true);
        setDomainVerifyResult({
          success: true,
          message: data.message || 'DNS verified successfully! Your domain is now live.',
        });
        await handleSaveSettings();
      } else {
        setIsDomainVerified(false);
        setDomainVerifyResult({
          success: false,
          message: data.message || 'DNS verification pending. Please verify your CNAME record points to gymora.swadyum.store and DNS has propagated.',
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
    setDashboardDomain('');
    setLandingDomain('');
    setIsDomainVerified(false);
    setDomainVerifyResult({
      success: true,
      message: 'Custom domains removed. Click "Save Changes" to apply.',
    });
  };

  const sections: {
    id: SettingsSection;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    description: string;
  }[] = [
    { id: 'profile', label: 'Gym Profile', shortLabel: 'Profile', icon: Building2, description: 'Name, phone, email & address' },
    { id: 'payments', label: 'Payments', shortLabel: 'Payments', icon: CreditCard, description: 'UPI, QR code & gateway' },
    { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WhatsApp', icon: MessageCircle, description: 'Manual click-to-chat & API' },
    { id: 'automation', label: 'Automation', shortLabel: 'Automation', icon: Clock, description: 'Reminders & cancellation' },
    { id: 'branding', label: 'Domain & Branding', shortLabel: 'Branding', icon: Globe, description: 'Custom domain, branding & logo' },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const defaultPlatformUrl = `https://gymora.swadyum.store/join/${derivedSlug}`;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-32">
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

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 min-h-[44px]"
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
      </div>

      {saveSuccess && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3.5 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3.5 flex items-center gap-2 text-xs font-medium text-rose-800 dark:text-rose-300 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section Navigation */}
      {/* Mobile Grid Navigation (clean responsive tactile cards) */}
      <div className="sm:hidden grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2.5 p-3 min-h-[48px] rounded-xl border text-left transition active:scale-[0.98] ${
                isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold leading-tight truncate">{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Horizontal Navigation */}
      <div className="hidden sm:flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto no-scrollbar">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: GYM PROFILE */}
      {activeSection === 'profile' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Gym Profile</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Official name and contact information. Your gym name automatically determines your unique QR join link.
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
                placeholder="e.g. Iron Pulse Fitness"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Auto-derived QR & Join Link Box */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/80 dark:bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Public Registration Link (Auto-Generated from Gym Name)
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Slug: {derivedSlug}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-zinc-900 dark:text-zinc-100 break-all font-medium">
                  {defaultPlatformUrl}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyDerivedUrl(defaultPlatformUrl)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition min-h-[38px]"
                  >
                    {copiedDerivedUrl ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/join/${derivedSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition min-h-[38px]"
                  >
                    <span>Preview</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
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
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
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
                  placeholder="contact@ironpulse.fit"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Gym Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No. 4, 2nd Floor, Main Market..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PAYMENTS */}
      {activeSection === 'payments' && (
        <div className="space-y-8 max-w-2xl">
          {/* Section 2.1: Manual Payments */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Manual Payment Collection</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Support direct Cash, UPI, and Counter QR payments with zero gateway deductions.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Gym UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 9876543210@ybl or ironpulse@okaxis"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Counter UPI QR Image URL
                </label>
                <input
                  type="url"
                  value={upiQrUrl}
                  onChange={(e) => setUpiQrUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
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
                  placeholder="e.g. Please show the UPI transaction screenshot or pay cash at the reception desk."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2.2: Online Payment Gateway */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Online Payment Gateway</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Accept automated payments online via Razorpay, PhonePe, Cashfree, or Paytm.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={isGatewayEnabled}
                  onChange={(e) => setIsGatewayEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white"></div>
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
                        className={`rounded-xl py-2.5 px-3 text-xs font-semibold capitalize border transition min-h-[44px] ${
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
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
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
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Webhook URL:</span>{' '}
                  <code className="font-mono text-zinc-900 dark:text-zinc-100 break-all">
                    https://gymora.fit/api/webhooks/{gatewayProvider}
                  </code>
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

      {/* SECTION 3: WHATSAPP */}
      {activeSection === 'whatsapp' && (
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
                Automate reminders and receipts via Meta&apos;s official Cloud API using pre-approved templates.
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
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[44px]"
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
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: AUTOMATION */}
      {activeSection === 'automation' && (
        <div className="space-y-8 max-w-3xl">
          {/* 4.1 Auto-cancellation rule */}
          <div className="space-y-4">
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
                      className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition min-h-[44px] ${
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

              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong className="text-zinc-900 dark:text-zinc-100">Financial History Guarantee:</strong>{' '}
                Cancelling an unpaid membership moves the membership lifecycle to <em>Cancelled</em> and deactivates access. The member&apos;s full profile, past payments, and subscription history remain fully preserved and searchable.
              </div>
            </div>
          </div>

          {/* 4.2 Reminder Rules & Automation Schedule Engine */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Automated Reminder Schedules</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Control when automated payment reminders and updates are triggered. Messages respect member WhatsApp opt-out preferences.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
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
          </div>
        </div>
      )}

      {/* SECTION 5: DOMAIN & BRANDING */}
      {activeSection === 'branding' && (
        <div className="space-y-8 max-w-3xl">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Custom Domains & Branding</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Connect your own custom domains for your dashboard and landing page, customize your brand logo and theme color.
            </p>
          </div>

          {/* Logo Upload */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/50 space-y-4 shadow-sm">
            <LogoUploader
              value={logoUrl}
              onChange={setLogoUrl}
              label="Gym Brand Logo"
              description="Displays on your custom domain header, member receipts, and onboarding portal"
            />
          </div>

          {/* Brand Accent Color */}
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
              Customize the primary accent color across your dashboard, member portal, and buttons.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Brand Accent Color
              </label>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                    onClick={() => handleBrandColorChange(color.hex)}
                    className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition min-h-[44px] ${
                      brandColor === color.hex
                        ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white ring-2 ring-zinc-900 dark:ring-white ring-offset-1'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full shadow-inner shrink-0"
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
                    onChange={(e) => handleBrandColorChange(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => handleBrandColorChange(e.target.value)}
                    className="w-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono uppercase text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm flex items-center min-h-[44px]"
                  style={{ backgroundColor: brandColor }}
                >
                  Live Accent Preview
                </div>
              </div>
            </div>
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
                  {domainVerifyResult.success ? 'Domain Status: Connected' : 'Verification Status'}
                </span>
                <span>{domainVerifyResult.message}</span>
              </div>
            </div>
          )}

          {/* Custom Domains Integration (Dashboard Domain + Landing Page Domain) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/50 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    Connect Your Own Domains
                    {isDomainVerified ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> Connected
                      </span>
                    ) : (landingDomain || dashboardDomain) ? (
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
              <span className="text-[11px] text-zinc-400">White-label host on your own domain</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Set up dedicated domains for your admin dashboard and public QR registration. If no custom domain is connected, your gym is automatically accessible at <strong className="text-zinc-900 dark:text-zinc-100">{defaultPlatformUrl}</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Dashboard Domain (Owner Portal)
                </label>
                <input
                  type="text"
                  value={dashboardDomain}
                  onChange={(e) => setDashboardDomain(e.target.value.toLowerCase().replace(/^(https?:\/\/)/, '').replace(/\/.*$/, '').trim())}
                  placeholder="e.g. admin.mygym.com"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">Where you manage your gym</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Landing Page / Join Domain (Public QR)
                </label>
                <input
                  type="text"
                  value={landingDomain}
                  onChange={(e) => setLandingDomain(e.target.value.toLowerCase().replace(/^(https?:\/\/)/, '').replace(/\/.*$/, '').trim())}
                  placeholder="e.g. join.mygym.com or mygym.in"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 focus:outline-none min-h-[44px]"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">Where walk-in members register</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={isVerifyingDomain || (!landingDomain.trim() && !dashboardDomain.trim())}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 min-h-[44px]"
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

              {(landingDomain || dashboardDomain) && (
                <button
                  type="button"
                  onClick={handleDisconnectDomain}
                  className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 px-3 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition min-h-[44px]"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* DNS Instructions Box */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                DNS Configuration Table
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Log into your domain provider (GoDaddy, Namecheap, Cloudflare, Hostinger, etc.) and add the corresponding record:
              </p>

              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Host / Subdomain</th>
                      <th className="px-3 py-2 font-semibold">Points To / Target</th>
                      <th className="px-3 py-2 font-semibold">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                    {dashboardDomain && (
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">CNAME</td>
                        <td className="px-3 py-2 font-semibold">{dashboardDomain.split('.')[0]}</td>
                        <td className="px-3 py-2 flex items-center justify-between gap-2">
                          <span>gymora.swadyum.store</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCustomDomain('gymora.swadyum.store')}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                          >
                            {copiedCustomDomain ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                      </tr>
                    )}
                    {landingDomain && (
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">CNAME</td>
                        <td className="px-3 py-2 font-semibold">{landingDomain.split('.')[0]}</td>
                        <td className="px-3 py-2 flex items-center justify-between gap-2">
                          <span>gymora.swadyum.store</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCustomDomain('gymora.swadyum.store')}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                          >
                            {copiedCustomDomain ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                      </tr>
                    )}
                    {!dashboardDomain && !landingDomain && (
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">CNAME</td>
                        <td className="px-3 py-2">portal (or @)</td>
                        <td className="px-3 py-2 flex items-center justify-between gap-2">
                          <span>gymora.swadyum.store</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCustomDomain('gymora.swadyum.store')}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                          >
                            {copiedCustomDomain ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-3 py-2 font-bold text-zinc-500">A (Fallback)</td>
                      <td className="px-3 py-2">@ (root)</td>
                      <td className="px-3 py-2">77.37.54.103</td>
                      <td className="px-3 py-2 text-zinc-500">Auto / 3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong>Note:</strong> DNS changes propagate worldwide within 2 to 15 minutes. Once DNS propagates, click &ldquo;Verify DNS&rdquo; and &ldquo;Save Changes&rdquo;.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sticky Save Changes Bar (Appears ONLY when isDirty) */}
      {isDirty && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-auto z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between sm:justify-end gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-2 mr-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                Unsaved changes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Discard</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
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
          </div>
        </div>
      )}
    </div>
  );
}
