'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  ShieldCheck,
} from 'lucide-react';

export default function QRPage() {
  const [gymSlug, setGymSlug] = useState('iron-pulse');
  const [gymName, setGymName] = useState('Gymora Fitness');
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8 flex flex-col items-center">
      {/* Printable Reception Standee / Display Card */}
      <div
        ref={printRef}
        className="print-area rounded-3xl border-2 border-slate-200 bg-white p-8 sm:p-12 shadow-lg flex flex-col items-center text-center max-w-lg mx-auto w-full"
      >
        {/* QR Code Container */}
        <div className="mb-6 rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-200 inline-block">
          <QRCodeSVG
            value={joinUrl}
            size={280}
            level="H"
            includeMargin={true}
          />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {gymName}
        </h2>
        <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600 mt-2">
          Scan to Join & Pay
        </p>

        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Powered by Gymora CRM</span>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-4 text-base font-bold text-white shadow-md hover:bg-slate-800 transition active:scale-95"
      >
        <Printer className="h-5 w-5 text-emerald-400" />
        <span>Print Reception Poster</span>
      </button>
    </div>
  );
}
