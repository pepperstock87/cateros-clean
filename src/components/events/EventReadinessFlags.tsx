"use client";

type Props = {
  daysUntil: number;
  hasStaff: boolean;
  hasPricing: boolean;
  hasProposal: boolean;
  depositPaid: boolean;
};

type Flag = {
  label: string;
  ok: boolean;
};

export function EventReadinessFlags({ daysUntil, hasStaff, hasPricing, hasProposal, depositPaid }: Props) {
  const flags: Flag[] = [
    { label: hasPricing ? "Priced" : "No Pricing", ok: hasPricing },
    { label: hasProposal ? "Proposed" : "No Proposal", ok: hasProposal },
    { label: hasStaff ? "Staffed" : "No Staff", ok: hasStaff },
    { label: depositPaid ? "Deposit Paid" : "No Deposit", ok: depositPaid },
  ];

  // Only show red flags for events within 14 days
  const visibleFlags = flags.filter((f) => f.ok || daysUntil <= 14);

  if (visibleFlags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleFlags.map((flag) => (
        <span
          key={flag.label}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            flag.ok
              ? "bg-green-900/30 text-green-400 border border-green-800/40"
              : "bg-red-900/30 text-red-400 border border-red-800/40"
          }`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  );
}
