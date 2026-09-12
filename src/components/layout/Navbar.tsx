'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Layers,
  QrCode,
  UserCheck,
  Menu,
  X,
  PlusCircle,
  Bell,
} from 'lucide-react';

interface NavbarProps {
  onAddMemberClick?: () => void;
}

export default function Navbar({ onAddMemberClick }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (data.success && Array.isArray(data.registrations)) {
        const count = data.registrations.filter((r: any) => r.status === 'pending').length;
        setPendingCount(count);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchPendingCount();

    // Fast polling every 4s for instant reception notifications
    const interval = setInterval(fetchPendingCount, 4000);

    // Cross-tab broadcast listener
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gymora_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') {
          fetchPendingCount();
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gymora_new_registration') {
        fetchPendingCount();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('gym:member-updated', fetchPendingCount);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('gym:member-updated', fetchPendingCount);
    };
  }, []);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/plans', label: 'Plans', icon: Layers },
    {
      href: '/registrations',
      label: 'QR Submissions',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/qr', label: 'Reception QR', icon: QrCode },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo & Name: Gymora */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md group-hover:bg-emerald-600 transition">
                <Dumbbell className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-black text-slate-900 text-xl tracking-tight block leading-tight">
                  Gymora
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-600 block">
                  Fitness CRM
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-black text-white shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Actions: Add Member & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            {pendingCount > 0 && (
              <Link
                href="/registrations"
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                title={`${pendingCount} pending registrations`}
              >
                <Bell className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                <span>{pendingCount} New Signups</span>
              </Link>
            )}

            {onAddMemberClick && (
              <button
                onClick={onAddMemberClick}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add Member</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-4 md:hidden animate-in slide-in-from-top-2">
          <div className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-base font-semibold ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-black text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
