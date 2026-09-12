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
  LogOut,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
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
    const interval = setInterval(fetchPendingCount, 4000);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gymora_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') fetchPendingCount();
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gymora_new_registration') fetchPendingCount();
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

  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      ]
    },
    {
      label: 'MEMBERS',
      items: [
        { href: '/members', label: 'Members', icon: Users },
        {
          href: '/registrations',
          label: 'Registrations',
          icon: UserCheck,
          badge: pendingCount > 0 ? pendingCount : null,
        },
      ]
    },
    {
      label: 'MONEY',
      items: [
        { href: '/plans', label: 'Plans', icon: Layers },
      ]
    },
    {
      label: 'TOOLS',
      items: [
        { href: '/qr', label: 'Gym QR', icon: QrCode },
      ]
    },
    {
      label: 'CONFIGURATION',
      items: [
        { href: '/settings', label: 'Settings', icon: SettingsIcon },
      ]
    }
  ];

  const DesktopSidebar = (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 min-h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-lg">Gymora</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-2 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-200/50 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500")} />
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
            </div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 text-zinc-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  const MobileHeader = (
    <header className="md:hidden sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Dumbbell className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-lg">Gymora</span>
        </Link>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link
              href="/registrations"
              className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600"
            >
              <Bell className="h-3 w-3 animate-bounce" />
              <span>{pendingCount}</span>
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-zinc-600 dark:text-zinc-400"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2 py-4 shadow-xl">
          <div className="space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                <div className="px-3 mb-1 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium",
                          isActive
                            ? "bg-zinc-200/50 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-50"
                            : "text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500")} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="pt-2 px-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileHeader}
    </>
  );
}
