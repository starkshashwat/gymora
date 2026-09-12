'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import AddMemberModal from '@/components/members/AddMemberModal';
import { MembershipPlan } from '@/lib/types/database';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col selection:bg-zinc-900 selection:text-white">
      <Navbar onAddMemberClick={() => setIsAddMemberOpen(true)} />
      <main className="flex-1 pb-16">
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
