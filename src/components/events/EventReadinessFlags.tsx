"use client";

import type { DepositStatus } from "@/types";

type Props = {
  daysUntil: number;
  hasStaff: boolean;
  hasPricing: boolean;
  hasProposal: boolean;
  depositStatus: DepositStatus;
};

type Flag = {
  label: string;
  ok: boolean;
  colorClass: string;
};

const DEPOSIT_FLAG_CONFIG: Record<DepositStatus, { label: string; ok: boolean; colorClass: string }> = {
  none: {
    label: "No Deposit Due",
    ok: true,
    colorClass: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  },
  pending: {
    label: "Deposit Pending",
    ok: false,
    colorClass: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
  overdue: {
    label: "Deposit Overdue",
    ok: false,
    colorClass: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  paid: {
    label: "Deposit Paid",
    ok: true,
    colorClass: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  failed: {
    label: "Deposit Failed",
    ok: false,
    colorClass: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
};

export function EventReadinessFlags({ daysUntil, hasStaff, hasPricing, hasProposal, depositStatus }: Props) {
  const standardFlags: Flag[] = [
    {
      label: hasPricing ? "Priced" : "No Pricing",
      ok: hasPricing,
      colorClass: hasPricing
        ? "bg-green-900/30 text-green-400 border border-green-800/40"
        : "bg-red-900/30 text-red-400 border border-red-800/40",
    },
    {
      label: hasProposal ? "Proposed" : "No Proposal",
      ok: hasProposal,
      colorClass: hasProposal
        ? "bg-green-900/30 text-green-400 border border-green-800/40"
        : "bg-red-900/30 text-red-400 border border-red-800/40",
    },
    {
      label: hasStaff ? "Staffed" : "No Staff",
      ok: hasStaff,
      colorClass: hasStaff
        ? "bg-green-900/30 text-green-400 border border-green-800/40"
        : "bg-red-900/30 text-red-400 border border-red-800/40",
    },
  ];

  const depositFlag = DEPOSIT_FLAG_CONFIG[depositStatus];

  const allFlags: Flag[] = [...standardFlags, depositFlag];

  // Only show red/warning flags for events within 14 days
  const visibleFlags = allFlags.filter((f) => f.ok || daysUntil <= 14);

  if (visibleFlags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleFlags.map((flag) => (
        <span
          key={flag.label}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${flag.colorClass}`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  );
}
