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
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [gymInfo, setGymInfo] = useState<{ name: string; logoUrl?: string | null }>({ name: 'Gymora' });

  const fetchGymInfo = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings?.general) {
        setGymInfo({
          name: data.settings.general.name || 'Gymora',
          logoUrl: data.settings.general.logo_url || null,
        });
      }
    } catch {
      // ignore
    }
  };

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
    fetchGymInfo();
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
    window.addEventListener('gym:settings-updated', fetchGymInfo);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('gym:member-updated', fetchPendingCount);
      window.removeEventListener('gym:settings-updated', fetchGymInfo);
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
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          {gymInfo.logoUrl ? (
            <img
              src={gymInfo.logoUrl}
              alt={gymInfo.name}
              className="h-8 w-8 rounded-lg object-contain border border-zinc-200 dark:border-zinc-800 bg-white shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shrink-0">
              <Dumbbell className="h-4 w-4" />
            </div>
          )}
          <span className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-base sm:text-lg truncate">
            {gymInfo.name}
          </span>
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
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          {gymInfo.logoUrl ? (
            <img
              src={gymInfo.logoUrl}
              alt={gymInfo.name}
              className="h-7 w-7 rounded-lg object-contain border border-zinc-200 dark:border-zinc-800 bg-white shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shrink-0">
              <Dumbbell className="h-3.5 w-3.5" />
            </div>
          )}
          <span className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-base sm:text-lg truncate max-w-[180px]">
            {gymInfo.name}
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/qr"
            className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition"
            title="Gym QR Code"
            aria-label="Gym QR Code"
          >
            <QrCode className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          </Link>

          {pendingCount > 0 && (
            <Link
              href="/registrations"
              className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600"
            >
              <Bell className="h-3 w-3 animate-bounce" />
              <span>{pendingCount}</span>
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-zinc-600 dark:text-zinc-400"
            aria-label="Toggle navigation menu"
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

  const MobileBottomNav = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
      <div className="flex h-16 items-center justify-around px-1 relative">
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
            pathname === '/dashboard'
              ? "text-zinc-900 dark:text-white font-bold"
              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          )}
        >
          <LayoutDashboard className={cn("h-5 w-5 mb-0.5", pathname === '/dashboard' ? "stroke-[2.5]" : "stroke-[1.75]")} />
          <span className="text-[10px] tracking-tight">Overview</span>
        </Link>

        {/* 2. Members */}
        <Link
          href="/members"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
            pathname.startsWith('/members')
              ? "text-zinc-900 dark:text-white font-bold"
              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          )}
        >
          <Users className={cn("h-5 w-5 mb-0.5", pathname.startsWith('/members') ? "stroke-[2.5]" : "stroke-[1.75]")} />
          <span className="text-[10px] tracking-tight">Members</span>
        </Link>

        {/* 3. Center Elevated FAB: Add Member */}
        <div className="flex flex-col items-center justify-center px-1 -translate-y-3 shrink-0">
          <button
            onClick={() => {
              window.dispatchEvent(new Event('gym:open-add-member'));
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl ring-4 ring-white dark:ring-zinc-950 hover:scale-105 active:scale-95 transition dark:bg-white dark:text-zinc-900"
            title="Add Member"
            aria-label="Add Member"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 mt-1">Add</span>
        </div>

        {/* 4. Registrations */}
        <Link
          href="/registrations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 relative transition-colors",
            pathname.startsWith('/registrations')
              ? "text-zinc-900 dark:text-white font-bold"
              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          )}
        >
          <div className="relative">
            <UserCheck className={cn("h-5 w-5 mb-0.5", pathname.startsWith('/registrations') ? "stroke-[2.5]" : "stroke-[1.75]")} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white animate-pulse shadow-sm">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Signups</span>
        </Link>

        {/* 5. Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
            pathname.startsWith('/settings')
              ? "text-zinc-900 dark:text-white font-bold"
              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          )}
        >
          <SettingsIcon className={cn("h-5 w-5 mb-0.5", pathname.startsWith('/settings') ? "stroke-[2.5]" : "stroke-[1.75]")} />
          <span className="text-[10px] tracking-tight">Settings</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileHeader}
      {MobileBottomNav}
    </>
  );
}
