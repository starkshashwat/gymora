'use client';

import React, { useState, useEffect } from 'react';
import { MembershipPlan } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import PlanModal from '@/components/plans/PlanModal';
import {
  Layers,
  PlusCircle,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  Check,
  Dumbbell,
} from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    try {
      await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...plan,
          is_active: !plan.is_active,
        }),
      });
      loadPlans();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Membership Plans
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Define pricing tiers, duration, 16:9 banners, and features displayed on reception QR onboarding.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition shrink-0"
        >
          <PlusCircle className="h-4 w-4 text-emerald-400" />
          <span>Add New Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-base font-bold text-slate-900">No plans created yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first plan to start offering memberships.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            <PlusCircle className="h-4 w-4" /> Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-white overflow-hidden shadow-sm flex flex-col justify-between transition ${
                plan.is_active ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div>
                {/* 16:9 Image or Banner Placeholder */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  {plan.image_url ? (
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-950 text-white">
                      <Dumbbell className="h-10 w-10 text-emerald-400 opacity-60" />
                    </div>
                  )}

                  {/* Badge over banner */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm ${
                        plan.is_active
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm p-1.5 text-slate-700 hover:bg-white transition shadow-sm"
                    title="Edit plan"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {formatINR(plan.price)}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      / {plan.duration_days} days
                    </span>
                  </div>

                  {plan.description && (
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  {/* Features Bullet Points */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Duration: {plan.duration_days}d</span>
                  </div>

                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={`text-xs font-bold transition ${
                      plan.is_active
                        ? 'text-rose-600 hover:text-rose-700'
                        : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    {plan.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot Protection Notice */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Financial Snapshot Protection:</strong> Updating plan pricing will apply to new signups and future membership cycles only. Existing member balances and historical invoices remain immutable.
        </div>
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={selectedPlan}
        onPlanSaved={loadPlans}
      />
    </div>
  );
}
