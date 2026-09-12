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
} from 'lucide-react';

export default function QRPage() {
  const [gymSlug, setGymSlug] = useState('gymora');
  const [gymName, setGymName] = useState('Gymora');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const joinUrl = `${origin || 'http://localhost:3000'}/join/${gymSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Reception QR Code
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Print and display this QR code at your reception counter for contactless member self-onboarding.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-slate-400" />
              <span>Copy Onboarding URL</span>
            </>
          )}
        </button>

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
          <Dumbbell className="h-8 w-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {gymName}
        </h2>
        <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 mt-1">
          Self Registration & Plan Selection
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
            Point your mobile camera at this QR code to choose your membership plan and submit your details.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Safe & Direct Reception Onboarding</span>
        </div>
      </div>
    </div>
  );
}
