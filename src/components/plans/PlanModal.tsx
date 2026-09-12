'use client';

import React, { useState, useEffect } from 'react';
import { MembershipPlan } from '@/lib/types/database';
import { formatINR } from '@/lib/utils/currency';
import { X, Layers, Loader2, Image as ImageIcon, ListPlus } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MembershipPlan | null; // if null, creating new plan
  onPlanSaved: () => void;
}

export default function PlanModal({
  isOpen,
  onClose,
  plan,
  onPlanSaved,
}: PlanModalProps) {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(1500);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDurationDays(plan.duration_days);
      setPrice(plan.price);
      setDescription(plan.description || '');
      setImageUrl(plan.image_url || '');
      setFeaturesText((plan.features || []).join('\n'));
      setIsActive(plan.is_active);
    } else {
      setName('');
      setDurationDays(30);
      setPrice(1500);
      setDescription('');
      setImageUrl('');
      setFeaturesText('');
      setIsActive(true);
    }
    setError(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Plan name is required');
      return;
    }
    if (durationDays <= 0) {
      setError('Duration must be at least 1 day');
      return;
    }
    if (price < 0) {
      setError('Price cannot be negative');
      return;
    }

    const parsedFeatures = featuresText
      .split(/[\n,]+/)
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan?.id,
          name: name.trim(),
          duration_days: Number(durationDays),
          price: Number(price),
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          features: parsedFeatures,
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save plan');
      }

      onPlanSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {plan ? 'Edit Membership Plan' : 'Create New Plan'}
              </h2>
              <p className="text-xs text-slate-500">Configure pricing, duration, features, and 16:9 banner.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Standard, Annual VIP"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description <span className="font-normal text-slate-400 lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of this membership plan..."
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          {/* 16:9 Image URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plan Banner Image URL (16:9)
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... (16:9 ratio)"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>
            {imageUrl && (
              <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={imageUrl}
                  alt="Plan preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Features bullet points */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plan Features / Highlights <span className="font-normal text-slate-400 lowercase">(one per line)</span>
            </label>
            <textarea
              rows={3}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder={"Full Gym Floor Access\nFree Locker Access\n1 Free Trainer Assessment\nSteam & Shower Access"}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active plan (shown on reception QR onboarding portal)
            </label>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Plan...</span>
                </>
              ) : (
                <span>{plan ? 'Save Changes' : 'Create Plan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
