'use client';

import React from 'react';
import { MemberFilterType } from '@/lib/types/database';
import {
  X,
  Filter,
  Check,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
  Ban,
  Calendar,
} from 'lucide-react';

interface MemberFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: MemberFilterType;
  onSelectFilter: (filter: MemberFilterType) => void;
  counts?: Partial<Record<MemberFilterType, number>>;
}

interface FilterOption {
  id: MemberFilterType;
  label: string;
  description: string;
  icon: React.ElementType;
  badgeColor?: string;
}

export default function MemberFilterModal({
  isOpen,
  onClose,
  currentFilter,
  onSelectFilter,
  counts = {},
}: MemberFilterModalProps) {
  if (!isOpen) return null;

  const filterOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'All Members',
      description: 'Show all registered gym members',
      icon: Users,
    },
    {
      id: 'due',
      label: 'Due Today / Partial',
      description: 'Members with payments due today or partial dues',
      icon: Clock,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      id: 'overdue',
      label: 'Overdue Members',
      description: 'Past due date with pending balance',
      icon: AlertCircle,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    },
    {
      id: 'expiring_soon',
      label: 'Expiring Soon (7 Days)',
      description: 'Membership ending within 7 days',
      icon: Calendar,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      id: 'paid',
      label: 'Fully Paid',
      description: 'Zero outstanding balance for current cycle',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
      id: 'paused',
      label: 'Paused Members',
      description: 'Billing and membership cycle temporarily frozen',
      icon: Pause,
      badgeColor: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    },
    {
      id: 'cancelled',
      label: 'Cancelled Members',
      description: 'Terminated memberships preserved for records',
      icon: Ban,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    },
  ];

  const handleSelect = (filterId: MemberFilterType) => {
    onSelectFilter(filterId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
        {/* Mobile drag handle indicator */}
        <div className="sm:hidden -mt-2 mb-4 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Filter className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Filter Members
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Quickly segment your member roster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter List */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 my-3">
          {filterOptions.map((opt) => {
            const isSelected = currentFilter === opt.id;
            const Icon = opt.icon;
            const count = counts[opt.id];

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`w-full flex items-center justify-between py-3.5 px-3 rounded-2xl text-left transition ${
                  isSelected
                    ? 'bg-zinc-100/90 dark:bg-zinc-800/70 font-semibold'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {opt.label}
                      </span>
                      {count !== undefined && count > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            opt.badgeColor || 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {isSelected ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => handleSelect('all')}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-900 dark:bg-white py-2.5 text-xs font-bold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
