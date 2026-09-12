'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Copy,
  Check,
  Printer,
  ExternalLink,
  ShieldCheck,
  Dumbbell,
  Globe,
} from 'lucide-react';

export default function QRPage() {
  const [gymSlug, setGymSlug] = useState('iron-pulse');
  const [gymName, setGymName] = useState('Gymora Fitness');
  const [copied, setCopied] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);
  const [origin, setOrigin] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    // Fetch actual gym profile
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.gym) {
          setGymSlug(data.gym.slug || 'iron-pulse');
          setGymName(data.gym.name || 'Gymora');
        }
      })
      .catch(() => {});
  }, []);

  const joinUrl = `${origin || 'http://localhost:3000'}/join/${gymSlug}`;

  // Subdomain URL calculation
  const subdomainUrl =
    typeof window !== 'undefined' && window.location.hostname.includes('localhost')
      ? `http://${gymSlug}.localhost:3000`
      : `https://${gymSlug}.gymora.fit`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopySubdomain = () => {
    navigator.clipboard.writeText(subdomainUrl);
    setCopiedSubdomain(true);
    setTimeout(() => setCopiedSubdomain(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Reception QR Code & Subdomain
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Print and display this QR code at your reception counter or share your personalized gym subdomain.
        </p>
      </div>

      {/* Subdomain & URL Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct URL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Direct Public URL
            </span>
            <button
              onClick={handleCopy}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 truncate">
            {joinUrl}
          </div>
        </div>

        {/* Subdomain URL */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Gym Subdomain Link
              </span>
            </div>
            <button
              onClick={handleCopySubdomain}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              {copiedSubdomain ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSubdomain ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-emerald-950 bg-white p-2.5 rounded-xl border border-emerald-200 truncate font-bold">
            {subdomainUrl}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <ExternalLink className="h-4 w-4 text-slate-400" />
          <span>Open Public Onboarding Page</span>
        </a>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition ml-auto"
        >
          <Printer className="h-4 w-4 text-emerald-400" />
          <span>Print Reception Poster</span>
        </button>
      </div>

      {/* Printable Reception Standee / Display Card */}
      <div
        ref={printRef}
        className="rounded-3xl border-2 border-slate-200 bg-white p-8 sm:p-12 shadow-lg flex flex-col items-center text-center max-w-lg mx-auto"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md mb-4">
          <Dumbbell className="h-8 w-8 text-emerald-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {gymName}
        </h2>
        <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 mt-1">
          Scan to Join & Pay Membership
        </p>

        {/* QR Code Container */}
        <div className="my-8 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 inline-block">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="space-y-2 max-w-xs">
          <h4 className="text-base font-bold text-slate-900">
            Scan to Join in 30 Seconds
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Point your mobile camera at this QR code to select your membership plan and submit your details.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Powered by Gymora CRM</span>
        </div>
      </div>
    </div>
  );
}
