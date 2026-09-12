'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Layers,
  QrCode,
  UserCheck,
  Menu,
  X,
  Plus,
  Bell,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onAddMemberClick?: () => void;
}

export default function Navbar({ onAddMemberClick }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    document.cookie = 'gymora_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'gymora_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'gymora_gym_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/';
  };

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (data.success && Array.isArray(data.registrations)) {
        const count = data.registrations.filter((r: any) => r.status === 'pending').length;
        setPendingCount(count);
      }
    } catch {
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
    <nav className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo & Name: Gymora */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900 transition-transform group-hover:scale-105">
                <Dumbbell className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
              </div>
              <div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-lg tracking-tight block leading-tight">
                  Gymora
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
                  Fitness CRM
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links — Sleek Pill Styling */}
          <div className="hidden md:flex items-center gap-1.5 bg-zinc-100/70 dark:bg-zinc-900 p-1 rounded-full border border-zinc-200/60 dark:border-zinc-800">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-white/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-emerald-400" : "text-zinc-400")} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Actions: Add Member & Exit Buttons */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Link
                href="/registrations"
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition"
                title={`${pendingCount} pending registrations`}
              >
                <Bell className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                <span>{pendingCount} New</span>
              </Link>
            )}

            {onAddMemberClick && (
              <button
                type="button"
                onClick={onAddMemberClick}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Member</span>
              </button>
            )}

            {/* Exit / Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
              title="Sign out of Gymora"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-200 bg-white px-4 pt-3 pb-5 md:hidden dark:border-zinc-800 dark:bg-zinc-950 animate-in slide-in-from-top-2">
          <div className="space-y-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}

            {/* Mobile Sign Out */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
