'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import AddMemberModal from '@/components/members/AddMemberModal';
import { MembershipPlan } from '@/lib/types/database';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOnboarding) return;
    fetchPlans();
    
    // Listen for add member requests from anywhere
    const handleOpenAddMember = () => setIsAddMemberOpen(true);
    window.addEventListener('gym:open-add-member', handleOpenAddMember);
    return () => window.removeEventListener('gym:open-add-member', handleOpenAddMember);
  }, [isOnboarding]);

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 selection:bg-zinc-900 selection:text-white">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col md:flex-row selection:bg-zinc-900 selection:text-white">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full min-w-0 pb-28 md:pb-8 overflow-x-hidden">
        {children}
      </main>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        plans={plans.filter((p) => p.is_active)}
        onMemberAdded={() => {
          // Trigger a page refresh / event so pages update their lists
          window.dispatchEvent(new Event('gym:member-updated'));
        }}
      />
    </div>
  );
}
